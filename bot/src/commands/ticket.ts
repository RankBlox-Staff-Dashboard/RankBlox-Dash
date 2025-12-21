import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType } from 'discord.js';
import { botAPI } from '../services/api';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Manage support tickets')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create a new support ticket')
      .addStringOption((option) =>
        option
          .setName('description')
          .setDescription('Description of the issue')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('close').setDescription('Close the current ticket channel')
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create') {
    await handleCreate(interaction);
  } else if (subcommand === 'close') {
    await handleClose(interaction);
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  if (interaction.channel?.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'This command can only be used in text channels.',
      ephemeral: true,
    });
  }

  const description = interaction.options.getString('description');
  const channelId = interaction.channel.id;
  const messageId = interaction.id;

  await interaction.deferReply();

  try {
    await botAPI.createTicket(channelId, messageId);

    await interaction.editReply({
      content: description
        ? `Ticket created: ${description}`
        : 'Ticket created successfully. Staff will assist you shortly.',
    });
  } catch (error: any) {
    console.error('Ticket create error:', error);
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      await interaction.editReply({
        content: 'A ticket already exists for this channel.',
      });
    } else {
      await interaction.editReply({
        content: 'Failed to create ticket. Please try again later.',
      });
    }
  }
}

async function handleClose(interaction: ChatInputCommandInteraction) {
  if (interaction.channel?.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'This command can only be used in text channels.',
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: 'Ticket closing functionality should be implemented through the web dashboard.',
    ephemeral: true,
  });
}

