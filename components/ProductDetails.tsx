import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle, ChevronRight, Clock, Edit, MapPin, Package, PackageOpen, Save, Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ProductFormValues, productSchema } from '../schemas/productSchema';
import { Category, CATEGORY_COLORS, Product } from '../types';

interface ProductDetailsProps {
    product: Product;
    allProducts: Product[];
    onBack: () => void;
    onUpdateProduct: (product: Product) => void;
    onUpdateQuantity: (id: string, newQuantity: number) => void;
    onSelectProduct: (product: Product) => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, allProducts, onBack, onUpdateProduct, onUpdateQuantity, onSelectProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);

    // React Hook Form for Edit Mode
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product.name,
            category: product.category,
            description: product.description || '',
            price: product.price,
            sku: product.sku || '',
            location: product.location || '',
            expiryDate: product.expiryDate,
            quantity: product.quantity,
            minStockThreshold: product.minStockThreshold,
        }
    });

    const formQuantity = watch('quantity');
    const formPrice = watch('price');

    // Sync edit data when product changes or edit mode toggles
    useEffect(() => {
        reset({
            name: product.name,
            category: product.category,
            description: product.description || '',
            price: product.price,
            sku: product.sku || '',
            location: product.location || '',
            expiryDate: product.expiryDate,
            quantity: product.quantity,
            minStockThreshold: product.minStockThreshold,
        });
        setIsEditing(false);
    }, [product, reset]);

    // Close search on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search Logic
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const results = allProducts.filter(p =>
            p.id !== product.id &&
            (p.name.toLowerCase().includes(lowerTerm) ||
                p.category.toLowerCase().includes(lowerTerm) ||
                (p.sku && p.sku.toLowerCase().includes(lowerTerm)))
        ).slice(0, 5);

        setSearchResults(results);
        setShowResults(true);
    }, [searchTerm, allProducts, product.id]);

    const handleSelectSearchResult = (p: Product) => {
        onSelectProduct(p);
        setSearchTerm('');
        setShowResults(false);
    };

    const getDaysUntilExpiry = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const daysLeft = getDaysUntilExpiry(product.expiryDate);
    const activePrice = isEditing ? (formPrice || 0) : (product.price || 0);
    const activeQuantity = isEditing ? (formQuantity || 0) : product.quantity;
    const totalValue = activePrice * activeQuantity;

    const getStatusInfo = (days: number) => {
        if (days < 0) return { label: 'Expired', color: 'bg-red-50 text-red-700 border-red-100', icon: AlertTriangle };
        if (days <= 3) return { label: 'Expiring Soon', color: 'bg-orange-50 text-orange-700 border-orange-100', icon: Clock };
        return { label: 'Fresh', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle };
    };

    const status = getStatusInfo(daysLeft);
    const StatusIcon = status.icon;

    // Dynamic notes based on product state
    const getProductNotes = () => {
        const notes: string[] = [];
        const threshold = product.minStockThreshold !== undefined ? product.minStockThreshold : 5;

        if (daysLeft < 0) {
            notes.push(`⚠️ This product expired ${Math.abs(daysLeft)} day(s) ago. Consider discounting or removing from shelves.`);
        } else if (daysLeft <= 3) {
            notes.push(`⏰ Expiring in ${daysLeft} day(s). Consider running a promotion to move stock quickly.`);
        }

        if (product.quantity <= threshold) {
            notes.push(`📦 Stock is low (${product.quantity} remaining, threshold: ${threshold}). Reorder soon.`);
        }

        if (notes.length === 0) {
            notes.push('✅ Product is in good condition. Stock levels and expiry are healthy.');
        }

        return notes.join('\n');
    };

    const onSaveEdit = (data: ProductFormValues) => {
        onUpdateProduct({
            ...product,
            name: data.name,
            description: data.description || undefined,
            price: data.price,
            sku: data.sku || undefined,
            location: data.location || undefined,
            category: data.category as Category,
            quantity: data.quantity,
            minStockThreshold: data.minStockThreshold,
        });

        if (data.quantity !== product.quantity) {
            onUpdateQuantity(product.id, data.quantity);
        }
        setIsEditing(false);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 transition-all shadow-sm active:scale-95 hover:text-gray-900"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Products <ChevronRight size={10} /> Details
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
                    </div>
                </div>

                {/* Quick Search */}
                <div className="relative w-full md:w-96 group" ref={searchRef}>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Jump to another product..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 bg-white transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => searchTerm && setShowResults(true)}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => { setSearchTerm(''); setShowResults(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Dropdown Results */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                            {searchResults.length > 0 ? (
                                <>
                                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Matches
                                    </div>
                                    {searchResults.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleSelectSearchResult(p)}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors border-l-2 border-transparent hover:border-primary-500"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <span className="text-gray-400 font-bold text-xs">{p.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${CATEGORY_COLORS[p.category]}`}>
                                                        {p.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-300" />
                                        </button>
                                    ))}
                                </>
                            ) : (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                    <PackageOpen size={24} className="mx-auto mb-2 opacity-50" />
                                    No products found matching "{searchTerm}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Hero Section */}
            <form id="product-edit-form" onSubmit={handleSubmit(onSaveEdit)} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
                <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="w-full md:w-96 h-80 bg-gray-50 border-r border-gray-100 relative group">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={64} strokeWidth={1} />
                            </div>
                        )}
                        <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-sm ${status.color}`}>
                            <StatusIcon size={14} />
                            {status.label}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-3 mb-2">
                                    {isEditing ? (
                                        <select
                                            {...register('category')}
                                            className="px-2.5 py-1 rounded-md text-xs font-bold border border-primary-300 bg-primary-50 text-primary-700 outline-none"
                                        >
                                            {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${CATEGORY_COLORS[product.category]}`}>
                                            {product.category}
                                        </span>
                                    )}
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            {...register('sku')}
                                            placeholder="SKU"
                                            className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md border border-gray-300 outline-none w-32"
                                        />
                                    ) : (
                                        product.sku && (
                                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                                SKU: {product.sku}
                                            </span>
                                        )
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            {...register('name')}
                                            className={`text-3xl font-bold text-gray-900 border-b-2 outline-none bg-transparent w-full pb-1 ${errors.name ? 'border-red-400' : 'border-primary-300'}`}
                                        />
                                        {errors.name && <p className="text-red-500 text-xs font-bold">{errors.name.message}</p>}
                                    </div>
                                ) : (
                                    <h2 className="text-3xl font-bold text-gray-900">{product.name}</h2>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => { reset(); setIsEditing(false); }}
                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all active:scale-95"
                                        >
                                            <X size={20} />
                                        </button>
                                        <button
                                            type="submit"
                                            className="p-2 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-all active:scale-95"
                                        >
                                            <Save size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all active:scale-95"
                                        >
                                            <Edit size={20} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1">
                            {isEditing ? (
                                <textarea
                                    {...register('description')}
                                    placeholder="Add a description..."
                                    rows={3}
                                    className="text-gray-600 leading-relaxed w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 resize-none"
                                />
                            ) : (
                                <p className="text-gray-600 leading-relaxed max-w-2xl">
                                    {product.description || "No description available for this product."}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-8 pt-8 mt-8 border-t border-gray-100 relative">
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Stock Level</p>
                                {isEditing ? (
                                    <div className="space-y-1">
                                        <input
                                            type="number"
                                            {...register('quantity', { valueAsNumber: true })}
                                            className="text-3xl font-bold text-gray-900 border-b-2 border-primary-300 outline-none bg-transparent w-full pb-1"
                                        />
                                        {errors.quantity && <p className="text-red-500 text-[10px] font-bold absolute -bottom-4">{errors.quantity.message}</p>}
                                    </div>
                                ) : (
                                    <p className="text-3xl font-bold text-gray-900">{product.quantity}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Unit Price</p>
                                {isEditing ? (
                                    <div className="space-y-1">
                                        <div className="relative">
                                            <span className="absolute left-0 top-1 text-2xl font-bold text-gray-400">₦</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register('price', { setValueAs: v => v === '' || isNaN(parseFloat(v)) ? undefined : parseFloat(v) })}
                                                className="text-3xl font-bold text-gray-900 border-b-2 border-primary-300 outline-none bg-transparent w-full pl-5 pb-1"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-3xl font-bold text-gray-900">₦{product.price?.toFixed(2) || '0.00'}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Value</p>
                                <p className="text-3xl font-bold text-gray-900">₦{totalValue.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Product Information</h3>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Location</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        {...register('location')}
                                        placeholder="e.g. Aisle 3, Shelf B"
                                        form="product-edit-form"
                                        className="flex items-center gap-2 text-gray-900 font-medium border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary-100 w-full"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                                        <MapPin size={18} className="text-primary-500" />
                                        {product.location || 'Unassigned'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Added Date</p>
                                <p className="text-gray-900 font-medium">{new Date(product.addedDate).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Auto Notes</p>
                                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 border border-gray-100 whitespace-pre-line leading-relaxed">
                                    {getProductNotes()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Expiry & Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 opacity-20 ${daysLeft < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

                        <h3 className="text-lg font-bold text-gray-900 mb-6 relative z-10">Expiry Status</h3>

                        <div className="text-center py-6">
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${daysLeft < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {daysLeft < 0 ? <AlertTriangle size={32} /> : <Calendar size={32} />}
                            </div>
                            <p className="text-4xl font-bold text-gray-900 mb-1">{daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}</p>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{daysLeft < 0 ? 'Days Overdue' : 'Days Remaining'}</p>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Expires on</span>
                                <span className="font-bold text-gray-900">{new Date(product.expiryDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;