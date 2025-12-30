import jsPDF from 'jspdf';
import type { DetailedUserInfo, DetailedUsersResponse } from '@/services/api';

export async function generateStaffReportPDF(data: DetailedUsersResponse): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;
  const lineHeight = 7;
  const sectionSpacing = 10;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * lineHeight;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Staff Activity Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;

  // Report metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generatedDate = new Date(data.generated_at).toLocaleString();
  doc.text(`Generated: ${generatedDate}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Week Start: ${data.week_start}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Total Staff: ${data.total_staff}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Summary statistics
  const activeCount = data.users.filter(u => u.is_active).length;
  const inactiveCount = data.total_staff - activeCount;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Summary', margin, yPosition);
  yPosition += lineHeight * 1.5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Active Staff: ${activeCount}`, margin + 5, yPosition);
  yPosition += lineHeight;
  doc.text(`Inactive Staff: ${inactiveCount}`, margin + 5, yPosition);
  yPosition += sectionSpacing;

  // Process each user
  data.users.forEach((user, index) => {
    checkPageBreak(60); // Reserve space for user section

    // User header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const userName = user.roblox_username || user.discord_username || 'Unknown';
    const statusColor = user.is_active ? [46, 125, 50] : [211, 47, 47]; // Green or Red
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`${index + 1}. ${userName} (ID: ${user.id})`, margin, yPosition);
    doc.setTextColor(0, 0, 0); // Reset to black
    yPosition += lineHeight;

    // User details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Discord: ${user.discord_username}`, margin + 5, yPosition);
    yPosition += lineHeight;
    if (user.roblox_username) {
      doc.text(`Roblox: ${user.roblox_username}`, margin + 5, yPosition);
      yPosition += lineHeight;
    }
    doc.text(`Rank: ${user.rank || 'N/A'} ${user.rank_name ? `(${user.rank_name})` : ''}`, margin + 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Status: ${user.status}`, margin + 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Activity: ${user.is_active ? 'ACTIVE' : 'INACTIVE'}`, margin + 5, yPosition);
    yPosition += lineHeight * 1.5;

    // Current week activity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Current Week Activity:', margin + 5, yPosition);
    yPosition += lineHeight;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Messages: ${user.messages_sent} / ${user.messages_quota} (${user.quota_percentage}%)`, margin + 10, yPosition);
    yPosition += lineHeight;
    doc.text(`Minutes: ${user.minutes}`, margin + 10, yPosition);
    yPosition += lineHeight;
    doc.text(`Tickets Claimed: ${user.tickets_claimed}`, margin + 10, yPosition);
    yPosition += lineHeight;
    doc.text(`Tickets Resolved: ${user.tickets_resolved}`, margin + 10, yPosition);
    yPosition += lineHeight * 1.5;

    // Activity logs summary
    if (user.activity_logs && user.activity_logs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Activity Logs (${user.activity_logs.length} entries):`, margin + 5, yPosition);
      yPosition += lineHeight;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      // Show last 3 activity logs
      user.activity_logs.slice(0, 3).forEach((log: any) => {
        checkPageBreak(15);
        doc.text(
          `Week ${log.week_start}: ${log.messages_sent || 0} msgs, ${log.minutes || 0}m, ${log.tickets_claimed || 0} claimed, ${log.tickets_resolved || 0} resolved`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      });
      if (user.activity_logs.length > 3) {
        doc.text(`... and ${user.activity_logs.length - 3} more entries`, margin + 10, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
    }

    // Infractions
    if (user.infractions && user.infractions.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Infractions (${user.infractions.length}):`, margin + 5, yPosition);
      yPosition += lineHeight;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      user.infractions.slice(0, 3).forEach((inf: any) => {
        checkPageBreak(15);
        const voidedText = inf.voided ? ' [VOIDED]' : '';
        doc.text(
          `${inf.type.toUpperCase()}: ${inf.reason}${voidedText} (${new Date(inf.created_at).toLocaleDateString()})`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      });
      if (user.infractions.length > 3) {
        doc.text(`... and ${user.infractions.length - 3} more infractions`, margin + 10, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Infractions: None', margin + 5, yPosition);
      yPosition += lineHeight;
    }

    // Tickets summary
    if (user.tickets && user.tickets.length > 0) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Tickets: ${user.tickets.length} total (${user.tickets.filter((t: any) => t.status === 'resolved').length} resolved)`, margin + 5, yPosition);
      yPosition += lineHeight;
    }

    // Discord messages
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Discord Messages (this week): ${user.discord_messages_count || 0}`, margin + 5, yPosition);
    yPosition += lineHeight;

    // Recent messages detail
    if (user.recent_messages && user.recent_messages.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Recent Messages (last ${user.recent_messages.length}):`, margin + 5, yPosition);
      yPosition += lineHeight;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      user.recent_messages.slice(0, 3).forEach((msg: any, idx: number) => {
        checkPageBreak(10);
        const msgDate = msg.created_at ? new Date(msg.created_at).toLocaleString() : 'N/A';
        doc.text(
          `${idx + 1}. Channel: ${msg.discord_channel_id || 'N/A'}, Created: ${msgDate}`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight * 0.8;
      });
      if (user.recent_messages.length > 3) {
        doc.text(`... and ${user.recent_messages.length - 3} more messages`, margin + 10, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight;
    }

    // Additional statistics summary
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Data Summary:', margin + 5, yPosition);
    yPosition += lineHeight;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `Activity Logs: ${user.activity_logs?.length || 0} | ` +
      `Infractions: ${user.infractions?.length || 0} | ` +
      `Tickets: ${user.tickets?.length || 0}`,
      margin + 10,
      yPosition
    );
    yPosition += lineHeight * 1.5;

    // Add separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += sectionSpacing;
  });

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `staff-report-${dateStr}.pdf`;

  // Save PDF
  doc.save(filename);
}

