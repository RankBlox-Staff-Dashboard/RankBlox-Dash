import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botAPI } from '../services/api';
import { isImmuneRank } from '../utils/immunity';

export const data = new SlashCommandBuilder()
  .setName('inactive-staff')
  .setDescription('List all staff members who haven\'t completed their quota');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Check if interaction is already replied/deferred
  if (interaction.replied || interaction.deferred) {
    return;
  }

  try {
    await interaction.deferReply({ flags: 64 }); // Ephemeral flag
  } catch (error: any) {
    // If defer fails, interaction might be expired
    if (error.code === 10062) {
      console.error('Interaction expired before defer:', error);
      return;
    }
    throw error;
  }

  try {
    // Get all staff with quota information
    const response = await botAPI.getStaffQuota();
    const allStaff = response.data as Array<{
      id: number;
      discord_id: string;
      discord_username: string;
      roblox_username: string | null;
      rank: number | null;
      rank_name: string | null;
      status: string;
      messages_sent: number;
      messages_quota: number;
      quota_met: boolean;
      quota_percentage: number;
    }>;

    if (!allStaff || allStaff.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('📊 Inactive Staff')
        .setDescription('No staff members found in the database.')
        .setColor(0xFFAA00)
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        if (err.code !== 10062) {
          console.error('Error editing reply (no staff):', err);
        }
      }
      return;
    }

    // Filter for staff who haven't met quota, excluding immune ranks
    const inactiveStaff = allStaff.filter((staff) => {
      // Exclude immune ranks (254-255) as they don't need to meet quota
      if (isImmuneRank(staff.rank)) {
        return false;
      }
      // Include staff who haven't met their quota
      return !staff.quota_met;
    });

    if (inactiveStaff.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('✅ All Staff Active')
        .setDescription('All staff members have completed their quota for this week!')
        .setColor(0x00FF00)
        .setTimestamp();
      
      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        if (err.code !== 10062) {
          console.error('Error editing reply (all active):', err);
        }
      }
      return;
    }

    // Sort by quota percentage (lowest first) and then by rank
    inactiveStaff.sort((a, b) => {
      if (a.quota_percentage !== b.quota_percentage) {
        return a.quota_percentage - b.quota_percentage;
      }
      return (b.rank || 0) - (a.rank || 0);
    });

    // Build embed with inactive staff list
    // Discord embeds have a limit of 25 fields, so we'll split into multiple embeds if needed
    const embed = new EmbedBuilder()
      .setTitle('📊 Inactive Staff Report')
      .setDescription(`Found **${inactiveStaff.length}** staff member${inactiveStaff.length === 1 ? '' : 's'} who haven't completed their quota this week.`)
      .setColor(0xFF0000)
      .setFooter({ text: 'Quota: 150 messages per week' })
      .setTimestamp();

    // Add fields for each inactive staff member (max 25 fields per embed)
    const maxFields = 25;
    const staffToShow = inactiveStaff.slice(0, maxFields);
    
    for (const staff of staffToShow) {
      const displayName = staff.roblox_username || staff.discord_username;
      const rankDisplay = staff.rank_name || `Rank ${staff.rank || 'N/A'}`;
      const progress = `${staff.messages_sent}/${staff.messages_quota} (${staff.quota_percentage}%)`;
      
      embed.addFields({
        name: `${displayName} - ${rankDisplay}`,
        value: `Messages: ${progress}`,
        inline: true,
      });
    }

    // If there are more than 25 inactive staff, add a note
    if (inactiveStaff.length > maxFields) {
      embed.addFields({
        name: '⚠️ Note',
        value: `Showing first ${maxFields} of ${inactiveStaff.length} inactive staff members.`,
        inline: false,
      });
    }

    try {
      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      if (err.code !== 10062) {
        console.error('Error editing reply (inactive staff):', err);
      }
    }
  } catch (error: any) {
    console.error('Inactive-staff command error:', error);
    
    // Don't try to respond if interaction is expired
    if (error.code === 10062) {
      return;
    }
    
    let errorMessage = 'An error occurred while fetching inactive staff. Please try again later.';
    
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
      // Don't rethrow - we've handled the error
    }
  }
}


