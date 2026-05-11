import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis from "@/models/RiskAnalysis";
import Report from "@/models/Report";
import { generateReport, parseReportIntoSlides } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId, level } = await req.json();

    if (!analysisId || !level) {
      return NextResponse.json(
        { error: "Analysis ID and level are required" },
        { status: 400 }
      );
    }

    if (!["strategic", "tactical", "operational"].includes(level)) {
      return NextResponse.json(
        { error: "Invalid report level" },
        { status: 400 }
      );
    }

    await dbConnect();

    const analysis = await RiskAnalysis.findById(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Check if report already exists for this level — delete and regenerate with latest prompt
    await Report.deleteOne({ analysisId: analysis._id, level });

    // Check if AI API key is configured
    if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI API key not configured" },
        { status: 500 }
      );
    }

    // Prepare full analysis data for report generation
    const analysisData = {
      company: analysis.company,
      category: analysis.category,
      date: analysis.createdAt,
      riskRegisterId: analysis.riskRegisterId,
      operational: analysis.operational || [],
      tactical: analysis.tactical || [],
      strategic: analysis.strategic || [],
      summary: analysis.summary || {},
    };

    // Generate report using AI
    const reportResult = await generateReport(level, analysisData);

    // Save report to MongoDB
    const report = new Report({
      analysisId: analysis._id,
      level,
      content: reportResult.content,
      riskMatrix: reportResult.riskMatrix,
      charts: reportResult.charts,
      exportFormats: ["PDF", "DOCX"],
      generatedAt: new Date(),
    });

    const savedReport = await report.save();

    // Parse into slides for the online reader
    const slides = parseReportIntoSlides(reportResult.content, level);

    return NextResponse.json({
      success: true,
      report: savedReport,
      slides,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}

