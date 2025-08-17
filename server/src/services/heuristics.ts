import { FileChange, PRMeta, Stats } from "../schemas";

export function calculateStats(files: FileChange[], pr?: PRMeta): Stats {
  const totalFiles = files.length;
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  // Touched areas
  const touchedAreas = new Set<string>();
  files.forEach((file) => touchedAreas.add(file.type));

  // Flags analysis
  const hasTestsChanged = files.some((f) => f.type === "test");
  const hasMigrations = files.some((f) => f.type === "db");
  const depsMajorBump = checkDependencyMajorBump(files);

  // PR body analysis
  const prBodyPresent = !!(pr?.body && pr.body.trim().length > 20);

  // Calculate risk score
  const riskScore = calculateRiskScore({
    totalFiles,
    totalAdditions,
    totalDeletions,
    touchedAreas: Array.from(touchedAreas),
    hasTestsChanged,
    hasMigrations,
    depsMajorBump,
    prBodyPresent,
    files,
    pr,
  });

  return {
    total_files: totalFiles,
    additions: totalAdditions,
    deletions: totalDeletions,
    risk_score_pre: riskScore,
    touched_areas: Array.from(touchedAreas),
    has_tests_changed: hasTestsChanged,
    deps_major_bump: depsMajorBump,
    has_migrations: hasMigrations,
    pr_body_present: prBodyPresent,
  };
}

function checkDependencyMajorBump(files: FileChange[]): boolean {
  const depFiles = files.filter((f) => f.type === "deps");

  for (const file of depFiles) {
    const patch = file.patch_snippet;

    // Look for major version changes in package.json style
    const majorBumpRegex =
      /-\s*"[^"]+"\s*:\s*"[\^~]?(\d+)\.\d+\.\d+".*\n\+\s*"[^"]+"\s*:\s*"[\^~]?(\d+)\.\d+\.\d+"/g;
    let match;

    while ((match = majorBumpRegex.exec(patch)) !== null) {
      const oldMajor = parseInt(match[1], 10);
      const newMajor = parseInt(match[2], 10);
      if (newMajor > oldMajor) {
        return true;
      }
    }

    // Look for requirements.txt style changes
    const reqBumpRegex =
      /-([a-zA-Z0-9_-]+)==(\d+)\.\d+\.\d+.*\n\+\1==(\d+)\.\d+\.\d+/g;
    while ((match = reqBumpRegex.exec(patch)) !== null) {
      const oldMajor = parseInt(match[2], 10);
      const newMajor = parseInt(match[3], 10);
      if (newMajor > oldMajor) {
        return true;
      }
    }
  }

  return false;
}

interface RiskFactors {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  touchedAreas: string[];
  hasTestsChanged: boolean;
  hasMigrations: boolean;
  depsMajorBump: boolean;
  prBodyPresent: boolean;
  files: FileChange[];
  pr?: PRMeta;
}

function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;

  // Size factors
  if (factors.totalAdditions > 2000 || factors.totalFiles > 50) {
    score += 30;
  } else if (factors.totalAdditions > 800 || factors.totalFiles > 25) {
    score += 15;
  }

  // High-risk areas
  const hasAuthChanges = factors.files.some((f) =>
    f.flags.includes("touches_auth")
  );
  const hasPaymentChanges = factors.files.some((f) =>
    f.flags.includes("touches_payment")
  );
  if (hasAuthChanges || hasPaymentChanges) {
    score += 25;
  }

  // Database changes
  if (factors.hasMigrations) {
    score += 15;
    // Extra penalty if no tests changed with DB changes
    if (!factors.hasTestsChanged) {
      score += 10;
    }
  }

  // Dependency changes
  if (factors.depsMajorBump) {
    score += 20;
  }
  const depFiles = factors.files.filter((f) => f.type === "deps").length;
  if (depFiles > 5) {
    score += 10;
  }

  // Config/Infrastructure changes
  if (
    factors.touchedAreas.includes("config") ||
    factors.touchedAreas.includes("infra")
  ) {
    score += 10;
  }

  // API surface changes
  const hasApiChanges = factors.files.some((f) =>
    f.flags.includes("changes_public_api")
  );
  if (hasApiChanges) {
    score += 10;
  }

  // Quality signals
  const codeChanged = factors.files.some((f) => f.type === "code");
  if (codeChanged && !factors.hasTestsChanged) {
    score += 15;
  }

  if (!factors.prBodyPresent) {
    score += 5;
  }

  // Mitigations
  const netDeletions = factors.totalDeletions > factors.totalAdditions;
  if (netDeletions && factors.hasTestsChanged) {
    score -= 10;
  }

  const onlyDocsAndConfig = factors.touchedAreas.every((area) =>
    ["docs", "config", "test"].includes(area)
  );
  if (onlyDocsAndConfig) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function generateHotspots(files: FileChange[], stats: Stats): string[] {
  const hotspots: string[] = [];

  // Size hotspots
  if (stats.total_files > 50) {
    hotspots.push(`Large changeset: ${stats.total_files} files modified`);
  } else if (stats.total_files > 25) {
    hotspots.push(`Medium changeset: ${stats.total_files} files modified`);
  }

  if (stats.additions > 2000) {
    hotspots.push(`High line count: ${stats.additions} lines added`);
  } else if (stats.additions > 800) {
    hotspots.push(`Significant additions: ${stats.additions} lines added`);
  }

  // Security/Auth hotspots
  const authFiles = files.filter((f) => f.flags.includes("touches_auth"));
  if (authFiles.length > 0) {
    hotspots.push(
      `Security-sensitive files: ${authFiles.map((f) => f.path).join(", ")}`
    );
  }

  // Payment hotspots
  const paymentFiles = files.filter((f) => f.flags.includes("touches_payment"));
  if (paymentFiles.length > 0) {
    hotspots.push(
      `Payment-related changes: ${paymentFiles.map((f) => f.path).join(", ")}`
    );
  }

  // Database hotspots
  if (stats.has_migrations) {
    const dbFiles = files.filter((f) => f.type === "db");
    hotspots.push(
      `Database schema changes: ${dbFiles.map((f) => f.path).join(", ")}`
    );
  }

  // Dependency hotspots
  if (stats.deps_major_bump) {
    hotspots.push("Major dependency version bumps detected");
  }

  const depFiles = files.filter((f) => f.type === "deps");
  if (depFiles.length > 5) {
    hotspots.push(
      `Multiple dependency files changed: ${depFiles.length} files`
    );
  }

  // API changes
  const apiFiles = files.filter((f) => f.flags.includes("changes_public_api"));
  if (apiFiles.length > 0) {
    hotspots.push(
      `Potential API changes: ${apiFiles.map((f) => f.path).join(", ")}`
    );
  }

  // Quality concerns
  const codeFiles = files.filter((f) => f.type === "code");
  if (codeFiles.length > 0 && !stats.has_tests_changed) {
    hotspots.push("Code changes without corresponding test updates");
  }

  if (!stats.pr_body_present) {
    hotspots.push("Missing or minimal PR description");
  }

  return hotspots.slice(0, 8); // Limit to 8 hotspots
}

export function getRiskLevel(score: number): "Low" | "Medium" | "High" {
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}
