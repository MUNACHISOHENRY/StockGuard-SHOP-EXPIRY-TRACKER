import { Activity, AlertTriangle, ArrowUpRight, Clock, DollarSign, Layers, Loader2, Package, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getExpiryAdvice } from '../services/geminiService';
import { Product } from '../types';

interface DashboardProps {
    products: Product[];
}

// Modern, softer color palette for charts
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6'];

const Dashboard: React.FC<DashboardProps> = ({ products }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
    const [adviceError, setAdviceError] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Metrics
    const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);
    const totalValue = products.reduce((acc, p) => acc + (p.quantity * (p.price || 0)), 0);
    const uniqueCategories = new Set(products.map(p => p.category)).size;

    const expiringSoon = products.filter(p => {
        const daysUntil = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return daysUntil >= 0 && daysUntil <= 3;
    });
    const expiringSoonCount = expiringSoon.length;

    const expiredItems = products.filter(p => {
        const daysUntil = Math.ceil((new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return daysUntil < 0;
    });
    const expiredCount = expiredItems.length;

    const lowStockCount = products.filter(p => {
        const threshold = p.minStockThreshold !== undefined ? p.minStockThreshold : 5;
        return p.quantity <= threshold;
    }).length;

    // Data for Pie Chart
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        products.forEach(p => {
            counts[p.category] = (counts[p.category] || 0) + p.quantity;
        });
        return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
    }, [products]);

    // Data for Bar Chart (Items expiring in next 7 days)
    const expiryTrendData = useMemo(() => {
        const next7Days: Record<string, number> = {};
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            next7Days[d.toISOString().split('T')[0]] = 0;
        }

        products.forEach(p => {
            if (next7Days[p.expiryDate] !== undefined) {
                next7Days[p.expiryDate] += p.quantity;
            }
        });

        return Object.entries(next7Days).map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            count,
            fullDate: date
        }));
    }, [products]);

    // Fetch AI Advice
    const fetchAdvice = async () => {
        const atRiskItems = [...expiredItems, ...expiringSoon];
        if (atRiskItems.length === 0) return;

        setIsLoadingAdvice(true);
        setAdviceError(false);
        try {
            const advice = await getExpiryAdvice(
                atRiskItems.map(p => ({ name: p.name, expiryDate: p.expiryDate, quantity: p.quantity }))
            );
            setAiAdvice(advice);
        } catch {
            setAdviceError(true);
        } finally {
            setIsLoadingAdvice(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, colorTheme, subValue, trend }: any) => {
        const themes: any = {
            emerald: {
                iconBg: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                gradient: 'from-emerald-400 to-teal-400',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                border: 'hover:border-emerald-200'
            },
            blue: {
                iconBg: 'bg-blue-50',
                iconColor: 'text-blue-600',
                gradient: 'from-blue-400 to-indigo-400',
                badge: 'bg-blue-50 text-blue-700 border-blue-100',
                border: 'hover:border-blue-200'
            },
            orange: {
                iconBg: 'bg-orange-50',
                iconColor: 'text-orange-600',
                gradient: 'from-orange-400 to-amber-400',
                badge: 'bg-orange-50 text-orange-700 border-orange-100',
                border: 'hover:border-orange-200'
            },
            red: {
                iconBg: 'bg-red-50',
                iconColor: 'text-red-600',
                gradient: 'from-red-400 to-rose-400',
                badge: 'bg-red-50 text-red-700 border-red-100',
                border: 'hover:border-red-200'
            },
        };
        const t = themes[colorTheme] || themes.blue;

        return (
            <div className={`bg-white p-6 rounded-2xl shadow-card border border-gray-100 relative overflow-hidden group card-interactive animate-slide-up ${t.border}`}>
                {/* Ambient Background Gradient */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${t.gradient} opacity-[0.06] group-hover:opacity-[0.12] rounded-full blur-3xl -mr-12 -mt-12 transition-all duration-700`}></div>

                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${t.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                            <Icon size={20} className={t.iconColor} strokeWidth={2.5} />
                        </div>
                        <div className={`p-1.5 rounded-full ${t.iconBg} opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300`}>
                            <ArrowUpRight size={14} className={t.iconColor} />
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight animate-count-up">{value}</h3>
                    </div>

                    {subValue && (
                        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${t.badge} flex items-center gap-1.5`}>
                                {trend === 'up' && <TrendingUp size={12} strokeWidth={3} />}
                                {trend === 'down' && <TrendingDown size={12} strokeWidth={3} />}
                                {trend === 'neutral' && <Activity size={12} strokeWidth={3} />}
                                {subValue}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const EmptyStateIllustration = () => (
        <svg width="240" height="200" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto opacity-80">
            <rect x="40" y="60" width="160" height="100" rx="12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
            <path d="M40 90H200" stroke="#E2E8F0" strokeWidth="2" />
            <path d="M70 120H170" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M70 140H140" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <circle cx="120" cy="50" r="24" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" />
            <path d="M120 38V50L126 56" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M190 140L210 160M210 140L190 160" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center animate-fade-in">
                <EmptyStateIllustration />
                <h2 className="text-2xl font-bold text-gray-900 mt-6">No inventory data yet</h2>
                <p className="text-gray-500 max-w-md mt-2 mb-8 leading-relaxed">
                    Your dashboard is looking a bit empty! Start by adding your first product to track stock levels and expiration dates efficiently.
                </p>
                <div className="p-4 bg-primary-50 text-primary-800 rounded-xl mb-4 border border-primary-100 text-sm font-medium flex items-center gap-2">
                    <div className="bg-white p-1 rounded-full shadow-sm"><Activity size={14} /></div>
                    Tip: Use the 'Add Item' tab to scan products with AI.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard</h2>
                    <p className="text-gray-400 mt-1 text-sm">Real-time overview of your inventory health.</p>
                </div>
                <div className="text-xs font-semibold text-gray-500 bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2 self-start md:self-auto">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Updated {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <section aria-label="Key Metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
                <StatCard
                    icon={DollarSign}
                    label="Total Value"
                    value={`₦${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    colorTheme="emerald"
                    subValue={`${uniqueCategories} categories`}
                    trend="neutral"
                />
                <StatCard
                    icon={Package}
                    label="Total Items"
                    value={totalItems}
                    colorTheme="blue"
                    subValue={lowStockCount > 0 ? `${lowStockCount} low stock` : 'All stocked'}
                    trend={lowStockCount > 0 ? 'down' : 'up'}
                />
                <StatCard
                    icon={Clock}
                    label="Expiring Soon"
                    value={expiringSoonCount}
                    colorTheme="orange"
                    subValue="Within 3 days"
                    trend="down"
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Expired Items"
                    value={expiredCount}
                    colorTheme="red"
                    subValue={expiredCount > 0 ? "Action needed" : "All clear"}
                    trend={expiredCount > 0 ? "down" : "up"}
                />
            </section>

            {/* AI Advice Banner */}
            {(expiringSoonCount > 0 || expiredCount > 0) && (
                <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-200 rounded-full blur-3xl opacity-20 -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">AI Expiry Advisor</h3>
                                    <p className="text-xs text-gray-500">Get smart tips to minimize waste and loss</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchAdvice}
                                disabled={isLoadingAdvice}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                                {isLoadingAdvice ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Sparkles size={14} /> Get Advice</>}
                            </button>
                        </div>
                        {aiAdvice && (
                            <div
                                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-indigo-100 whitespace-pre-line"
                                dangerouslySetInnerHTML={{
                                    __html: aiAdvice
                                        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
                                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                }}
                            />
                        )}
                        {adviceError && (
                            <div className="bg-white/80 rounded-xl p-4 text-sm text-gray-500 border border-gray-200">
                                Unable to generate advice — check your API key in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code>.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Chart */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[420px] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 z-10 relative">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Inventory Distribution</h3>
                            <p className="text-sm text-gray-500 mt-1">Breakdown by product category</p>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"><Layers size={18} /></button>
                    </div>

                    <div className="flex-1 min-h-0 flex items-center justify-center relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={6}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                                    itemStyle={{ color: '#0f172a', fontSize: '13px', fontWeight: 600 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center text for Donut Chart */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-4xl font-bold text-gray-900 tracking-tight">{totalItems}</span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Products</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-6 z-10">
                        {categoryData.slice(0, 5).map((entry, index) => (
                            <div key={entry.name} className="flex items-center text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                {entry.name}
                            </div>
                        ))}
                        {categoryData.length > 5 && <span className="text-xs text-gray-400 self-center font-medium">+{categoryData.length - 5} more</span>}
                    </div>
                </section>

                {/* Expiry Bar Chart */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[420px] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 z-10">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Expiry Risk Forecast</h3>
                            <p className="text-sm text-gray-500 mt-1">Items expiring in the next 7 days</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-100">
                            <AlertTriangle size={12} />
                            <span>Risk Level</span>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={expiryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc', radius: 8 }}
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#f59e0b"
                                    radius={[8, 8, 8, 8]}
                                    fillOpacity={0.9}
                                    activeBar={{ fill: '#fbbf24', fillOpacity: 1 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;