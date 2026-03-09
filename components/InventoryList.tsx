import { AlertTriangle, ArrowUpDown, Calendar, ChevronDown, ChevronRight, Download, Filter, Minus, MoreHorizontal, Plus, Search, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { TableVirtuoso, Virtuoso } from 'react-virtuoso';
import { CATEGORY_COLORS, CATEGORY_DOT_COLORS, Category, Product } from '../types';

interface InventoryListProps {
    products: Product[];
    onDelete: (id: string) => void;
    onUpdateQuantity: (id: string, newQuantity: number) => void;
    onSelectProduct: (product: Product) => void;
    onAddItem: () => void;
}

type SortOption = 'expiry_asc' | 'expiry_desc' | 'name_asc' | 'name_desc' | 'added_desc';
type StatusFilter = 'all' | 'expired' | 'warning' | 'good' | 'low_stock';

const InventoryList: React.FC<InventoryListProps> = ({ products, onDelete, onUpdateQuantity, onSelectProduct, onAddItem }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('expiry_asc');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');

    const getDaysUntilExpiry = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const isLowStock = (product: Product) => {
        const threshold = product.minStockThreshold !== undefined ? product.minStockThreshold : 5;
        return product.quantity <= threshold;
    };

    const filteredProducts = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();

        return products.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(lowerTerm) ||
                p.category.toLowerCase().includes(lowerTerm) ||
                (p.sku && p.sku.toLowerCase().includes(lowerTerm));

            const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

            const days = getDaysUntilExpiry(p.expiryDate);
            let matchesStatus = true;
            if (statusFilter === 'expired') matchesStatus = days < 0;
            else if (statusFilter === 'warning') matchesStatus = days >= 0 && days <= 3;
            else if (statusFilter === 'good') matchesStatus = days > 3;
            else if (statusFilter === 'low_stock') matchesStatus = isLowStock(p);

            return matchesSearch && matchesCategory && matchesStatus;
        }).sort((a, b) => {
            switch (sortBy) {
                case 'expiry_asc':
                    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                case 'expiry_desc':
                    return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'added_desc':
                    return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
                default:
                    return 0;
            }
        });
    }, [products, searchTerm, sortBy, statusFilter, categoryFilter]);

    const getStatusColor = (days: number) => {
        if (days < 0) return 'text-red-700 bg-red-50 border-red-100';
        if (days <= 3) return 'text-orange-700 bg-orange-50 border-orange-100';
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    };

    const getStatusText = (days: number) => {
        if (days < 0) return `Expired ${Math.abs(days)}d ago`;
        if (days === 0) return 'Expires Today';
        if (days === 1) return 'Expires Tomorrow';
        return `${days} days left`;
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setCategoryFilter('all');
    };

    const handleExportCSV = () => {
        const headers = ['Name', 'Category', 'Expiry Date', 'Days Left', 'Quantity', 'Added Date'];
        const rows = filteredProducts.map(p => {
            const days = getDaysUntilExpiry(p.expiryDate);
            return [
                `"${p.name.replace(/"/g, '""')}"`,
                p.category,
                p.expiryDate,
                days,
                p.quantity,
                p.addedDate.split('T')[0]
            ].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const EmptyStateIllustration = () => (
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6 opacity-60 grayscale">
            <circle cx="100" cy="100" r="80" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M65 85H135L125 145H75L65 85Z" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" strokeLinejoin="round" />
            <path d="M60 85H140" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <path d="M100 115V125" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M85 115V125" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M115 115V125" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <circle cx="130" cy="70" r="15" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
            <path d="M130 63V70L135 74" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Toolbar */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Inventory</h2>
                        <p className="text-gray-400 mt-1 text-sm">Manage stock and track expiration dates.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-all text-sm font-semibold active:scale-[0.98] active:bg-gray-100"
                        >
                            <Download size={16} />
                            Export
                        </button>
                        <button
                            onClick={onAddItem}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 border border-primary-600 rounded-xl text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all text-sm font-bold hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        >
                            <Plus size={16} />
                            Add Item
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-5">
                    <div className="flex flex-col lg:flex-row gap-5 justify-between">
                        <div className="relative flex-1 max-w-lg group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, SKU or category..."
                                className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 transition-all bg-gray-50/50 focus:bg-white text-gray-900"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                            {(['all', 'expired', 'warning', 'low_stock', 'good'] as StatusFilter[]).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === status
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {status === 'all' ? 'All Items' :
                                        status === 'expired' ? 'Expired' :
                                            status === 'warning' ? 'Expiring Soon' :
                                                status === 'low_stock' ? 'Low Stock' : 'Good Condition'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Row: Detailed Filters */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <Filter size={16} />
                            <span>Filter by:</span>
                        </div>

                        <div className="relative group">
                            <select
                                className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 cursor-pointer shadow-sm transition-all"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value as any)}
                            >
                                <option value="all">All Categories</option>
                                {Object.values(Category).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        <div className="relative group">
                            <select
                                className="appearance-none pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 cursor-pointer shadow-sm transition-all"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                            >
                                <option value="expiry_asc">Expiry: Soonest First</option>
                                <option value="expiry_desc">Expiry: Latest First</option>
                                <option value="name_asc">Name: A-Z</option>
                                <option value="name_desc">Name: Z-A</option>
                                <option value="added_desc">Date Added: Newest</option>
                            </select>
                            <ArrowUpDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        {(categoryFilter !== 'all' || searchTerm || statusFilter !== 'all') && (
                            <button
                                onClick={clearFilters}
                                className="ml-auto text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <X size={14} /> Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Product List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {filteredProducts.length === 0 ? (
                    <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
                        <EmptyStateIllustration />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                            We couldn't find any items matching your current filters. Try adjusting your search keywords or categories.
                        </p>
                        <button
                            onClick={clearFilters}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Desktop View Virtualized Table */}
                        <div className="hidden md:block h-[600px] w-full">
                            <TableVirtuoso
                                data={filteredProducts}
                                components={{
                                    Table: (props) => <table {...props} className="w-full text-left border-collapse" />,
                                    TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} className="bg-gray-50/80 backdrop-blur border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-bold" />),
                                    TableRow: (props) => <tr {...props} className="group transition-all duration-200 cursor-pointer row-hover outline-none border-b border-gray-100 last:border-0" />,
                                    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="bg-white" />),
                                }}
                                fixedHeaderContent={() => (
                                    <tr>
                                        <th className="px-6 py-5 pl-8 bg-gray-50/95 sticky top-0 z-10 w-[30%]">Product</th>
                                        <th className="px-6 py-5 bg-gray-50/95 sticky top-0 z-10 w-[20%]">Category</th>
                                        <th className="px-6 py-5 bg-gray-50/95 sticky top-0 z-10 w-[20%]">Expiry Status</th>
                                        <th className="px-6 py-5 text-center bg-gray-50/95 sticky top-0 z-10 w-[15%]">Stock</th>
                                        <th className="px-6 py-5 text-right pr-8 bg-gray-50/95 sticky top-0 z-10 w-[15%]">Actions</th>
                                    </tr>
                                )}
                                itemContent={(index, product) => {
                                    const daysLeft = getDaysUntilExpiry(product.expiryDate);
                                    const lowStock = isLowStock(product);
                                    const isExpired = daysLeft < 0;

                                    return (
                                        <>
                                            <td className={`px-6 py-4 pl-8 ${isExpired ? 'bg-red-50/30' : ''}`} onClick={() => onSelectProduct(product)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            product.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm group-hover:text-primary-700 transition-colors">{product.name}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 font-medium">
                                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                            SKU: {product.sku || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 ${isExpired ? 'bg-red-50/30' : ''}`} onClick={() => onSelectProduct(product)}>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${CATEGORY_COLORS[product.category]}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${CATEGORY_DOT_COLORS[product.category]}`}></span>
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 ${isExpired ? 'bg-red-50/30' : ''}`} onClick={() => onSelectProduct(product)}>
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getStatusColor(daysLeft)}`}>
                                                        {daysLeft < 0 ? <AlertTriangle size={12} strokeWidth={2.5} /> : <Calendar size={12} strokeWidth={2.5} />}
                                                        {getStatusText(daysLeft)}
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-medium pl-1">
                                                        {new Date(product.expiryDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 ${isExpired ? 'bg-red-50/30' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-center justify-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                                        <button
                                                            onClick={() => onUpdateQuantity(product.id, Math.max(0, product.quantity - 1))}
                                                            className="w-6 h-6 rounded border border-transparent hover:border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center transition-all disabled:opacity-50"
                                                            disabled={product.quantity <= 0}
                                                        >
                                                            <Minus size={12} strokeWidth={2.5} />
                                                        </button>
                                                        <span className="w-8 text-center font-bold text-gray-900 text-sm">{product.quantity}</span>
                                                        <button
                                                            onClick={() => onUpdateQuantity(product.id, product.quantity + 1)}
                                                            className="w-6 h-6 rounded border border-transparent hover:border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center transition-all"
                                                        >
                                                            <Plus size={12} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                    {lowStock && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                            Low Stock
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right pr-8 ${isExpired ? 'bg-red-50/30' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => onSelectProduct(product)}
                                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all active:scale-95"
                                                        title="View Details"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(product.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    );
                                }}
                            />
                        </div>

                        {/* Mobile View Virtualized Cards */}
                        <div className="md:hidden h-[600px] w-full">
                            <Virtuoso
                                data={filteredProducts}
                                itemContent={(index, product) => {
                                    const daysLeft = getDaysUntilExpiry(product.expiryDate);
                                    return (
                                        <div
                                            key={product.id}
                                            className="p-5 border-b border-gray-100 space-y-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                            onClick={() => onSelectProduct(product)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold border border-gray-200 shadow-sm shrink-0 overflow-hidden">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            product.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-base">{product.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${CATEGORY_COLORS[product.category]}`}>
                                                                {product.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                                                    className="text-gray-300 hover:text-red-500 p-2"
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">Expiry Status</span>
                                                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${getStatusColor(daysLeft).split(' ')[0]}`}>
                                                        {daysLeft < 0 ? <AlertTriangle size={12} /> : <Calendar size={12} />}
                                                        {getStatusText(daysLeft)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wide">In Stock</span>
                                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm relative">
                                                        <button
                                                            onClick={() => onUpdateQuantity(product.id, Math.max(0, product.quantity - 1))}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded"
                                                        >
                                                            <Minus size={12} strokeWidth={2.5} />
                                                        </button>
                                                        <span className="w-6 text-center text-sm font-bold text-gray-900">{product.quantity}</span>
                                                        <button
                                                            onClick={() => onUpdateQuantity(product.id, product.quantity + 1)}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded"
                                                        >
                                                            <Plus size={12} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* List Footer Stats */}
            <div className="text-center text-xs text-gray-400 font-medium">
                Showing {filteredProducts.length} of {products.length} products
            </div>
        </div>
    );
};

export default InventoryList;