"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import {
  HiOfficeBuilding, HiCalendar, HiShieldCheck, HiSearch,
  HiRefresh, HiDownload, HiExclamation, HiBadgeCheck,
  HiX, HiSparkles,
} from "react-icons/hi";
import { MdOpenInNew } from "react-icons/md";
import { RiBarChartBoxFill } from "react-icons/ri";
import { FiFileText } from "react-icons/fi";

type Analysis = {
  questionId: number; level: string; question: string; answer: string;
  likelihood: number; impact: number; riskScore: number; riskLevel: string;
  gap: string; threat: string; mitigation: string;
};

type Assessment = {
  _id: string; company: string; category: string; date: string;
  analyses: Analysis[]; summary?: any;
};

type Registration = {
  analysisId: string; certificateNumber: string;
  overallRiskLevel: string; registeredAt: string;
};

// Role → which report types they can access
const ROLE_ACCESS: Record<string, string[]> = {
  "Director":      ["strategic"],
  "Division Head": ["strategic", "tactical"],
  "Risk Analyst":  ["tactical", "operational"],
  "Staff":         ["operational"],
};

const REPORT_TYPES = [
  {
    key: "strategic",
    label: "Strategic Report",
    desc: "Overall risk posture, trending, risk appetite & resource allocation",
    audience: "Director / Division Head",
  },
  {
    key: "tactical",
    label: "Tactical Report",
    desc: "Control effectiveness, risk treatment plans & compliance status",
    audience: "Division Head / Risk Analyst",
  },
  {
    key: "operational",
    label: "Operational Report",
    desc: "Specific vulnerabilities, patching actions & immediate items",
    audience: "Risk Analyst / Staff",
  },
];

const RISK_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500", HIGH: "bg-orange-400",
  MEDIUM: "bg-yellow-400", LOW: "bg-emerald-400",
};

const RISK_TEXT: Record<string, string> = {
  CRITICAL: "text-red-600 bg-red-50",
  HIGH: "text-orange-600 bg-orange-50",
  MEDIUM: "text-yellow-600 bg-yellow-50",
  LOW: "text-emerald-600 bg-emerald-50",
};

