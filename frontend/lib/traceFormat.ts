export type Severity = "high" | "medium" | "low";

export type CheckStatus = "clear" | "flagged" | "warning" | "info";

export interface Finding {
  label: string;
  severity: Severity;
}

export interface FormattedCheck {
  id: string;
  step: number;
  title: string;
  category: string;
  description: string;
  status: CheckStatus;
  statusLabel: string;
  findings: Finding[];
  summary: string;
  detail?: string;
  inputPreview?: string;
}

const TOOL_META: Record<
  string,
  { title: string; category: string; description: string; order: number }
> = {
  flag_risky_diff_patterns: {
    title: "Risk pattern scan",
    category: "Static analysis",
    description: "Diff scanned for migrations, IAM, secrets, and infra signals.",
    order: 1,
  },
  check_test_coverage_mentioned: {
    title: "Test coverage signal",
    category: "Quality gate",
    description: "PR description checked for explicit test references.",
    order: 2,
  },
  check_breaking_api_changes: {
    title: "API contract analysis",
    category: "Compatibility",
    description: "Endpoints and schema changes evaluated for client impact.",
    order: 3,
  },
  lookup_past_incidents: {
    title: "Incident history lookup",
    category: "Operational context",
    description: "Component matched against seeded incident knowledge base.",
    order: 4,
  },
  generate_rollback_plan: {
    title: "Rollback plan generation",
    category: "Recovery",
    description: "Change type classified and recovery steps drafted.",
    order: 5,
  },
};

const SEVERITY_PATTERN = /^(.+?)\s*\(severity:\s*(high|medium|low)\)$/i;

function parseSeverityFindings(text: string): Finding[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(SEVERITY_PATTERN);
      if (match) {
        return {
          label: match[1].trim(),
          severity: match[2].toLowerCase() as Severity,
        };
      }
      return { label: line, severity: "medium" as Severity };
    });
}

function getInputPreview(input: Record<string, unknown> | null): string | undefined {
  if (!input) return undefined;
  const value =
    input.diff_or_description ??
    input.pr_description ??
    input.change_summary ??
    input.component_name;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= 120) return trimmed;
  return `${trimmed.slice(0, 120)}…`;
}

function formatRiskPatterns(
  toolName: string,
  output: string,
  input: Record<string, unknown> | null
): FormattedCheck {
  const meta = TOOL_META[toolName];
  const clear = output.toLowerCase().includes("no risky patterns");
  const findings = clear ? [] : parseSeverityFindings(output.replace(/^Risky patterns found:\n?/i, ""));

  return {
    id: toolName,
    step: meta.order,
    title: meta.title,
    category: meta.category,
    description: meta.description,
    status: clear ? "clear" : "flagged",
    statusLabel: clear ? "No issues" : `${findings.length} pattern${findings.length === 1 ? "" : "s"}`,
    findings,
    summary: clear ? "No high-risk diff patterns detected in this change." : output.split("\n")[0],
    inputPreview: getInputPreview(input),
  };
}

function formatTestCoverage(
  toolName: string,
  output: string,
  input: Record<string, unknown> | null
): FormattedCheck {
  const meta = TOOL_META[toolName];
  const passed = output.toLowerCase().includes("tests appear");
  const signalsMatch = output.match(/Signals:\s*(.+)$/i);
  const signals = signalsMatch
    ? signalsMatch[1].split(",").map((s) => s.trim())
    : [];

  return {
    id: toolName,
    step: meta.order,
    title: meta.title,
    category: meta.category,
    description: meta.description,
    status: passed ? "clear" : "warning",
    statusLabel: passed ? "Signals found" : "Follow-up required",
    findings: signals.map((label) => ({ label, severity: "low" as Severity })),
    summary: passed
      ? "Test references detected in the PR description."
      : "No explicit test coverage mentioned — manual verification recommended.",
    detail: passed ? `Matched signals: ${signals.join(", ")}` : undefined,
    inputPreview: getInputPreview(input),
  };
}

