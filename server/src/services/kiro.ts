import { AnalysisInput, AIAnalysis, AIAnalysisSchema } from "../schemas";
import axios from "axios";

const SYSTEM_MESSAGE = `You are a senior staff engineer and code reviewer. You will receive a compact, preprocessed view of a pull request (stats, selected file patches, and heuristic hotspots). Return only valid JSON that matches the provided output_schema. Be precise, concrete, and actionable. Prefer checklists and step-by-step test plans. If uncertain, state assumptions explicitly. Do not include any prose outside the JSON.`;

const OUTPUT_SCHEMA = `{
  "summary": string[],
  "risk": {
    "level": "Low" | "Medium" | "High",
    "score": number,
    "reasons": string[],
    "hotspots": { "file": string, "notes": string }[]
  },
  "reviewer_checklist": {
    "blocking_items": string[],
    "non_blocking_items": string[]
  },
  "questions_for_author": string[],
  "missing_tests": string[],
  "generated_test_plan": {
    "unit": string[],
    "integration": string[],
    "manual": string[]
  },
  "commands_to_run": string[],
  "suggested_pr_description": string
}`;

export function makeAnalysisPrompt(analysisInput: AnalysisInput): {
  system: string;
  user: string;
  schema: string;
} {
  const userMessage = `Context:
${JSON.stringify(analysisInput, null, 2)}

Task:
1) Summarize what this PR does in 3–5 concise bullets.
2) Refine the risk assessment: choose level (Low/Medium/High) and a score 0–100. Give up to 6 concrete reasons referencing specific files/keywords (by file name and keyword context, not exact line numbers).
3) Produce:
- reviewer_checklist: blocking_items[] and non_blocking_items[] tailored to this PR
- questions_for_author[] that unblock review and reduce risk
- missing_tests[] with rationale for each missing test
- generated_test_plan with specific, runnable steps for unit, integration, and manual verification
- commands_to_run[] (shell commands) appropriate for the detected language(s) and tooling
- suggested_pr_description as polished Markdown that includes context, risks, and test notes

Return JSON exactly matching output_schema. No extra text.`;

  return {
    system: SYSTEM_MESSAGE,
    user: userMessage,
    schema: OUTPUT_SCHEMA,
  };
}

export async function callKiro(
  analysisInput: AnalysisInput,
  userProvider?: string,
  userApiKey?: string,
  isGuestUser?: boolean
): Promise<AIAnalysis> {
  // Determine which provider and API key to use
  const aiProvider = userProvider || process.env.AI_PROVIDER || "mock";

  // Guest users cannot use system API keys - they must provide their own
  const effectiveApiKey = isGuestUser
    ? userApiKey // Only user-provided key for guests
    : userApiKey || getSystemApiKey(aiProvider); // User key or system key for logged-in users

  console.log(
    `Generating AI-powered PR analysis using ${aiProvider}${
      isGuestUser ? " (guest mode)" : ""
    }...`
  );

  // If guest user has no API key, throw error - no AI analysis available
  if (isGuestUser && !userApiKey) {
    throw new Error(
      "AI_KEY_REQUIRED: Guest users must provide their own API keys for AI analysis"
    );
  }

  // If logged-in user has no API key and no system key available, throw error
  if (!effectiveApiKey || effectiveApiKey === "mock") {
    throw new Error("AI_KEY_REQUIRED: No API key available for AI analysis");
  }

  let response;

  try {
    switch (aiProvider) {
      case "openai":
        response = await callOpenAI(analysisInput, effectiveApiKey);
        break;
      case "anthropic":
        response = await callAnthropic(analysisInput, effectiveApiKey);
        break;
      case "gemini":
        response = await callGemini(analysisInput, effectiveApiKey);
        break;
      default:
        response = await simulateKiroCall(analysisInput);
    }

    // Validate the response
    return AIAnalysisSchema.parse(response);
  } catch (error) {
    console.warn("AI analysis failed, falling back to intelligent mock...");
    const fallbackResponse = await simulateKiroCall(analysisInput, true);
    return AIAnalysisSchema.parse(fallbackResponse);
  }
}

// OpenAI GPT-4 Integration
function getSystemApiKey(provider: string): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    default:
      return undefined;
  }
}

async function callOpenAI(
  analysisInput: AnalysisInput,
  apiKey?: string
): Promise<any> {
  if (!apiKey) {
    throw new Error("OpenAI API key is required for OpenAI integration");
  }

  const { system, user } = makeAnalysisPrompt(analysisInput);

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const content = response.data.choices[0].message.content;
  return JSON.parse(content);
}

// Anthropic Claude Integration
async function callAnthropic(
  analysisInput: AnalysisInput,
  apiKey?: string
): Promise<any> {
  if (!apiKey) {
    throw new Error("Anthropic API key is required for Anthropic integration");
  }

  const { system, user } = makeAnalysisPrompt(analysisInput);

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      temperature: 0.2,
      system: system,
      messages: [{ role: "user", content: user }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
    }
  );

  const content = response.data.content[0].text;
  return JSON.parse(content);
}

// Google Gemini Integration
async function callGemini(
  analysisInput: AnalysisInput,
  apiKey?: string
): Promise<any> {
  if (!apiKey) {
    throw new Error("Google Gemini API key is required for Gemini integration");
  }

  const { system, user } = makeAnalysisPrompt(analysisInput);
  const prompt = `${system}\n\n${user}`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4000,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const content = response.data.candidates[0].content.parts[0].text;
  // Extract JSON from the response (Gemini might include extra text)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("Could not extract JSON from Gemini response");
}

