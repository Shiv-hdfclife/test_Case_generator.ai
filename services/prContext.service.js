import { getChangedFiles } from "./prFiles.service.js";

export async function buildPRContext(owner, repo, prNumber) {
  const files = await getChangedFiles(owner, repo, prNumber);

  const resultFiles = files.map(file => ({
    file: file.filename,
    status: file.status,
    patch: file.patch || ""
  }));

  return {
    pullRequest: prNumber,
    owner,
    repo,
    files: resultFiles
  };
}
