import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, Check, ChevronLeft, ChevronRight, Info, LayoutDashboard, List, PackageOpen, PlusCircle, Search, Settings, ShoppingBasket, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { MOCK_DATA } from '../../mockData';
import { CATEGORY_COLORS, Product } from '../../types';

// ─── Toast System ─────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';
export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    exiting?: boolean;
}

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    const icons = {
        success: <Check size={16} strokeWidth={3} />,
        error: <AlertTriangle size={16} />,
        info: <Info size={16} />
    };

    const colors = {
        success: 'bg-emerald-600',
        error: 'bg-red-600',
        info: 'bg-primary-600'
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`${toast.exiting ? 'toast-exit' : 'toast-enter'} flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white backdrop-blur-sm ${colors[toast.type]}`}
                >
                    <div className="shrink-0 opacity-90">{icons[toast.type]}</div>
                    <p className="text-sm font-medium flex-1">{toast.message}</p>
                    <button onClick={() => onDismiss(toast.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export interface MainLayoutContext {
    addToast: (type: ToastType, message: string) => void;
}

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Global Search State
    const [globalSearch, setGlobalSearch] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Toast State
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Fetch products for global search and alerts in header
    const { data: products = [] } = useProducts();

    // ─── Toast Helpers ──────────────────────────────────────────────
    const addToast = useCallback((type: ToastType, message: string) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
        }, 3500);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getDaysUntilExpiry = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
    };

    const alertItems = products.filter(p => {
        const days = getDaysUntilExpiry(p.expiryDate);
        return days <= 3;
    }).sort((a, b) => getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate));

    const searchResults = globalSearch.trim()
        ? products.filter(p =>
            p.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
            p.category.toLowerCase().includes(globalSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(globalSearch.toLowerCase()))
        ).slice(0, 6)
        : [];

    const handleSearchSelect = (product: Product) => {
        setGlobalSearch('');
        setShowSearchResults(false);
        navigate(`/inventory/${product.id}`);
    };

    const NavItem = ({ path, icon: Icon, label }: { path: string, icon: any, label: string }) => {
        const isActive = location.pathname === path || (path === '/inventory' && location.pathname.startsWith('/inventory') && location.pathname !== '/inventory/add');

        return (
            <button
                onClick={() => navigate(path)}
                className={`group flex items-center gap-3 py-2.5 rounded-xl transition-all w-full text-sm font-medium relative overflow-hidden active:scale-[0.98] ${isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    } ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}
                title={isSidebarCollapsed ? label : undefined}
            >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-primary-600 rounded-r-full" />
                )}
                <Icon size={20} className={`shrink-0 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    {label}
                </span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            <aside className={`hidden md:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 z-20 transition-all duration-300 ease-in-out relative ${isSidebarCollapsed ? 'w-[72px]' : 'w-64'}`}>
                <div className={`h-16 flex items-center border-b border-gray-100 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-5'}`}>
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl text-white shadow-lg shadow-primary-600/25 shrink-0">
                            <ShoppingBasket size={20} strokeWidth={2.5} />
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-none">StockGuard</h1>
                            <p className="text-[10px] text-gray-400 font-medium">Expiry Tracker</p>
                        </div>
                    </div>
                </div>

                <div className="px-3 py-5 flex-1 overflow-y-auto">
                    <p className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 transition-all ${isSidebarCollapsed ? 'opacity-0 h-0 mb-0' : 'px-2'}`}>Menu</p>
                    <nav className="space-y-1">
                        <NavItem path="/" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem path="/inventory" icon={List} label="Inventory" />
                        <NavItem path="/inventory/add" icon={PlusCircle} label="Add Item" />
                    </nav>
                </div>

                <div className={`px-3 py-4 border-t border-gray-100 space-y-2 ${isSidebarCollapsed ? 'items-center flex flex-col' : ''}`}>
                    <button
                        onClick={() => setShowSettings(true)}
                        className={`flex items-center gap-3 p-2.5 w-full text-sm font-medium text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] ${isSidebarCollapsed ? 'justify-center' : 'px-3'}`}
                    >
                        <Settings size={18} />
                        <span className={`${isSidebarCollapsed ? 'hidden' : ''}`}>Settings</span>
                    </button>

                    <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isSidebarCollapsed ? 'justify-center' : 'bg-gradient-to-r from-gray-50 to-white border border-gray-100 px-3'}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs shrink-0 ring-2 ring-white shadow-sm">
                            SG
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
                            <p className="text-sm font-bold text-gray-900 truncate">My Store</p>
                            <p className="text-[10px] text-gray-400 font-medium truncate">Admin</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1.5 text-gray-400 hover:text-primary-600 shadow-md hover:shadow-lg transition-all z-30 flex items-center justify-center hover:scale-110 active:scale-95"
                >
                    {isSidebarCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
                </button>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/80 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="md:hidden flex items-center gap-2.5">
                        <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-1.5 rounded-lg text-white shadow-sm">
                            <ShoppingBasket size={18} />
                        </div>
                        <h1 className="text-lg font-extrabold text-gray-900">StockGuard</h1>
                    </div>

                    <div className="hidden md:flex items-center gap-3 text-sm">
                        <h2 className="font-bold text-gray-900 text-base">
                            {location.pathname === '/' && 'Overview'}
                            {location.pathname === '/inventory' && 'Inventory'}
                            {location.pathname === '/inventory/add' && 'Add New Item'}
                            {location.pathname.startsWith('/inventory/') && location.pathname !== '/inventory/add' && 'Product Details'}
                        </h2>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-gray-50 text-gray-400 border-gray-200">
                            💾 localStorage
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:block relative" ref={searchRef}>
                            <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2 w-56 focus-within:w-72 focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-400 focus-within:bg-white transition-all duration-300">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="bg-transparent border-none text-sm focus:outline-none w-full text-gray-700 placeholder:text-gray-400"
                                    value={globalSearch}
                                    onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchResults(true); }}
                                    onFocus={() => globalSearch && setShowSearchResults(true)}
                                />
                                {globalSearch && (
                                    <button onClick={() => { setGlobalSearch(''); setShowSearchResults(false); }} className="text-gray-400 hover:text-gray-600 shrink-0">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {showSearchResults && globalSearch.trim() && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in">
                                    {searchResults.length > 0 ? (
                                        <>
                                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                                            </div>
                                            {searchResults.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleSearchSelect(p)}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden">
                                                        {p.imageUrl ? (
                                                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-gray-400 font-bold text-xs">{p.name.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${CATEGORY_COLORS[p.category]}`}>
                                                            {p.category}
                                                        </span>
                                                    </div>
                                                    <ChevronRight size={14} className="text-gray-300" />
                                                </button>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="px-4 py-6 text-center text-sm text-gray-400">
                                            <PackageOpen size={24} className="mx-auto mb-2 opacity-50" />
                                            No products matching "{globalSearch}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all relative"
                            >
                                <Bell size={20} />
                                {alertItems.length > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white text-[9px] text-white font-bold flex items-center justify-center px-0.5">
                                        {alertItems.length}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-in">
                                    <div className="px-4 py-2.5 border-b border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900">Alerts</h4>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Expiring & expired items</p>
                                    </div>
                                    {alertItems.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                            <span className="text-3xl block mb-2">🎉</span>
                                            <p className="font-medium">All clear!</p>
                                            <p className="text-xs text-gray-300 mt-0.5">No items need attention</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto">
                                            {alertItems.map(item => {
                                                const days = getDaysUntilExpiry(item.expiryDate);
                                                const isExpired = days < 0;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => { navigate(`/inventory/${item.id}`); setShowNotifications(false); }}
                                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isExpired ? 'bg-red-500' : 'bg-orange-400'} ${!isExpired ? 'animate-pulse' : ''}`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                                            <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                                                                {isExpired ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Expires today' : `Expires in ${days}d`}
                                                            </p>
                                                        </div>
                                                        <ChevronRight size={14} className="text-gray-300 shrink-0" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-24 md:pb-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <Outlet context={{ addToast } satisfies MainLayoutContext} />
                    </div>
                </div>
            </main>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 p-2 pb-safe-area flex justify-around shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.08)] z-50">
                {[
                    { path: '/', icon: LayoutDashboard, label: 'Home' },
                    { path: '/inventory', icon: List, label: 'Inventory' },
                    { path: '/inventory/add', icon: PlusCircle, label: 'Add' },
                ].map(item => {
                    const isActive = location.pathname === item.path || (item.path === '/inventory' && location.pathname.startsWith('/inventory') && location.pathname !== '/inventory/add');
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
                        >
                            <item.icon size={22} />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {showSettings && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSettings(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-8 relative animate-scale-in" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <X size={18} />
                        </button>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-gradient-to-br from-gray-100 to-gray-50 p-3 rounded-xl border border-gray-200"><Settings size={22} className="text-gray-600" /></div>
                            <div>
                                <h3 className="text-lg font-extrabold text-gray-900">Settings</h3>
                                <p className="text-sm text-gray-400">Application preferences</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Store Name</p>
                                    <p className="text-xs text-gray-500 mt-0.5">My Store</p>
                                </div>
                                <span className="text-xs text-gray-400 bg-white px-2.5 py-1 rounded-lg font-medium border border-gray-200">Default</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Data Storage</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Local browser storage</p>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-100 border-gray-200 px-2.5 py-1 rounded-lg font-bold border">
                                    💾 Local
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm('This will clear all inventory data and load demo products. Are you sure?')) {
                                        localStorage.removeItem('stockguard_inventory');
                                        queryClient.setQueryData(['products'], MOCK_DATA);
                                        addToast('info', 'Inventory reset to demo data');
                                        setShowSettings(false);
                                    }
                                }}
                                className="w-full p-3.5 text-sm font-bold text-red-600 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all"
                            >
                                Reset to Demo Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
