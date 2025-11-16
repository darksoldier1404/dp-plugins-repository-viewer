import React, { useState, useEffect, useCallback } from 'react';
import { GitHubRepo } from './types';
import { fetchRepositories, clearCache } from './services/githubService';
import ProjectCard from './components/ProjectCard';
import ProjectDetail from './components/ProjectDetail';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './components/Login';
import { RefreshIcon, LogoutIcon } from './components/Icons';

const ORG_NAME = 'DP-Plugins';
const EXCLUDED_REPO = 'DPP-Releases';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('github-token'));
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) {
            setLoading(false); // No token, no need to show loading spinner
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
                    setError("Authentication failed. Please check the instructions below and try again.");
                    localStorage.removeItem('github-token');
                    setToken(null);
                    clearCache();
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
    }, [token]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLoginSuccess = (newToken: string) => {
        setError(null); // Clear previous errors on new login attempt
        localStorage.setItem('github-token', newToken);
        setToken(newToken);
        clearCache(); // Clear any old cache from a previous session before fetching
    };

    const handleLogout = () => {
        localStorage.removeItem('github-token');
        setToken(null);
        setRepos([]);
        clearCache();
    };
    
    const handleRefresh = () => {
        clearCache();
        fetchData();
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
                            DP-Plugins Projects
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Latest Commits & Releases Dashboard</p>
                </header>

                <div className="flex justify-center md:justify-end items-center mb-6 gap-4">
                    <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium">
                        <RefreshIcon className="w-4 h-4" />
                        Refresh Data
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium">
                        <LogoutIcon className="w-4 h-4" />
                        Logout
                    </button>
                </div>

                <main>
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg text-gray-300">Fetching repository data...</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    {!loading && !error && (
                        selectedRepo ? (
                            <ProjectDetail repo={selectedRepo} onBack={handleBackToList} />
                        ) : repos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {repos.map(repo => (
                                    <ProjectCard 
                                        key={repo.id} 
                                        repo={repo}
                                        onSelect={handleSelectRepo} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 px-6 bg-gray-800/50 rounded-lg border border-gray-700">
                                <h2 className="text-xl font-semibold text-gray-200">No Repositories Found</h2>
                                <p className="mt-4 text-gray-400 max-w-lg mx-auto">
                                    This could be because there are no active repositories in the DP-Plugins organization,
                                    or your GitHub Personal Access Token may not have the required <code className="bg-gray-900 text-cyan-400 text-sm font-mono py-1 px-2 rounded-md">public_repo</code> scope.
                                </p>
                                <p className="mt-4 text-gray-500 text-sm">
                                    Please verify your token's permissions and try refreshing the data.
                                </p>
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;