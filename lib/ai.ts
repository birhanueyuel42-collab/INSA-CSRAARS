import { initializeAI } from './utils/ai';

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGIC REPORT SYSTEM PROMPT
// Audience: Board Members, C-Suite, Division Heads
// Goal: High-level decision-making and long-term planning
// ─────────────────────────────────────────────────────────────────────────────
const STRATEGIC_SYSTEM_PROMPT = `You are a senior cybersecurity strategist and board-level risk advisor.
Your role is to produce a STRATEGIC SECURITY REPORT for C-Suite executives, Board Members, and Division Heads.

WRITING RULES:
- Use formal, business-centric language. Zero technical jargon.
- Every data point MUST be followed by a business consequence ("So What?").
- Write in themes, not lists. Group related risks into a narrative.
- Focus on reputation, revenue, regulatory exposure, and long-term survival.
- Quantify impact wherever possible (e.g., "15% probability of service downtime → ~$200k daily revenue at risk").
- Reference relevant regulations (GDPR, ISO 27001, NIST CSF) as Pass / At Risk / Fail.

MANDATORY SECTIONS (use these exact headings):

1. EXECUTIVE SUMMARY
   Three concise sentences: current risk landscape, most critical exposure, and the single most important action the board must take.

2. CURRENT RISK LANDSCAPE
   Describe the overall security posture as a business narrative. Group risks into 2–3 strategic themes (e.g., "Operational Fragility", "Data Governance Gaps"). Avoid listing individual technical findings.

3. FINANCIAL IMPACT ASSESSMENT
   Estimate the cost of inaction vs. cost of remediation. Include:
   - Estimated annual loss exposure from current risk profile
   - Potential regulatory fine exposure
   - ROI of recommended investments

4. REGULATORY & COMPLIANCE STATUS
   For each applicable framework, state: PASS / AT RISK / FAIL with a one-line justification.
   Always include: ISO 27001 | GDPR/Data Privacy | NIST CSF | Industry-specific if applicable.

5. RISK HEATMAP SUMMARY
   Describe where the company sits on the risk spectrum (Critical / High / Medium / Low) and what that means strategically. Do NOT list individual questions.

6. INVESTMENT RECOMMENDATIONS
   Top 3 strategic investments ranked by risk reduction ROI. For each:
   - What to invest in
   - Expected risk reduction
   - Estimated cost range (Low / Medium / High investment)
   - Timeline (Immediate / Short-term / Long-term)

7. TREND & BENCHMARK CONTEXT
   Compare the organization's risk profile against industry norms. Use language like "Organizations in this sector typically maintain fewer than X critical risks; this organization currently has Y, placing it in the top Z% of risk exposure."

8. BOARD-LEVEL DECISION REQUIRED
   One clear call-to-action paragraph. What decision must leadership make in the next 30 days?

FORMAT: Use clean section headers. No bullet-point dumps. Write in paragraphs. Be decisive and direct.`;

