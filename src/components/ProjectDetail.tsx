import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GitHubRepo, GitHubRelease } from '../types';
import { fetchReadmeHtml, fetchAllReleases } from '../services/githubService';
import { BackIcon, TagIcon, DownloadIcon, CalendarIcon, ExternalLinkIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface ProjectDetailProps {
    repo: GitHubRepo;
    onBack: () => void;
}

const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ repo, onBack }) => {
    const { t } = useTranslation();
    const [readme, setReadme] = useState<string | null>(null);
    const [releases, setReleases] = useState<GitHubRelease[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError('');
            try {
                const [readmeData, releasesData] = await Promise.all([
                    fetchReadmeHtml(repo.owner.login, repo.name),
                    fetchAllReleases(repo.owner.login, repo.name).catch(err => {
                        console.warn(`Could not fetch releases for ${repo.name}, treating as empty. Error:`, err);
                        return []; // Gracefully handle no releases (e.g., 404)
                    })
                ]);
                setReadme(readmeData);
                setReleases(releasesData);
            } catch (err) {
                console.error("A critical error occurred while fetching project details:", err);
                setError('Failed to load project details. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [repo]);

    return (
        <div className="animate-fade-in">
            <button
                onClick={onBack}
                className="inline-flex items-center mb-8 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-colors"
            >
                <BackIcon className="w-5 h-5 mr-2" />
                {t('buttons.back')}
            </button>

            <header className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                     <h1 className="text-3xl md:text-4xl font-extrabold text-cyan-400">{repo.name}</h1>
                     <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors" aria-label="View on GitHub">
                         <ExternalLinkIcon className="w-7 h-7" />
                     </a>
                </div>
                <p className="text-gray-400 mt-2 text-lg">{repo.description || 'No description available.'}</p>
            </header>

            {loading && (
                 <div className="flex flex-col items-center justify-center h-64">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-gray-300">Loading details...</p>
                </div>
            )}
            
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-12">
                    {/* All Releases Section */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-200 border-b-2 border-gray-700 pb-2 flex items-center">
                           <TagIcon className="w-6 h-6 mr-3 text-gray-400"/>
                           All Releases
                        </h2>
                        <div className="space-y-6">
                           {releases.length > 0 ? (
                                (() => {
                                    const totalPages = Math.ceil(releases.length / itemsPerPage);
                                    const displayedReleases = releases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                    return (
                                        <>
                                            {displayedReleases.map(release => (
                                                <div key={release.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                                    <div className="flex justify-between items-start">
                                                        <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-teal-400 hover:underline">
                                                            {release.name || release.tag_name}
                                                        </a>
                                                        <span className="text-sm text-gray-500 flex items-center flex-shrink-0 ml-4">
                                                            <CalendarIcon className="w-4 h-4 mr-1.5" />
                                                            {formatDate(release.published_at)}
                                                        </span>
                                                    </div>
                                                    {release.assets.length > 0 && (
                                                        <ul className="mt-4 space-y-2">
                                                            {release.assets.map(asset => (
                                                                <li key={asset.id}>
                                                                    <a href={asset.browser_download_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-cyan-500 bg-gray-900/60 hover:bg-gray-700/60 transition-colors py-2 px-3 rounded-md text-sm">
                                                                       <DownloadIcon className="w-4 h-4 mr-2" />
                                                                       {asset.name}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                            {totalPages > 1 && (
                                                <div className="flex justify-center mt-8 space-x-2">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                                                    >
                                                        Previous
                                                    </button>
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`px-4 py-2 rounded-md transition-colors ${
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
                                                        className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()
                           ) : (
                               <p className="text-gray-500 pl-2">No releases found for this project.</p>
                           )}
                        </div>
                    </section>
                    
                    {/* README Section */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-200 border-b-2 border-gray-700 pb-2">README.md</h2>
                        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            {readme ? (
                                <div className="markdown-body" dangerouslySetInnerHTML={{ __html: readme }} />
                            ) : (
                                <p className="text-gray-500">No README.md file found for this project.</p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;