// Mock implementation - replace with actual Kiro API call
async function simulateKiroCall(
  analysisInput: AnalysisInput,
  isRetry = false
): Promise<any> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { stats, files, hotspots } = analysisInput;

  // Generate realistic mock response based on the input
  const hasAuthFiles = files.some((f) => f.flags.includes("touches_auth"));
  const hasDbFiles = files.some((f) => f.type === "db");
  const hasTestFiles = files.some((f) => f.type === "test");
  const codeFiles = files.filter((f) => f.type === "code");

  const summary = [
    `Modifies ${stats.total_files} files with ${stats.additions} additions and ${stats.deletions} deletions`,
    `Primary changes in: ${stats.touched_areas.join(", ")}`,
  ];

  if (hasAuthFiles)
    summary.push("Updates authentication/security related code");
  if (hasDbFiles) summary.push("Includes database schema or migration changes");
  if (stats.deps_major_bump)
    summary.push("Contains major dependency version updates");

  const reasons = [];
  if (stats.total_files > 25)
    reasons.push(`Large changeset affecting ${stats.total_files} files`);
  if (stats.additions > 800)
    reasons.push(`Significant code additions (${stats.additions} lines)`);
  if (hasAuthFiles)
    reasons.push("Touches security-sensitive authentication code");
  if (hasDbFiles && !hasTestFiles)
    reasons.push("Database changes without corresponding test updates");
  if (stats.deps_major_bump)
    reasons.push("Major dependency upgrades may introduce breaking changes");
  if (!stats.pr_body_present) reasons.push("Missing detailed PR description");

  const riskHotspots = files
    .filter(
      (f) =>
        f.flags.includes("touches_auth") ||
        f.flags.includes("touches_payment") ||
        f.type === "db"
    )
    .slice(0, 3)
    .map((f) => ({
      file: f.path,
      notes: f.flags.includes("touches_auth")
        ? "Security-sensitive authentication logic"
        : f.flags.includes("touches_payment")
        ? "Payment processing code"
        : "Database schema modification",
    }));

  const blockingItems = [];
  const nonBlockingItems = [];

  if (hasAuthFiles)
    blockingItems.push("Verify authentication flows and security implications");
  if (hasDbFiles)
    blockingItems.push("Review database migration safety and rollback plan");
  if (stats.deps_major_bump)
    blockingItems.push("Test compatibility with major dependency updates");

  nonBlockingItems.push("Code style and formatting consistency");
  nonBlockingItems.push("Documentation updates for new features");
  if (codeFiles.length > 0)
    nonBlockingItems.push("Performance impact assessment");

  const questions = [];
  if (!stats.pr_body_present)
    questions.push(
      "Can you provide more context about the changes and their purpose?"
    );
  if (hasDbFiles)
    questions.push(
      "What is the rollback strategy if this migration needs to be reverted?"
    );
  if (stats.deps_major_bump)
    questions.push(
      "Have you tested the application with these dependency updates?"
    );

  const missingTests = [];
  if (codeFiles.length > 0 && !hasTestFiles) {
    missingTests.push("Unit tests for new/modified business logic");
    if (hasAuthFiles)
      missingTests.push("Security tests for authentication changes");
    if (hasDbFiles)
      missingTests.push("Integration tests for database operations");
  }

  const testPlan = {
    unit: hasTestFiles
      ? ["Run existing test suite", "Verify new test coverage"]
      : ["Add unit tests for core logic"],
    integration: hasDbFiles
      ? ["Test database migration", "Verify data integrity"]
      : ["Test API endpoints"],
    manual: ["Smoke test critical user flows", "Verify UI/UX changes"],
  };

  const commands = [];
  const hasNodeProject = files.some((f) => f.path.includes("package.json"));
  const hasPythonProject = files.some(
    (f) =>
      f.path.includes("requirements.txt") || f.path.includes("pyproject.toml")
  );

  if (hasNodeProject) {
    commands.push("npm test", "npm run lint", "npm run build");
  } else if (hasPythonProject) {
    commands.push("pytest", "flake8", "mypy");
  } else {
    commands.push("make test", "make lint");
  }

  const suggestedDescription = `## Summary
${summary.join("\n")}

## Changes
- ${files
    .slice(0, 5)
    .map((f) => `${f.path}: ${f.additions}+ ${f.deletions}-`)
    .join("\n- ")}

## Risk Assessment
Risk Level: ${
    stats.risk_score_pre >= 60
      ? "High"
      : stats.risk_score_pre >= 30
      ? "Medium"
      : "Low"
  } (${stats.risk_score_pre}/100)

${
  reasons.length > 0
    ? `### Risks\n${reasons.map((r) => `- ${r}`).join("\n")}`
    : ""
}

## Testing
${
  missingTests.length > 0
    ? `### Missing Tests\n${missingTests.map((t) => `- ${t}`).join("\n")}\n`
    : ""
}
### Test Plan
- Unit: ${testPlan.unit.join(", ")}
- Integration: ${testPlan.integration.join(", ")}
- Manual: ${testPlan.manual.join(", ")}`;

  return {
    summary,
    risk: {
      level:
        stats.risk_score_pre >= 60
          ? "High"
          : stats.risk_score_pre >= 30
          ? "Medium"
          : "Low",
      score: stats.risk_score_pre,
      reasons: reasons.slice(0, 6),
      hotspots: riskHotspots,
    },
    reviewer_checklist: {
      blocking_items: blockingItems,
      non_blocking_items: nonBlockingItems,
    },
    questions_for_author: questions,
    missing_tests: missingTests,
    generated_test_plan: testPlan,
    commands_to_run: commands,
    suggested_pr_description: suggestedDescription,
  };
}
