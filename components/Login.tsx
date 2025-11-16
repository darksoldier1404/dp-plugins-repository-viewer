import React, { useState } from 'react';

interface LoginProps {
    onLoginSuccess: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [token, setToken] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            onLoginSuccess(token.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                        DP-Plugins Viewer
                    </h1>
                    <p className="mt-2 text-gray-400">Please log in with a GitHub Personal Access Token.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-gray-300">
                            Personal Access Token
                        </label>
                        <div className="mt-1">
                            <input
                                id="token"
                                name="token"
                                type="password"
                                required
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full px-3 py-2 text-gray-100 bg-gray-900 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                placeholder="ghp_..."
                            />
                        </div>
                    </div>
                     <p className="text-xs text-gray-500 text-center">
                        A token with <code className="bg-gray-700 p-1 rounded-md text-gray-300">public_repo</code> scope is required. 
                        <a 
                            href="https://github.com/settings/tokens/new?scopes=public_repo&description=DP-Plugins%20Viewer" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-cyan-400 hover:text-cyan-300 ml-1"
                        >
                            Create one here.
                        </a>
                    </p>
                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all duration-300"
                        >
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;