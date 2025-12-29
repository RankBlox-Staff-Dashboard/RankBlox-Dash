import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder,
  GuildMember
} from 'discord.js';

// Rate limiting constants
const BATCH_SIZE = 5; // Send 5 DMs per batch
const DELAY_BETWEEN_BATCHES_MS = 1000; // 1 second delay between batches
const DELAY_BETWEEN_DMS_MS = 200; // 200ms delay between individual DMs in a batch

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a DM to a single user with error handling
 */
async function sendDMToUser(
  member: GuildMember,
  message: string
): Promise<{ success: boolean; userId: string; username: string; error?: string }> {
  try {
    // Skip bots
    if (member.user.bot) {
      return { 
        success: false, 
        userId: member.user.id, 
        username: member.user.tag,
        error: 'Bot user skipped' 
      };
    }

    // Attempt to send DM
    await member.user.send(message);
    
    console.log(`[DM Command] Successfully sent DM to ${member.user.tag} (${member.user.id})`);
    return { 
      success: true, 
      userId: member.user.id, 
      username: member.user.tag 
    };
  } catch (error: any) {
    // Handle common Discord errors
    if (error.code === 50007) {
      // Cannot send messages to this user (DMs disabled)
      console.log(`[DM Command] Cannot DM user ${member.user.tag} (${member.user.id}) - DMs are closed`);
      return { 
        success: false, 
        userId: member.user.id, 
        username: member.user.tag,
        error: 'DMs disabled' 
      };
    }
    
    if (error.code === 10013) {
      // Unknown User
      console.log(`[DM Command] Unknown user ${member.user.id}`);
      return { 
        success: false, 
        userId: member.user.id, 
        username: member.user.tag,
        error: 'Unknown user' 
      };
    }

    // Log other errors but don't crash
    console.error(`[DM Command] Failed to send DM to ${member.user.tag} (${member.user.id}):`, error.message);
    return { 
      success: false, 
      userId: member.user.id, 
      username: member.user.tag,
      error: error.message || 'Failed to send DM' 
    };
  }
}

/**
 * Process a batch of members and send DMs with rate limiting
 */
async function processBatch(
  members: GuildMember[],
  message: string,
  batchNumber: number,
  totalBatches: number
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const member of members) {
    const result = await sendDMToUser(member, message);
    
    if (result.success) {
      sent++;
    } else if (result.error === 'Bot user skipped') {
      skipped++;
    } else {
      failed++;
    }

    // Small delay between individual DMs in a batch
    if (members.indexOf(member) < members.length - 1) {
      await sleep(DELAY_BETWEEN_DMS_MS);
    }
  }

  console.log(`[DM Command] Batch ${batchNumber}/${totalBatches} completed: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  
  return { sent, failed, skipped };
}

export const data = new SlashCommandBuilder()
  .setName('dm')
  .setDescription('Send a direct message to all members in the server (Server Owner Only)')
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('The message to send to all members')
      .setRequired(true)
      .setMaxLength(2000) // Discord message limit
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Defer reply immediately (ephemeral)
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if interaction is in a guild
    if (!interaction.guild) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('This command can only be used in a server.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const guild = interaction.guild;
    const userId = interaction.user.id;

    // STRICT server owner check - compare user ID with guild owner ID
    if (guild.ownerId !== userId) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Permission Denied')
        .setDescription('Only the server owner can use this command.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      console.log(`[DM Command] Permission denied: User ${interaction.user.tag} (${userId}) attempted to use /dm command. Server owner is ${guild.ownerId}`);
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const message = interaction.options.getString('message', true);

    // Send initial status
    const initialEmbed = new EmbedBuilder()
      .setTitle('📨 Mass DM Started')
      .setDescription('Fetching server members...')
      .setColor(0x3498db)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [initialEmbed] });

    // Fetch all members (this may take a moment for large servers)
    console.log(`[DM Command] Fetching all members for guild ${guild.name} (${guild.id})`);
    await guild.members.fetch();

    // Filter out bots and get all members
    const allMembers = Array.from(
      guild.members.cache
        .filter(member => !member.user.bot)
        .values()
    );

    const totalMembers = allMembers.length;

    if (totalMembers === 0) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('No members found to send DMs to.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Split members into batches
    const batches: GuildMember[][] = [];
    for (let i = 0; i < allMembers.length; i += BATCH_SIZE) {
      batches.push(allMembers.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = batches.length;
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    console.log(`[DM Command] Starting mass DM to ${totalMembers} members in ${totalBatches} batches`);

    // Process batches with rate limiting
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      // Update progress
      const progressEmbed = new EmbedBuilder()
        .setTitle('📨 Mass DM In Progress')
        .setDescription(`Processing batch ${batchNumber}/${totalBatches}...`)
        .addFields(
          { name: 'Total Members', value: totalMembers.toString(), inline: true },
          { name: 'Batches', value: `${batchNumber}/${totalBatches}`, inline: true },
          { name: 'Sent', value: totalSent.toString(), inline: true },
          { name: 'Failed', value: totalFailed.toString(), inline: true },
          { name: 'Skipped', value: totalSkipped.toString(), inline: true }
        )
        .setColor(0x3498db)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [progressEmbed] });

      // Process batch
      const batchResult = await processBatch(batch, message, batchNumber, totalBatches);
      
      totalSent += batchResult.sent;
      totalFailed += batchResult.failed;
      totalSkipped += batchResult.skipped;

      // Delay between batches (except for the last batch)
      if (i < batches.length - 1) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    // Send final status
    const finalEmbed = new EmbedBuilder()
      .setTitle('✅ Mass DM Completed')
      .setDescription('Finished sending DMs to all members.')
      .addFields(
        { name: 'Total Members', value: totalMembers.toString(), inline: true },
        { name: '✅ Successfully Sent', value: totalSent.toString(), inline: true },
        { name: '❌ Failed', value: totalFailed.toString(), inline: true },
        { name: '⏭️ Skipped (Bots)', value: totalSkipped.toString(), inline: true }
      )
      .setColor(totalFailed === 0 ? 0x00FF00 : 0xFFAA00)
      .setFooter({ text: 'Note: Some users may have DMs disabled' })
      .setTimestamp();

    console.log(`[DM Command] Mass DM completed: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped out of ${totalMembers} total members`);

    await interaction.editReply({ embeds: [finalEmbed] });

  } catch (error: any) {
    console.error('[DM Command] Error executing /dm command:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('An error occurred while processing the mass DM. Please check the logs for details.')
      .setColor(0xFF0000)
      .setTimestamp();

    try {
      await interaction.editReply({ embeds: [errorEmbed] });
    } catch (replyError: any) {
      // Ignore interaction expired errors
      if (replyError.code !== 10062) {
        console.error('[DM Command] Error sending error reply:', replyError);
      }
    }
  }
}
