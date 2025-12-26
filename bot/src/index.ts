import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { sendInfractionDM, InfractionData } from './services/notifications';

config();

const BOT_API_TOKEN = process.env.BOT_API_TOKEN;

// Helper to parse JSON body from request
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Verify bot API token for secure endpoints
function verifyBotToken(req: IncomingMessage): boolean {
  const token = req.headers['x-bot-token'];
  return BOT_API_TOKEN ? token === BOT_API_TOKEN : false;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Required to fetch all guild members
  ],
});

// HTTP server for health checks and API endpoints
const PORT = process.env.PORT || 3001;
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Health check endpoints - Render uses this to check if service is alive
  if (req.url === '/health' || req.url === '/') {
    const isReady = client.isReady();
    const status = isReady ? 'ok' : 'starting';
    res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status,
      service: 'staffapp-bot',
      bot_ready: isReady,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Notification endpoint for infraction DMs
  if (req.url === '/notify-infraction' && req.method === 'POST') {
    // Verify authentication
    if (!verifyBotToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req) as InfractionData;

      // Validate required fields
      if (!body.discord_id || !body.type || !body.reason || !body.issued_by) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: discord_id, type, reason, issued_by' }));
        return;
      }

      // Send the DM
      const result = await sendInfractionDM(client, {
        discord_id: body.discord_id,
        type: body.type,
        reason: body.reason,
        issued_by: body.issued_by,
        issued_at: body.issued_at || new Date().toISOString(),
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: result.success,
        dm_sent: result.success,
        error: result.error || null,
      }));
    } catch (error: any) {
      console.error('Error processing infraction notification:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Get Discord server members endpoint
  if (req.url === '/server-members' && req.method === 'GET') {
    // Verify authentication
    if (!verifyBotToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      // Check if bot is ready
      if (!client.isReady()) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bot is not ready yet' }));
        return;
      }

      const guildId = process.env.GUILD_ID;
      if (!guildId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GUILD_ID not configured' }));
        return;
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Guild not found' }));
        return;
      }

      // Fetch all members (this may take a moment for large servers)
      // Fetch all members to ensure cache is populated
      await guild.members.fetch(); // Fetches all members and populates cache
      
      const members = guild.members.cache
        .filter(member => !member.user.bot) // Filter out bots
        .map(member => ({
          discord_id: member.user.id,
          discord_username: member.user.username,
          discord_display_name: member.displayName,
          discord_avatar: member.user.avatar,
          bot: member.user.bot,
        }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ members }));
    } catch (error: any) {
      console.error('Error fetching server members:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Store server instance for graceful shutdown
const serverInstance = server.listen(PORT, '0.0.0.0', () => {
  console.log(`Bot HTTP server listening on port ${PORT}`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/health`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
  }
});

// Load commands
const commands = new Collection<any, any>();

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Load events
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  const event = require(filePath);
  if (event.name && event.execute) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

// Register slash commands
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  // Register commands
  try {
    const commandsData = Array.from(commands.values()).map((cmd) => cmd.data.toJSON());
    
    // Register globally (can take up to an hour to propagate)
    // For faster testing, use guild commands instead
    if (process.env.GUILD_ID) {
      const guild = readyClient.guilds.cache.get(process.env.GUILD_ID);
      if (guild) {
        await guild.commands.set(commandsData);
        console.log(`Registered ${commandsData.length} commands to guild ${guild.name}`);
      }
    } else {
      await readyClient.application?.commands.set(commandsData);
      console.log(`Registered ${commandsData.length} commands globally`);
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error: any) {
    // Silently handle interaction expiration - this is expected and can't be prevented
    if (error.code === 10062) {
      return; // Interaction expired, nothing we can do
    }
    
    // Don't try to respond if interaction is already handled
    if (interaction.replied || interaction.deferred) {
      return;
    }
    
    // Log other errors
    console.error(`Error executing ${interaction.commandName}:`, error);

    try {
      const reply = {
        content: 'There was an error while executing this command!',
        flags: 64, // Ephemeral flag
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (replyError: any) {
      // Ignore interaction expired errors
      if (replyError.code !== 10062) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
});

// Handle unhandled promise rejections (especially interaction timeouts)
process.on('unhandledRejection', (error: any) => {
  // Silently ignore interaction expiration errors (10062) - these are expected
  if (error?.code === 10062) {
    return;
  }
  // Log other unhandled rejections
  console.error('Unhandled promise rejection:', error);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

// Graceful shutdown handler for Render
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new requests
  serverInstance.close(() => {
    console.log('HTTP server closed');
  });
  
  // Destroy Discord client
  if (client.isReady()) {
    try {
      client.destroy();
      console.log('Discord client destroyed');
    } catch (error) {
      console.error('Error destroying Discord client:', error);
    }
  }
  
  // Give it a moment to finish cleanup, then exit
  setTimeout(() => {
    console.log('Graceful shutdown complete');
    process.exit(0);
  }, 5000);
}

// Handle termination signals (Render sends SIGTERM)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Log startup
console.log('Starting Discord bot...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

// Login to Discord
client.login(token).catch((error) => {
  console.error('Failed to login to Discord:', error);
  process.exit(1);
});

