import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';
import PptxGenJS from 'pptxgenjs';

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

        const overall = analysis.summary?.overall || {};
        const dist = overall.riskDistribution || {};
        const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        pptx.title = `${levelLabel} Report - ${analysis.company}`;

        // Slide 1: Title
        const slide1 = pptx.addSlide();
        slide1.background = { color: '0F172A' };
        slide1.addText(`${levelLabel.toUpperCase()} SECURITY REPORT`, {
            x: 0.5, y: 1.5, w: 12, h: 1,
            fontSize: 32, bold: true, color: '3B82F6', align: 'center'
        });
        slide1.addText(analysis.company || 'Unknown Company', {
            x: 0.5, y: 2.8, w: 12, h: 0.8,
            fontSize: 24, color: 'FFFFFF', align: 'center'
        });
        slide1.addText(`Generated: ${new Date().toLocaleDateString()} | Category: ${analysis.category}`, {
            x: 0.5, y: 3.8, w: 12, h: 0.5,
            fontSize: 14, color: '94A3B8', align: 'center'
        });
        slide1.addText('INSA - Cyber Security Risk Analysis & Reporting System', {
            x: 0.5, y: 6.5, w: 12, h: 0.4,
            fontSize: 11, color: '64748B', align: 'center'
        });

        // Slide 2: Risk Summary
        const slide2 = pptx.addSlide();
        slide2.background = { color: '0F172A' };
        slide2.addText('RISK SUMMARY', {
            x: 0.5, y: 0.3, w: 12, h: 0.6,
            fontSize: 24, bold: true, color: '3B82F6'
        });
        const summaryData = [
            { label: 'Total Assessed', value: String(overall.totalQuestionsAnalyzed || allAnalyses.length), color: 'FFFFFF' },
            { label: 'Avg Risk Score', value: `${overall.averageRiskScore || 0}/25`, color: 'FFFFFF' },
            { label: 'Critical', value: String(dist.CRITICAL || 0), color: 'DC2626' },
            { label: 'High', value: String(dist.HIGH || 0), color: 'EA580C' },
            { label: 'Medium', value: String(dist.MEDIUM || 0), color: 'EAB308' },
            { label: 'Low', value: String(dist.LOW || 0), color: '16A34A' },
        ];
        summaryData.forEach((item, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            slide2.addShape('rect' as any, {
                x: 0.5 + col * 4.2, y: 1.2 + row * 2.2, w: 3.8, h: 1.8,
                fill: { color: '1E293B' }, line: { color: '334155', width: 1 }
            });
            slide2.addText(item.value, {
                x: 0.5 + col * 4.2, y: 1.4 + row * 2.2, w: 3.8, h: 0.8,
                fontSize: 28, bold: true, color: item.color, align: 'center'
            });
            slide2.addText(item.label, {
                x: 0.5 + col * 4.2, y: 2.3 + row * 2.2, w: 3.8, h: 0.5,
                fontSize: 12, color: '94A3B8', align: 'center'
            });
        });

        // Add content slides from AI report
        if (savedReport?.content) {
            const sections = savedReport.content.split(/\n(?=[0-9]+\.|━+\s*SECTION|[A-Z][A-Z\s]{5,}\n)/);
            sections.slice(0, 8).forEach((section: string, i: number) => {
                const lines = section.trim().split('\n').filter(Boolean);
                if (lines.length === 0) return;
                const title = lines[0].replace(/^[0-9]+\.\s*/, '').replace(/━+/g, '').trim().substring(0, 60);
                const body = lines.slice(1).join('\n').substring(0, 600);
                const contentSlide = pptx.addSlide();
                contentSlide.background = { color: '0F172A' };
                contentSlide.addText(title || `Section ${i + 1}`, {
                    x: 0.5, y: 0.3, w: 12, h: 0.6,
                    fontSize: 18, bold: true, color: '3B82F6'
                });
                contentSlide.addText(body, {
                    x: 0.5, y: 1.1, w: 12, h: 5.5,
                    fontSize: 10, color: 'CBD5E1', valign: 'top'
                });
            });
        } else {
            // Fallback: top risks slide
            const criticalRisks = allAnalyses.filter((a: any) => a.analysis?.riskLevel === 'CRITICAL' || a.analysis?.riskLevel === 'HIGH').slice(0, 5);
            if (criticalRisks.length > 0) {
                const slide3 = pptx.addSlide();
                slide3.background = { color: '0F172A' };
                slide3.addText('TOP RISKS', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: 'DC2626' });
                criticalRisks.forEach((a: any, i: number) => {
                    slide3.addText(`${i + 1}. ${(a.analysis?.gap || '').substring(0, 80)}`, {
                        x: 0.5, y: 1.2 + i * 1.1, w: 12, h: 0.5, fontSize: 12, color: 'FFFFFF'
                    });
                });
            }
        }

        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        return new NextResponse(new Uint8Array(pptxBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${analysis.company}-${level}-report.pptx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('PPTX export error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate PPTX' }, { status: 500 });
    }
}
