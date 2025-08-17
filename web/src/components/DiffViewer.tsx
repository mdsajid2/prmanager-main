import React, { useState, useMemo } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentIcon,
  DocumentPlusIcon,
  DocumentMinusIcon,
  PencilSquareIcon,
  CodeBracketIcon,
  CogIcon,
  BeakerIcon,
  BookOpenIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  MinusIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface DiffLine {
  type: "add" | "remove" | "context" | "header";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  isNoNewline?: boolean;
}

interface FileDiff {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  oldFilename?: string;
}

interface DiffViewerProps {
  files: FileDiff[];
  className?: string;
}

const parsePatch = (patch: string): DiffLine[] => {
  if (!patch) return [];

  const lines = patch.split("\n");
  const diffLines: DiffLine[] = [];
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNumber = parseInt(match[1]) - 1;
        newLineNumber = parseInt(match[2]) - 1;
      }
      diffLines.push({
        type: "header",
        content: line,
      });
    } else if (line.startsWith("+")) {
      newLineNumber++;
      diffLines.push({
        type: "add",
        content: line.substring(1),
        newLineNumber,
        isNoNewline: line === "+\\ No newline at end of file",
      });
    } else if (line.startsWith("-")) {
      oldLineNumber++;
      diffLines.push({
        type: "remove",
        content: line.substring(1),
        oldLineNumber,
        isNoNewline: line === "-\\ No newline at end of file",
      });
    } else if (line.startsWith(" ")) {
      oldLineNumber++;
      newLineNumber++;
      diffLines.push({
        type: "context",
        content: line.substring(1),
        oldLineNumber,
        newLineNumber,
      });
    } else if (line.startsWith("\\ No newline")) {
      diffLines.push({
        type: "context",
        content: line,
        isNoNewline: true,
      });
    }
  }

  return diffLines;
};

const getFileIcon = (filename: string, status: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  // Status-based icons with colors
  if (status === "added") {
    return <DocumentPlusIcon className="w-5 h-5 text-green-600" />;
  }
  if (status === "removed") {
    return <DocumentMinusIcon className="w-5 h-5 text-red-600" />;
  }
  if (status === "renamed") {
    return <PencilSquareIcon className="w-5 h-5 text-purple-600" />;
  }

  // Extension-based icons with appropriate colors
  switch (ext) {
    case "js":
    case "jsx":
      return <CodeBracketIcon className="w-5 h-5 text-yellow-600" />;
    case "ts":
    case "tsx":
      return <CodeBracketIcon className="w-5 h-5 text-blue-600" />;
    case "py":
      return <CodeBracketIcon className="w-5 h-5 text-green-600" />;
    case "java":
      return <CodeBracketIcon className="w-5 h-5 text-orange-600" />;
    case "css":
    case "scss":
    case "sass":
      return <CodeBracketIcon className="w-5 h-5 text-pink-600" />;
    case "html":
      return <CodeBracketIcon className="w-5 h-5 text-orange-500" />;
    case "json":
      return <ClipboardDocumentIcon className="w-5 h-5 text-gray-600" />;
    case "md":
    case "markdown":
      return <BookOpenIcon className="w-5 h-5 text-blue-500" />;
    case "yml":
    case "yaml":
      return <CogIcon className="w-5 h-5 text-gray-600" />;
    case "test":
    case "spec":
      return <BeakerIcon className="w-5 h-5 text-green-500" />;
    default:
      return <DocumentIcon className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "added":
      return "text-green-600 bg-green-50";
    case "removed":
      return "text-red-600 bg-red-50";
    case "modified":
      return "text-blue-600 bg-blue-50";
    case "renamed":
      return "text-purple-600 bg-purple-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

const FileHeader: React.FC<{
  file: FileDiff;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ file, isExpanded, onToggle }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center justify-center">
          {getFileIcon(file.filename, file.status)}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-medium text-gray-900">
              {file.filename}
            </span>
            {file.oldFilename && file.oldFilename !== file.filename && (
              <span className="text-xs text-gray-500">
                (renamed from {file.oldFilename})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                file.status
              )}`}
            >
              {file.status}
            </span>

            {file.additions > 0 && (
              <span className="text-xs text-green-600 font-medium">
                +{file.additions}
              </span>
            )}

            {file.deletions > 0 && (
              <span className="text-xs text-red-600 font-medium">
                -{file.deletions}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {file.additions > 0 && (
            <div className="flex">
              {Array.from({ length: Math.min(file.additions, 5) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-green-500 rounded-sm mr-0.5"
                  />
                )
              )}
              {file.additions > 5 && (
                <span className="text-xs text-green-600 ml-1">
                  +{file.additions - 5}
                </span>
              )}
            </div>
          )}

          {file.deletions > 0 && (
            <div className="flex">
              {Array.from({ length: Math.min(file.deletions, 5) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-red-500 rounded-sm mr-0.5"
                  />
                )
              )}
              {file.deletions > 5 && (
                <span className="text-xs text-red-600 ml-1">
                  +{file.deletions - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DiffLine: React.FC<{ line: DiffLine }> = ({ line }) => {
  const getLineClass = () => {
    switch (line.type) {
      case "add":
        return "bg-green-50 border-l-4 border-green-500";
      case "remove":
        return "bg-red-50 border-l-4 border-red-500";
      case "header":
        return "bg-blue-50 border-l-4 border-blue-500";
      default:
        return "bg-white";
    }
  };

  const getTextColor = () => {
    switch (line.type) {
      case "add":
        return "text-green-800";
      case "remove":
        return "text-red-800";
      case "header":
        return "text-blue-800 font-medium";
      default:
        return "text-gray-800";
    }
  };

  if (line.isNoNewline) {
    return (
      <div className="flex text-xs text-gray-500 bg-gray-50 px-4 py-1">
        <span className="italic">{line.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${getLineClass()}`}>
      <div className="flex-shrink-0 w-16 px-2 py-1 text-xs text-gray-500 bg-gray-100 border-r border-gray-200 text-right">
        {line.oldLineNumber || ""}
      </div>
      <div className="flex-shrink-0 w-16 px-2 py-1 text-xs text-gray-500 bg-gray-100 border-r border-gray-200 text-right">
        {line.newLineNumber || ""}
      </div>
      <div className="flex-shrink-0 w-8 px-1 py-1 bg-gray-100 border-r border-gray-200 flex items-center justify-center">
        {line.type === "add" && <PlusIcon className="w-3 h-3 text-green-600" />}
        {line.type === "remove" && (
          <MinusIcon className="w-3 h-3 text-red-600" />
        )}
        {line.type === "context" && (
          <span className="text-gray-400 text-xs font-mono"> </span>
        )}
        {line.type === "header" && (
          <EyeIcon className="w-3 h-3 text-blue-600" />
        )}
      </div>
      <div
        className={`flex-1 px-4 py-1 font-mono text-sm ${getTextColor()} whitespace-pre-wrap`}
      >
        {line.content || " "}
      </div>
    </div>
  );
};