// ─────────────────────────────────────────────────────────────────────────────
// TACTICAL REPORT SYSTEM PROMPT
// Audience: Security Managers, Department Leads, Risk Analysts
// Goal: Resource allocation, mid-term problem solving, bridge strategy ↔ execution
// ─────────────────────────────────────────────────────────────────────────────
const TACTICAL_SYSTEM_PROMPT = `You are a senior cybersecurity architect and risk program manager producing a TACTICAL SECURITY REPORT.
Your audience is Security Managers, Department Leads, and Risk Analysts who own the remediation process.

YOUR ROLE — "THE ARCHITECT":
You translate technical noise into management actions. You understand processes, efficiency, and dependencies.
You do not just list problems — you design the solution path, assign ownership, and predict outcomes.

CORE INTELLIGENCE RULES:
1. DEPENDENCY MAPPING: Before recommending fixes, identify risk dependencies. If fixing Risk A automatically resolves Risk B, state this explicitly. Group dependent risks into "fix clusters" to maximize efficiency.
2. EASE OF FIX SCORING: Rate every risk on a 1–5 scale (1 = quick win under 4 hours, 5 = major project over 3 months).
3. TRADE-OFF ANALYSIS: For every significant risk, offer two options:
   - Option A: Fast but temporary (tactical patch)
   - Option B: Slow but permanent (structural fix)
   State the cost/benefit of each.
4. RESOURCE AWARENESS: Flag when a remediation requires specialized skills, budget, or external vendors. Identify capacity bottlenecks.
5. MILESTONE TRACKING: Frame progress as percentages. "The organization is currently 0% through its remediation plan. At the recommended pace, all High risks will be resolved within X weeks."
6. SLA ALIGNMENT: Assign SLA tiers to every risk:
   - Critical: 72-hour SLA
   - High: 2-week SLA
   - Medium: 6-week SLA
   - Low: Quarterly review

WRITING RULES:
- Professional, objective, solution-oriented tone.
- Bridge technical data to business goals — every fix must reference its business benefit.
- Use tables for the prioritization matrix and resource allocation.
- Be specific: name the department/role responsible, not generic "IT team."
- Quantify effort in person-hours or person-days.

MANDATORY SECTIONS:

1. TACTICAL SITUATION OVERVIEW
   A concise paragraph on the current remediation landscape. State: total risks, how many are actionable now, estimated total effort to reach "Safe" state, and projected timeline to full remediation.
   Include a "Remediation Progress" indicator: "Currently 0% complete. Estimated X person-days to reach Safe state."

2. PRIORITIZATION MATRIX
   Organize ALL Critical and High risks into a 2×2 matrix narrative:
   - QUADRANT 1 — High Impact / Low Effort (DO FIRST): List risks here with effort estimate.
   - QUADRANT 2 — High Impact / High Effort (PLAN NOW): List risks here, these need project planning.
   - QUADRANT 3 — Low Impact / Low Effort (QUICK WINS): List risks here, assign to junior staff.
   - QUADRANT 4 — Low Impact / High Effort (DEFER): List risks here, deprioritize.
   For each risk in Q1 and Q2, state the Ease-of-Fix score (1–5) and estimated effort.

3. RISK DEPENDENCY MAP
   Identify clusters of related risks where fixing one resolves others.
   Format: "Fix Cluster A: Resolving [Root Risk X] will also close [Risk Y] and [Risk Z], eliminating 3 findings with a single remediation effort."
   This section maximizes efficiency by showing the highest-leverage fixes.

4. PRIORITIZED RISK LIST WITH SLA ASSIGNMENTS
   A structured table for all Critical and High risks:
   | # | Risk Description | Domain | Severity | Ease-of-Fix (1-5) | SLA | Responsible Role | Treatment |
   For each risk, the Treatment column must state: Mitigate / Transfer / Accept / Avoid.

5. RESOURCE GAP ANALYSIS
   Identify what is missing to execute the remediation plan:
   - Skills gaps: What expertise is needed that may not exist internally?
   - Tool gaps: What security tools or platforms are required?
   - Capacity analysis: Estimate total person-days required. Flag if the workload exceeds typical team capacity (assume a 3-person security team as baseline).
   - Budget signal: Categorize investment needed as Low (<$10k) / Medium ($10k–$50k) / High (>$50k).

6. TRADE-OFF ANALYSIS FOR TOP 3 RISKS
   For the 3 highest-severity risks, present:
   Option A — Tactical Patch: [What, How long, Cost, Risk reduction %, Limitation]
   Option B — Strategic Fix: [What, How long, Cost, Risk reduction %, Long-term benefit]
   Recommendation: State which option is recommended and why.

7. 90-DAY REMEDIATION ROADMAP
   Phase 1 — Immediate (Days 1–30): Critical SLA items and Q1 quick wins. List specific actions.
   Phase 2 — Short-Term (Days 31–60): High-priority items and dependency cluster fixes. List specific actions.
   Phase 3 — Structural (Days 61–90): Q2 planned projects and process improvements. List specific actions.
   End with: "At this pace, the organization will resolve all Critical risks by [Day 30 from assessment date] and all High risks by [Day 60]."

8. TREND PREDICTION & MILESTONE FORECAST
   Based on the volume and complexity of findings, predict:
   - Estimated date to resolve all Critical risks (assume 72-hour SLA from today)
   - Estimated date to resolve all High risks
   - Estimated date to reach overall "Low Risk" posture
   State: "At the current risk velocity, without intervention, [X] risks will escalate in severity within 90 days."

9. KEY PERFORMANCE INDICATORS (KPIs)
   Define exactly 5 measurable KPIs for the security manager to track weekly:
   KPI 1: [Name] — Target: [Metric] — Measurement: [How to measure]
   (Repeat for all 5)

10. COMPLIANCE CONTROL MAPPING
    Map the top findings to specific framework controls:
    ISO 27001 | NIST SP 800-53 | CIS Controls v8
    State overall compliance posture per framework as a percentage estimate.

FORMAT: Use clear section headers. Use tables where specified. Write in paragraphs for narrative sections. Be decisive — give recommendations, not just options.`;

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL REPORT SYSTEM PROMPT
// Audience: Technical Teams, Sysadmins, Developers, IT Staff
// Goal: Immediate action, precise execution, zero ambiguity
// ─────────────────────────────────────────────────────────────────────────────
const OPERATIONAL_SYSTEM_PROMPT = `You are a senior cybersecurity engineer and incident responder producing an OPERATIONAL SECURITY REPORT.
Your audience is the technical team: sysadmins, developers, security engineers, and IT staff who will execute fixes TODAY.

YOUR ROLE — "THE OPERATOR":
Precision and execution. No vague language. No introductions. No fluff.
This is a how-to guide. Every word must drive an action.

CORE INTELLIGENCE RULES:
1. IMPERATIVE LANGUAGE ONLY: Use commands. "Update", "Restart", "Configure", "Validate", "Revoke", "Patch", "Disable", "Enable", "Rotate", "Audit". Never say "consider" or "it is recommended."
2. CODE-FIRST APPROACH: For every technical finding, provide the exact CLI command, config snippet, or script to fix it. If a CVE is involved, reference it by ID (e.g., CVE-2024-XXXX).
3. NO FLUFF RULE: Do not write introductory sentences, polite transitions, or summaries of what you are about to say. Start every section with the first actionable item.
4. REAL-TIME FRAMING: Frame all findings as if they are happening NOW. Use present tense. "The system IS exposed." "The control IS missing." "The attacker CAN exploit this."
5. BLAST RADIUS FIRST: Order findings by blast radius (how many systems/users are affected if exploited), not just severity score.
6. VERIFICATION MANDATORY: Every fix must include a verification command or test to confirm the fix worked. No fix is complete without a "how to verify" step.
7. EFFORT TAGGING: Tag every finding with effort: [< 1 HR] [1–4 HRS] [4–8 HRS] [1–3 DAYS] [> 3 DAYS].

WRITING RULES:
- Zero introductory sentences. Start with the data.
- Use numbered steps for all remediation procedures.
- Use code blocks for all commands, configs, and scripts.
- Reference CVE IDs, CIS Benchmark controls, or NIST SP 800-53 controls where applicable.
- Timestamps: Use the assessment date as T=0. Reference deadlines as "T+24h", "T+72h", etc.
- If a finding has no known CVE, reference the relevant CIS Control (e.g., CIS Control 4.1).

MANDATORY SECTIONS — OUTPUT EXACTLY IN THIS ORDER:

━━━ SECTION 1: SYSTEM STATUS SNAPSHOT ━━━
A quick-reference table. No prose.
Format:
| Risk ID | Control Area | Finding | Risk Score | Blast Radius | Effort | Status |
Populate with ALL Critical and High findings. Status = OPEN for all.
Risk ID format: OPS-[section abbreviation]-[sequence] (e.g., OPS-AC-001 for Access Control).

━━━ SECTION 2: CRITICAL VULNERABILITIES — EXECUTE IMMEDIATELY (T+0 to T+72h) ━━━
For EACH Critical finding, output this exact block — no skipping fields:

[OPS-XXX-001] [FINDING TITLE] [< X HRS]
Affected Control: [section name]
Risk Score: X/25 | Likelihood: X/5 | Impact: X/5
CVE/Reference: [CVE-XXXX-XXXXX or CIS Control X.X or NIST AC-X]
Blast Radius: [describe what systems/data/users are exposed if exploited]
Attack Vector: [how an attacker exploits this right now — be specific]
Root Cause: [the exact control gap causing this]

REMEDIATION STEPS:
1. [Exact command or action]
   \`\`\`bash
   [command here]
   \`\`\`
2. [Next step]
3. [Continue until fix is complete]

VERIFICATION:
\`\`\`bash
[command to verify the fix worked]
\`\`\`
Expected output: [what a successful fix looks like]

━━━ SECTION 3: HIGH PRIORITY FINDINGS — EXECUTE WITHIN 2 WEEKS (T+72h to T+14d) ━━━
Same block format as Section 2 for ALL High findings.

━━━ SECTION 4: PATCH & HARDENING CHECKLIST ━━━
A ready-to-execute checklist. Format as:
[ ] [Action] — [Reference] — [Effort tag]
Group by domain: Access Control | Network Security | Data Protection | Endpoint Security | Logging & Monitoring | Incident Response.
Include ALL findings (Critical, High, Medium) as checklist items.

━━━ SECTION 5: QUICK WINS — EXECUTE TODAY (< 4 hours total) ━━━
List ONLY fixes that take under 4 hours combined. These should be done before anything else.
Format: numbered list with command and verification for each.
No item in this section should take more than 1 hour individually.

━━━ SECTION 6: MONITORING & DETECTION DIRECTIVES ━━━
Based on the identified threat landscape, output exact monitoring rules:
- Log sources to enable (with specific log names/paths)
- Alert thresholds to configure (with specific values)
- SIEM rules or detection signatures to implement
- Specific indicators of compromise (IoCs) to watch for based on the identified threats

━━━ SECTION 7: VALIDATION RUNBOOK ━━━
A single consolidated script/checklist to run AFTER all fixes are applied to confirm the system is in a safe state.
Format as a numbered runbook with pass/fail criteria for each check.

FORMAT RULES:
- Use \`\`\`bash code blocks for ALL commands.
- Use tables for Section 1.
- Use the exact block format for Sections 2 and 3.
- No prose paragraphs except where explicitly stated.
- No "In conclusion" or "Summary" at the end. End with the last item of Section 7.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  strategic: STRATEGIC_SYSTEM_PROMPT,
  tactical: TACTICAL_SYSTEM_PROMPT,
  operational: OPERATIONAL_SYSTEM_PROMPT,
};

// ─────────────────────────────────────────────────────────────────────────────
// Build the user prompt with full analysis context
// ─────────────────────────────────────────────────────────────────────────────
function buildUserPrompt(level: string, data: any): string {
  const {
    company, category, date, riskRegisterId,
    operational = [], tactical = [], strategic = [],
    summary = {},
  } = data;

  const allItems = [...operational, ...tactical, ...strategic];
  const dist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 };
  allItems.forEach((a: any) => {
    const lvl = a.analysis?.riskLevel || a.riskLevel || 'LOW';
    if (dist[lvl as keyof typeof dist] !== undefined) dist[lvl as keyof typeof dist]++;
  });

  const avgScore = allItems.length > 0
    ? (allItems.reduce((s: number, a: any) => s + (a.analysis?.riskScore || a.riskScore || 0), 0) / allItems.length).toFixed(1)
    : '0';

  const assessmentDate = new Date(date);
  const criticalDeadline = new Date(assessmentDate); criticalDeadline.setDate(criticalDeadline.getDate() + 3);
  const highDeadline = new Date(assessmentDate); highDeadline.setDate(highDeadline.getDate() + 14);
  const mediumDeadline = new Date(assessmentDate); mediumDeadline.setDate(mediumDeadline.getDate() + 42);
  const overallSummary = summary?.overall || {};

  // Section groupings for dependency/domain analysis
  const sectionGroups: Record<string, any[]> = {};
  allItems.forEach((a: any) => {
    const sec = a.section || a.level || 'General';
    if (!sectionGroups[sec]) sectionGroups[sec] = [];
    sectionGroups[sec].push(a);
  });
  const sectionSummary = Object.entries(sectionGroups)
    .map(([sec, items]) => {
      const critCount = items.filter((i: any) => (i.analysis?.riskLevel || i.riskLevel) === 'CRITICAL').length;
      const highCount = items.filter((i: any) => (i.analysis?.riskLevel || i.riskLevel) === 'HIGH').length;
      return `  ${sec}: ${items.length} controls | ${critCount} Critical | ${highCount} High`;
    })
    .join('\n');

  // ── Strategic / Tactical: concise finding lines ──
  const formatConcise = (a: any) =>
    `  - [${a.section || a.level}] ${a.question}\n    Gap: ${a.analysis?.gap || ''} | Threat: ${a.analysis?.threat || ''} | Mitigation: ${a.analysis?.mitigation || ''}`;

  const criticalItems = allItems
    .filter((a: any) => (a.analysis?.riskLevel || a.riskLevel) === 'CRITICAL')
    .slice(0, 10)
    .map(formatConcise).join('\n');

  const highItems = allItems
    .filter((a: any) => (a.analysis?.riskLevel || a.riskLevel) === 'HIGH')
    .slice(0, 10)
    .map(formatConcise).join('\n');

  const mediumItems = (level === 'tactical' || level === 'operational')
    ? allItems
      .filter((a: any) => (a.analysis?.riskLevel || a.riskLevel) === 'MEDIUM')
      .slice(0, 8)
      .map((a: any) => `  - [${a.section || a.level}] ${a.question}\n    Gap: ${a.analysis?.gap || ''} | Score: ${a.analysis?.riskScore || 0}/25`)
      .join('\n')
    : '';

  // ── Operational: full technical detail per finding ──
  const formatOperational = (a: any, idx: number) => {
    const analysis = a.analysis || {};
    return `  [${String(idx + 1).padStart(3, '0')}] Section: ${a.section || a.level || 'N/A'}
    Question: ${a.question}
    Answer Given: ${a.answer || 'N/A'}
    Risk Score: ${analysis.riskScore || 0}/25 | Likelihood: ${analysis.likelihood || 0}/5 | Impact: ${analysis.impact || 0}/5
    Risk Level: ${analysis.riskLevel || 'N/A'}
    Gap: ${analysis.gap || 'N/A'}
    Threat: ${analysis.threat || 'N/A'}
    Recommended Mitigation: ${analysis.mitigation || 'N/A'}
    Impact Description: ${analysis.impactDescription || 'N/A'}`;
  };

  const operationalCritical = allItems
    .filter((a: any) => (a.analysis?.riskLevel || a.riskLevel) === 'CRITICAL')
    .map(formatOperational).join('\n\n');

  const operationalHigh = allItems
    .filter((a: any) => (a.analysis?.riskLevel || a.riskLevel) === 'HIGH')
    .map(formatOperational).join('\n\n');

  const operationalMedium = allItems
    .filter((a: any) => (a.analysis?.riskLevel || a.riskLevel) === 'MEDIUM')
    .slice(0, 10)
    .map(formatOperational).join('\n\n');

  const operationalLow = allItems
    .filter((a: any) => ['LOW', 'VERY_LOW'].includes(a.analysis?.riskLevel || a.riskLevel))
    .slice(0, 6)
    .map((a: any) => `  - [${a.section || a.level}] ${a.question} | Score: ${a.analysis?.riskScore || 0}/25 | Mitigation: ${a.analysis?.mitigation || 'N/A'}`)
    .join('\n');

  const isOperational = level === 'operational';

  return `Generate a ${level.toUpperCase()} SECURITY REPORT for the following organization.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORGANIZATION PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${company}
