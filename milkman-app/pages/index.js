// components/MainApp.js or pages/index.js
import React, { useState, useEffect } from 'react';
import AuthPage from '../components/AuthPage';
import MilkmanCalculator from '../components/MilkmanCalculator';
import { LogOut, Loader } from 'lucide-react';

const MainApp = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = () => {
            const authStatus = localStorage.getItem('isAuthenticated');
            setIsAuthenticated(authStatus === 'true');
            setLoading(false);
        };

        checkAuth();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
    };

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Loader className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <AuthPage onAuthenticate={setIsAuthenticated} />;
    }

    // Show main app with logout option if authenticated
    return (
        <div className="relative">
            {/* Logout Button */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-gray-700"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>

            {/* Main Application */}
            <MilkmanCalculator />
        </div>
    );
};

export default MainApp;