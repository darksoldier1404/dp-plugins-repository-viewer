import React, { useEffect, useState, useCallback } from 'react';
import { GitHubRepo } from '../types';
import { fetchAllPlugins, findPluginByName, findPluginForRepo, fetchPluginCharts, fetchChartData, clearBstatsCache, getManualMapping, testBstatsApi } from '../services/bstatsService';

type Props = { repos: GitHubRepo[] };

const Sparkline: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
    if (!points || points.length === 0) return <div className="text-sm text-gray-400">No data</div>;
    // build simple SVG path
    const values = points.map(p => p[1]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = 4;
    const width = 140;
    const height = 32;
    const range = max - min || 1;
    const scaled = values.map((v, i) => {
        const x = (i / (values.length - 1 || 1)) * (width - pad * 2) + pad;
        const y = height - pad - ((v - min) / range) * (height - pad * 2);
        return `${x},${y}`;
    });
    return (
        <svg width={width} height={height} className="block">
            <polyline fill="none" stroke="#06b6d4" strokeWidth={2} points={scaled.join(' ')} />
        </svg>
    );
};

const StatsTab: React.FC<Props> = ({ repos }) => {
    const [pluginsLoaded, setPluginsLoaded] = useState(false);
    const [matches, setMatches] = useState<Record<number, { pluginId: number; pluginName: string } | null>>({});
    const [chartData, setChartData] = useState<Record<number, Array<[number, number]>>>({});
    const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const runLookup = useCallback(async () => {
        let mounted = true;
        try {
            setError(null);
            setPluginsLoaded(false);
            await fetchAllPlugins(); // warm cache
            if (!mounted) return;
            // For each repo, try to find plugin match
            const newMatches: Record<number, { pluginId: number; pluginName: string } | null> = {};
            await Promise.all(repos.map(async (repo) => {
                try {
                    // Prefer manual mapping (if configured), otherwise fall back to name-based lookup
                    let p = await findPluginForRepo(repo.name);
                    if (!p) p = await findPluginByName(repo.name);
                    newMatches[repo.id] = p ? { pluginId: p.id, pluginName: p.name } : null;
                } catch (e) {
                    newMatches[repo.id] = null;
                }
            }));
            if (mounted) {
                setMatches(newMatches);
                setPluginsLoaded(true);
            }

            // Automatically fetch default chart for matched plugins (lightweight: only chart metadata then data)
            await Promise.all(repos.map(async (repo) => {
                const m = newMatches[repo.id];
                if (!m) return;
                setLoadingMap(prev => ({ ...prev, [repo.id]: true }));
                try {
                    const charts = await fetchPluginCharts(m.pluginId);
                    // find default chart or first single_linechart
                    const entries = Object.entries(charts);
                    let chartId: string | null = null;
                    for (const [key, val] of entries) {
                        if (val.isDefault) { chartId = key; break; }
                    }
                    if (!chartId) {
                        const single = entries.find(([, v]) => v.type && v.type.includes('line'));
                        chartId = single ? single[0] : (entries[0] ? entries[0][0] : null);
                    }
                    if (chartId) {
                        const data = await fetchChartData(m.pluginId, chartId, 30);
                        if (mounted) setChartData(prev => ({ ...prev, [repo.id]: data }));
                    }
                } catch (e) {
                    // ignore single plugin errors
                } finally {
                    setLoadingMap(prev => ({ ...prev, [repo.id]: false }));
                }
            }));

        } catch (e: any) {
            console.error('bStats fetch error', e);
            setError(`Failed to fetch bStats data: ${e?.message || String(e)}`);
        } finally {
            mounted = false;
        }
    }, [repos]);

    useEffect(() => {
        runLookup();
        const onMappingChange = () => { runLookup(); };
        window.addEventListener('bstats-mapping-changed', onMappingChange);
        return () => { window.removeEventListener('bstats-mapping-changed', onMappingChange); };
    }, [repos, runLookup]);

    const handleRefresh = async () => {
        clearBstatsCache();
        setPluginsLoaded(false);
        setMatches({});
        setChartData({});
        setError(null);
        try {
            await runLookup();
        } catch (e: any) {
            setError(`Failed to refresh bStats data: ${e?.message || String(e)}`);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Statistics (bStats)</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Refresh</button>
                </div>
            </div>
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
                    <div className="mb-2 font-semibold">{error}</div>
                    <div className="flex gap-2">
                        <button onClick={handleRefresh} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Retry</button>
                        <button
                            onClick={async () => {
                                setTesting(true);
                                setTestResult(null);
                                try {
                                    const r = await testBstatsApi();
                                    setTestResult(r);
                                } catch (e: any) {
                                    setTestResult({ ok: false, error: e?.message || String(e) });
                                } finally {
                                    setTesting(false);
                                }
                            }}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                        >{testing ? 'Testing…' : 'Test bStats API'}</button>
                        <a href="https://bstats.org" target="_blank" rel="noreferrer" className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Open bStats</a>
                        <div className="text-xs text-gray-400 ml-auto self-center">See console for details</div>
                    </div>
                </div>
            )}
            {!pluginsLoaded ? (
                <div className="p-4 text-center text-gray-400">Loading bStats plugins metadata…</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {repos.map(repo => {
                            const m = matches[repo.id];
                            const data = chartData[repo.id] || [];
                            const loading = !!loadingMap[repo.id];
                            const latest = data.length ? data[data.length - 1][1] : null;
                            return (
                                <div key={repo.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-lg">{repo.name}</div>
                                            <div className="text-sm text-gray-400 mt-1">{repo.description}</div>
                                        </div>
                                        <div className="text-right">
                                            {m ? (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <a href={`https://bstats.org/plugin/bukkit/${repo.name}/${m.pluginId}`} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline text-sm">View in bStats</a>
                                                    {(() => {
                                                        const mapping = getManualMapping();
                                                        const isMapped = Object.keys(mapping).some(k => k.toLowerCase() === repo.name.toLowerCase());
                                                        return isMapped ? <span className="text-xs text-gray-400">(mapped)</span> : null;
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">No bStats plugin</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs text-gray-400">Servers</div>
                                            <div className="text-xl font-bold text-cyan-300">{loading ? '…' : (latest !== null ? latest : '—')}</div>
                                        </div>
                                        <div>
                                            <Sparkline points={data} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {testResult && (
                        <div className="mt-4 bg-gray-800/60 border border-gray-700 rounded p-3 text-sm text-gray-200">
                            <div className="font-semibold mb-2">bStats API test result</div>
                            <pre className="whitespace-pre-wrap text-xs text-gray-300">{JSON.stringify(testResult, null, 2)}</pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StatsTab;
