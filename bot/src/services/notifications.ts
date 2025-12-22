import { Client, EmbedBuilder } from 'discord.js';

export interface InfractionData {
  discord_id: string;
  type: 'warning' | 'strike';
  reason: string;
  issued_by: string;
  issued_at: string;
}

/**
 * Send a DM notification to a user about an infraction
 */
export async function sendInfractionDM(
  client: Client,
  data: InfractionData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch the user from Discord
    const user = await client.users.fetch(data.discord_id);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Build the infraction embed
    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Staff Infraction Received`)
      .setColor(data.type === 'strike' ? 0xFF0000 : 0xFFAA00)
      .setDescription(
        `You have received a ${data.type === 'strike' ? '**Strike**' : '**Warning**'} on the Atlanta High staff team.`
      )
      .addFields(
        { name: '📋 Type', value: data.type.charAt(0).toUpperCase() + data.type.slice(1), inline: true },
        { name: '👤 Issued By', value: data.issued_by, inline: true },
        { name: '📅 Date', value: new Date(data.issued_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }), inline: true },
        { name: '📝 Reason', value: data.reason, inline: false }
      )
      .setFooter({ text: 'Atlanta High Staff System' })
      .setTimestamp();

    if (data.type === 'strike') {
      embed.addFields({
        name: '⚠️ Important',
        value: 'Strikes are serious infractions. Please review the staff guidelines and contact management if you have questions.',
        inline: false
      });
    }

    // Attempt to send the DM
    await user.send({ embeds: [embed] });
    
    console.log(`[Notification] Successfully sent infraction DM to ${user.tag} (${data.discord_id})`);
    return { success: true };

  } catch (error: any) {
    // Handle common Discord errors
    if (error.code === 50007) {
      // Cannot send messages to this user (DMs disabled)
      console.log(`[Notification] Cannot DM user ${data.discord_id} - DMs are closed`);
      return { success: false, error: 'User has DMs disabled' };
    }
    
    if (error.code === 10013) {
      // Unknown User
      console.log(`[Notification] Unknown user ${data.discord_id}`);
      return { success: false, error: 'Unknown user' };
    }

    console.error(`[Notification] Failed to send DM to ${data.discord_id}:`, error);
    return { success: false, error: error.message || 'Failed to send DM' };
  }
}
