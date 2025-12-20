const BSTATS_API_BASE = 'https://bstats.org';
const CACHE_PREFIX = 'bstats-cache-';

type Plugin = {
    id: number;
    name: string;
    owner: { id: number; name: string };
    software: { id: number; name: string; url: string };
    isGlobal: boolean;
};

export type ChartMetadata = {
    uid: number;
    type: string;
    position: number;
    title: string;
    isDefault: boolean;
    data: any;
};

const cache = {
    get: <T>(key: string): T | null => {
        const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!item) return null;
        try {
            return JSON.parse(item) as T;
        } catch (e) {
            console.error('Failed to parse bStats cache item', e);
            return null;
        }
    },
    set: (key: string, data: any) => {
        try {
            localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to set bStats cache item', e);
        }
    },
    clear: () => {
        Object.keys(localStorage)
            .filter(key => key.startsWith(CACHE_PREFIX))
            .forEach(key => localStorage.removeItem(key));
        console.log('bStats cache cleared.');
    }
};

export const clearBstatsCache = cache.clear;

async function fetchJson<T>(endpoint: string): Promise<T> {
    try {
        const res = await fetch(`${BSTATS_API_BASE}${endpoint}`);
        const text = await res.text();
        if (!res.ok) {
            let body: any = text;
            try { body = JSON.parse(text); } catch (_) {}
            throw new Error(`bStats API request failed: ${res.status} ${res.statusText}. Response: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
        }

        if (!text) {
            // some endpoints may return empty body
            return {} as T;
        }

        try {
            return JSON.parse(text) as T;
        } catch (e: any) {
            throw new Error(`Failed to parse bStats JSON response for ${endpoint}: ${e.message}`);
        }
    } catch (e: any) {
        // Network / fetch errors
        throw new Error(`Network error while contacting bStats: ${e.message}`);
    }
}

export const fetchAllPlugins = async (): Promise<Plugin[]> => {
    const key = 'plugins-all';
    const cached = cache.get<Plugin[]>(key);
    if (cached) return cached;
    const data = await fetchJson<Plugin[]>('/api/v1/plugins');
    cache.set(key, data);
    return data;
};

export const fetchPluginCharts = async (pluginId: number): Promise<Record<string, ChartMetadata>> => {
    const key = `plugin-charts-${pluginId}`;
    const cached = cache.get<Record<string, ChartMetadata>>(key);
    if (cached) return cached;
    const data = await fetchJson<Record<string, ChartMetadata>>(`/api/v1/plugins/${pluginId}/charts`);
    cache.set(key, data);
    return data;
};

export const fetchChartData = async (pluginId: number, chartId: string, maxElements?: number): Promise<any> => {
    const key = `chart-data-${pluginId}-${chartId}-${maxElements || 'all'}`;
    const cached = cache.get<any>(key);
    if (cached) return cached;
    const url = `/api/v1/plugins/${pluginId}/charts/${chartId}/data${maxElements ? `?maxElements=${maxElements}` : ''}`;
    const data = await fetchJson<any>(url);
    cache.set(key, data);
    return data;
};

export const findPluginByName = async (name: string): Promise<Plugin | null> => {
    const plugins = await fetchAllPlugins();
    const normalize = (s: string) => s.toLowerCase().replace(/[_\-\s]/g, '');
    const target = normalize(name);

    // Exact or normalized name match
    const exact = plugins.find(p => normalize(p.name) === target);
    if (exact) return exact;

    // If not exact, try partial match or owner match
    const partial = plugins.find(p => normalize(p.name).includes(target) || target.includes(normalize(p.name)));
    if (partial) return partial;

    const owner = plugins.find(p => p.owner && normalize(p.owner.name) === target);
    if (owner) return owner;

    return null;
};

// --- Manual mapping support ---
export type BstatsMapping = Record<string, number>; // repoName (case-insensitive) -> pluginId

// Default example mapping (can be edited by the user in Settings)
export const DEFAULT_BSTATS_MAPPING: BstatsMapping = {
    "DPP-Core": 24432,
    "DP-AFKShop": 26098,
    "DP-Ban": 27745,
    "DP-Cash": 26291,
    "DP-ConsumeBox": 25979,
    "DP-Evaluation": 28442,
    "DP-GUIShop": 26579,
    "DP-ItemCategory": 26503,
    "DP-ItemCollection": 27465,
    "DP-ItemEditor": 26325,
    "DP-ItemSkin": 27273,
    "DP-MailBox": 27647,
    "DP-Menu": 26570,
    "DP-RewardChest": 26191,
    "DP-SimpleAnnouncement": 27284,
    "DP-SimplePrefix": 24491,
    "DP-StreamNotify": 27577,
    "DP-VirtualStorage": 27498,
    "DP-CustomCraft": 28201,
    "DP-Banknote": 28390
};

export const getManualMapping = (): BstatsMapping => {
    try {
        const raw = localStorage.getItem('bstats-mapping');
        if (!raw) {
            // Persist default mapping so other parts of the app see it consistently
            try {
                localStorage.setItem('bstats-mapping', JSON.stringify(DEFAULT_BSTATS_MAPPING));
            } catch (e) {
                console.warn('Could not persist default bstats mapping', e);
            }
            return DEFAULT_BSTATS_MAPPING;
        }
        return JSON.parse(raw) as BstatsMapping;
    } catch (e) {
        console.error('Failed to parse bstats mapping', e);
        return DEFAULT_BSTATS_MAPPING;
    }
};

export const setManualMapping = (mapping: BstatsMapping) => {
    try {
        localStorage.setItem('bstats-mapping', JSON.stringify(mapping));
    } catch (e) {
        console.error('Failed to save bstats mapping', e);
    }
};

export const fetchPluginDetails = async (pluginId: number): Promise<Plugin> => {
    return fetchJson<Plugin>(`/api/v1/plugins/${pluginId}`);
};

// Try manual mapping first; returns Plugin details if found by mapping or by name (fallback)
export const findPluginForRepo = async (repoName: string): Promise<Plugin | null> => {
    const mapping = getManualMapping();
    const keys = Object.keys(mapping);
    const targetKey = keys.find(k => k.toLowerCase() === repoName.toLowerCase());
    if (targetKey) {
        const pluginId = mapping[targetKey];
        try {
            const plugin = await fetchPluginDetails(pluginId);
            return plugin;
        } catch (e) {
            console.warn(`bStats mapping exists for ${repoName} -> ${pluginId} but fetch failed`, e);
            // fallthrough to name-based lookup
        }
    }

    // fallback to best-effort name matching
    return findPluginByName(repoName);
};

// --- Diagnostics / test helpers ---
export const testBstatsApi = async (endpoint = '/api/v1/plugins', timeoutMs = 10000) : Promise<{ ok: boolean; status?: number; statusText?: string; body?: any; error?: string }> => {
    const url = `${BSTATS_API_BASE}${endpoint}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        const text = await res.text();
        let parsed: any = text;
        try { parsed = text ? JSON.parse(text) : null; } catch (_) {}
        if (!res.ok) {
            return { ok: false, status: res.status, statusText: res.statusText, body: parsed, error: `HTTP ${res.status} ${res.statusText}` };
        }
        return { ok: true, status: res.status, statusText: res.statusText, body: parsed };
    } catch (e: any) {
        const message = e?.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : e?.message || String(e);
        return { ok: false, error: `Network error: ${message}` };
    }
};