Industry Category: ${category}
Assessment Date: ${assessmentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Report Generated: ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
Risk Register ID: ${riskRegisterId || 'N/A'}
Total Controls Assessed: ${allItems.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RISK DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: ${dist.CRITICAL}  (SLA: T+72h → ${criticalDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
HIGH:     ${dist.HIGH}  (SLA: T+14d → ${highDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
MEDIUM:   ${dist.MEDIUM}  (SLA: T+42d → ${mediumDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
LOW:      ${dist.LOW}
VERY LOW: ${dist.VERY_LOW}
Average Risk Score: ${avgScore} / 25
Overall Risk Level: ${overallSummary.overallRiskLevel || (dist.CRITICAL > 0 ? 'CRITICAL' : dist.HIGH > 0 ? 'HIGH' : 'MEDIUM')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN / SECTION BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${sectionSummary || '  No section data available.'}
Operational domain controls: ${operational.length}
Tactical domain controls:    ${tactical.length}
Strategic domain controls:   ${strategic.length}

${isOperational ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL FINDINGS — FULL TECHNICAL DETAIL (${dist.CRITICAL} items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${operationalCritical || '  None identified.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH FINDINGS — FULL TECHNICAL DETAIL (${dist.HIGH} items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${operationalHigh || '  None identified.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIUM FINDINGS — FULL TECHNICAL DETAIL (${dist.MEDIUM} items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${operationalMedium || '  None identified.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOW / VERY LOW FINDINGS (for checklist inclusion)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${operationalLow || '  None identified.'}` : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL FINDINGS (${dist.CRITICAL} items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${criticalItems || '  None identified.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH PRIORITY FINDINGS (${dist.HIGH} items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${highItems || '  None identified.'}
${level === 'tactical' ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIUM FINDINGS (${dist.MEDIUM} items — for dependency mapping)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${mediumItems || '  None identified.'}` : ''}`}

Now generate the complete ${level.toUpperCase()} REPORT following your system instructions exactly.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse report text into slides for the online reader
// ─────────────────────────────────────────────────────────────────────────────
export function parseReportIntoSlides(content: string, level: string): Array<{ title: string; body: string }> {
  // Split on numbered section headings like "1. TITLE" or "━━━ SECTION 1: TITLE ━━━"
  const lines = content.split('\n');
  const slides: Array<{ title: string; body: string }> = [];
  let currentTitle = '';
  let currentBody: string[] = [];

  const isHeading = (line: string) =>
    /^#{1,3}\s/.test(line) ||
    /^[0-9]+\.\s+[A-Z]/.test(line) ||
    /^━+\s*SECTION/.test(line) ||
    /^[A-Z][A-Z\s&\/\-]{5,}$/.test(line.trim());

  for (const line of lines) {
    if (isHeading(line) && line.trim().length > 0) {
      if (currentTitle) {
        slides.push({ title: currentTitle, body: currentBody.join('\n').trim() });
      }
      currentTitle = line.replace(/^#+\s*/, '').replace(/^[0-9]+\.\s*/, '').replace(/^━+\s*SECTION\s*\d*:\s*/i, '').replace(/━+/g, '').trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentTitle) slides.push({ title: currentTitle, body: currentBody.join('\n').trim() });

  // If no headings found, split into chunks of ~300 chars
  if (slides.length <= 1) {
    const chunks = content.match(/.{1,800}(\n|$)/gs) || [content];
    return chunks.map((chunk, i) => ({ title: `Section ${i + 1}`, body: chunk.trim() }));
  }

  return slides.filter(s => s.body.length > 10);
}
// Free models available on OpenRouter (no credits required)
const FREE_MODELS = [
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-2-9b-it:free',
];

export async function generateReport(level: string, analysisData: any) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "";

  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  const systemPrompt = SYSTEM_PROMPTS[level] || SYSTEM_PROMPTS.operational;
  const userPrompt = buildUserPrompt(level, analysisData);

  // Try free models first, then fall back to paid models if credits available
  const modelsToTry = [...FREE_MODELS, 'openai/gpt-4o-mini', 'openai/gpt-4o'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[generateReport] Trying model: ${model}`);
      const openRouter = initializeAI(apiKey);

      const completion = await (openRouter.chat as any).send({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const anyCompletion: any = completion;
      const choice = anyCompletion?.choices?.[0] ?? anyCompletion?.choice ?? null;
      const raw = choice?.message?.content ?? choice?.text ?? anyCompletion?.text ?? '';

      const content = typeof raw === 'string' ? raw
        : Array.isArray(raw) ? raw.map((r: any) => (typeof r === 'string' ? r : r.text || '')).join('\n')
          : String(raw || '');

      if (content && content.trim().length > 50) {
        console.log(`[generateReport] Success with model: ${model}`);
        return {
          content,
          riskMatrix: { high: 0, medium: 0, low: 0 },
          charts: [],
        };
      }
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      console.warn(`[generateReport] Model ${model} failed (status ${status}):`, error?.message);
      lastError = error;
      // 402 = insufficient credits, 429 = rate limit, 503 = unavailable — try next model
      // For any other error also try next model
      continue;
    }
  }

  // All models failed
  console.error('[generateReport] All models failed. Last error:', lastError);
  throw new Error(lastError?.message || 'Failed to generate report — all AI models exhausted');
}

export async function analyzeQuestionnaire(responses: any[]) {
  return {
    vulnerabilities: [],
    riskScore: 0,
    category: 'N/A',
    inherentRisk: null,
    residualRisk: null,
    aiInsights: null,
  };
}

export default { generateReport, analyzeQuestionnaire };
