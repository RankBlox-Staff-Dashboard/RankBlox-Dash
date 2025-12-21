import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botAPI } from '../services/api';
import axios from 'axios';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View your staff statistics');

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Get user from backend
    const userResponse = await botAPI.getUser(discordId);

    if (!userResponse.data || userResponse.data.status !== 'active') {
      return interaction.editReply({
        content: 'You are not an active staff member.',
      });
    }

    // Get stats (would need to add this endpoint or use existing)
    // For now, we'll just show user info
    const embed = new EmbedBuilder()
      .setTitle('Staff Statistics')
      .setDescription(`Stats for ${userResponse.data.discord_username}`)
      .addFields(
        { name: 'Roblox Username', value: userResponse.data.roblox_username || 'N/A', inline: true },
        { name: 'Rank', value: userResponse.data.rank?.toString() || 'N/A', inline: true },
        { name: 'Status', value: userResponse.data.status, inline: true }
      )
      .setColor(0x3498db)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Stats command error:', error);
    await interaction.editReply({
      content: 'An error occurred while fetching stats. Please try again later.',
    });
  }
}

