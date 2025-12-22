import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botAPI } from '../services/api';
import { isImmuneRank } from '../utils/immunity';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Get information about verifying your Roblox account');

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user exists in the system
    let userExists = false;
    let isVerified = false;

    try {
      const userResponse = await botAPI.getUser(discordId);
      if (userResponse.data) {
        userExists = true;
        // Immune ranks (254-255) are always considered verified regardless of status
        const hasImmuneRank = isImmuneRank(userResponse.data.rank);
        isVerified = !!userResponse.data.roblox_username && (userResponse.data.status === 'active' || hasImmuneRank);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        throw err;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔐 Roblox Verification')
      .setColor(isVerified ? 0x00FF00 : 0x3498db)
      .setTimestamp();

    if (isVerified) {
      embed.setDescription('✅ Your account is already verified!')
        .addFields(
          { name: 'Status', value: 'Verified & Active', inline: true },
          { name: 'Next Steps', value: 'You can access all staff features through the dashboard.', inline: false }
        );
    } else if (userExists) {
      embed.setDescription('Your Discord account is linked, but Roblox verification is pending.')
        .addFields(
          { name: 'How to Verify', value: '1. Go to the staff dashboard\n2. Click "Get Verification Code"\n3. Add the emoji code to your Roblox bio\n4. Enter your Roblox username and verify', inline: false },
          { name: 'Dashboard', value: 'Visit the Atlanta High staff dashboard to complete verification.', inline: false }
        );
    } else {
      embed.setDescription('You need to log in through the web dashboard first.')
        .addFields(
          { name: 'How to Start', value: '1. Visit the Atlanta High staff dashboard\n2. Click "Authorize Securely"\n3. Log in with Discord\n4. Complete Roblox verification', inline: false }
        );
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Verify command error:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('An error occurred while processing your request. Please try again later.')
      .setColor(0xFF0000)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

