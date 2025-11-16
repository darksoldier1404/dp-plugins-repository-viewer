import React, { useState, useEffect, useRef } from 'react';
import { GitHubRepo, GitHubCommit, GitHubRelease } from '../types';
import { fetchLatestCommit, fetchLatestRelease } from '../services/githubService';
import { CommitIcon, TagIcon, DownloadIcon, CalendarIcon } from './Icons';

interface ProjectCardProps {
    repo: GitHubRepo;
    onSelect: (repo: GitHubRepo) => void;
}

const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// --- Intersection Observer Hook ---
const useOnScreen = (options: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                // Stop observing once it's visible to prevent re-triggering
                observer.unobserve(entry.target);
            }
        }, options);

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [ref, options]);

    return [ref, isVisible] as const;
};


const ProjectCard: React.FC<ProjectCardProps> = ({ repo, onSelect }) => {
    const [latestCommit, setLatestCommit] = useState<GitHubCommit | null>(null);
    const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [ref, isVisible] = useOnScreen({ rootMargin: '0px 0px -50px 0px' });

    useEffect(() => {
        const loadDetails = async () => {
            if (!isVisible || !isLoading) return; // Only fetch if visible and not already loaded/loading

            try {
                const [commit, release] = await Promise.all([
                    fetchLatestCommit(repo.owner.login, repo.name),
                    fetchLatestRelease(repo.owner.login, repo.name).catch(() => null)
                ]);
                setLatestCommit(commit);
                setLatestRelease(release);
            } catch (error) {
                console.error(`Failed to fetch details for ${repo.name}`, error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDetails();
    }, [isVisible, repo, isLoading]);
    
    const firstAsset = latestRelease?.assets?.[0];

    const handleCardClick = () => onSelect(repo);

    const SkeletonLoader = ({ className }: {className?: string}) => (
        <div className={`bg-gray-700/50 animate-pulse rounded-md ${className}`}></div>
    );

    return (
        <div 
            ref={ref}
            className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700/50 flex flex-col justify-between transition-all duration-300 hover:border-cyan-500 hover:shadow-cyan-500/10 hover:-translate-y-1 cursor-pointer min-h-[450px]"
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick() }}
            aria-label={`View details for ${repo.name}`}
        >
            <div>
                <h2 className="text-2xl font-bold mb-2 truncate text-cyan-400">
                   {repo.name}
                </h2>
                <p className="text-gray-400 mb-6 text-sm h-10 overflow-hidden">{repo.description || 'No description available.'}</p>

                {/* Latest Commit Section */}
                <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3 text-gray-300 flex items-center">
                        <CommitIcon className="w-5 h-5 mr-2 text-gray-400"/>
                        Latest Commit
                    </h3>
                     {isLoading ? <SkeletonLoader className="h-16" /> : latestCommit ? (
                        <a href={latestCommit.html_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block bg-gray-900/50 p-3 rounded-md hover:bg-gray-700/60 transition-colors">
                            <p className="text-sm text-gray-200 truncate font-mono">{latestCommit.commit.message.split('\n')[0]}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                by {latestCommit.commit.author.name} on {formatDate(latestCommit.commit.author.date)}
                            </p>
                        </a>
                    ) : (
                        <p className="text-sm text-gray-500">Could not fetch commit data.</p>
                    )}
                </div>

                {/* Latest Release Section */}
                <div>
                     <h3 className="font-semibold text-lg mb-3 text-gray-300 flex items-center">
                        <TagIcon className="w-5 h-5 mr-2 text-gray-400"/>
                        Latest Release
                    </h3>
                    {isLoading ? <SkeletonLoader className="h-14" /> : latestRelease ? (
                        <div className="bg-gray-900/50 p-3 rounded-md">
                            <a href={latestRelease.html_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-teal-400 font-semibold hover:underline truncate block">
                                {latestRelease.name || latestRelease.tag_name}
                            </a>
                             <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <CalendarIcon className="w-3 h-3 mr-1.5"/> Published on {formatDate(latestRelease.published_at)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No releases found.</p>
                    )}
                </div>
            </div>

            {/* Download Button */}
             {isLoading ? (firstAsset ? <SkeletonLoader className="h-12 mt-6" /> : null) : firstAsset && (
                 <a 
                    href={firstAsset.browser_download_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-6 w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                 >
                    <DownloadIcon className="w-5 h-5 mr-2"/>
                    Download ({firstAsset.name.length > 20 ? '...' + firstAsset.name.slice(-17) : firstAsset.name})
                </a>
            )}
        </div>
    );
};

export default ProjectCard;