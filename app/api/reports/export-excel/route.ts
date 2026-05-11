import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const analysisId = searchParams.get('analysisId');
        const level = searchParams.get('level') || 'operational';

        if (!analysisId) {
            return NextResponse.json({ error: 'Missing analysisId' }, { status: 400 });
        }

        await dbConnect();
        const analysis = await RiskAnalysis.findById(analysisId).lean() as any;

        if (!analysis) {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }

        // Get AI-generated report content for this level
        const Report = (await import('@/models/Report')).default;
        const savedReport = await Report.findOne({ analysisId, level }).lean() as any;

        const allAnalyses = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || []),
        ];

        const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'INSA CSRARS';
        workbook.created = new Date();

        // Sheet 1: Report Content (AI-generated)
        if (savedReport?.content) {
            const reportSheet = workbook.addWorksheet(`${levelLabel} Report`);
            reportSheet.columns = [{ header: `${levelLabel} Security Report`, key: 'content', width: 120 }];
            reportSheet.getRow(1).font = { bold: true, size: 14 };
            reportSheet.addRow({ content: `Organization: ${analysis.company}` });
            reportSheet.addRow({ content: `Report Level: ${levelLabel}` });
            reportSheet.addRow({ content: `Generated: ${new Date().toLocaleDateString()}` });
            reportSheet.addRow({ content: '' });
            savedReport.content.split('\n').forEach((line: string) => {
                reportSheet.addRow({ content: line });
            });
        }

        // Sheet 2: Summary
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Field', key: 'field', width: 25 },
            { header: 'Value', key: 'value', width: 40 },
        ];
        const overall = analysis.summary?.overall || {};
        const dist = overall.riskDistribution || {};
        summarySheet.addRows([
            { field: 'Company', value: analysis.company },
            { field: 'Category', value: analysis.category },
            { field: 'Report Level', value: levelLabel },
            { field: 'Date', value: new Date(analysis.createdAt).toLocaleDateString() },
            { field: 'Total Questions', value: allAnalyses.length },
            { field: 'Critical', value: dist.CRITICAL || 0 },
            { field: 'High', value: dist.HIGH || 0 },
            { field: 'Medium', value: dist.MEDIUM || 0 },
            { field: 'Low', value: dist.LOW || 0 },
        ]);
        summarySheet.getRow(1).font = { bold: true };

        // Sheet 3: Risk Details
        const detailSheet = workbook.addWorksheet('Risk Details');
        detailSheet.columns = [
            { header: '#', key: 'num', width: 5 },
            { header: 'Level', key: 'level', width: 12 },
            { header: 'Section', key: 'section', width: 30 },
            { header: 'Question', key: 'question', width: 50 },
            { header: 'Answer', key: 'answer', width: 20 },
            { header: 'Risk Score', key: 'riskScore', width: 12 },
            { header: 'Risk Level', key: 'riskLevel', width: 12 },
            { header: 'Gap', key: 'gap', width: 40 },
            { header: 'Mitigation', key: 'mitigation', width: 40 },
        ];
        detailSheet.getRow(1).font = { bold: true };
        detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        allAnalyses.forEach((a: any, idx: number) => {
            const riskLevel = a.analysis?.riskLevel || 'UNKNOWN';
            const row = detailSheet.addRow({
                num: idx + 1, level: a.level || '', section: a.section || '',
                question: a.question || '', answer: a.answer || '',
                riskScore: a.analysis?.riskScore || 0, riskLevel,
                gap: a.analysis?.gap || '', mitigation: a.analysis?.mitigation || '',
            });
            const riskColors: Record<string, string> = {
                CRITICAL: 'FFDC2626', HIGH: 'FFEA580C', MEDIUM: 'FFEAB308', LOW: 'FF16A34A',
            };
            const cell = row.getCell('riskLevel');
            if (riskColors[riskLevel]) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColors[riskLevel] } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(buffer as Buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${analysis.company}-${level}-report.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('Excel export error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate Excel' }, { status: 500 });
    }
}
