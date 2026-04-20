import { Octokit } from '@octokit/rest';
import btoa from 'btoa';
import moment from 'moment';
import atob from 'atob';

export type GitHubAPIConfig = {
  githubToken: string;
  owner: string;
  repository: string;
};

let api: Octokit | null = null;
let apiConfig: GitHubAPIConfig | null = null;

export default function login(config: GitHubAPIConfig) {
  api = new Octokit({
    auth: config.githubToken,
    userAgent: 'LevinBot',
    timeZone: 'Europe/London',
    log: {
      debug: console.log,
      info: console.log,
      warn: console.warn,
      error: console.error
    }
  });
  apiConfig = config;
}

export async function fetchFile(path: string): Promise<string | null> {
  if (!api || !apiConfig) {
    console.warn('[fetchFile] This method is noop if no GitHub API is initialized.');
    return null;
  }
  try {
    const response = await api.repos.getContents({
      owner: apiConfig.owner,
      repo: apiConfig.repository,
      path
    });
    return atob(response.data.content);
  } catch (e) {
    console.error(`Cannot fetch file "${path}". Error:`, e);
    return null;
  }
}

/**
 * Save a serializable object to file, the file MUST exists in
 * GitHub.
 * @param path
 * @param json
 */
export async function saveToFile(path: string, json: Object): Promise<boolean> {
  if (!api || !apiConfig) {
    console.warn('[fetchFile] This method is noop if no GitHub API is initialized.');
    return Promise.resolve(false);
  }

  let sha = null;
  // Check the file already exists in GitHub. This is a self-guard
  // mechanism to prevent accidental creation of files.
  try {
    const file = await api.repos.getContents({
      owner: apiConfig.owner,
      repo: apiConfig.repository,
      path
    });
    sha = file.data.sha;
  } catch (err) {
    console.error(
      `[saveToFile] Can't save object to file "${path}", check that file exists. Error:`,
      err
    );
    return Promise.resolve(false);
  }

  const update = await api.repos.createOrUpdateFile({
    owner: apiConfig.owner,
    repo: apiConfig.repository,
    path,
    sha,
    message: `Updated on ${moment().format('DD-MM-YYYY-HH:mm:ss')}`,
    content: btoa(JSON.stringify(json, null, 2)),
    committer: {
      name: 'Levin 2.0',
      email: 'Levin@Levin.Levin'
    },
    author: {
      name: 'Levin 2.0',
      email: 'Levin@Levin.Levin'
    }
  });

  if (update.status !== 200) {
    console.error('[saveToFile] error on save:', update);
    return Promise.resolve(false);
  }

  return Promise.resolve(true);
}
