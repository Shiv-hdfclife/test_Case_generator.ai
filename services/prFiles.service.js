import { githubClient } from "../clients/github.client.js";

/**
 * Fetch changed files for a Pull Request
 * Returns only what is required for behavior analysis
 */
export async function getChangedFiles(owner, repo, prNumber) {
  const res = await githubClient.get(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      params: {
        per_page: 100
      }
    }
  );

  return res.data.map(file => ({
    filename: file.filename,
    status: file.status,
    patch: file.patch || ""
  }));
}
