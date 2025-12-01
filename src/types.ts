
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  pushed_at: string;
  archived: boolean;
  owner: {
    login: string;
  };
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  browser_download_url: string;
}

export interface GitHubRelease {
  id: number;
  name: string;
  tag_name: string;
  html_url: string;
  published_at: string;
  assets: GitHubReleaseAsset[];
}

declare global {
  interface Window {
    electronAPI: {
      setHardwareAcceleration: (enabled: boolean) => Promise<void>;
    };
  }
}