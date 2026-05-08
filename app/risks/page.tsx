"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

interface QuestionAnalysis {
  questionId: string;
  level: string;
  question: string;
  answer: string;

  // New fields
  riskName: string;
  description: string;
  status: 'Open' | 'Closed';
  riskType: 'Risk' | 'Issue';
  threatOpportunity: 'Threat' | 'Opportunity';
  assignedTo: string;

  // Pre-Mitigation
  preMitigationProbability: number;
  preMitigationImpact: number;
  preMitigationScore: number;
  preMitigationCost: number;

  // Current values
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: string;

  // Post-Mitigation
  postMitigationProbability: number;
  postMitigationImpact: number;
  postMitigationScore: number;
  postMitigationCost: number;

  // Mitigation details
  mitigationCost: number;
  gap: string;
  threat: string;
  mitigation: string;
  impactLabel?: string;
  impactDescription?: string;
}

interface ProcessedAssessment {
  _id: string; // RiskAnalysis _id
  riskRegisterId: string; // Risk Register ID
  company: string;
  category: string;
  date: string;
  analyses: QuestionAnalysis[];
}

type SortOrder = "newest" | "oldest";

interface EditingState {
  analysisId: string;
  questionId: string;
  level: string;

  // New fields
  riskName: string;
  description: string;
  status: 'Open' | 'Closed';
  riskType: 'Risk' | 'Issue';
  threatOpportunity: 'Threat' | 'Opportunity';
  assignedTo: string;

  // Pre-Mitigation
  preMitigationProbability: string;
  preMitigationImpact: string;
  preMitigationCost: string;

  // Current values
  likelihood: string;
  impact: string;

  // Post-Mitigation
  postMitigationProbability: string;
  postMitigationImpact: string;
  postMitigationCost: string;

  // Mitigation details
  mitigationCost: string;
  gap: string;
  threat: string;
  mitigation: string;
  impactLabel: string;
  impactDescription: string;
}

