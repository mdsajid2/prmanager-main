import { FileChange } from "../schemas";

interface ParsedFile {
  path: string;
  additions: number;
  deletions: number;
  patch_snippet: string;
  is_binary: boolean;
}

export function parseDiff(diffText: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = diffText.split("\n");

  let currentFile: Partial<ParsedFile> | null = null;
  let patchLines: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file header
    if (line.startsWith("diff --git")) {
      // Save previous file if exists
      if (currentFile) {
        files.push({
          path: currentFile.path!,
          additions,
          deletions,
          patch_snippet: patchLines.join("\n"),
          is_binary: currentFile.is_binary || false,
        });
      }

      // Start new file
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (match) {
        currentFile = {
          path: match[2], // Use the "b/" path (destination)
          is_binary: false,
        };
        patchLines = [line];
        additions = 0;
        deletions = 0;
      }
    }
    // File path headers
    else if (line.startsWith("---") || line.startsWith("+++")) {
      if (currentFile) {
        patchLines.push(line);
      }
    }
    // Hunk header
    else if (line.startsWith("@@")) {
      if (currentFile) {
        patchLines.push(line);
      }
    }
    // Binary file detection
    else if (line.includes("Binary files") && line.includes("differ")) {
      if (currentFile) {
        currentFile.is_binary = true;
        patchLines.push(line);
      }
    }
    // Content lines
    else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
      if (currentFile && patchLines.length < 300) {
        patchLines.push(line);
      }
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
      if (currentFile && patchLines.length < 300) {
        patchLines.push(line);
      }
    } else if (line.startsWith(" ")) {
      // Context line
      if (currentFile && patchLines.length < 300) {
        patchLines.push(line);
      }
    } else if (currentFile && line.trim() === "") {
      // Empty line in patch
      if (patchLines.length < 300) {
        patchLines.push(line);
      }
    }
  }

  // Save last file
  if (currentFile) {
    files.push({
      path: currentFile.path!,
      additions,
      deletions,
      patch_snippet: patchLines.join("\n"),
      is_binary: currentFile.is_binary || false,
    });
  }

  return files;
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();

  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    java: "java",
    go: "go",
    rs: "rust",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    sh: "shell",
    dockerfile: "dockerfile",
  };

  if (!ext) {
    // Check for special files
    const filename = path.split("/").pop()?.toLowerCase();
    if (filename === "dockerfile") return "dockerfile";
    if (filename === "makefile") return "makefile";
    return "text";
  }

  return langMap[ext] || "text";
}