const FileDiffView: React.FC<{ file: FileDiff }> = ({ file }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const diffLines = useMemo(() => {
    return file.patch ? parsePatch(file.patch) : [];
  }, [file.patch]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      <FileHeader
        file={file}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {diffLines.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {diffLines.map((line, index) => (
                <DiffLine key={index} line={line} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              {file.status === "added" && "New file - no diff to show"}
              {file.status === "removed" && "File deleted - no diff to show"}
              {file.status === "renamed" && "File renamed - no content changes"}
              {file.status === "modified" && "No diff data available"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DiffViewer: React.FC<DiffViewerProps> = ({
  files,
  className = "",
}) => {
  const stats = useMemo(() => {
    return files.reduce(
      (acc, file) => ({
        totalFiles: acc.totalFiles + 1,
        totalAdditions: acc.totalAdditions + file.additions,
        totalDeletions: acc.totalDeletions + file.deletions,
        totalChanges: acc.totalChanges + file.changes,
      }),
      { totalFiles: 0, totalAdditions: 0, totalDeletions: 0, totalChanges: 0 }
    );
  }, [files]);

  if (files.length === 0) {
    return (
      <div className={`p-8 text-center text-gray-500 ${className}`}>
        <div className="flex justify-center mb-4">
          <DocumentIcon className="w-16 h-16 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No files changed
        </h3>
        <p>This PR doesn't contain any file changes to review.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Code Changes ({stats.totalFiles} file
            {stats.totalFiles !== 1 ? "s" : ""})
          </h3>

          <div className="flex items-center space-x-4 text-sm">
            {stats.totalAdditions > 0 && (
              <span className="text-green-600 font-medium">
                +{stats.totalAdditions} additions
              </span>
            )}

            {stats.totalDeletions > 0 && (
              <span className="text-red-600 font-medium">
                -{stats.totalDeletions} deletions
              </span>
            )}

            <span className="text-gray-500">{stats.totalChanges} changes</span>
          </div>
        </div>

        {/* Visual diff bar */}
        <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-gray-200">
          {stats.totalAdditions > 0 && (
            <div
              className="bg-green-500"
              style={{
                width: `${
                  (stats.totalAdditions /
                    (stats.totalAdditions + stats.totalDeletions)) *
                  100
                }%`,
              }}
            />
          )}
          {stats.totalDeletions > 0 && (
            <div
              className="bg-red-500"
              style={{
                width: `${
                  (stats.totalDeletions /
                    (stats.totalAdditions + stats.totalDeletions)) *
                  100
                }%`,
              }}
            />
          )}
        </div>
      </div>

      {/* File Diffs */}
      <div className="space-y-4">
        {files.map((file, index) => (
          <FileDiffView key={`${file.filename}-${index}`} file={file} />
        ))}
      </div>
    </div>
  );
};

export default DiffViewer;
