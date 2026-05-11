import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
const [owner, repo] = config.GITHUB_OBSIDIAN_REPO.split('/') as [string, string];
const branch = config.GITHUB_OBSIDIAN_BRANCH;

export async function commitFile(
  path: string,
  content: string,
  message: string,
): Promise<string> {
  const contentB64 = Buffer.from(content, 'utf-8').toString('base64');

  // Check if file exists to get its SHA (required for updates)
  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (!Array.isArray(existing.data) && existing.data.type === 'file') {
      sha = existing.data.sha;
    }
  } catch {
    // File doesn't exist — create it
  }

  const response = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: contentB64,
    branch,
    ...(sha ? { sha } : {}),
  });

  return response.data.commit.sha ?? '';
}

export async function getFileContent(path: string): Promise<string | null> {
  try {
    const response = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (!Array.isArray(response.data) && response.data.type === 'file') {
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}
