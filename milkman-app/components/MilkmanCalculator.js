// components/MilkmanCalculator.js
import React, { useState, useEffect } from 'react';
import { Calendar, Calculator, Settings, Save, Download, Loader } from 'lucide-react';

const MilkmanCalculator = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [globalRate, setGlobalRate] = useState(60);
    const [defaultCategory1, setDefaultCategory1] = useState(2.0);
    const [defaultCategory2, setDefaultCategory2] = useState(2.5);
    const [overrides, setOverrides] = useState({});
    const [showSettings, setShowSettings] = useState(false);
    const [showBill, setShowBill] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load settings
            const settingsRes = await fetch('/api/settings');
            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                setGlobalRate(settings.globalRate || 60);
                setDefaultCategory1(settings.defaultCategory1 || 2.0);
                setDefaultCategory2(settings.defaultCategory2 || 2.5);
            }

            // Load overrides for current month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const overridesRes = await fetch(`/api/overrides?year=${year}&month=${month}`);
            if (overridesRes.ok) {
                const overridesData = await overridesRes.json();
                const overridesMap = {};
                overridesData.forEach(override => {
                    overridesMap[override.date] = {
                        category1: override.category1Amount,
                        category2: override.category2Amount
                    };
                });
                setOverrides(overridesMap);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load overrides when month changes
    useEffect(() => {
        if (!loading) {
            loadOverrides();
        }
    }, [currentDate]);

    const loadOverrides = async () => {
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const overridesRes = await fetch(`/api/overrides?year=${year}&month=${month}`);
            if (overridesRes.ok) {
                const overridesData = await overridesRes.json();
                const overridesMap = {};
                overridesData.forEach(override => {
                    overridesMap[override.date] = {
                        category1: override.category1Amount,
                        category2: override.category2Amount
                    };
                });
                setOverrides(overridesMap);
            }
        } catch (error) {
            console.error('Error loading overrides:', error);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    globalRate,
                    defaultCategory1,
                    defaultCategory2
                })
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const saveOverride = async (date, category1Amount, category2Amount) => {
        try {
            const dateKey = formatDate(date);
            await fetch('/api/overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateKey,
                    category1Amount: category1Amount,
                    category2Amount: category2Amount
                })
            });
        } catch (error) {
            console.error('Error saving override:', error);
            alert('Failed to save override');
        }
    };

    // Auto-save settings when changed
    useEffect(() => {
        if (!loading) {
            const timeoutId = setTimeout(() => {
                saveSettings();
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [globalRate, defaultCategory1, defaultCategory2]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const formatDate = (date) => {
        // Format date as YYYY-MM-DD in local timezone (UTC+5) without conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getAmountForDay = (date, category) => {
        const dateKey = formatDate(date);
        if (overrides[dateKey]) {
            return category === 1 ? overrides[dateKey].category1 : overrides[dateKey].category2;
        }
        return category === 1 ? defaultCategory1 : defaultCategory2;
    };

    // Function to determine the status of a day
    const getDayStatus = (date) => {
        const dateKey = formatDate(date);
        const override = overrides[dateKey];

        if (!override) {
            return 'default'; // No override exists
        }

        // Check if both categories are 0 (no delivery)
        if (override.category1 === 0 && override.category2 === 0) {
            return 'no-delivery';
        }

        // Check if either category differs from default
        const hasOverride = override.category1 !== defaultCategory1 || override.category2 !== defaultCategory2;
        if (hasOverride) {
            return 'override';
        }

        return 'default';
    };

    // Function to get day styling based on status
    const getDayClassName = (date, isSelected) => {
        const status = getDayStatus(date);
        const baseClasses = "w-full h-full p-1 sm:p-2 rounded-lg border-2 transition-all text-left";

        if (isSelected) {
            return `${baseClasses} border-blue-500 bg-blue-50`;
        }

        switch (status) {
            case 'no-delivery':
                return `${baseClasses} border-red-300 bg-red-50 hover:border-red-400`;
            case 'override':
                return `${baseClasses} border-orange-300 bg-orange-50 hover:border-orange-400`;
            default:
                return `${baseClasses} border-gray-200 hover:border-gray-300 bg-white`;
        }
    };

    const updateOverride = async (date, category, amount) => {
        const dateKey = formatDate(date);
        // Handle empty string separately to allow clearing the field
        const parsedAmount = amount === '' ? 0 : (parseFloat(amount) || 0);

        // Get current values for both categories
        const currentCategory1 = getAmountForDay(date, 1);
        const currentCategory2 = getAmountForDay(date, 2);

        // Determine new values
        const newCategory1 = category === 1 ? parsedAmount : currentCategory1;
        const newCategory2 = category === 2 ? parsedAmount : currentCategory2;

        // Update local state
        setOverrides(prev => ({
            ...prev,
            [dateKey]: {
                category1: newCategory1,
                category2: newCategory2
            }
        }));

        // Save to database with both values
        await saveOverride(date, newCategory1, newCategory2);
    };

    const markNoDelivery = async (date) => {
        const dateKey = formatDate(date);

        // Update local state - set both categories to 0
        setOverrides(prev => ({
            ...prev,
            [dateKey]: {
                category1: 0,
                category2: 0
            }
        }));

        // Save to database with both values as 0
        await saveOverride(date, 0, 0);
    };

    // Function to handle clicking outside to unselect date
    const handleBackgroundClick = (e) => {
        // Check if the click is on the main container background
        if (e.target === e.currentTarget) {
            setSelectedDate(null);
        }
    };

    const calculateBill = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let category1Total = 0;
        let category2Total = 0;
        let category1Days = 0;
        let category2Days = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const cat1Amount = getAmountForDay(date, 1);
            const cat2Amount = getAmountForDay(date, 2);

            category1Total += cat1Amount;
            category2Total += cat2Amount;

            if (cat1Amount > 0) category1Days++;
            if (cat2Amount > 0) category2Days++;
        }

        return {
            category1: {
                totalLiters: category1Total,
                totalAmount: category1Total * globalRate,
                activeDays: category1Days
            },
            category2: {
                totalLiters: category2Total,
                totalAmount: category2Total * globalRate,
                activeDays: category2Days
            }
        };
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const days = getDaysInMonth(currentDate);
    const bill = calculateBill();

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

    return (
        <div
            className="min-h-screen bg-gray-50 p-2 sm:p-4"
            onClick={handleBackgroundClick}
        >
            <div className="max-w-6xl mx-auto">
                <header className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dairy Bill Calculator</h1>
                        </div>

                        {/* Mobile: Stack buttons vertically */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                disabled={saving}
                            >
                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                                <span className="sm:inline">Settings</span>
                            </button>
                            <button
                                onClick={() => setShowBill(!showBill)}
                                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Calculator className="w-4 h-4" />
                                <span className="sm:inline">View Bill</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6" onClick={(e) => e.stopPropagation()}>
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{monthName}</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                                        className="px-2 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs sm:text-sm"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                                        className="px-2 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs sm:text-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>

                            {/* Color Legend - Optimized for mobile */}
                            <div className="mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                                <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Legend:</div>
                                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-4 text-xs">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-200 bg-white rounded"></div>
                                        <span>Default</span>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-orange-300 bg-orange-50 rounded"></div>
                                        <span>Modified</span>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-300 bg-red-50 rounded"></div>
                                        <span>No Delivery</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                    <div key={index} className="text-center font-medium text-gray-600 py-1 sm:py-2 text-xs sm:text-sm">
                                        <span className="hidden sm:inline">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]}
                                        </span>
                                        <span className="sm:hidden">{day}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                {days.map((day, index) => (
                                    <div key={index} className="aspect-square">
                                        {day && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDate(day);
                                                }}
                                                className={getDayClassName(
                                                    day,
                                                    selectedDate && formatDate(selectedDate) === formatDate(day)
                                                )}
                                            >
                                                <div className="text-xs sm:text-sm font-medium text-gray-800 mb-1">
                                                    {day.getDate()}
                                                </div>
                                                {/* Mobile: Stack vertically, Desktop: Show inline */}
                                                <div className="text-xs text-gray-500">
                                                    <div className="hidden sm:block">
                                                        <div>C1: {getAmountForDay(day, 1)}L</div>
                                                        <div>C2: {getAmountForDay(day, 2)}L</div>
                                                    </div>
                                                    {/* Mobile: Compact format */}
                                                    <div className="sm:hidden text-center">
                                                        <div>{getAmountForDay(day, 1)}/{getAmountForDay(day, 2)}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {showSettings && (
                            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Global Rate (Rs/Liter)
                                        </label>
                                        <input
                                            type="number"
                                            value={globalRate}
                                            onChange={(e) => setGlobalRate(parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Category 1 (L/day)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={defaultCategory1}
                                            onChange={(e) => setDefaultCategory1(parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Default Category 2 (L/day)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={defaultCategory2}
                                            onChange={(e) => setDefaultCategory2(parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    {saving && (
                                        <div className="text-sm text-blue-600 flex items-center gap-2">
                                            <Loader className="w-4 h-4 animate-spin" />
                                            Auto-saving...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedDate && (
                            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                        Override for {selectedDate.toLocaleDateString()}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedDate(null)}
                                        className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category 1 (Liters)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={getAmountForDay(selectedDate, 1)}
                                            onChange={(e) => updateOverride(selectedDate, 1, e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            inputMode="decimal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category 2 (Liters)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={getAmountForDay(selectedDate, 2)}
                                            onChange={(e) => updateOverride(selectedDate, 2, e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            inputMode="decimal"
                                        />
                                    </div>
                                    <button
                                        onClick={() => markNoDelivery(selectedDate)}
                                        className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                    >
                                        Mark No Delivery
                                    </button>
                                </div>
                            </div>
                        )}

                        {showBill && (
                            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                                    Bill Summary - {monthName}
                                </h3>
                                <div className="space-y-4">
                                    <div className="border-b pb-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Category 1</h4>
                                        <div className="text-sm text-gray-600">
                                            <div>Total Liters: {bill.category1.totalLiters.toFixed(1)}L</div>
                                            <div>Active Days: {bill.category1.activeDays}</div>
                                            <div className="font-semibold text-gray-800">
                                                Amount: Rs{bill.category1.totalAmount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-b pb-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Category 2</h4>
                                        <div className="text-sm text-gray-600">
                                            <div>Total Liters: {bill.category2.totalLiters.toFixed(1)}L</div>
                                            <div>Active Days: {bill.category2.activeDays}</div>
                                            <div className="font-semibold text-gray-800">
                                                Amount: Rs{bill.category2.totalAmount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-gray-800">
                                        Total: Rs{(bill.category1.totalAmount + bill.category2.totalAmount).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MilkmanCalculator;