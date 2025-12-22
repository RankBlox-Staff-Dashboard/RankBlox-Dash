import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botAPI } from '../services/api';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View your staff statistics')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('View another staff member\'s stats (admin only)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user');
  const discordId = targetUser?.id || interaction.user.id;
  const isSelfLookup = !targetUser || targetUser.id === interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Get user from backend
    let userData: any;
    try {
      const userResponse = await botAPI.getUser(discordId);
      userData = userResponse.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const embed = new EmbedBuilder()
          .setTitle('❌ User Not Found')
          .setDescription(isSelfLookup 
            ? 'You are not registered in the staff system. Please log in through the web dashboard first.'
            : 'This user is not registered in the staff system.')
          .setColor(0xFF0000)
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }
      throw err;
    }

    if (!userData) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Could not fetch user data.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      return interaction.editReply({ embeds: [embed] });
    }

    // Build status color
    let statusColor = 0x808080; // Gray for inactive
    let statusEmoji = '⚪';
    
    if (userData.status === 'active') {
      statusColor = 0x00FF00; // Green
      statusEmoji = '🟢';
    } else if (userData.status === 'pending_verification') {
      statusColor = 0xFFAA00; // Orange
      statusEmoji = '🟡';
    }

    // Build rank badge
    let rankBadge = '👤';
    if (userData.rank) {
      if (userData.rank >= 24 && userData.rank <= 255) {
        rankBadge = '👑'; // Admin
      } else if (userData.rank >= 8) {
        rankBadge = '⭐'; // Senior
      } else if (userData.rank >= 4) {
        rankBadge = '🔷'; // Moderator
      }
    }

    // Get Roblox avatar using the official Thumbnails API
    let thumbnailUrl = null;
    if (userData.roblox_id) {
      try {
        const avatarResponse = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.roblox_id}&size=150x150&format=Png&isCircular=false`
        );
        if (avatarResponse.ok) {
          const avatarData = await avatarResponse.json();
          if (avatarData.data && avatarData.data.length > 0 && avatarData.data[0].imageUrl) {
            thumbnailUrl = avatarData.data[0].imageUrl;
          }
        }
      } catch (err) {
        console.error('Error fetching Roblox avatar:', err);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`${rankBadge} Staff Profile`)
      .setDescription(`${statusEmoji} **${userData.roblox_username || userData.discord_username}**`)
      .setColor(statusColor)
      .addFields(
        { name: '📛 Discord', value: userData.discord_username || 'N/A', inline: true },
        { name: '🎮 Roblox', value: userData.roblox_username || 'Not Verified', inline: true },
        { name: '📊 Rank', value: userData.rank_name || `Rank ${userData.rank || 'N/A'}`, inline: true },
        { name: '📋 Status', value: userData.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), inline: true }
      )
      .setFooter({ text: 'Atlanta High Staff System' })
      .setTimestamp();

    if (thumbnailUrl) {
      embed.setThumbnail(thumbnailUrl);
    }

    // Add message about viewing full stats
    embed.addFields({
      name: '📈 Full Statistics',
      value: 'Visit the web dashboard to view complete statistics including message quota, tickets, and infractions.',
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Stats command error:', error);
    
    let errorMessage = 'An error occurred while fetching stats. Please try again later.';
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Could not connect to the server. Please try again later.';
    }

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription(errorMessage)
      .setColor(0xFF0000)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

