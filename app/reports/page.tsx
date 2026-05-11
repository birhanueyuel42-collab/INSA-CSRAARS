"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import {
  HiOfficeBuilding, HiCalendar, HiShieldCheck, HiSearch,
  HiRefresh, HiDownload, HiExclamation, HiBadgeCheck,
  HiX, HiSparkles, HiMenuAlt2,
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
  "Director": ["strategic"],
  "Division Head": ["strategic", "tactical"],
  "Risk Analyst": ["tactical", "operational"],
  "Staff": ["operational"],
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
  const [tocOpen, setTocOpen] = useState(true);
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        PDF: `/api/reports/export-pdf?analysisId=${assessment._id}&level=${level}`,
        DOCX: `/api/reports/export?analysisId=${assessment._id}&format=DOCX&level=${level}`,
        Excel: `/api/reports/export-excel?analysisId=${assessment._id}&level=${level}`,
        PPTX: `/api/reports/export-pptx?analysisId=${assessment._id}&level=${level}`,
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

        {/* Company quick-jump dropdown */}
        <div className="relative" ref={dropdownRef}>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Company</p>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
          >
            <span>Select company...</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {assessments.map(a => (
                <button
                  key={a._id}
                  onClick={() => {
                    setDropdownOpen(false);
                    setSearch("");
                    setTimeout(() => {
                      cardRefs.current[a._id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition border-b border-gray-50 last:border-0"
                >
                  <HiOfficeBuilding className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {a.company}
                </button>
              ))}
              {assessments.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">No companies available</p>
              )}
            </div>
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
              <div key={assessment._id} ref={el => { cardRefs.current[assessment._id] = el; }} className="bg-white border border-gray-200 rounded-xl overflow-hidden scroll-mt-4">

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
                      {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(lvl =>
                        dist[lvl] > 0 ? (
                          <div key={lvl} title={`${lvl}: ${dist[lvl]}`}
                            className={`${RISK_COLORS[lvl]}`}
                            style={{ width: `${(dist[lvl] / total) * 100}%` }} />
                        ) : null
                      )}
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(lvl => (
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
                            {isGen ? "Generating..." : "Read"}
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

      {/* Report viewer — full-screen online reader */}
      {modal && (() => {
        const rt = REPORT_TYPES.find(r => r.key === modal.level)!;
        const LEVEL_COLORS: Record<string, string> = {
          strategic: "bg-purple-600",
          tactical: "bg-blue-600",
          operational: "bg-emerald-600",
        };
        const levelColor = LEVEL_COLORS[modal.level] || "bg-blue-600";

        // Render a single slide body with basic markdown-like formatting
        const renderBody = (body: string) => {
          const lines = body.split("\n");
          const elements: React.ReactNode[] = [];
          let listItems: string[] = [];
          let tableLines: string[] = [];

          const flushList = (key: string) => {
            if (listItems.length > 0) {
              elements.push(
                <ul key={`ul-${key}`} className="list-none space-y-1.5 my-3 pl-0">
                  {listItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700 text-sm leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
                    </li>
                  ))}
                </ul>
              );
              listItems = [];
            }
          };

          const flushTable = (key: string) => {
            if (tableLines.length >= 2) {
              const headers = tableLines[0].split("|").map(h => h.trim()).filter(Boolean);
              const rows = tableLines.slice(2).map(r => r.split("|").map(c => c.trim()).filter(Boolean));
              elements.push(
                <div key={`tbl-${key}`} className="overflow-x-auto my-4 rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-gray-600 border-t border-gray-100"
                              dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              tableLines = [];
            } else {
              tableLines = [];
            }
          };

          lines.forEach((line, idx) => {
            const trimmed = line.trim();

            // Table row detection
            if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
              flushList(`pre-tbl-${idx}`);
              tableLines.push(trimmed);
              return;
            } else if (tableLines.length > 0) {
              flushTable(`tbl-${idx}`);
            }

            // Separator lines
            if (/^[=\-─━]{4,}$/.test(trimmed)) {
              flushList(`pre-sep-${idx}`);
              elements.push(<hr key={`hr-${idx}`} className="my-4 border-gray-200" />);
              return;
            }

            // Bullet points
            if (/^[-•*]\s/.test(trimmed)) {
              listItems.push(trimmed.replace(/^[-•*]\s/, ""));
              return;
            } else {
              flushList(`pre-${idx}`);
            }

            // Numbered list items like "1. text" or "KPI 1: text"
            if (/^(\d+\.|KPI\s*\d+:)\s/.test(trimmed)) {
              elements.push(
                <div key={`num-${idx}`} className="flex items-start gap-2 my-1.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {trimmed.match(/^(\d+)/)?.[1] || "•"}
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^(\d+\.|KPI\s*\d+:)\s/, "")) }} />
                </div>
              );
              return;
            }

            // Empty line
            if (!trimmed) {
              elements.push(<div key={`sp-${idx}`} className="h-2" />);
              return;
            }

            // Sub-heading (ALL CAPS line or starts with ##)
            if (/^#{2,3}\s/.test(trimmed)) {
              elements.push(
                <h4 key={`h4-${idx}`} className="text-sm font-bold text-gray-800 mt-5 mb-2 uppercase tracking-wide">
                  {trimmed.replace(/^#{2,3}\s/, "")}
                </h4>
              );
              return;
            }

            if (/^[A-Z][A-Z\s&\/\-:]{8,}$/.test(trimmed) && trimmed.length < 80) {
              elements.push(
                <h4 key={`caps-${idx}`} className="text-xs font-bold text-gray-500 mt-5 mb-1.5 uppercase tracking-widest">
                  {trimmed}
                </h4>
              );
              return;
            }

            // Regular paragraph
            elements.push(
              <p key={`p-${idx}`} className="text-sm text-gray-700 leading-relaxed my-1"
                dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
            );
          });

          flushList("end");
          flushTable("end");
          return elements;
        };

        // Inline formatting: **bold**, `code`, RISK levels
        const formatInline = (text: string): string => {
          return text
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
            .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
            .replace(/\b(CRITICAL)\b/g, '<span class="font-bold text-red-600">CRITICAL</span>')
            .replace(/\b(HIGH)\b/g, '<span class="font-bold text-orange-500">HIGH</span>')
            .replace(/\b(MEDIUM)\b/g, '<span class="font-bold text-yellow-600">MEDIUM</span>')
            .replace(/\b(LOW)\b/g, '<span class="font-bold text-emerald-600">LOW</span>')
            .replace(/\b(PASS)\b/g, '<span class="font-bold text-emerald-600">PASS</span>')
            .replace(/\b(FAIL)\b/g, '<span class="font-bold text-red-600">FAIL</span>')
            .replace(/\b(AT RISK)\b/g, '<span class="font-bold text-orange-500">AT RISK</span>');
        };

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-stretch justify-center z-50">
            <div className="bg-white w-full max-w-6xl flex flex-col shadow-2xl md:m-4 md:rounded-2xl overflow-hidden">

              {/* Top bar */}
              <div className={`${levelColor} px-6 py-3 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTocOpen(o => !o)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition"
                    title="Toggle table of contents"
                  >
                    <HiMenuAlt2 className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{modal.assessment.company}</p>
                    <p className="text-white/70 text-xs">{rt?.label} · {modal.slides.length} sections</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {EXPORT_FMTS.map(fmt => (
                    <button key={fmt}
                      onClick={() => handleExport(modal.assessment, modal.level, fmt)}
                      disabled={!!exporting}
                      className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50">
                      <HiDownload className="w-3 h-3" />
                      {exporting?.fmt === fmt ? "..." : fmt}
                    </button>
                  ))}
                  <button onClick={() => setModal(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition ml-1">
                    <HiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body: TOC sidebar + content */}
              <div className="flex flex-1 overflow-hidden">

                {/* Table of Contents */}
                {tocOpen && (
                  <aside className="w-56 shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50/60 hidden md:block">
                    <p className="px-4 pt-4 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Contents</p>
                    <nav className="pb-4">
                      {modal.slides.map((slide, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const el = sectionRefs.current[i];
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-white hover:text-blue-700 transition leading-snug border-l-2 border-transparent hover:border-blue-400"
                        >
                          <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                          {slide.title}
                        </button>
                      ))}
                    </nav>
                  </aside>
                )}

                {/* Scrollable report content */}
                <main className="flex-1 overflow-y-auto">
                  <div className="max-w-3xl mx-auto px-8 py-8 space-y-10">

                    {/* Report cover */}
                    <div className="text-center pb-6 border-b border-gray-200">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${levelColor} mb-3`}>
                        {rt?.label.toUpperCase()}
                      </span>
                      <h1 className="text-2xl font-bold text-gray-900">{modal.assessment.company}</h1>
                      <p className="text-gray-400 text-sm mt-1">
                        {modal.assessment.category} · Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>

                    {/* Sections */}
                    {modal.slides.map((slide, i) => (
                      <section
                        key={i}
                        ref={el => { sectionRefs.current[i] = el; }}
                        className="scroll-mt-4"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span className={`w-7 h-7 rounded-lg ${levelColor} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                            {i + 1}
                          </span>
                          <h2 className="text-base font-bold text-gray-900">{slide.title}</h2>
                        </div>
                        <div className="pl-10">
                          {renderBody(slide.body)}
                        </div>
                        {i < modal.slides.length - 1 && (
                          <hr className="mt-10 border-gray-100" />
                        )}
                      </section>
                    ))}

                    {/* Footer */}
                    <div className="pt-6 border-t border-gray-200 text-center">
                      <p className="text-xs text-gray-400">End of {rt?.label} — {modal.assessment.company}</p>
                      <div className="flex justify-center gap-2 mt-4">
                        {EXPORT_FMTS.map(fmt => (
                          <button key={fmt}
                            onClick={() => handleExport(modal.assessment, modal.level, fmt)}
                            disabled={!!exporting}
                            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition disabled:opacity-50">
                            <HiDownload className="w-3.5 h-3.5" />
                            {exporting?.fmt === fmt ? "Exporting..." : `Export ${fmt}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
