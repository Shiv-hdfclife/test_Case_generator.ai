const SKIP_EXTENSIONS = [
  ".md",
  ".yml",
  ".yaml",
  ".json",
  ".xml",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".lock"
];

/**
 * Decide whether a file is relevant for behavior analysis
 */
function isRelevantFile(filePath) {
  // Only analyze Java source files
  if (!filePath.endsWith(".java")) return false;

  // Skip non-code assets
  return !SKIP_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Clean GitHub patch to retain only meaningful diff lines
 */
function cleanPatch(patch = "") {
  if (!patch) return "";

  return patch
    .split("\n")
    .filter(line =>
      (line.startsWith("+") ||
       line.startsWith("-") ||
       line.startsWith("@@")) &&
      !line.startsWith("+++")
      && !line.startsWith("---")
    )
    .join("\n");
}

/**
 * Clean individual file context
 */
function cleanFileContext(file) {
  return {
    file: file.file,
    status: file.status,
    patch: cleanPatch(file.patch)
  };
}

/**
 * Clean entire PR context
 */
export function cleanPRContext(prContext) {
  return {
    pullRequest: prContext.pullRequest,
    files: prContext.files
      .filter(f => isRelevantFile(f.file))
      .map(cleanFileContext)
  };
}
