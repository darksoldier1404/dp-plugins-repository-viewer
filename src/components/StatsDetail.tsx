import React, { useEffect, useState } from 'react';
import { GitHubRepo } from '../types';
import { fetchPluginCharts, fetchChartData } from '../services/bstatsService';

type Props = {
    repo: GitHubRepo;
    pluginId: number;
    pluginName: string;
    onBack: () => void;
};

import * as echarts from 'echarts';

const EChartLine: React.FC<{ points: Array<[number, number]> }> = ({ points }) => {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const chartRef = React.useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!ref.current) return;
        const chart = echarts.init(ref.current);
        chartRef.current = chart;

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    if (!params || !params[0]) return '';
                    const p = params[0];
                    const date = new Date(p.data[0]);
                    return `<div style="font-size:14px"><b>${date.toLocaleString()}</b></div><div>Servers: <b>${p.data[1]}</b></div>`;
                }
            },
            grid: { left: 48, right: 12, top: 12, bottom: 40 },
            dataZoom: [
                { type: 'slider', start: 60, end: 100, bottom: 10 },
                { type: 'inside', start: 60, end: 100 }
            ],
            xAxis: { type: 'time', axisLine: { lineStyle: { color: '#1f2937' } }, axisLabel: { color: '#94a3b8' } },
            yAxis: { type: 'value', min: 0, axisLine: { lineStyle: { color: '#1f2937' } }, axisLabel: { color: '#94a3b8', formatter: (v: number) => Number(v) % 1 !== 0 ? '' : String(v) } },
            series: [{
                type: 'line',
                data: points.map(p => [p[0], p[1]] as any),
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(6,182,212,0.12)' }, { offset: 1, color: 'rgba(6,182,212,0.02)' }] } },
                lineStyle: { color: '#06b6d4' },
                showSymbol: false,
                smooth: true,
                sampling: 'lttb'
            }],
        };

        chart.setOption(option);
        const resize = () => chart.resize();
        window.addEventListener('resize', resize);
        return () => { window.removeEventListener('resize', resize); chart.dispose(); chartRef.current = null; };
    }, [points]);

    return <div ref={ref} style={{ width: '100%', height: 320 }} />;
};

const EChartPie: React.FC<{ items: Array<{ label: string; value: number | Record<string, number>; drill?: Record<string, number> }>; chartId?: string; onSliceClick?: (name: string) => void }> = ({ items, chartId, onSliceClick }) => {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const chartRef = React.useRef<echarts.ECharts | null>(null);

    // normalize
    const normPre = items.map(it => {
        if (typeof it.value === 'number') return { name: it.label, value: it.value, drill: it.drill ?? null };
        const obj = it.value as Record<string, number>;
        const sum = Object.values(obj).reduce((s, v) => s + (Number(v) || 0), 0);
        return { name: it.label, value: sum, drill: obj };
    });
    const norm = normPre.filter(it => !Number.isNaN(it.value) && it.value > 0);

    useEffect(() => {
        if (!ref.current) return;
        const chart = echarts.init(ref.current);
        chartRef.current = chart;

        // Group very small slices into 'Other' when more than 20 items, preserving drill data
        let dataForChart = norm.slice();
        if (dataForChart.length > 20) {
            const total = dataForChart.reduce((s, it) => s + it.value, 0);
            let other = 0;
            const otherDrill: Record<string, number> = {};
            dataForChart = dataForChart.filter(it => {
                if (it.value < total / 200) {
                    other += it.value;
                    if (it.drill) {
                        for (const [k, v] of Object.entries(it.drill)) { const num = Number(v as any); if (!Number.isNaN(num)) otherDrill[k] = (otherDrill[k] || 0) + num; }
                    }
                    return false;
                }
                return true;
            });
            if (other > 0) dataForChart.push({ name: 'Other', value: other, drill: Object.keys(otherDrill).length ? otherDrill : null });
        }

        dataForChart.sort((a, b) => b.value - a.value);

        const isMobile = window.innerWidth <= 600;

        const option: echarts.EChartsOption = {
            tooltip: { trigger: 'item', formatter: (params: any) => `<div style="font-size:16px"><b>${params.name}</b></div><div>Share: ${params.percent?.toFixed(1) ?? params.percent}%</div><div>Total: ${params.value}</div>` },
            legend: { orient: 'vertical', left: isMobile ? 'left' : 'right', textStyle: { color: '#d1d5db' }, show: isMobile },
            series: [{
                name: chartId || 'data',
                type: 'pie',
                // full circle (not a donut)
                radius: isMobile ? '55%' : '60%',
                avoidLabelOverlap: false,
                label: { show: !isMobile, formatter: '{b}: {d}%' },
                emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
                labelLine: { show: !isMobile },
                data: dataForChart.map(n => ({ name: n.name, value: n.value }))
            }]
        };
        chart.setOption(option);
        // click
        chart.off('click');
        chart.on('click', (params: any) => {
            if (onSliceClick) onSliceClick(params.name);
        });
        const resize = () => chart.resize();
        window.addEventListener('resize', resize);
        return () => { window.removeEventListener('resize', resize); chart.dispose(); chartRef.current = null; };
    }, [items, chartId]);

    return <div ref={ref} style={{ width: '100%', height: 260 }} className="w-full" />;
};

