import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { 
  sendInfractionDM, 
  InfractionData,
  sendPromotionDM,
  PromotionData,
  sendDemotionDM,
  DemotionData,
  sendTerminationDMAndKick,
  TerminationData,
  sendLOANotificationDM,
  LOANotificationData
} from './services/notifications';
import { botAPI } from './services/api';

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
// Parse the environment variable to a number, defaulting to 3001
const PORT = parseInt(process.env.PORT || '3001', 10);
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

  // Promotion notification endpoint
  if (req.url === '/notify-promotion' && req.method === 'POST') {
    if (!verifyBotToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req) as PromotionData;

      if (!body.discord_id || !body.promoted_by) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: discord_id, promoted_by' }));
        return;
      }

      const result = await sendPromotionDM(client, body);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: result.success,
        dm_sent: result.success,
        error: result.error || null,
      }));
    } catch (error: any) {
      console.error('Error processing promotion notification:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Demotion notification endpoint
  if (req.url === '/notify-demotion' && req.method === 'POST') {
    if (!verifyBotToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req) as DemotionData;

      if (!body.discord_id || !body.demoted_by) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: discord_id, demoted_by' }));
        return;
      }

      const result = await sendDemotionDM(client, body);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: result.success,
        dm_sent: result.success,
        error: result.error || null,
      }));
    } catch (error: any) {
      console.error('Error processing demotion notification:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Termination notification endpoint (includes kick)
  if (req.url === '/notify-termination' && req.method === 'POST') {
    if (!verifyBotToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req) as TerminationData & { guild_id?: string };

      if (!body.discord_id || !body.terminated_by) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: discord_id, terminated_by' }));
        return;
      }

      const guildId = body.guild_id || process.env.GUILD_ID;
      if (!guildId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GUILD_ID not configured and not provided in request' }));
        return;
      }

      const result = await sendTerminationDMAndKick(client, {
        discord_id: body.discord_id,
        terminated_by: body.terminated_by,
        reason: body.reason,
      }, guildId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: result.success,
        dm_sent: result.success || false,
        kicked: result.kicked,
        error: result.error || null,
      }));
    } catch (error: any) {
      console.error('Error processing termination notification:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // LOA notification endpoint
  if (req.url === '/notify-loa' && req.method === 'POST') {
    if (!verifyBotToken(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req) as LOANotificationData;

      if (!body.discord_id || !body.status || !body.reviewed_by) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required fields: discord_id, status, reviewed_by' }));
        return;
      }

      if (!['approved', 'denied'].includes(body.status)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid status. Must be approved or denied.' }));
        return;
      }

      const result = await sendLOANotificationDM(client, body);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: result.success,
        dm_sent: result.success,
        error: result.error || null,
      }));
    } catch (error: any) {
      console.error('Error processing LOA notification:', error);
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

try {
  const commandsPath = join(__dirname, 'commands');
  console.log(`[Startup] Loading commands from: ${commandsPath}`);
  
  if (!require('fs').existsSync(commandsPath)) {
    console.error(`[Startup] ERROR: Commands directory not found: ${commandsPath}`);
    console.error(`[Startup] Make sure TypeScript has been compiled. Run: npm run build`);
    process.exit(1);
  }
  
  const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
  console.log(`[Startup] Found ${commandFiles.length} command file(s)`);
  
  for (const file of commandFiles) {
    try {
      const filePath = join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.set(command.data.name, command);
        console.log(`[Startup] Loaded command: ${command.data.name}`);
      } else {
        console.warn(`[Startup] WARNING: The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    } catch (error: any) {
      console.error(`[Startup] Error loading command ${file}:`, error.message);
    }
  }
} catch (error: any) {
  console.error('[Startup] Failed to load commands:', error.message);
  process.exit(1);
}

// Load events
try {
  const eventsPath = join(__dirname, 'events');
  console.log(`[Startup] Loading events from: ${eventsPath}`);
  
  if (!require('fs').existsSync(eventsPath)) {
    console.error(`[Startup] ERROR: Events directory not found: ${eventsPath}`);
    console.error(`[Startup] Make sure TypeScript has been compiled. Run: npm run build`);
    process.exit(1);
  }
  
  const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
  console.log(`[Startup] Found ${eventFiles.length} event file(s)`);
  
  for (const file of eventFiles) {
    try {
      const filePath = join(eventsPath, file);
      const event = require(filePath);
      if (event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`[Startup] Loaded event: ${event.name} (${event.once ? 'once' : 'on'})`);
      } else {
        console.warn(`[Startup] WARNING: Event at ${filePath} is missing "name" or "execute" property.`);
      }
    } catch (error: any) {
      console.error(`[Startup] Error loading event ${file}:`, error.message);
    }
  }
} catch (error: any) {
  console.error('[Startup] Failed to load events:', error.message);
  process.exit(1);
}

// Register slash commands
client.once(Events.ClientReady, async (readyClient) => {
  console.log('========================================');
  console.log('✅ Discord bot is ready!');
  console.log(`🤖 Logged in as: ${readyClient.user.tag}`);
  console.log(`🆔 Bot ID: ${readyClient.user.id}`);
  console.log(`📊 Guilds: ${readyClient.guilds.cache.size}`);
  console.log('========================================');

  // Register commands
  try {
    const commandsData = Array.from(commands.values()).map((cmd) => cmd.data.toJSON());
    
    if (commandsData.length === 0) {
      console.warn('[Startup] WARNING: No commands to register!');
    } else {
      // Register globally (can take up to an hour to propagate)
      // For faster testing, use guild commands instead
      if (process.env.GUILD_ID) {
        const guild = readyClient.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
          await guild.commands.set(commandsData);
          console.log(`[Commands] Registered ${commandsData.length} commands to guild: ${guild.name}`);
        } else {
          console.warn(`[Commands] WARNING: Guild ${process.env.GUILD_ID} not found. Registering globally instead.`);
          await readyClient.application?.commands.set(commandsData);
          console.log(`[Commands] Registered ${commandsData.length} commands globally`);
        }
      } else {
        await readyClient.application?.commands.set(commandsData);
        console.log(`[Commands] Registered ${commandsData.length} commands globally`);
      }
    }
  } catch (error: any) {
    console.error('[Commands] Error registering commands:', error.message || error);
  }

  // Sync existing ticket channels on startup
  try {
    console.log('[TicketSync] Starting ticket channel sync...');
    const TICKET_CATEGORIES = ['980275354704953415', '993210302185345124'];
    
    // Ensure botAPI is available
    if (!botAPI) {
      console.error('[TicketSync] ERROR: botAPI is not available');
      return;
    }
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const guild of readyClient.guilds.cache.values()) {
      try {
        // Fetch all channels to ensure cache is populated
        await guild.channels.fetch();
        
        for (const channel of guild.channels.cache.values()) {
          if (channel.isTextBased() && !channel.isDMBased()) {
            const textChannel = channel as any;
            if (textChannel.parentId && TICKET_CATEGORIES.includes(textChannel.parentId)) {
              try {
                await botAPI.createTicket(textChannel.id, undefined);
                syncedCount++;
              } catch (error: any) {
                // Ignore "already exists" errors
                if (error.response?.status !== 400 || !error.response?.data?.error?.includes('already exists')) {
                  console.error(`[TicketSync] Error syncing channel ${textChannel.id}:`, error.message);
                  errorCount++;
                }
              }
            }
          }
        }
      } catch (guildError: any) {
        console.error(`[TicketSync] Error processing guild ${guild.name}:`, guildError.message);
        errorCount++;
      }
    }
    
    if (syncedCount > 0) {
      console.log(`[TicketSync] ✅ Synced ${syncedCount} existing ticket channels`);
    } else {
      console.log(`[TicketSync] No ticket channels found to sync`);
    }
    
    if (errorCount > 0) {
      console.warn(`[TicketSync] ⚠️  Encountered ${errorCount} error(s) during sync`);
    }
  } catch (error: any) {
    console.error('[TicketSync] ❌ Error during startup sync:', error.message || error);
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
console.log('========================================');
console.log('🚀 Starting Discord bot...');
console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`📁 Commands loaded: ${commands.size}`);
console.log('========================================');

// Validate token before attempting login
if (!token || token.trim().length === 0) {
  console.error('========================================');
  console.error('❌ DISCORD_BOT_TOKEN is not set or is empty!');
  console.error('========================================');
  process.exit(1);
}

// Login to Discord
console.log('[Startup] Attempting to connect to Discord...');
client.login(token)
  .then(() => {
    console.log('[Startup] ✅ Login successful, waiting for ready event...');
  })
  .catch((error: any) => {
    console.error('========================================');
    console.error('❌ Failed to login to Discord:');
    console.error(`   Error: ${error.message || error}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    console.error('========================================');
    console.error('Common issues:');
    console.error('  - Invalid bot token');
    console.error('  - Bot not added to server');
    console.error('  - Network connectivity issues');
    console.error('========================================');
    process.exit(1);
  });

