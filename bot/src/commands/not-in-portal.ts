import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, GuildMember } from 'discord.js';
import { botAPI } from '../services/api';

export const data = new SlashCommandBuilder()
  .setName('not-in-portal')
  .setDescription('List Discord server members who are not in the staff portal');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Defer immediately to prevent interaction timeout (must respond within 3 seconds)
  try {
    await interaction.deferReply({ flags: 64 }); // Ephemeral flag
  } catch (error: any) {
    // If defer fails (e.g., interaction expired), just return silently
    if (error.code === 10062) {
      return; // Interaction expired, nothing we can do
    }
    console.error('Error deferring reply:', error);
    return;
  }

  try {
    // Get the guild
    const guild = interaction.guild;
    if (!guild) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('This command can only be used in a server.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (err: any) {
        if (err.code !== 10062) {
          console.error('Error editing reply:', err);
        }
      }
      return;
    }

    // Fetch all Discord members (this may take a moment for large servers)
    await guild.members.fetch(); // Fetches all members and populates cache
    
    const discordMembers = guild.members.cache
      .filter((member: GuildMember) => !member.user.bot) // Filter out bots
      .map((member: GuildMember) => ({
        discord_id: member.user.id,
        discord_username: member.user.username,
        discord_display_name: member.displayName,
      }));

    // Get all users from the staff portal via API (all users, not just staff)
    let portalUsers: Array<{ discord_id: string; discord_username: string }> = [];
    
    try {
      const response = await botAPI.getAllUsers();
      portalUsers = response.data as Array<{
        discord_id: string;
        discord_username: string;
      }>;
    } catch (apiError: any) {
      console.error('Error fetching portal users:', apiError);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to fetch users from the staff portal. Please try again later.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (err: any) {
        if (err.code !== 10062) {
          console.error('Error editing reply:', err);
        }
      }
      return;
    }

    // Create a set of Discord IDs from portal users for fast lookup
    const portalDiscordIds = new Set(portalUsers.map(user => user.discord_id));

    // Find members who are in Discord but not in the portal
    type MemberInfo = {
      discord_id: string;
      discord_username: string;
      discord_display_name: string;
    };
    
    const notInPortal = discordMembers
      .filter((member: MemberInfo) => !portalDiscordIds.has(member.discord_id))
      .map((member: MemberInfo) => ({
        discord_id: member.discord_id,
        discord_username: member.discord_username,
        discord_display_name: member.discord_display_name,
      }))
      .sort((a: MemberInfo, b: MemberInfo) => a.discord_username.localeCompare(b.discord_username)); // Sort alphabetically

    if (notInPortal.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('✅ All Members in Portal')
        .setDescription('All Discord server members are registered in the staff portal!')
        .setColor(0x00FF00)
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        if (err.code !== 10062) {
          console.error('Error editing reply (all in portal):', err);
        }
      }
      return;
    }

    // Build embed with members not in portal
    // Discord embeds have a limit of 25 fields and 4096 characters in description
    const embed = new EmbedBuilder()
      .setTitle('📋 Members Not in Staff Portal')
      .setDescription(`Found **${notInPortal.length}** member${notInPortal.length === 1 ? '' : 's'} in the Discord server who ${notInPortal.length === 1 ? 'is' : 'are'} not registered in the staff portal.`)
      .setColor(0xFFAA00)
      .setFooter({ text: `Total Discord members: ${discordMembers.length} | Portal users: ${portalUsers.length}` })
      .setTimestamp();

    // Add fields for each member (max 25 fields per embed)
    const maxFields = 25;
    const membersToShow = notInPortal.slice(0, maxFields);
    
    for (const member of membersToShow) {
      const displayName = member.discord_display_name !== member.discord_username 
        ? `${member.discord_display_name} (${member.discord_username})`
        : member.discord_username;
      
      embed.addFields({
        name: displayName,
        value: `ID: ${member.discord_id}`,
        inline: true,
      });
    }

    // If there are more than 25 members, add a note
    if (notInPortal.length > maxFields) {
      embed.addFields({
        name: '⚠️ Note',
        value: `Showing first ${maxFields} of ${notInPortal.length} members.`,
        inline: false,
      });
    }

    try {
      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      if (err.code !== 10062) {
        console.error('Error editing reply (not in portal):', err);
      }
    }
  } catch (error: any) {
    console.error('not-in-portal command error:', error);
    
    // Don't try to respond if interaction is expired
    if (error.code === 10062) {
      return;
    }
    
    let errorMessage = 'An error occurred while fetching members. Please try again later.';
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Could not connect to the server. Please try again later.';
    } else if (error.response?.status === 404) {
      errorMessage = 'The backend endpoint is not available. Please contact an administrator.';
    } else if (error.response?.status) {
      errorMessage = `Backend error (${error.response.status}). Please try again later.`;
    }

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription(errorMessage)
      .setColor(0xFF0000)
      .setTimestamp();

    try {
      await interaction.editReply({ embeds: [errorEmbed] });
    } catch (err: any) {
      // Ignore interaction expired errors - don't log or throw
      if (err.code !== 10062) {
        console.error('Error sending error embed:', err);
      }
    }
  }
}

