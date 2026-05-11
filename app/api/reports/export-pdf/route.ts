import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RiskAnalysis from '@/models/RiskAnalysis';

const PAGE_HEIGHT = 750;
const LINE_HEIGHT = 14;
const MARGIN_TOP = 50;
const MARGIN_LEFT = 50;
const MAX_CHARS = 90;

function escapePdfText(text: string): string {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[^\x20-\x7E]/g, '?') // replace non-ASCII with ?
        .substring(0, MAX_CHARS);
}

function generateMultiPagePdf(data: {
    company: string;
    category: string;
    date: string;
    analyses: any[];
    summary: any;
    level?: string;
    reportContent?: string | null;
}): Buffer {
    const { company, category, date, analyses, summary, level = 'operational', reportContent } = data;
    const overall = summary?.overall || {};
    const dist = overall.riskDistribution || {};

    const allLines: { text: string; size: number; bold: boolean; color: string }[] = [];

    const add = (text: string, size = 10, bold = false, color = '000000') => {
        allLines.push({ text, size, bold, color });
    };

    const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
    add(`${levelLabel.toUpperCase()} SECURITY REPORT`, 16, true, '1E3A8A');
    add('='.repeat(60));
    add(`Organization: ${company}`, 11, true);
    add(`Category: ${category}`);
    add(`Report Level: ${levelLabel}`);
    add(`Generated: ${new Date(date).toLocaleDateString()}`);
    add('');

    if (reportContent) {
        // Use AI-generated content
        add(`${levelLabel} REPORT CONTENT`, 13, true, '1E3A8A');
        add('-'.repeat(40));
        const lines = reportContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { add(''); continue; }
            const isHeading = /^[0-9]+\./.test(trimmed) || /^[A-Z][A-Z\s]{5,}$/.test(trimmed) || /^━+/.test(trimmed);
            add(trimmed, isHeading ? 11 : 9, isHeading, isHeading ? '1E3A8A' : '000000');
        }
    } else {
        // Fallback: raw analysis data
        add('RISK DISTRIBUTION', 13, true, '1E3A8A');
        add('-'.repeat(40));
        add(`Critical: ${dist.CRITICAL || 0}  |  High: ${dist.HIGH || 0}  |  Medium: ${dist.MEDIUM || 0}  |  Low: ${dist.LOW || 0}`);
        add(`Average Risk Score: ${overall.averageRiskScore || 0}/25`);
        add('');
        add('RISK ANALYSIS DETAILS', 13, true, '1E3A8A');
        add('='.repeat(60));
        analyses.forEach((a: any, idx: number) => {
            add('');
            add(`Q${idx + 1}: ${a.question || ''}`, 10, true);
            add(`Answer: ${a.answer || ''}`, 9);
            const rl = a.analysis?.riskLevel || 'UNKNOWN';
            const color = rl === 'CRITICAL' ? 'DC2626' : rl === 'HIGH' ? 'EA580C' : rl === 'MEDIUM' ? 'CA8A04' : '16A34A';
            add(`Risk: ${rl} | Score: ${a.analysis?.riskScore || 0}/25`, 9, false, color);
            if (a.analysis?.gap) add(`Gap: ${a.analysis.gap}`, 9);
            if (a.analysis?.mitigation) add(`Fix: ${a.analysis.mitigation}`, 9, false, '15803D');
            add('-'.repeat(40));
        });
    }

    add('');
    add('INSA - Cyber Security Risk Analysis & Reporting System', 9, false, '64748B');
    add('Confidential Document', 9, false, '64748B');

    // Split lines into pages
    const pages: string[][] = [];
    let currentPage: string[] = [];
    let currentY = PAGE_HEIGHT - MARGIN_TOP;

    for (const line of allLines) {
        if (currentY < 30) {
            pages.push(currentPage);
            currentPage = [];
            currentY = PAGE_HEIGHT - MARGIN_TOP;
        }
        const escaped = escapePdfText(line.text);
        currentPage.push(`BT /F1 ${line.size} Tf ${MARGIN_LEFT} ${currentY} Td (${escaped}) Tj ET`);
        currentY -= LINE_HEIGHT;
    }
    if (currentPage.length > 0) pages.push(currentPage);

    // Build PDF objects
    const pdfParts: string[] = [];
    const objOffsets: number[] = [];
    let byteOffset = 0;

    const header = '%PDF-1.4\n';
    byteOffset += header.length;
    pdfParts.push(header);

    const addObj = (id: number, content: string) => {
        objOffsets[id] = byteOffset;
        const obj = `${id} 0 obj\n${content}\nendobj\n`;
        pdfParts.push(obj);
        byteOffset += obj.length;
    };

    const pageCount = pages.length;
    const pageIds = pages.map((_, i) => 4 + i * 2); // content objects
    const pageObjIds = pages.map((_, i) => 4 + i * 2 + 1); // page objects

    // Object 1: Catalog
    addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

    // Object 2: Pages
    const kidsRef = pageObjIds.map(id => `${id} 0 R`).join(' ');
    addObj(2, `<< /Type /Pages /Kids [${kidsRef}] /Count ${pageCount} >>`);

    // Object 3: Font
    addObj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    // Add content + page objects for each page
    pages.forEach((pageLines, i) => {
        const contentId = pageIds[i];
        const pageObjId = pageObjIds[i];
        const stream = pageLines.join('\n');

        addObj(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        addObj(pageObjId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    });

    // Cross-reference table
    const xrefStart = byteOffset;
    const totalObjs = 3 + pageCount * 2 + 1;
    let xref = `xref\n0 ${totalObjs}\n`;
    xref += '0000000000 65535 f \n';
    for (let i = 1; i < totalObjs; i++) {
        xref += `${String(objOffsets[i] || 0).padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    pdfParts.push(xref + trailer);
    return Buffer.from(pdfParts.join(''), 'latin1');
}

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

        // Try to get the AI-generated report content for this level
        const Report = (await import('@/models/Report')).default;
        const savedReport = await Report.findOne({ analysisId, level }).lean() as any;

        const allAnalyses = [
            ...(analysis.operational || []),
            ...(analysis.tactical || []),
            ...(analysis.strategic || []),
        ];

        const pdfBuffer = generateMultiPagePdf({
            company: analysis.company || 'Unknown',
            category: analysis.category || 'N/A',
            date: analysis.createdAt,
            analyses: allAnalyses,
            summary: analysis.summary,
            level,
            reportContent: savedReport?.content || null,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${analysis.company}-${level}-report.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: any) {
        console.error('PDF export error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}
