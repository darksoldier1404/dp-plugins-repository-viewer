import { GitHubRepo, GitHubCommit, GitHubRelease } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_PREFIX = 'github-cache-';

// --- Cache Utility Functions ---
const cache = {
    get: <T>(key: string): T | null => {
        const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!item) return null;
        try {
            return JSON.parse(item) as T;
        } catch (e) {
            console.error('Failed to parse cache item', e);
            return null;
        }
    },
    set: (key: string, data: any) => {
        try {
            const item = JSON.stringify(data);
            localStorage.setItem(`${CACHE_PREFIX}${key}`, item);
        } catch (e) {
            console.error('Failed to set cache item', e);
        }
    },
    clear: () => {
        Object.keys(localStorage)
            .filter(key => key.startsWith(CACHE_PREFIX))
            .forEach(key => localStorage.removeItem(key));
        console.log('GitHub data cache cleared.');
    }
};

export const clearCache = cache.clear;

// --- API Fetch Wrapper ---
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('github-token');
    
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'No error details available' }));
        throw new Error(`GitHub API request for ${endpoint} failed: ${response.status} ${response.statusText}. Message: ${errorData.message}`);
    }

    return response.json() as Promise<T>;
}

async function apiFetchWithCache<T>(key: string, endpoint: string, options?: RequestInit): Promise<T> {
    const cachedData = cache.get<T>(key);
    if (cachedData) {
        return Promise.resolve(cachedData);
    }
    const data = await apiFetch<T>(endpoint, options);
    cache.set(key, data);
    return data;
}

async function apiFetchHtml(endpoint: string): Promise<string | null> {
     const token = localStorage.getItem('github-token');
     const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.html+json',
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, { headers });

    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        throw new Error(`GitHub API request for ${endpoint} failed: ${response.status} ${response.statusText}.`);
    }

    return response.text();
}

// --- Exported Service Functions ---
export const fetchRepositories = (orgName: string): Promise<GitHubRepo[]> => {
    return apiFetchWithCache<GitHubRepo[]>(`repos-${orgName}`, `/orgs/${orgName}/repos?sort=pushed&per_page=100`);
};

export const fetchLatestCommit = async (owner: string, repo: string): Promise<GitHubCommit | null> => {
    const cacheKey = `commit-${owner}-${repo}`;
    const cached = cache.get<GitHubCommit | null>(cacheKey);
    if (cached) return cached;
    
    const commits = await apiFetch<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?per_page=1`);
    const data = commits[0] || null;
    cache.set(cacheKey, data);
    return data;
};

export const fetchLatestRelease = (owner: string, repo: string): Promise<GitHubRelease> => {
    return apiFetchWithCache<GitHubRelease>(`release-latest-${owner}-${repo}`, `/repos/${owner}/${repo}/releases/latest`);
};

export const fetchReadmeHtml = (owner: string, repo: string): Promise<string | null> => {
     const cacheKey = `readme-${owner}-${repo}`;
     const cached = cache.get<string | null>(cacheKey);
     if(cached) return Promise.resolve(cached);

     return apiFetchHtml(`/repos/${owner}/${repo}/readme`).then(data => {
         cache.set(cacheKey, data);
         return data;
     });
};

export const fetchAllReleases = (owner: string, repo: string): Promise<GitHubRelease[]> => {
    return apiFetchWithCache<GitHubRelease[]>(`releases-all-${owner}-${repo}`,`/repos/${owner}/${repo}/releases?per_page=100`);
};