const EXPORT_FMTS = ["PDF", "DOCX", "Excel", "PPTX"];

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<{ id: string; level: string } | null>(null);
  const [exporting, setExporting] = useState<{ id: string; fmt: string } | null>(null);
  const [modal, setModal] = useState<{ assessment: Assessment; level: string; content: string; slides: Array<{ title: string; body: string }> } | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [aRes, rRes] = await Promise.all([
        fetch("/api/analysis/processed"),
        fetch("/api/registrations"),
      ]);
      const aData = await aRes.json();
      const rData = await rRes.json();
      setAssessments(aData.success && Array.isArray(aData.assessments) ? aData.assessments : []);
      setRegistrations(rData.success && Array.isArray(rData.registrations) ? rData.registrations : []);
    } catch { setAssessments([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  const userRole = (session?.user as any)?.role || "";
  const allowedKeys = ROLE_ACCESS[userRole] || REPORT_TYPES.map(r => r.key);
  const allowedTypes = REPORT_TYPES.filter(r => allowedKeys.includes(r.key));

  const handleGenerate = async (assessment: Assessment, level: string) => {
    setGenerating({ id: assessment._id, level });
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: assessment._id, level }),
      });
      const data = await res.json();
      if (data.success && data.report?.content) {
        const slides = data.slides || [{ title: "Report", body: data.report.content }];
        setSlideIndex(0);
        setModal({ assessment, level, content: data.report.content, slides });
      } else {
        alert(data.error || "Failed to generate report");
      }
    } catch { alert("Error generating report"); }
    finally { setGenerating(null); }
  };

  const handleExport = async (assessment: Assessment, level: string, fmt: string) => {
    setExporting({ id: assessment._id, fmt });
    try {
      const endpoints: Record<string, string> = {
        PDF:   `/api/reports/export-pdf?analysisId=${assessment._id}&level=${level}`,
        DOCX:  `/api/reports/export?analysisId=${assessment._id}&format=DOCX&level=${level}`,
        Excel: `/api/reports/export-excel?analysisId=${assessment._id}&level=${level}`,
        PPTX:  `/api/reports/export-pptx?analysisId=${assessment._id}&level=${level}`,
      };
      const exts: Record<string, string> = { PDF: "pdf", DOCX: "docx", Excel: "xlsx", PPTX: "pptx" };
      const res = await fetch(endpoints[fmt]);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${assessment.company}-${level}-${fmt.toLowerCase()}.${exts[fmt]}`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { alert(`Failed to export ${fmt}`); }
    finally { setExporting(null); }
  };

  const getRiskDist = (a: Assessment) => {
    const d: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    a.analyses.forEach(x => { if (d[x.riskLevel] !== undefined) d[x.riskLevel]++; });
    return d;
  };

  const getDominant = (d: Record<string, number>) =>
    d.CRITICAL > 0 ? "CRITICAL" : d.HIGH > 0 ? "HIGH" : d.MEDIUM > 0 ? "MEDIUM" : "LOW";

  const filtered = assessments.filter(a =>
    a.company.toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-72 gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
            <RiBarChartBoxFill className="absolute inset-0 m-auto w-5 h-5 text-blue-400" />
          </div>
          <p className="text-gray-400 text-sm">Loading reports...</p>
        </div>
      </Layout>
    );
  }
  if (!session) return null;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {userRole ? `Showing reports available for ${userRole}` : "Security assessment reports"}
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            <HiRefresh className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Report types available to this role */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Report Access</p>
          <div className="space-y-2">
            {allowedTypes.map(rt => (
              <div key={rt.key} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-gray-700">{rt.label}</span>
                  <span className="text-xs text-gray-400 ml-2">— {rt.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search organization..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white rounded-lg border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <HiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <FiFileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No organizations found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or refresh.</p>
          </div>
        )}

        {/* Organization list */}
        <div className="space-y-4">
          {filtered.map(assessment => {
            const dist = getRiskDist(assessment);
            const total = Object.values(dist).reduce((s, v) => s + v, 0);
            const dominant = getDominant(dist);
            const reg = registrations.find(r => r.analysisId === assessment._id);

            return (
              <div key={assessment._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                {/* Company header */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <HiOfficeBuilding className="w-4.5 h-4.5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{assessment.company}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <HiCalendar className="w-3 h-3" />
                            {new Date(assessment.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${RISK_TEXT[dominant] || "text-gray-600 bg-gray-100"}`}>
                            {dominant}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {reg && (
                        <a href={`/certificates/${reg.certificateNumber}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                          <HiBadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Certificate
                          <MdOpenInNew className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="mt-3">
                    <div className="flex rounded-full overflow-hidden h-1.5 bg-gray-100">
                      {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(lvl =>
                        dist[lvl] > 0 ? (
                          <div key={lvl} title={`${lvl}: ${dist[lvl]}`}
                            className={`${RISK_COLORS[lvl]}`}
                            style={{ width: `${(dist[lvl] / total) * 100}%` }} />
                        ) : null
                      )}
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(lvl => (
                        <span key={lvl} className="flex items-center gap-1 text-xs text-gray-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${RISK_COLORS[lvl]}`} />
                          {dist[lvl]} {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Report type rows — only allowed types */}
                <div className="divide-y divide-gray-50">
                  {allowedTypes.map(rt => {
                    const isGen = generating?.id === assessment._id && generating?.level === rt.key;
                    const isExp = exporting?.id === assessment._id;

                    return (
                      <div key={rt.key} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{rt.label}</p>
                          <p className="text-xs text-gray-400">{rt.audience}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Generate & Read */}
                          <button
                            onClick={() => handleGenerate(assessment, rt.key)}
                            disabled={isGen}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            {isGen ? (
                              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                              <HiSparkles className="w-3 h-3" />
                            )}
                            {isGen ? "Generating..." : "Generate & Read"}
                          </button>

                          {/* Export buttons inline */}
                          <div className="flex items-center gap-1">
                            {EXPORT_FMTS.map(fmt => (
                              <button key={fmt}
                                onClick={() => handleExport(assessment, rt.key, fmt)}
                                disabled={isExp}
                                className="px-2 py-1.5 border border-gray-200 text-gray-500 rounded text-xs font-medium hover:bg-gray-50 hover:text-gray-700 transition disabled:opacity-40">
                                {exporting?.id === assessment._id && exporting?.fmt === fmt ? "..." : fmt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report modal — slide reader */}
      {modal && (() => {
        const rt = REPORT_TYPES.find(r => r.key === modal.level)!;
        const slide = modal.slides[slideIndex];
        const total = modal.slides.length;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">{modal.assessment.company}</h2>
                  <p className="text-xs text-gray-400">{rt?.label} · {total} sections</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{slideIndex + 1} / {total}</span>
                  <button onClick={() => setModal(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slide content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                  {slide?.title}
                </h3>
                <div className="text-sm text-gray-700 leading-7 whitespace-pre-wrap font-sans">
                  {slide?.body}
                </div>
              </div>

              {/* Navigation + export */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
                    disabled={slideIndex === 0}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setSlideIndex(i => Math.min(total - 1, i + 1))}
                    disabled={slideIndex === total - 1}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>

                {/* Slide dots */}
                <div className="flex gap-1">
                  {modal.slides.map((_, i) => (
                    <button key={i} onClick={() => setSlideIndex(i)}
                      className={`w-2 h-2 rounded-full transition ${i === slideIndex ? "bg-blue-600" : "bg-gray-200 hover:bg-gray-300"}`} />
                  ))}
                </div>

                <button onClick={() => handleExport(modal.assessment, modal.level, "PDF")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition">
                  <HiDownload className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