export default function RiskRegisterFromAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<ProcessedAssessment[]>([]);

  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Column visibility ──────────────────────────────────────────────────────
  const ALL_COLUMNS = [
    { key: "riskId",        label: "Risk ID" },
    { key: "riskName",      label: "Risk Name" },
    { key: "status",        label: "Status" },
    { key: "riskType",      label: "Risk/Issue" },
    { key: "threatOpp",     label: "Threat/Opp" },
    { key: "assignedTo",    label: "Assigned To" },
    { key: "company",       label: "Company" },
    { key: "category",      label: "Category" },
    { key: "date",          label: "Date" },
    { key: "level",         label: "Level" },
    { key: "preProb",       label: "Pre-Prob%" },
    { key: "preImpact",     label: "Pre-Impact%" },
    { key: "preScore",      label: "Pre-Score%" },
    { key: "preCost",       label: "Pre-Cost$" },
    { key: "likelihood",    label: "Likelihood" },
    { key: "impact",        label: "Impact" },
    { key: "riskScore",     label: "Risk Score" },
    { key: "riskLevel",     label: "Risk Level" },
    { key: "postProb",      label: "Post-Prob%" },
    { key: "postImpact",    label: "Post-Impact%" },
    { key: "postScore",     label: "Post-Score%" },
    { key: "postCost",      label: "Post-Cost$" },
    { key: "mitigCost",     label: "Mitigation Cost$" },
    { key: "gap",           label: "Gap" },
    { key: "threat",        label: "Threat" },
    { key: "mitigation",    label: "Mitigation" },
    { key: "description",   label: "Description" },
    { key: "impactLabel",   label: "Impact Label" },
    { key: "impactDesc",    label: "Impact Description" },
  ] as const;
  type ColKey = typeof ALL_COLUMNS[number]["key"];
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set([
    "riskId", "riskName", "status", "riskType", "threatOpp",
    "assignedTo", "company", "category", "date", "level",
    "preProb", "preImpact", "preScore", "preCost",
    "postProb", "postImpact", "postScore", "postCost",
    "mitigCost",
  ]));
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [noneMode, setNoneMode] = useState(false);
  const toggleCol = (key: ColKey) => { setNoneMode(false); setVisibleCols(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); };
  const show = (key: ColKey) => visibleCols.has(key);
  const showTd = (key: ColKey) => !noneMode && visibleCols.has(key);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchAssessments();
    }
  }, [status, router]);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();

      const list: ProcessedAssessment[] = Array.isArray(data.assessments)
        ? data.assessments
        : [];

      setAssessments(list);

      const companies = Array.from(
        new Set(list.map((a) => a.company).filter((c): c is string => !!c))
      );
      setAvailableCompanies(companies);

      const categories = Array.from(
        new Set(list.map((a) => a.category).filter((c): c is string => !!c))
      );
      setAvailableCategories(categories);

      setLoading(false);
    } catch (error) {
      console.error("Error loading assessments", error);
      setAssessments([]);
      setLoading(false);
    }
  };

  // 1) sort assessments by date
  const sortedAssessments = useMemo(() => {
    const copy = [...assessments];
    copy.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return copy;
  }, [assessments, sortOrder]);

  // 2) apply company/category and date range filters
  const filteredAssessments = useMemo(() => {
    return sortedAssessments.filter((a) => {
      const matchCompany =
        !companyFilter ||
        (a.company || "").toLowerCase() === companyFilter.toLowerCase();
      const matchCategory =
        !categoryFilter ||
        (a.category || "").toLowerCase() === categoryFilter.toLowerCase();

      if (!matchCompany || !matchCategory) return false;

      const d = new Date(a.date);
      if (startDate) {
        const start = new Date(startDate);
        if (d < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }

      return true;
    });
  }, [sortedAssessments, companyFilter, categoryFilter, startDate, endDate]);

  // 3) flatten to rows and filter by risk level
  const rows: Array<
    QuestionAnalysis & {
      riskRegisterId: string;
      company: string;
      category: string;
      date: string;
      analysisId: string;
    }
  > = filteredAssessments
    .flatMap((a) =>
      (a.analyses || []).map((q) => ({
        ...q,
        riskRegisterId: a.riskRegisterId,
        company: a.company,
        category: a.category,
        date: a.date,
        analysisId: a._id,
      }))
    )
    .filter((q) => {
      if (riskLevelFilter && (q.riskLevel || "").toLowerCase() !== riskLevelFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter && (q.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });

  const startEditing = (row: {
    analysisId: string;
    questionId: string;
    level: string;
    riskName: string;
    description: string;
    status: 'Open' | 'Closed';
    riskType: 'Risk' | 'Issue';
    threatOpportunity: 'Threat' | 'Opportunity';
    assignedTo: string;
    preMitigationProbability: number;
    preMitigationImpact: number;
    preMitigationCost: number;
    likelihood: number;
    impact: number;
    postMitigationProbability: number;
    postMitigationImpact: number;
    postMitigationCost: number;
    mitigationCost: number;
    gap: string;
    threat: string;
    mitigation: string;
    impactLabel?: string;
    impactDescription?: string;
  }) => {
    setEditing({
      analysisId: row.analysisId,
      questionId: row.questionId,
      level: row.level,
      riskName: row.riskName ?? "",
      description: row.description ?? "",
      status: row.status ?? "Open",
      riskType: row.riskType ?? "Risk",
      threatOpportunity: row.threatOpportunity ?? "Threat",
      assignedTo: row.assignedTo ?? "",
      preMitigationProbability: String(row.preMitigationProbability ?? ""),
      preMitigationImpact: String(row.preMitigationImpact ?? ""),
      preMitigationCost: String(row.preMitigationCost ?? ""),
      likelihood: String(row.likelihood ?? ""),
      impact: String(row.impact ?? ""),
      postMitigationProbability: String(row.postMitigationProbability ?? ""),
      postMitigationImpact: String(row.postMitigationImpact ?? ""),
      postMitigationCost: String(row.postMitigationCost ?? ""),
      mitigationCost: String(row.mitigationCost ?? ""),
      gap: row.gap ?? "",
      threat: row.threat ?? "",
      mitigation: row.mitigation ?? "",
      impactLabel: row.impactLabel ?? "",
      impactDescription: row.impactDescription ?? "",
    });
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;

    try {
      setSaving(true);

      const res = await fetch("/api/analysis/processed/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: editing.analysisId,
          level: editing.level,
          questionId: Number(editing.questionId),

          // New fields
          riskName: editing.riskName,
          description: editing.description,
          status: editing.status,
          riskType: editing.riskType,
          threatOpportunity: editing.threatOpportunity,
          assignedTo: editing.assignedTo,

          // Pre-Mitigation
          preMitigationProbability: editing.preMitigationProbability.trim() === "" ? undefined : Number(editing.preMitigationProbability),
          preMitigationImpact: editing.preMitigationImpact.trim() === "" ? undefined : Number(editing.preMitigationImpact),
          preMitigationCost: editing.preMitigationCost.trim() === "" ? undefined : Number(editing.preMitigationCost),

          // Current values
          likelihood: editing.likelihood.trim() === "" ? undefined : Number(editing.likelihood),
          impact: editing.impact.trim() === "" ? undefined : Number(editing.impact),

          // Post-Mitigation
          postMitigationProbability: editing.postMitigationProbability.trim() === "" ? undefined : Number(editing.postMitigationProbability),
          postMitigationImpact: editing.postMitigationImpact.trim() === "" ? undefined : Number(editing.postMitigationImpact),
          postMitigationCost: editing.postMitigationCost.trim() === "" ? undefined : Number(editing.postMitigationCost),

          // Mitigation details
          mitigationCost: editing.mitigationCost.trim() === "" ? undefined : Number(editing.mitigationCost),
          gap: editing.gap,
          threat: editing.threat,
          mitigation: editing.mitigation,
          impactLabel: editing.impactLabel,
          impactDescription: editing.impactDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Failed to update assessment", data);
        setSaving(false);
        return;
      }

      const updatedAssessment = data.assessment as ProcessedAssessment;

      setAssessments((prev) =>
        prev.map((a) =>
          a._id === updatedAssessment._id ? updatedAssessment : a
        )
      );

      setSaving(false);
      setEditing(null);
    } catch (error) {
      console.error("Error updating assessment", error);
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading assessments...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">
          Risk Register (from Assessments)
        </h1>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Filters</span>
            <div className="relative">
              <button onClick={() => setColMenuOpen(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded text-xs font-semibold transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                Customization ({visibleCols.size}/{ALL_COLUMNS.length})
                <svg className={`w-3 h-3 transition-transform duration-200 ${colMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {colMenuOpen && (
                <div onClick={e => e.stopPropagation()} className="absolute right-0 top-9 z-50 w-52 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 space-y-1">
                  <div className="flex gap-2 pb-2 border-b border-slate-700 mb-1">
                    <button onClick={() => { setNoneMode(false); setVisibleCols(new Set(ALL_COLUMNS.map(c => c.key))); }} className="flex-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold">Select All</button>
                  </div>
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 px-1 py-0.5 rounded">
                      <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} className="accent-blue-500 w-3.5 h-3.5" />
                      <span className="text-xs text-slate-300">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {/* Company */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Risk level */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Risk level
              </label>
              <select
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Sort + date range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Sort order */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Sort by date
              </label>
              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as SortOrder)
                }
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="newest">Newest to oldest</option>
                <option value="oldest">Oldest to newest</option>
              </select>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Table + editing */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">
              No records match the current filters.
            </p>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse text-slate-100">
              <thead>
                <tr className="border-b border-slate-700">
                  {show("riskId")      && <th className="py-2 pr-3">Risk ID</th>}
                  {show("riskName")    && <th className="py-2 pr-3">Risk Name</th>}
                  {show("status")      && <th className="py-2 pr-3">Status</th>}
                  {show("riskType")    && <th className="py-2 pr-3">Risk/Issue</th>}
                  {show("threatOpp")   && <th className="py-2 pr-3">Threat/Opp</th>}
                  {show("assignedTo")  && <th className="py-2 pr-3">Assigned To</th>}
                  {show("company")     && <th className="py-2 pr-3">Company</th>}
                  {show("category")    && <th className="py-2 pr-3">Category</th>}
                  {show("date")        && <th className="py-2 pr-3">Date</th>}
                  {show("level")       && <th className="py-2 pr-3">Level</th>}
                  {show("preProb")     && <th className="py-2 pr-3 bg-orange-900/20">Pre-Prob%</th>}
                  {show("preImpact")   && <th className="py-2 pr-3 bg-orange-900/20">Pre-Impact%</th>}
                  {show("preScore")    && <th className="py-2 pr-3 bg-orange-900/20">Pre-Score%</th>}
                  {show("preCost")     && <th className="py-2 pr-3 bg-orange-900/20">Pre-Cost$</th>}
                  {show("likelihood")  && <th className="py-2 pr-3">Likelihood</th>}
                  {show("impact")      && <th className="py-2 pr-3">Impact</th>}
                  {show("riskScore")   && <th className="py-2 pr-3">Risk Score</th>}
                  {show("riskLevel")   && <th className="py-2 pr-3">Risk Level</th>}
                  {show("postProb")    && <th className="py-2 pr-3 bg-green-900/20">Post-Prob%</th>}
                  {show("postImpact")  && <th className="py-2 pr-3 bg-green-900/20">Post-Impact%</th>}
                  {show("postScore")   && <th className="py-2 pr-3 bg-green-900/20">Post-Score%</th>}
                  {show("postCost")    && <th className="py-2 pr-3 bg-green-900/20">Post-Cost$</th>}
                  {show("mitigCost")   && <th className="py-2 pr-3">Mitigation Cost$</th>}
                  {show("gap")         && <th className="py-2 pr-3">Gap</th>}
                  {show("threat")      && <th className="py-2 pr-3">Threat</th>}
                  {show("mitigation")  && <th className="py-2 pr-3">Mitigation</th>}
                  {show("description") && <th className="py-2 pr-3">Description</th>}
                  {show("impactLabel") && <th className="py-2 pr-3">Impact Label</th>}
                  {show("impactDesc")  && <th className="py-2 pr-3">Impact Description</th>}
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const isEditing = editing && editing.analysisId === r.analysisId && editing.questionId === r.questionId && editing.level === r.level;
                  return (
                    <tr key={`${r.analysisId}-${r.questionId}-${idx}`} className="border-b border-slate-700 last:border-b-0">
                      {showTd("riskId")      && <td className="py-2 pr-3 font-mono text-emerald-400">{r.riskRegisterId}</td>}
                      {showTd("riskName")    && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.riskName} onChange={e => setEditing(p => p ? {...p, riskName: e.target.value} : p)} className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.riskName || '-')}</td>}
                      {showTd("status")      && <td className="py-2 pr-3">{isEditing ? <select value={editing.status} onChange={e => setEditing(p => p ? {...p, status: e.target.value as 'Open'|'Closed'} : p)} className="w-24 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"><option value="Open">Open</option><option value="Closed">Closed</option></select> : <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.status === 'Open' ? 'bg-yellow-400 text-yellow-900' : 'bg-green-400 text-green-900'}`}>{r.status || 'Open'}</span>}</td>}
                      {showTd("riskType")    && <td className="py-2 pr-3">{isEditing ? <select value={editing.riskType} onChange={e => setEditing(p => p ? {...p, riskType: e.target.value as 'Risk'|'Issue'} : p)} className="w-24 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"><option value="Risk">Risk</option><option value="Issue">Issue</option></select> : (r.riskType || 'Risk')}</td>}
                      {showTd("threatOpp")   && <td className="py-2 pr-3">{isEditing ? <select value={editing.threatOpportunity} onChange={e => setEditing(p => p ? {...p, threatOpportunity: e.target.value as 'Threat'|'Opportunity'} : p)} className="w-28 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white"><option value="Threat">Threat</option><option value="Opportunity">Opportunity</option></select> : (r.threatOpportunity || 'Threat')}</td>}
                      {showTd("assignedTo")  && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.assignedTo} onChange={e => setEditing(p => p ? {...p, assignedTo: e.target.value} : p)} className="w-32 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.assignedTo || '-')}</td>}
                      {showTd("company")     && <td className="py-2 pr-3">{r.company}</td>}
                      {showTd("category")    && <td className="py-2 pr-3">{r.category}</td>}
                      {showTd("date")        && <td className="py-2 pr-3">{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>}
                      {showTd("level")       && <td className="py-2 pr-3">{r.level}</td>}
                      {showTd("preProb")     && <td className="py-2 pr-3 bg-orange-900/10">{isEditing ? <input type="number" min={0} max={100} value={editing.preMitigationProbability} onChange={e => setEditing(p => p ? {...p, preMitigationProbability: e.target.value} : p)} className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.preMitigationProbability || 0}%`}</td>}
                      {showTd("preImpact")   && <td className="py-2 pr-3 bg-orange-900/10">{isEditing ? <input type="number" min={0} max={100} value={editing.preMitigationImpact} onChange={e => setEditing(p => p ? {...p, preMitigationImpact: e.target.value} : p)} className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.preMitigationImpact || 0}%`}</td>}
                      {showTd("preScore")    && <td className="py-2 pr-3 bg-orange-900/10">{r.preMitigationScore?.toFixed(2) || 0}%</td>}
                      {showTd("preCost")     && <td className="py-2 pr-3 bg-orange-900/10">{isEditing ? <input type="number" min={0} step={0.01} value={editing.preMitigationCost} onChange={e => setEditing(p => p ? {...p, preMitigationCost: e.target.value} : p)} className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.preMitigationCost?.toFixed(2) || 0}`}</td>}
                      {showTd("likelihood")  && <td className="py-2 pr-3">{isEditing ? <input type="number" min={0} max={5} value={editing.likelihood} onChange={e => setEditing(p => p ? {...p, likelihood: e.target.value} : p)} className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : r.likelihood}</td>}
                      {showTd("impact")      && <td className="py-2 pr-3">{isEditing ? <input type="number" min={0} max={5} value={editing.impact} onChange={e => setEditing(p => p ? {...p, impact: e.target.value} : p)} className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : r.impact}</td>}
                      {showTd("riskScore")   && <td className="py-2 pr-3">{r.riskScore}</td>}
                      {showTd("riskLevel")   && <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded text-xs ${r.riskLevel === 'CRITICAL' ? 'bg-red-600/30 text-red-300' : r.riskLevel === 'HIGH' ? 'bg-orange-600/30 text-orange-300' : r.riskLevel === 'MEDIUM' ? 'bg-yellow-600/30 text-yellow-300' : 'bg-green-600/30 text-green-300'}`}>{r.riskLevel}</span></td>}
                      {showTd("postProb")    && <td className="py-2 pr-3 bg-green-900/10">{isEditing ? <input type="number" min={0} max={100} value={editing.postMitigationProbability} onChange={e => setEditing(p => p ? {...p, postMitigationProbability: e.target.value} : p)} className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.postMitigationProbability || 0}%`}</td>}
                      {showTd("postImpact")  && <td className="py-2 pr-3 bg-green-900/10">{isEditing ? <input type="number" min={0} max={100} value={editing.postMitigationImpact} onChange={e => setEditing(p => p ? {...p, postMitigationImpact: e.target.value} : p)} className="w-16 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.postMitigationImpact || 0}%`}</td>}
                      {showTd("postScore")   && <td className="py-2 pr-3 bg-green-900/10">{r.postMitigationScore?.toFixed(2) || 0}%</td>}
                      {showTd("postCost")    && <td className="py-2 pr-3 bg-green-900/10">{isEditing ? <input type="number" min={0} step={0.01} value={editing.postMitigationCost} onChange={e => setEditing(p => p ? {...p, postMitigationCost: e.target.value} : p)} className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.postMitigationCost?.toFixed(2) || 0}`}</td>}
                      {showTd("mitigCost")   && <td className="py-2 pr-3">{isEditing ? <input type="number" min={0} step={0.01} value={editing.mitigationCost} onChange={e => setEditing(p => p ? {...p, mitigationCost: e.target.value} : p)} className="w-20 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : `${r.mitigationCost?.toFixed(2) || 0}`}</td>}
                      {showTd("gap")         && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.gap} onChange={e => setEditing(p => p ? {...p, gap: e.target.value} : p)} className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.gap || '-')}</td>}
                      {showTd("threat")      && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.threat} onChange={e => setEditing(p => p ? {...p, threat: e.target.value} : p)} className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.threat || '-')}</td>}
                      {showTd("mitigation")  && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.mitigation} onChange={e => setEditing(p => p ? {...p, mitigation: e.target.value} : p)} className="w-40 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.mitigation || '-')}</td>}
                      {showTd("description") && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.description} onChange={e => setEditing(p => p ? {...p, description: e.target.value} : p)} className="w-64 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.description || '-')}</td>}
                      {showTd("impactLabel") && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.impactLabel} onChange={e => setEditing(p => p ? {...p, impactLabel: e.target.value} : p)} className="w-32 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.impactLabel || '-')}</td>}
                      {showTd("impactDesc")  && <td className="py-2 pr-3">{isEditing ? <input type="text" value={editing.impactDescription} onChange={e => setEditing(p => p ? {...p, impactDescription: e.target.value} : p)} className="w-64 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-white" /> : (r.impactDescription || '-')}</td>}
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={saveEdit} disabled={saving} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs">{saving ? "Saving..." : "Save"}</button>
                            <button onClick={cancelEditing} disabled={saving} className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing({ analysisId: r.analysisId, questionId: r.questionId, level: r.level, riskName: r.riskName, description: r.description, status: r.status, riskType: r.riskType, threatOpportunity: r.threatOpportunity, assignedTo: r.assignedTo, preMitigationProbability: r.preMitigationProbability, preMitigationImpact: r.preMitigationImpact, preMitigationCost: r.preMitigationCost, likelihood: r.likelihood, impact: r.impact, postMitigationProbability: r.postMitigationProbability, postMitigationImpact: r.postMitigationImpact, postMitigationCost: r.postMitigationCost, mitigationCost: r.mitigationCost, gap: r.gap, threat: r.threat, mitigation: r.mitigation, impactLabel: r.impactLabel, impactDescription: r.impactDescription })} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs">Edit</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
