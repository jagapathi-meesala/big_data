import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Incident from '../models/Incident';
import Resource from '../models/Resource';

export const generatePdfReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeframe = 'daily' } = req.query;

    const doc = new PDFDocument({ margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=aid_dras_${timeframe}_report.pdf`);
    
    doc.pipe(res);

    // 1. Draw top brand banner
    doc.rect(40, 30, 532, 65).fill('#0f172a'); // slate-900 background
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('AID-DRAS EMERGENCY OPERATIONS', 60, 42);
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(`DISASTER RESPONSE SYSTEM  |  ${timeframe.toString().toUpperCase()} REPORT`, 60, 68);

    // 2. Metadata details
    const timeString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    doc.fillColor('#475569').fontSize(9).text(`Timeframe: ${timeframe.toString().toUpperCase()}`, 40, 115);
    doc.text(`Generated: ${timeString} IST`, 40, 128);

    // 3. Horizontal separator line
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, 145).lineTo(572, 145).stroke();

    // Fetch counts from database
    const totalIncidents = await Incident.count();
    const resolvedCount = await Incident.count({ where: { status: 'RESOLVED' } });
    const resourcesCount = await Resource.count();

    // 4. Summary Metrics Section Title
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('1. Key Operations Summary', 40, 160);

    // Draw KPI Card 1 (Total Incidents)
    doc.rect(40, 180, 164, 70).fill('#fff1f2'); // soft red/rose
    doc.rect(40, 180, 164, 70).strokeColor('#fecdd3').lineWidth(1).stroke();
    doc.fillColor('#9f1239').fontSize(22).font('Helvetica-Bold').text(`${totalIncidents}`, 55, 192);
    doc.fillColor('#be123c').fontSize(8).font('Helvetica').text('TOTAL INCIDENTS', 55, 225);

    // Draw KPI Card 2 (Resolved Incidents)
    doc.rect(224, 180, 164, 70).fill('#ecfdf5'); // soft emerald
    doc.rect(224, 180, 164, 70).strokeColor('#a7f3d0').lineWidth(1).stroke();
    doc.fillColor('#065f46').fontSize(22).font('Helvetica-Bold').text(`${resolvedCount}`, 239, 192);
    doc.fillColor('#047857').fontSize(8).font('Helvetica').text('RESOLVED CASES', 239, 225);

    // Draw KPI Card 3 (Active Resources)
    doc.rect(408, 180, 164, 70).fill('#eff6ff'); // soft blue
    doc.rect(408, 180, 164, 70).strokeColor('#bfdbfe').lineWidth(1).stroke();
    doc.fillColor('#1e40af').fontSize(22).font('Helvetica-Bold').text(`${resourcesCount}`, 423, 192);
    doc.fillColor('#1d4ed8').fontSize(8).font('Helvetica').text('ACTIVE RESOURCES', 423, 225);

    // 5. Recent Incidents Section Title
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('2. Recent Incident Logs', 40, 270);

    // Load recent incidents
    const incidents = await Incident.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
    
    let currentY = 290;
    for (const inc of incidents) {
      const severity = inc.severity || inc.getDataValue('severity') || (inc as any).severity || (inc as any).dataValues?.severity || 'MEDIUM';
      const title = inc.title || inc.getDataValue('title') || (inc as any).title || (inc as any).dataValues?.title || 'Unknown Incident';
      const status = inc.status || inc.getDataValue('status') || (inc as any).status || (inc as any).dataValues?.status || 'REPORTED';
      const district = inc.district || inc.getDataValue('district') || (inc as any).district || (inc as any).dataValues?.district || 'Unknown';
      const state = inc.state || inc.getDataValue('state') || (inc as any).state || (inc as any).dataValues?.state || 'Unknown';

      // Determine severity color
      let severityColor = '#3b82f6'; // Blue for info/low
      if (severity === 'CRITICAL') severityColor = '#ef4444'; // Red
      else if (severity === 'HIGH') severityColor = '#f59e0b'; // Gold
      else if (severity === 'MEDIUM') severityColor = '#3b82f6';
      else severityColor = '#10b981'; // Green for low

      // Draw Incident item container
      doc.rect(40, currentY, 532, 48).fill('#f8fafc');
      doc.rect(40, currentY, 532, 48).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Left marker strip colored by severity
      doc.rect(40, currentY, 4, 48).fill(severityColor);

      // Title & Location
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(title, 55, currentY + 10);
      doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`${district}, ${state}`, 55, currentY + 28);

      // Status pill on the right
      const statusX = 430;
      doc.rect(statusX, currentY + 16, 75, 16).fill('#e2e8f0');
      doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(status, statusX + 4, currentY + 21, { width: 67, align: 'center' });

      // Severity badge on the right of title
      doc.rect(515, currentY + 16, 45, 16).fill(severityColor);
      doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold').text(severity, 515, currentY + 21, { width: 45, align: 'center' });

      currentY += 56;
    }

    // 6. Draw footer note
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('AID-DRAS Operations Management Portal | Automated Report System', 40, 680, { align: 'center' });

    doc.end();
  } catch (error: any) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ message: 'Internal server error generating report.' });
  }
};
