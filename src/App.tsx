import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GitHubRepo } from './types';
import { fetchRepositories, clearCache } from './services/githubService';
import ProjectCard from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import StatsTab from './components/StatsTab';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './components/Login';
import Settings from './components/Settings';
import { LogoutIcon, SettingsIcon } from './components/Icons';

const ORG_NAME = 'DP-Plugins';
const EXCLUDED_REPO = 'DPP-Releases';

const App: React.FC = () => {
    const { t } = useTranslation();
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('github-token'));
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'grid-1' | 'grid-2' | 'grid-3'>(() => (localStorage.getItem('viewMode') as 'grid-1' | 'grid-2' | 'grid-3') || 'grid-3');
    const [activeTab, setActiveTab] = useState<'main' | 'stats'>(() => (localStorage.getItem('activeTab') as 'main' | 'stats') || 'main');
    const [currentPage, setCurrentPage] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const itemsPerPage = 9;

    const handleLogout = useCallback(() => {
        localStorage.removeItem('github-token');
        setToken(null);
        setRepos([]);
        clearCache();
    }, []);

    const fetchData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSelectedRepo(null);

            const allRepos = await fetchRepositories(ORG_NAME);
            const filteredRepos = allRepos.filter(repo => !repo.archived && repo.name !== EXCLUDED_REPO);
            setRepos(filteredRepos);

        } catch (err) {
            if (err instanceof Error) {
                if (err.message.includes('API rate limit exceeded')) {
                    setError('GitHub API rate limit exceeded. Authenticated requests have a higher limit. Please check your token or try again later.');
                } else if (err.message.includes('401')) {
                     setError('Authentication failed. Your GitHub token may be invalid or expired.');
                     handleLogout();
                } else {
                    setError(`Failed to fetch data: ${err.message}`);
                }
            } else {
                setError('An unknown error occurred while fetching repository data.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, handleLogout]);
    
    // Data refresh is handled by handleRefresh effect (called once on startup and every 3 hours)

    const handleLoginSuccess = (newToken: string) => {
        setError(null);
        localStorage.setItem('github-token', newToken);
        setToken(newToken);
        clearCache(); // Clear any old cache from a previous session before fetching
    };
    
    const handleRefresh = useCallback(() => {
        clearCache();
        fetchData();
    }, [fetchData]);

    // Refresh once on startup and then every 3 hours
    useEffect(() => {
        handleRefresh();
        const intervalId = setInterval(handleRefresh, 3 * 60 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [handleRefresh]);

    const handleSetViewMode = (mode: 'grid-1' | 'grid-2' | 'grid-3') => {
        setViewMode(mode);
        localStorage.setItem('viewMode', mode);
        setCurrentPage(1);
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleSelectRepo = (repo: GitHubRepo) => {
        setSelectedRepo(repo);
        window.scrollTo(0, 0);
    };

    const handleBackToList = () => {
        setSelectedRepo(null);
    };

    if (!token) {
        return <Login onLoginSuccess={handleLoginSuccess} error={error} />;
    }
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-6">
                    <h1 className="text-4xl md:text-5xl font-extrabold">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                            {t('app.title')}
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">{t('app.subtitle')}</p>
                </header>

                <div className="flex justify-center mb-4 space-x-2">
                    <button onClick={() => { setActiveTab('main'); localStorage.setItem('activeTab', 'main'); }} className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${activeTab === 'main' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Main</button>
                    <button onClick={() => { setActiveTab('stats'); localStorage.setItem('activeTab', 'stats'); }} className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${activeTab === 'stats' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Statistics</button>
                </div>

                {activeTab === 'main' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <input
                                type="text"
                                placeholder={t('search.placeholder')}
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full max-w-md"
                            />
                        </div>

                        <div className="flex justify-center mb-4 space-x-2">
                            <button onClick={() => handleSetViewMode('grid-1')} className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'grid-1' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{t('viewMode.1Column')}</button>
                            <button onClick={() => handleSetViewMode('grid-2')} className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'grid-2' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{t('viewMode.2Columns')}</button>
                            <button onClick={() => handleSetViewMode('grid-3')} className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${viewMode === 'grid-3' ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{t('viewMode.3Columns')}</button>
                        </div>
                    </>
                )}

                <div className="flex justify-center md:justify-end items-center mb-6 gap-4">
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium">
                        <SettingsIcon className="w-4 h-4" />
                        {t('settings.title')}
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium">
                        <LogoutIcon className="w-4 h-4" />
                        {t('buttons.logout')}
                    </button>
                </div>

                <main>
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg text-gray-300">{t('loading.fetching')}</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    {!loading && !error && (
                        activeTab === 'stats' ? (
                            <StatsTab repos={repos} />
                        ) : (
                            selectedRepo ? (
                                <ProjectDetail repo={selectedRepo} onBack={handleBackToList} />
                            ) : (
                                <div className={`grid ${viewMode === 'grid-1' ? 'grid-cols-1' : viewMode === 'grid-2' ? 'grid-cols-2' : 'grid-cols-3'} gap-8`}>
                                    {(() => {
                                        const filteredRepos = repos.filter(repo => 
                                            repo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                            (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                        );
                                        const sortedFilteredRepos = [...filteredRepos].sort((a, b) => {
                                            if (a.name === 'DPP-Core') return -1;
                                            if (b.name === 'DPP-Core') return 1;
                                            return a.name.localeCompare(b.name);
                                        });
                                        const totalPages = Math.ceil(sortedFilteredRepos.length / itemsPerPage);
                                        const displayedRepos = sortedFilteredRepos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                        return (
                                            <>
                                                {displayedRepos.map(repo => (
                                                    <ProjectCard 
                                                        key={repo.id} 
                                                        repo={repo}
                                                        onSelect={handleSelectRepo} 
                                                    />
                                                ))}
                                                {totalPages > 1 && (
                                                    <div className="col-span-full flex justify-center mt-8 space-x-2">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={currentPage === 1}
                                                            className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm font-medium"
                                                        >
                                                            {t('buttons.previous')}
                                                        </button>
                                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                            <button
                                                                key={page}
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                                                    page === currentPage
                                                                        ? 'bg-cyan-500 text-white'
                                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                                }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm font-medium"
                                                        >
                                                            {t('buttons.next')}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )
                        )
                    )}
                </main>
                {showSettings && <Settings onClose={() => setShowSettings(false)} />}
            </div>
        </div>
    );
};

export default App;