// Location charts removed by user request; keeping GeoMap list fallback only.

const GeoMap: React.FC<{ items: Record<string, number> }> = ({ items }) => {
    // fallback simple list display
    return (
        <div className="w-full overflow-auto">
            <h4 className="mb-2">Server distribution</h4>
            <div className="h-64 bg-gray-900/30 rounded p-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(items).map(([c, v]) => (
                        <div key={c} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                            <div>{c}</div>
                            <div className="font-bold text-cyan-300">{v}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatsDetail: React.FC<Props> = ({ pluginId, onBack }) => {
    const [charts, setCharts] = useState<Record<string, any> | null>(null);
    const [chartDataMap, setChartDataMap] = useState<Record<string, any>>({});
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [pieOpen, setPieOpen] = useState<Record<string, string | null>>({});

    // helper to parse various bStats pie payload shapes and handle drilldownData
    const parsePieData = (raw: any) : Array<{ label: string; value: number; drill?: Record<string, number> }> => {
        if (!raw) return [];

        const sumValue = (v: any) : { value: number; drill?: Record<string, number> | undefined } => {
            if (v == null) return { value: 0 };
            if (typeof v === 'number') return { value: v };
            if (typeof v === 'string' && v !== '') {
                const n = Number(v);
                if (!Number.isNaN(n)) return { value: n };
            }
            if (Array.isArray(v)) {
                // array of pairs [[k, v], ...] or array of timeseries where last element carries the value
                // Try to find a numeric value: prefer last numeric in nested arrays or objects
                let s = 0;
                for (const it of v) {
                    if (Array.isArray(it) && it.length >= 2) {
                        const maybe = it[1];
                        if (typeof maybe === 'number') { s += maybe; }
                        else if (Array.isArray(maybe) && maybe.length >= 2) {
                            const n = Number(maybe[maybe.length - 1]); if (!Number.isNaN(n)) s += n;
                        } else if (typeof maybe === 'object' && maybe !== null) {
                            // sum its numeric values
                            for (const val of Object.values(maybe)) { const n = Number(val as any); if (!Number.isNaN(n)) s += n; }
                        } else {
                            const n = Number(maybe); if (!Number.isNaN(n)) s += n;
                        }
                    } else if (typeof it === 'object' && it !== null) {
                        if ('y' in it || 'value' in it) { const n = Number(it.y ?? it.value ?? 0); if (!Number.isNaN(n)) s += n; }
                        else {
                            for (const val of Object.values(it)) { const n = Number(val as any); if (!Number.isNaN(n)) s += n; }
                        }
                    } else {
                        const n = Number(it); if (!Number.isNaN(n)) s += n;
                    }
                }
                return { value: s };
            }
            if (typeof v === 'object') {
                // object map of category->count or drilldown object
                let drill: Record<string, number> = {};
                let s = 0;
                for (const [k, vv] of Object.entries(v)) {
                    // if vv is an array (timeseries), try last numeric
                    if (Array.isArray(vv)) {
                        for (let i = vv.length - 1; i >= 0; i--) {
                            const candidate = vv[i];
                            if (Array.isArray(candidate) && candidate.length >= 2) {
                                const n = Number(candidate[1]); if (!Number.isNaN(n)) { drill[k] = n; s += n; break; }
                            } else if (typeof candidate === 'number') { drill[k] = candidate as number; s += candidate as number; break; }
                            else if (candidate && typeof candidate === 'object') {
                                // pick numeric fields sum
                                let ss = 0; for (const inner of Object.values(candidate as any)) { const ni = Number(inner as any); if (!Number.isNaN(ni)) ss += ni; }
                                if (ss > 0) { drill[k] = ss; s += ss; break; }
                            }
                        }
                        continue;
                    }

                    const n = Number((vv as any));
                    if (!Number.isNaN(n)) { drill[k] = n; s += n; continue; }

                    if (typeof vv === 'object' && vv !== null) {
                        let ss = 0;
                        for (const inner of Object.values(vv as any)) { const ni = Number(inner as any); if (!Number.isNaN(ni)) ss += ni; }
                        if (ss > 0) { drill[k] = ss; s += ss; continue; }
                    }
                }
                return { value: s, drill: Object.keys(drill).length ? drill : undefined };
            }
            return { value: 0 };
        };

        // If array
        if (Array.isArray(raw)) {
            // Array of objects [{name, y}] or [{name, value}]
            if (raw.length > 0 && typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
                const first = raw[0] as any;
                if ('name' in first && ('y' in first || 'value' in first)) {
                    return raw.map((it:any) => ({ label: it.name, value: Number(it.y ?? it.value ?? 0) }));
                }
            }

            // array of pairs [[k, v], ...]
            const pairs = raw.filter((it:any) => Array.isArray(it) && it.length >= 2);
            if (pairs.length) return pairs.map((p:any) => ({ label: String(p[0]), value: Number(p[1]) }));

            // maybe it's timeseries snapshots; take the last snapshot if it's an object
            const last = raw[raw.length - 1];
            if (last && typeof last === 'object' && !Array.isArray(last)) {
                return Object.keys(last).map(k => {
                    const v = (last as any)[k];
                    const res = sumValue(v);
                    return { label: k, value: res.value, drill: res.drill };
                });
            }

            return [];
        }

        if (typeof raw === 'object') {
            // contains seriesData with possibly nested timeseries per-series
            if ('seriesData' in raw && Array.isArray(raw.seriesData)) {
                const arr = raw.seriesData;
                const items: Array<{ label: string; value: number; drill?: Record<string, number> | undefined }> = [];
                for (const it of arr) {
                    if (Array.isArray(it) && it.length >= 2) {
                        const name = String(it[0]);
                        const val = it[1];
                        if (Array.isArray(val)) {
                            // find last numeric value in val
                            let lastNum = 0;
                            for (let i = val.length - 1; i >= 0; i--) {
                                const el = val[i];
                                if (Array.isArray(el) && el.length >= 2) { const n = Number(el[1]); if (!Number.isNaN(n)) { lastNum = n; break; } }
                                if (typeof el === 'number') { lastNum = el; break; }
                                if (el && typeof el === 'object') { const n = Number((el as any).y ?? (el as any).value ?? 0); if (!Number.isNaN(n)) { lastNum = n; break; } }
                            }
                            items.push({ label: name, value: lastNum });
                        } else if (typeof val === 'object' && val !== null) {
                            const res = sumValue(val);
                            items.push({ label: name, value: res.value, drill: res.drill });
                        } else {
                            items.push({ label: name, value: Number(val) });
                        }
                    } else if (it && typeof it === 'object') {
                        if ('name' in it && ('y' in it || 'value' in it)) items.push({ label: it.name, value: Number(it.y ?? it.value ?? 0) });
                    }
                }

                // attach drilldownData if provided
                const drillMap = (raw as any).drilldownData || (raw as any).drilldown || (raw as any).drilldownMap;
                if (drillMap && typeof drillMap === 'object') {
                    for (const itm of items) {
                        const d = (drillMap as any)[itm.label] || null;
                        if (d && typeof d === 'object') {
                            const summed = sumValue(d);
                            itm.drill = summed.drill ?? (typeof d === 'object' ? (Object.keys(d).reduce((acc:any,k)=>{ const v = Number((d as any)[k]); if (!Number.isNaN(v)) acc[k]=v; return acc; }, {} as Record<string,number>) ) : undefined);
                            if (typeof itm.value !== 'number' || itm.value === 0) itm.value = summed.value;
                        }
                    }
                }

                return items;
            }

            // simple object map
            return Object.keys(raw).map(k => {
                const v = (raw as any)[k];
                const res = sumValue(v);
                return { label: k, value: res.value, drill: res.drill };
            });
        }

        return [];
    };
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const c = await fetchPluginCharts(pluginId);
                if (!mounted) return;
                setCharts(c);

                // Sequentially fetch chart data for all charts to avoid bursts
                const newData: Record<string, any> = {};
                const newLoading: Record<string, boolean> = {};
                for (const chartId of Object.keys(c)) {
                    if (!mounted) break;
                    newLoading[chartId] = true;
                    setLoadingMap({ ...newLoading });
                    try {
                        const data = await fetchChartData(pluginId, chartId, 500);
                        newData[chartId] = data;
                    } catch (e) {
                        console.warn('Failed to fetch chart data', chartId, e);
                        newData[chartId] = null;
                    } finally {
                        newLoading[chartId] = false;
                        setLoadingMap({ ...newLoading });
                    }
                }
                if (!mounted) return;
                setChartDataMap(newData);

            } catch (e: any) {
                setError(`Failed to load plugin charts: ${e?.message || String(e)}`);
            } finally {
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [pluginId, refreshKey]);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <button onClick={onBack} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm mr-2">Back</button>
                </div>
                <div>
                    <button onClick={() => { setRefreshKey(k => k + 1); }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Reload</button>
                </div>
            </div>

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">{error}</div>}

            {loading && <div className="p-4 text-gray-300">Loading charts…</div>}

            {/* Show all charts at once */}
            {charts && (() => {
                const entries = Object.entries(charts);

                // helper to detect location charts
                const isLocationChart = (meta: any, chartId: string) => {
                    const id = chartId.toLowerCase();
                    const title = String(meta?.title || '').toLowerCase();
                    const idCustom = String(meta?.idCustom || '').toLowerCase();
                    return id.includes('location') || id.includes('locations') || idCustom.includes('location') || title.includes('location') || title.includes('country') || title.includes('geo') || meta?.type === 'simple_map';
                };

                // Identify pie charts (not server/player line charts). Force serverSoftware to pie when present and exclude ALL location charts here
                const pieEntries = entries.map(([chartId, meta]) => {
                    const title = meta?.title || chartId;
                    const titleLower = String(title).toLowerCase();
                    const id = chartId.toLowerCase();
                    const data = chartDataMap[chartId];
                    const chartLoading = !!loadingMap[chartId];

                    const isServerOrPlayers = id.includes('server') || id.includes('servers') || id.includes('players') || titleLower.includes('server') || titleLower.includes('player');
                    const isLocation = isLocationChart(meta, chartId);
                    const isServerSoftware = id.includes('serversoftware') || titleLower.includes('server software') || String(meta?.idCustom || '').toLowerCase().includes('serversoftware');
                    const isPieType = typeof meta?.type === 'string' && String(meta.type).toLowerCase().includes('pie');

                    const pieItems = parsePieData(data);
                    const shouldBePie = ((!isServerOrPlayers) || isServerSoftware) && (pieItems.length > 0 || isServerSoftware || isPieType) && !isLocation;
                    return { chartId, title, data, pieItems, chartLoading, isServerOrPlayers, isLocation, isServerSoftware, isPieType, shouldBePie };
                }).filter(x => x.shouldBePie);

                // Exclude pie entries and ALL location charts from other entries
                const otherEntries = entries.filter(([chartId, meta]) => {
                    const isLoc = isLocationChart(meta, chartId);
                    const metaIsPie = typeof meta?.type === 'string' && String(meta.type).toLowerCase().includes('pie');
                    return !pieEntries.find(p => p.chartId === chartId) && !isLoc && !metaIsPie;
                });
                return (
                    <>
                        {otherEntries.map(([chartId, meta]) => {
                            const title = meta?.title || chartId;
                            const id = chartId.toLowerCase();
                            const data = chartDataMap[chartId];
                            const chartLoading = !!loadingMap[chartId];

                            // Normalize: line data vs object data
                            const linePoints: Array<[number, number]> | null = Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) ? (data as Array<[number, number]>) : null;

                            const isServerOrPlayers = id.includes('server') || id.includes('servers') || id.includes('players') || String(title).toLowerCase().includes('server') || String(title).toLowerCase().includes('player');
                            const isLocation = id.includes('location') || id.includes('locations') || String(title).toLowerCase().includes('location') || String(title).toLowerCase().includes('country') || String(title).toLowerCase().includes('geo');

                            return (
                                <div key={chartId} className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                                    <div className="text-lg font-semibold mb-2">{title}</div>
                                    <div className="flex items-center justify-center mb-4">
                                        {chartLoading ? <div className="text-gray-400">Loading…</div> : (
                                            isServerOrPlayers && linePoints ? (
                                                <div className="w-full">
                                                    <div className="flex justify-end mb-2">
                                                        <button onClick={async () => {
                                                            // load full data on demand
                                                            try {
                                                                setLoading(true);
                                                                const full = await fetchChartData(pluginId, chartId, 35000);
                                                                setChartDataMap(prev => ({ ...prev, [chartId]: full }));
                                                            } catch (e) {
                                                                console.error('Failed to load full data', e);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Load full data</button>
                                                    </div>
                                                    <EChartLine points={linePoints} />
                                                </div>
                                            ) : isLocation && data ? (
                                                // build country counts
                                                (() => {
                                                    const byCountry: Record<string, number> = {};
                                                    if (Array.isArray(data)) {
                                                        for (const it of data) {
                                                            if (Array.isArray(it) && it.length >= 2) {
                                                                const payload = it[1];
                                                                if (payload && typeof payload === 'object') {
                                                                    for (const k of Object.keys(payload)) {
                                                                        const v = Number(payload[k]); if (!Number.isNaN(v)) byCountry[k] = (byCountry[k] || 0) + v;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        for (const k of Object.keys(data)) { const v = Number((data as any)[k]); if (!Number.isNaN(v)) byCountry[k] = v; }
                                                    }
                                                    return <GeoMap items={byCountry} />;
                                                })()
                                            ) : (
                                                <pre className="whitespace-pre-wrap text-xs text-gray-300">{JSON.stringify(data || {}, null, 2)}</pre>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {pieEntries.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {pieEntries.map(p => (
                                    <div key={p.chartId} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                        <div className="text-lg font-semibold mb-2">{p.title}</div>
                                        <div>
                                            {p.chartLoading ? <div className="text-gray-400">Loading…</div> : (
                                                <div>
                                                    <EChartPie items={p.pieItems as any} chartId={p.chartId} onSliceClick={(name) => setPieOpen(prev => ({ ...prev, [p.chartId]: prev[p.chartId] === name ? null : name }))} />
                                                    {pieOpen[p.chartId] && (() => {
                                                        const item = p.pieItems.find((it:any) => it.label === pieOpen[p.chartId]);
                                                        const drill = item && typeof item.value === 'object' ? (item.value as Record<string, number>) : (item && item.drill ? item.drill : null);
                                                        if (!drill) return null;
                                                        return (
                                                            <div className="mt-4 bg-gray-900/50 p-3 rounded max-w-md mx-auto">
                                                                <div className="font-semibold mb-2">Drilldown: {item!.label}</div>
                                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                                    {Object.entries(drill).map(([k, v]) => (
                                                                        <div key={k} className="flex items-center justify-between"><div>{k}</div><div className="font-bold text-cyan-300">{v}</div></div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
};

export default StatsDetail;
