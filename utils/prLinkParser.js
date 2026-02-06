/**
 * Parse a GitHub Pull Request link and extract owner, repo, and PR number.
 * Supports links with or without protocol.
 */
export function parseGitHubPRLink(prLink) {
  console.log("RAW prLink:", prLink);
  console.log("TYPE of prLink:", typeof prLink);
  if (!prLink || typeof prLink !== "string") {
    throw new Error("Invalid PR link");
  }

  // Auto-add protocol if missing
  let normalizedLink = prLink.trim();
  console.log("AFTER trim:", normalizedLink);
  if (
    !normalizedLink.startsWith("http://") &&
    !normalizedLink.startsWith("https://")
  ) {
    normalizedLink = "https://" + normalizedLink;
  }
console.log("NORMALIZED LINK:", normalizedLink);
  let url;
  try {
    url = new URL(normalizedLink);
  } catch {
    throw new Error("Invalid URL");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  // Expected format: [owner, repo, "pull", prNumber]

  if (parts.length < 4 || parts[2] !== "pull") {
    throw new Error("Invalid GitHub PR link format");
  }

  const owner = parts[0];
  const repo = parts[1];
  const prNumber = parts[3];

  if (!owner || !repo || isNaN(Number(prNumber))) {
    throw new Error("Invalid GitHub PR link components");
  }

  return {
    owner,
    repo,
    prNumber
  };
}
