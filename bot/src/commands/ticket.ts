import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
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
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('info').setDescription('Get information about this ticket')
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      await handleCreate(interaction);
      break;
    case 'close':
      await handleClose(interaction);
      break;
    case 'info':
      await handleInfo(interaction);
      break;
    default:
      await interaction.reply({
        content: 'Unknown subcommand.',
        ephemeral: true,
      });
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  if (interaction.channel?.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: '❌ This command can only be used in text channels.',
      ephemeral: true,
    });
  }

  const description = interaction.options.getString('description');
  const channelId = interaction.channel.id;
  const messageId = interaction.id;

  await interaction.deferReply();

  try {
    const response = await botAPI.createTicket(channelId, messageId);

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Created')
      .setDescription(description || 'A new support ticket has been opened.')
      .setColor(0x00FF00)
      .addFields(
        { name: 'Ticket ID', value: `#${response.data.ticket_id}`, inline: true },
        { name: 'Status', value: 'Open', inline: true },
        { name: 'Created By', value: interaction.user.tag, inline: true }
      )
      .setFooter({ text: 'Atlanta High Staff System' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error: any) {
    console.error('Ticket create error:', error);
    
    let errorMessage = 'Failed to create ticket. Please try again later.';
    
    if (error.response?.status === 400) {
      if (error.response?.data?.error?.includes('already exists')) {
        errorMessage = '⚠️ A ticket already exists for this channel.';
      } else {
        errorMessage = `❌ ${error.response?.data?.error || 'Invalid request'}`;
      }
    } else if (error.response?.status === 401) {
      errorMessage = '❌ Bot authentication failed. Please contact an administrator.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorMessage = '❌ Could not connect to the server. Please try again later.';
    }

    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription(errorMessage)
      .setColor(0xFF0000)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleClose(interaction: ChatInputCommandInteraction) {
  if (interaction.channel?.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: '❌ This command can only be used in text channels.',
      ephemeral: true,
    });
  }

  // Check if user has permission to manage channels (staff)
  const member = interaction.member;
  const hasPermission = member && 'permissions' in member && 
    (member.permissions as any).has?.(PermissionFlagsBits.ManageChannels);

  await interaction.deferReply();

  try {
    // Verify user is staff
    const userResponse = await botAPI.getUser(interaction.user.id);
    
    if (!userResponse.data || userResponse.data.status !== 'active') {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Permission Denied')
        .setDescription('Only active staff members can close tickets.')
        .setColor(0xFF0000)
        .setTimestamp();
      
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Try to close the ticket
    try {
      await botAPI.closeTicket(interaction.channel.id);
      
      const embed = new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription('This ticket has been closed.')
        .setColor(0x808080)
        .addFields(
          { name: 'Closed By', value: interaction.user.tag, inline: true },
          { name: 'Time', value: new Date().toLocaleString(), inline: true }
        )
        .setFooter({ text: 'Atlanta High Staff System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (closeError: any) {
      if (closeError.response?.status === 404) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('⚠️ No Ticket Found')
          .setDescription('No ticket is associated with this channel.')
          .setColor(0xFFAA00)
          .setTimestamp();
        
        return interaction.editReply({ embeds: [errorEmbed] });
      }
      throw closeError;
    }
  } catch (error: any) {
    console.error('Ticket close error:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription('Failed to close ticket. Please try again or use the web dashboard.')
      .setColor(0xFF0000)
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function handleInfo(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle('🎫 Ticket System Information')
    .setDescription('The Atlanta High ticket system helps manage support requests.')
    .setColor(0x3498db)
    .addFields(
      { name: '/ticket create', value: 'Create a new support ticket in the current channel', inline: false },
      { name: '/ticket close', value: 'Close the ticket (staff only)', inline: false },
      { name: '/ticket info', value: 'Show this information', inline: false },
      { name: 'Web Dashboard', value: 'You can also manage tickets through the staff dashboard for more options.', inline: false }
    )
    .setFooter({ text: 'Atlanta High Staff System' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

