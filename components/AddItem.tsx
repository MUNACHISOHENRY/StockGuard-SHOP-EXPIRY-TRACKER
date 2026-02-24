import { AlertTriangle, ArrowLeft, Calculator, CalendarDays, Camera, Check, ChevronRight, Clock, DollarSign, FileText, Hash, Loader2, MapPin, Minus, Package, Plus, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { analyzeProductImage } from '../services/geminiService';
import { Category, Product } from '../types';

interface AddItemProps {
    onAdd: (product: Omit<Product, 'id' | 'addedDate'>) => void;
    onCancel: () => void;
}

type ExpiryMode = 'manual' | 'calculated';
type Step = 1 | 2 | 3;

// ─── Extracted Components (defined outside to prevent focus loss) ───
const INPUT_CLASS = "w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300 bg-white text-gray-900 font-medium hover:border-gray-300";

const FieldGroup: React.FC<{ label: string; required?: boolean; icon?: any; children: React.ReactNode }> = ({ label, required, children, icon: Icon }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider ml-0.5">
            {Icon && <Icon size={12} className="text-gray-400" />}
            {label}
            {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const STEPS = [
    { num: 1, label: 'Product Info', icon: Package },
    { num: 2, label: 'Stock & Expiry', icon: Clock },
    { num: 3, label: 'Confirm', icon: ShieldCheck }
];

const StepIndicator: React.FC<{ currentStep: Step }> = ({ currentStep }) => (
    <div className="flex flex-col items-center mb-8 px-4">
        <div className="flex items-center w-full max-w-md relative">
            {/* Background Line */}
            <div className="absolute top-5 left-[10%] w-[80%] h-0.5 bg-gray-200 -z-10"></div>

            {/* Active Progress Line */}
            <div
                className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 -z-10 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%` }}
            ></div>

            {STEPS.map((step) => {
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;
                const StepIcon = step.icon;

                return (
                    <div key={step.num} className="flex-1 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 z-10 ${isCompleted
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-100'
                            : isActive
                                ? 'bg-white border-[3px] border-primary-500 text-primary-600 shadow-lg shadow-primary-100 scale-110'
                                : 'bg-white border-2 border-gray-200 text-gray-400'
                            }`}>
                            {isCompleted ? <Check size={16} strokeWidth={3} /> : <StepIcon size={16} />}
                        </div>
                        <span className={`mt-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-primary-700' : isCompleted ? 'text-primary-600' : 'text-gray-400'
                            }`}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    </div>
);

const AddItem: React.FC<AddItemProps> = ({ onAdd, onCancel }) => {
    const [currentStep, setCurrentStep] = useState<Step>(1);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: Category.OTHER,
        description: '',
        price: '',
        sku: '',
        location: '',
        expiryDate: '',
        quantity: 1,
        minStockThreshold: 5
    });

    // Calculation State
    const [expiryMode, setExpiryMode] = useState<ExpiryMode>('manual');
    const [calcData, setCalcData] = useState({
        mfgDate: '',
        shelfLife: ''
    });

    // Image State
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto Calculate Expiry
    useEffect(() => {
        if (expiryMode === 'calculated' && calcData.mfgDate && calcData.shelfLife) {
            const days = parseInt(calcData.shelfLife);
            if (!isNaN(days)) {
                const mfg = new Date(calcData.mfgDate);
                const expiry = new Date(mfg);
                expiry.setDate(mfg.getDate() + days);

                setFormData(prev => ({
                    ...prev,
                    expiryDate: expiry.toISOString().split('T')[0]
                }));
            }
        }
    }, [expiryMode, calcData.mfgDate, calcData.shelfLife]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCalcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCalcData(prev => ({ ...prev, [name]: value }));
    };

    const adjustQuantity = (delta: number, field: 'quantity' | 'minStockThreshold' = 'quantity') => {
        setFormData(prev => ({
            ...prev,
            [field]: Math.max(0, Number(prev[field]) + delta)
        }));
    };

    // AI Analysis Logic
    const performAnalysis = async (base64String: string) => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            const analysis = await analyzeProductImage(base64String);
            const today = new Date();
            today.setDate(today.getDate() + analysis.estimatedDays);
            const estimatedDate = today.toISOString().split('T')[0];

            setExpiryMode('manual');
            setFormData(prev => ({
                ...prev,
                name: analysis.name,
                category: analysis.category,
                expiryDate: estimatedDate,
                description: `Automatically detected as ${analysis.name}.`
            }));
        } catch (err) {
            console.error("AI Analysis failed", err);
            setAnalysisError("Could not identify the product. Please enter details manually.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            setImagePreview(base64String);
            performAnalysis(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setAnalysisError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const nextStep = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (currentStep < 3) setCurrentStep(prev => (prev + 1) as Step);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(prev => (prev - 1) as Step);
    };

    const handleSubmit = () => {
        onAdd({
            name: formData.name,
            category: formData.category as Category,
            expiryDate: formData.expiryDate,
            quantity: Number(formData.quantity),
            imageUrl: imagePreview || undefined,
            description: formData.description,
            price: formData.price ? parseFloat(formData.price) : undefined,
            sku: formData.sku,
            location: formData.location,
            minStockThreshold: Number(formData.minStockThreshold)
        });
    };

    const getDaysUntil = (dateStr: string) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = target.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const inputClass = INPUT_CLASS;

    return (
        <div className="max-w-2xl mx-auto animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-2.5 -ml-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Add New Item</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Fill in the details below</p>
                    </div>
                </div>
                <div className="text-xs font-bold text-primary-600 bg-primary-50 px-3.5 py-1.5 rounded-full border border-primary-100">
                    Step {currentStep}/3
                </div>
            </div>

            <StepIndicator currentStep={currentStep} />

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative min-h-[520px] flex flex-col transition-all duration-300">

                {/* ═══════════════════ Step 1: Product Basics ═══════════════════ */}
                {currentStep === 1 && (
                    <div className="p-6 md:p-8 space-y-6 animate-in slide-in-from-right-8 fade-in duration-500 flex-1">
                        {/* Smart Scan Banner */}
                        <div className="relative bg-gradient-to-br from-primary-50 via-indigo-50/80 to-violet-50/50 rounded-2xl p-5 border border-primary-100/80 overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-200 rounded-full blur-3xl opacity-15 -mr-12 -mt-12"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200 rounded-full blur-2xl opacity-10 -ml-6 -mb-6"></div>

                            <div className="relative z-10 flex items-start gap-4">
                                <div className="bg-white p-3 rounded-xl text-primary-600 shadow-sm ring-1 ring-primary-100 shrink-0">
                                    <Sparkles size={22} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900">AI Smart Scan</h4>
                                        <span className="text-[9px] font-bold text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Beta</span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">Upload a product photo to auto-fill name, category, and estimated shelf life.</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                                        <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-2 group">
                                            <Camera size={14} className="group-hover:scale-110 transition-transform text-primary-500" /> Choose Photo
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                        {imagePreview && (
                                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                <Check size={10} strokeWidth={3} /> Image attached
                                            </span>
                                        )}
                                        {isAnalyzing && (
                                            <span className="text-[10px] text-primary-600 flex items-center gap-1.5 font-bold bg-white/80 px-2 py-1 rounded-md">
                                                <Loader2 size={10} className="animate-spin" /> Analyzing...
                                            </span>
                                        )}
                                        {analysisError && (
                                            <span className="text-[10px] text-amber-600 flex items-center gap-1 font-medium">
                                                <AlertTriangle size={10} /> {analysisError}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {imagePreview && (
                                    <div className="relative w-20 h-20 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 shadow-sm group">
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        <button onClick={handleRemoveImage} className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-xl">
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product Name */}
                        <FieldGroup label="Product Name" required icon={Package}>
                            <input
                                type="text"
                                name="name"
                                required
                                className={inputClass}
                                placeholder="e.g. Organic Whole Milk 1L"
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                        </FieldGroup>

                        {/* Category + SKU Row */}
                        <div className="grid grid-cols-2 gap-5">
                            <FieldGroup label="Category" required>
                                <div className="relative">
                                    <select
                                        name="category"
                                        className={`${inputClass} appearance-none cursor-pointer pr-10`}
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronRight size={16} className="rotate-90" />
                                    </div>
                                </div>
                            </FieldGroup>
                            <FieldGroup label="SKU / Barcode" icon={Hash}>
                                <input
                                    type="text"
                                    name="sku"
                                    className={inputClass}
                                    placeholder="#883921"
                                    value={formData.sku}
                                    onChange={handleInputChange}
                                />
                            </FieldGroup>
                        </div>

                        {/* Price + Location Row */}
                        <div className="grid grid-cols-2 gap-5">
                            <FieldGroup label="Unit Price" icon={DollarSign}>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
                                    <input
                                        type="number"
                                        name="price"
                                        step="0.01"
                                        className={`${inputClass} pl-8`}
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </FieldGroup>
                            <FieldGroup label="Location" icon={MapPin}>
                                <input
                                    type="text"
                                    name="location"
                                    className={inputClass}
                                    placeholder="Aisle 3, Shelf B"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                />
                            </FieldGroup>
                        </div>

                        {/* Description */}
                        <FieldGroup label="Description" icon={FileText}>
                            <textarea
                                name="description"
                                rows={2}
                                className={`${inputClass} resize-none`}
                                placeholder="Optional product notes..."
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                        </FieldGroup>
                    </div>
                )}

                {/* ═══════════════════ Step 2: Stock & Expiry ═══════════════════ */}
                {currentStep === 2 && (
                    <div className="p-6 md:p-8 space-y-8 animate-in slide-in-from-right-8 fade-in duration-500 flex-1">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Quantity Control */}
                            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    <Package size={12} className="text-gray-400" />
                                    Initial Stock
                                </label>
                                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                    <button onClick={() => adjustQuantity(-1)} className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Minus size={18} strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleInputChange}
                                        className="flex-1 text-center bg-transparent text-2xl font-bold outline-none text-gray-900"
                                    />
                                    <button onClick={() => adjustQuantity(1)} className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            {/* Low Stock Threshold */}
                            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    <AlertTriangle size={12} className="text-gray-400" />
                                    Alert Threshold
                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-200/80 px-1.5 py-0.5 rounded normal-case tracking-normal">Optional</span>
                                </label>
                                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                    <button onClick={() => adjustQuantity(-1, 'minStockThreshold')} className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Minus size={18} strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="number"
                                        name="minStockThreshold"
                                        value={formData.minStockThreshold}
                                        onChange={handleInputChange}
                                        className="flex-1 text-center bg-transparent text-2xl font-bold outline-none text-gray-900"
                                    />
                                    <button onClick={() => adjustQuantity(1, 'minStockThreshold')} className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expiry Date Section */}
                        <div className="space-y-4 pt-2">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <CalendarDays size={12} className="text-gray-400" />
                                Expiry Date <span className="text-red-400 ml-0.5">*</span>
                            </label>

                            {/* Mode Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setExpiryMode('manual')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${expiryMode === 'manual' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <CalendarDays size={15} /> Pick Date
                                </button>
                                <button
                                    onClick={() => setExpiryMode('calculated')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${expiryMode === 'calculated' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Calculator size={15} /> Calculate
                                </button>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all">
                                {expiryMode === 'manual' ? (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <p className="text-xs text-gray-400 mb-2">Select the expiry date from the product label.</p>
                                        <input
                                            type="date"
                                            name="expiryDate"
                                            value={formData.expiryDate}
                                            onChange={handleInputChange}
                                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none font-bold text-gray-900 bg-gray-50 focus:bg-white transition-colors hover:border-gray-300"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <p className="text-xs text-gray-400 mb-1">Enter the manufacturing date and shelf life to auto-calculate.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mfg Date</label>
                                                <input
                                                    type="date"
                                                    name="mfgDate"
                                                    value={calcData.mfgDate}
                                                    onChange={handleCalcChange}
                                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 outline-none bg-white text-gray-900 font-medium hover:border-gray-300 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shelf Life (Days)</label>
                                                <input
                                                    type="number"
                                                    name="shelfLife"
                                                    value={calcData.shelfLife}
                                                    onChange={handleCalcChange}
                                                    placeholder="30"
                                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 outline-none bg-white text-gray-900 font-medium hover:border-gray-300 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        {formData.expiryDate && (
                                            <div className="flex items-center justify-between bg-gradient-to-r from-primary-50 to-indigo-50 p-4 rounded-xl border border-primary-100">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={14} className="text-primary-500" />
                                                    <span className="text-xs text-primary-700 font-bold uppercase tracking-wider">Calculated Result</span>
                                                </div>
                                                <span className="text-base font-bold text-primary-900">
                                                    {formData.expiryDate}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════ Step 3: Review & Confirm ═══════════════════ */}
                {currentStep === 3 && (
                    <div className="p-6 md:p-8 space-y-5 animate-in slide-in-from-right-8 fade-in duration-500 flex-1">

                        {/* Product Summary Card */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Top: Image + Name */}
                            <div className="flex flex-col md:flex-row">
                                <div className="w-full md:w-44 h-44 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-gray-100 relative">
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Review" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-300">
                                            <Package size={36} strokeWidth={1.5} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">No Image</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 p-6 flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="inline-block bg-primary-100 text-primary-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                            {formData.category}
                                        </span>
                                        <span className="text-xl font-bold text-gray-900">{formData.price ? `₦${parseFloat(formData.price).toFixed(2)}` : <span className="text-gray-300 text-sm">No price</span>}</span>
                                    </div>
                                    <h4 className="text-2xl font-bold text-gray-900 mb-1.5">{formData.name || <span className="text-gray-300 italic">Untitled Product</span>}</h4>
                                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                                        {formData.description || "No description provided."}
                                    </p>
                                    {(formData.sku || formData.location) && (
                                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                                            {formData.sku && (
                                                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                                                    <Hash size={9} /> {formData.sku}
                                                </span>
                                            )}
                                            {formData.location && (
                                                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                                                    <MapPin size={9} /> {formData.location}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-white">
                                <div className="p-5 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">Stock</p>
                                    <p className="text-2xl font-bold text-gray-900">{formData.quantity}</p>
                                </div>
                                <div className="p-5 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">Expires</p>
                                    <p className={`text-sm font-bold ${!formData.expiryDate ? 'text-red-400' : 'text-gray-900'}`}>
                                        {formData.expiryDate || 'Not set'}
                                    </p>
                                </div>
                                <div className="p-5 text-center">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">Days Left</p>
                                    {(() => {
                                        const days = getDaysUntil(formData.expiryDate);
                                        if (days === null) return <p className="text-gray-300 text-sm font-medium">—</p>;
                                        const colorClass = days < 0 ? 'text-red-600' : days <= 7 ? 'text-orange-500' : 'text-emerald-600';
                                        return <p className={`text-2xl font-bold ${colorClass}`}>{days} <span className="text-xs text-gray-400 font-normal">days</span></p>;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Validation Banner */}
                        {!formData.name || !formData.expiryDate ? (
                            <div className="bg-red-50 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm border border-red-100 shadow-sm">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-red-500 shrink-0">
                                    <AlertTriangle size={16} />
                                </div>
                                <div>
                                    <span className="font-bold">Missing required fields.</span>
                                    <span className="text-red-600 ml-1">
                                        {!formData.name && !formData.expiryDate ? 'Product name and expiry date are required.'
                                            : !formData.name ? 'Product name is required.'
                                                : 'Expiry date is required.'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 p-4 rounded-xl flex items-center gap-3 text-emerald-700 text-sm border border-emerald-100 shadow-sm">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-emerald-500 shrink-0">
                                    <Check size={16} strokeWidth={3} />
                                </div>
                                <div>
                                    <span className="font-bold">Ready to add!</span>
                                    <span className="text-emerald-600 ml-1">Click "Confirm" to add this product to your inventory.</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════ Footer Actions ═══════════════════ */}
                <div className="p-5 md:px-8 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center mt-auto z-10">
                    {currentStep === 1 ? (
                        <button onClick={onCancel} className="px-5 py-2.5 text-gray-500 font-bold text-sm hover:bg-white hover:text-gray-900 rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm">
                            Cancel
                        </button>
                    ) : (
                        <button onClick={prevStep} className="px-5 py-2.5 text-gray-500 font-bold text-sm hover:bg-white hover:text-gray-900 rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm flex items-center gap-1.5">
                            <ArrowLeft size={14} /> Back
                        </button>
                    )}

                    {currentStep < 3 ? (
                        <button
                            onClick={() => nextStep()}
                            disabled={currentStep === 1 && !formData.name}
                            className="flex items-center gap-2 px-7 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
                        >
                            Continue <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.name || !formData.expiryDate}
                            className="flex items-center gap-2 px-7 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg"
                        >
                            <Check size={18} strokeWidth={3} /> Confirm & Add
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddItem;