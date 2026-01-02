import { Client, EmbedBuilder } from 'discord.js';

export interface InfractionData {
  discord_id: string;
  type: 'warning' | 'strike';
  reason: string;
  issued_by: string;
  issued_at: string;
}

export interface PromotionData {
  discord_id: string;
  old_rank: number | null;
  new_rank: number | null;
  old_rank_name: string | null;
  new_rank_name: string | null;
  promoted_by: string;
}

export interface DemotionData {
  discord_id: string;
  old_rank: number | null;
  new_rank: number | null;
  old_rank_name: string | null;
  new_rank_name: string | null;
  demoted_by: string;
}

export interface TerminationData {
  discord_id: string;
  terminated_by: string;
  reason?: string;
}

export interface LOANotificationData {
  discord_id: string;
  status: 'approved' | 'denied';
  start_date?: string;
  end_date?: string;
  review_notes?: string;
  reviewed_by: string;
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
        `You have received a ${data.type === 'strike' ? '**Strike**' : '**Warning**'} on the RankBlox staff team.`
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
      .setFooter({ text: 'RankBlox Staff System' })
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

/**
 * Send a DM notification to a user about a promotion
 */
export async function sendPromotionDM(
  client: Client,
  data: PromotionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await client.users.fetch(data.discord_id);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 Promotion Notice')
      .setColor(0x00FF00)
      .setDescription(
        `Congratulations! You have been **promoted** on the RankBlox staff team.`
      )
      .addFields(
        { 
          name: '📈 New Rank', 
          value: data.new_rank_name || `Rank ${data.new_rank}`, 
          inline: true 
        },
        { 
          name: '👤 Promoted By', 
          value: data.promoted_by, 
          inline: true 
        },
        { 
          name: '📅 Date', 
          value: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), 
          inline: true 
        }
      )
      .setFooter({ text: 'RankBlox Staff System' })
      .setTimestamp();

    if (data.old_rank_name) {
      embed.addFields({
        name: 'Previous Rank',
        value: data.old_rank_name,
        inline: false
      });
    }

    await user.send({ embeds: [embed] });
    
    console.log(`[Notification] Successfully sent promotion DM to ${user.tag} (${data.discord_id})`);
    return { success: true };

  } catch (error: any) {
    if (error.code === 50007) {
      console.log(`[Notification] Cannot DM user ${data.discord_id} - DMs are closed`);
      return { success: false, error: 'User has DMs disabled' };
    }
    
    if (error.code === 10013) {
      console.log(`[Notification] Unknown user ${data.discord_id}`);
      return { success: false, error: 'Unknown user' };
    }

    console.error(`[Notification] Failed to send promotion DM to ${data.discord_id}:`, error);
    return { success: false, error: error.message || 'Failed to send DM' };
  }
}

/**
 * Send a DM notification to a user about a demotion
 */
export async function sendDemotionDM(
  client: Client,
  data: DemotionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await client.users.fetch(data.discord_id);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Demotion Notice')
      .setColor(0xFFAA00)
      .setDescription(
        `You have been **demoted** on the RankBlox staff team.`
      )
      .addFields(
        { 
          name: '📉 New Rank', 
          value: data.new_rank_name || `Rank ${data.new_rank}`, 
          inline: true 
        },
        { 
          name: '👤 Demoted By', 
          value: data.demoted_by, 
          inline: true 
        },
        { 
          name: '📅 Date', 
          value: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), 
          inline: true 
        }
      )
      .setFooter({ text: 'RankBlox Staff System' })
      .setTimestamp();

    if (data.old_rank_name) {
      embed.addFields({
        name: 'Previous Rank',
        value: data.old_rank_name,
        inline: false
      });
    }

    await user.send({ embeds: [embed] });
    
    console.log(`[Notification] Successfully sent demotion DM to ${user.tag} (${data.discord_id})`);
    return { success: true };

  } catch (error: any) {
    if (error.code === 50007) {
      console.log(`[Notification] Cannot DM user ${data.discord_id} - DMs are closed`);
      return { success: false, error: 'User has DMs disabled' };
    }
    
    if (error.code === 10013) {
      console.log(`[Notification] Unknown user ${data.discord_id}`);
      return { success: false, error: 'Unknown user' };
    }

    console.error(`[Notification] Failed to send demotion DM to ${data.discord_id}:`, error);
    return { success: false, error: error.message || 'Failed to send DM' };
  }
}

/**
 * Send a DM notification to a user about termination and kick them from the server
 */
export async function sendTerminationDMAndKick(
  client: Client,
  data: TerminationData,
  guildId: string
): Promise<{ success: boolean; error?: string; kicked: boolean }> {
  try {
    const user = await client.users.fetch(data.discord_id);
    
    if (!user) {
      return { success: false, error: 'User not found', kicked: false };
    }

    // Build termination DM embed
    const embed = new EmbedBuilder()
      .setTitle('🚫 Termination Notice')
      .setColor(0xFF0000)
      .setDescription(
        `You have been **terminated** from the RankBlox staff team.`
      )
      .addFields(
        { 
          name: '👤 Terminated By', 
          value: data.terminated_by, 
          inline: true 
        },
        { 
          name: '📅 Date', 
          value: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), 
          inline: true 
        }
      )
      .setFooter({ text: 'RankBlox Staff System' })
      .setTimestamp();

    if (data.reason) {
      embed.addFields({
        name: '📝 Reason',
        value: data.reason,
        inline: false
      });
    }

    // Attempt to send DM before kicking (so they can receive it)
    let dmSent = false;
    try {
      await user.send({ embeds: [embed] });
      dmSent = true;
      console.log(`[Notification] Successfully sent termination DM to ${user.tag} (${data.discord_id})`);
    } catch (dmError: any) {
      if (dmError.code === 50007) {
        console.log(`[Notification] Cannot DM user ${data.discord_id} - DMs are closed`);
      } else {
        console.error(`[Notification] Failed to send termination DM to ${data.discord_id}:`, dmError);
      }
    }

    // Kick user from server
    let kicked = false;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return { success: dmSent, error: 'Guild not found', kicked: false };
      }

      const member = await guild.members.fetch(data.discord_id).catch(() => null);
      if (member) {
        await member.kick(`Terminated by ${data.terminated_by}${data.reason ? `: ${data.reason}` : ''}`);
        kicked = true;
        console.log(`[Notification] Successfully kicked ${user.tag} (${data.discord_id}) from server`);
      } else {
        console.log(`[Notification] User ${data.discord_id} is not a member of the server`);
      }
    } catch (kickError: any) {
      console.error(`[Notification] Failed to kick user ${data.discord_id}:`, kickError);
      // Continue even if kick fails
    }

    return { success: dmSent || kicked, error: dmSent ? undefined : 'Failed to send DM', kicked };
  } catch (error: any) {
    if (error.code === 10013) {
      console.log(`[Notification] Unknown user ${data.discord_id}`);
      return { success: false, error: 'Unknown user', kicked: false };
    }

    console.error(`[Notification] Failed to process termination for ${data.discord_id}:`, error);
    return { success: false, error: error.message || 'Failed to process termination', kicked: false };
  }
}

/**
 * Send a DM notification to a user about LOA request status
 */
export async function sendLOANotificationDM(
  client: Client,
  data: LOANotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await client.users.fetch(data.discord_id);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isApproved = data.status === 'approved';
    const embed = new EmbedBuilder()
      .setTitle(isApproved ? '✅ LOA Request Approved' : '❌ LOA Request Denied')
      .setColor(isApproved ? 0x00FF00 : 0xFF0000)
      .setDescription(
        `Your Leave of Absence (LOA) request has been **${data.status}**.`
      )
      .addFields(
        { 
          name: '👤 Reviewed By', 
          value: data.reviewed_by, 
          inline: true 
        },
        { 
          name: '📅 Date', 
          value: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }), 
          inline: true 
        }
      )
      .setFooter({ text: 'RankBlox Staff System' })
      .setTimestamp();

    if (isApproved && data.start_date && data.end_date) {
      embed.addFields(
        { 
          name: '📅 Start Date', 
          value: new Date(data.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }), 
          inline: true 
        },
        { 
          name: '📅 End Date', 
          value: new Date(data.end_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }), 
          inline: true 
        }
      );
    }

    if (data.review_notes) {
      embed.addFields({
        name: '📝 Notes',
        value: data.review_notes,
        inline: false
      });
    }

    await user.send({ embeds: [embed] });
    
    console.log(`[Notification] Successfully sent LOA ${data.status} DM to ${user.tag} (${data.discord_id})`);
    return { success: true };

  } catch (error: any) {
    if (error.code === 50007) {
      console.log(`[Notification] Cannot DM user ${data.discord_id} - DMs are closed`);
      return { success: false, error: 'User has DMs disabled' };
    }
    
    if (error.code === 10013) {
      console.log(`[Notification] Unknown user ${data.discord_id}`);
      return { success: false, error: 'Unknown user' };
    }

    console.error(`[Notification] Failed to send LOA notification DM to ${data.discord_id}:`, error);
    return { success: false, error: error.message || 'Failed to send DM' };
  }
}
