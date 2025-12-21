import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { botAPI } from '../services/api';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Verify your Roblox account with an emoji code')
  .addStringOption((option) =>
    option
      .setName('emoji_code')
      .setDescription('The emoji code from the verification page')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const emojiCode = interaction.options.getString('emoji_code', true);
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    // Get user from backend
    const userResponse = await botAPI.getUser(discordId);

    if (!userResponse.data) {
      return interaction.editReply({
        content: 'User not found. Please log in through the web dashboard first.',
      });
    }

    // Note: The actual verification logic is handled through the web interface
    // This command just provides feedback
    await interaction.editReply({
      content: `Verification codes must be verified through the web dashboard. Please go to the staff dashboard and complete the verification process there. Your emoji code is: ${emojiCode}`,
    });
  } catch (error: any) {
    console.error('Verify command error:', error);
    await interaction.editReply({
      content: 'An error occurred while verifying. Please try again later.',
    });
  }
}