function formatBreakingApi(
  toolName: string,
  output: string,
  input: Record<string, unknown> | null
): FormattedCheck {
  const meta = TOOL_META[toolName];
  const clear = output.toLowerCase().includes("no obvious breaking");
  const findings = clear
    ? []
    : parseSeverityFindings(output.replace(/^Potential breaking API changes:\n?/i, ""));

  return {
    id: toolName,
    step: meta.order,
    title: meta.title,
    category: meta.category,
    description: meta.description,
    status: clear ? "clear" : "flagged",
    statusLabel: clear ? "Compatible" : `${findings.length} signal${findings.length === 1 ? "" : "s"}`,
    findings,
    summary: clear
      ? "No breaking API contract changes identified."
      : "Potential client-facing breaking changes detected.",
    inputPreview: getInputPreview(input),
  };
}

function formatIncidents(
  toolName: string,
  output: string,
  input: Record<string, unknown> | null
): FormattedCheck {
  const meta = TOOL_META[toolName];
  const component =
    typeof input?.component_name === "string" ? input.component_name : "unknown";
  const hasHistory = !output.toLowerCase().includes("no past incidents");

  return {
    id: `${toolName}-${component}`,
    step: meta.order,
    title: `${meta.title} · ${component}`,
    category: meta.category,
    description: meta.description,
    status: hasHistory ? "warning" : "clear",
    statusLabel: hasHistory ? "History found" : "Clean record",
    findings: hasHistory
      ? [{ label: `${component} component`, severity: "medium" }]
      : [],
    summary: hasHistory
      ? `Prior incidents recorded for the ${component} domain.`
      : `No prior incidents on record for ${component}.`,
    detail: hasHistory ? output : undefined,
    inputPreview: component,
  };
}

function formatRollbackPlan(
  toolName: string,
  output: string,
  input: Record<string, unknown> | null
): FormattedCheck {
  const meta = TOOL_META[toolName];
  const plan = output.replace(/^Rollback plan:\s*/i, "").trim();
  const steps = plan
    .split(/,\s*(?=[a-z])/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    id: toolName,
    step: meta.order,
    title: meta.title,
    category: meta.category,
    description: meta.description,
    status: "info",
    statusLabel: "Plan ready",
    findings: [],
    summary: "Recovery procedure generated from change classification.",
    detail: plan,
    inputPreview: getInputPreview(input),
  };
}

export function formatToolCall(
  toolName: string,
  output: string,
  input: Record<string, unknown> | null
): FormattedCheck {
  switch (toolName) {
    case "flag_risky_diff_patterns":
      return formatRiskPatterns(toolName, output, input);
    case "check_test_coverage_mentioned":
      return formatTestCoverage(toolName, output, input);
    case "check_breaking_api_changes":
      return formatBreakingApi(toolName, output, input);
    case "lookup_past_incidents":
      return formatIncidents(toolName, output, input);
    case "generate_rollback_plan":
      return formatRollbackPlan(toolName, output, input);
    default:
      return {
        id: toolName,
        step: 99,
        title: toolName.replace(/_/g, " "),
        category: "Check",
        description: "Release readiness check.",
        status: "info",
        statusLabel: "Completed",
        findings: [],
        summary: output,
        inputPreview: getInputPreview(input),
      };
  }
}

export function formatToolCalls(
  toolCalls: Array<{
    id: string;
    tool_name: string;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | string | null;
  }>
): FormattedCheck[] {
  return toolCalls
    .map((call) => {
      const output =
        typeof call.output === "string"
          ? call.output
          : call.output
            ? JSON.stringify(call.output)
            : "";
      return formatToolCall(call.tool_name, output, call.input);
    })
    .sort((a, b) => a.step - b.step);
}

export function pipelineSummary(checks: FormattedCheck[]) {
  const findings = checks.flatMap((c) => c.findings);
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const flagged = checks.filter((c) => c.status === "flagged").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  return {
    totalChecks: checks.length,
    totalFindings: findings.length,
    highSeverity: high,
    mediumSeverity: medium,
    flaggedChecks: flagged,
    warningChecks: warnings,
  };
}
