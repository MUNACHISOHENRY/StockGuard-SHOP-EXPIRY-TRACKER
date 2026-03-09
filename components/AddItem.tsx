import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Calculator, CalendarDays, Camera, Check, ChevronRight, Clock, DollarSign, FileText, Hash, Loader2, MapPin, Minus, Package, Plus, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ProductFormValues, productSchema } from '../schemas/productSchema';
import { analyzeProductImage, checkBackendHealth } from '../services/geminiService';
import { Category, Product } from '../types';

interface AddItemProps {
    onAdd: (product: Omit<Product, 'id' | 'addedDate'>) => void;
    onCancel: () => void;
}

type ExpiryMode = 'manual' | 'calculated';
type Step = 1 | 2 | 3;

// ─── Extracted Components (defined outside to prevent focus loss) ───
const INPUT_CLASS = "w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300 bg-white text-gray-900 font-medium hover:border-gray-300";

const FieldGroup: React.FC<{ label: string; required?: boolean; icon?: any; error?: string; children: React.ReactNode }> = ({ label, required, children, icon: Icon, error }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider ml-0.5">
                {Icon && <Icon size={12} className="text-gray-400" />}
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {error && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">{error}</span>}
        </div>
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
            <div className="absolute top-5 left-[10%] w-[80%] h-0.5 bg-gray-200 -z-10"></div>
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

    // React Hook Form Setup
    const { register, handleSubmit, watch, setValue, trigger, getValues, formState: { errors } } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
            category: Category.OTHER,
            description: '',
            price: undefined,
            sku: '',
            location: '',
            expiryDate: '',
            quantity: 1,
            minStockThreshold: 5
        }
    });

    const formData = watch();

    // Calculation State
    const [expiryMode, setExpiryMode] = useState<ExpiryMode>('manual');
    const [calcData, setCalcData] = useState({ mfgDate: '', shelfLife: '' });

    // Image State
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check backend availability on mount
    useEffect(() => {
        checkBackendHealth().then(setIsBackendAvailable);
    }, []);

    // Auto Calculate Expiry
    useEffect(() => {
        if (expiryMode === 'calculated' && calcData.mfgDate && calcData.shelfLife) {
            const days = parseInt(calcData.shelfLife);
            if (!isNaN(days)) {
                const mfg = new Date(calcData.mfgDate);
                const expiry = new Date(mfg);
                expiry.setDate(mfg.getDate() + days);
                setValue('expiryDate', expiry.toISOString().split('T')[0], { shouldValidate: true });
            }
        }
    }, [expiryMode, calcData.mfgDate, calcData.shelfLife, setValue]);

    const handleCalcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCalcData(prev => ({ ...prev, [name]: value }));
    };

    const adjustQuantity = (delta: number, field: 'quantity' | 'minStockThreshold' = 'quantity') => {
        const current = getValues(field) ?? 0;
        setValue(field, Math.max(0, current + delta), { shouldValidate: true });
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
            setValue('name', analysis.name, { shouldValidate: true });
            setValue('category', analysis.category as Category, { shouldValidate: true });
            setValue('expiryDate', estimatedDate, { shouldValidate: true });
            setValue('description', `Automatically detected as ${analysis.name}.`, { shouldValidate: true });
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

    const nextStep = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Validate specific fields before moving to the next step
        if (currentStep === 1) {
            const isStep1Valid = await trigger(['name', 'category', 'price', 'sku', 'location', 'description']);
            if (!isStep1Valid) return;
        } else if (currentStep === 2) {
            const isStep2Valid = await trigger(['quantity', 'minStockThreshold', 'expiryDate']);
            if (!isStep2Valid) return;
        }

        if (currentStep < 3) setCurrentStep(prev => (prev + 1) as Step);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(prev => (prev - 1) as Step);
    };

    const onSubmit = (data: ProductFormValues) => {
        onAdd({
            name: data.name,
            category: data.category as Category,
            expiryDate: data.expiryDate,
            quantity: data.quantity,
            imageUrl: imagePreview || undefined,
            description: data.description,
            price: data.price,
            sku: data.sku,
            location: data.location,
            minStockThreshold: data.minStockThreshold
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

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onCancel} className="p-2.5 -ml-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all active:scale-95">
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
                        {/* Smart Scan Banner — only shown when backend is available */}
                        {isBackendAvailable !== false && (
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
                                            <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-2 group active:scale-95">
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
                                            <button type="button" onClick={handleRemoveImage} aria-label="Remove image" className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-xl">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Product Name */}
                        <FieldGroup label="Product Name" required icon={Package} error={errors.name?.message}>
                            <input
                                type="text"
                                className={INPUT_CLASS}
                                placeholder="e.g. Organic Whole Milk 1L"
                                {...register('name')}
                            />
                        </FieldGroup>

                        {/* Category + SKU Row */}
                        <div className="grid grid-cols-2 gap-5">
                            <FieldGroup label="Category" required error={errors.category?.message}>
                                <div className="relative">
                                    <select
                                        className={`${INPUT_CLASS} appearance-none cursor-pointer pr-10`}
                                        {...register('category')}
                                    >
                                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronRight size={16} className="rotate-90" />
                                    </div>
                                </div>
                            </FieldGroup>
                            <FieldGroup label="SKU / Barcode" icon={Hash} error={errors.sku?.message}>
                                <input
                                    type="text"
                                    className={INPUT_CLASS}
                                    placeholder="#883921"
                                    {...register('sku')}
                                />
                            </FieldGroup>
                        </div>

                        {/* Price + Location Row */}
                        <div className="grid grid-cols-2 gap-5">
                            <FieldGroup label="Unit Price" icon={DollarSign} error={errors.price?.message}>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₦</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={`${INPUT_CLASS} pl-8`}
                                        placeholder="0.00"
                                        {...register('price', { setValueAs: v => v === '' || isNaN(parseFloat(v)) ? undefined : parseFloat(v) })}
                                    />
                                </div>
                            </FieldGroup>
                            <FieldGroup label="Location" icon={MapPin} error={errors.location?.message}>
                                <input
                                    type="text"
                                    className={INPUT_CLASS}
                                    placeholder="Aisle 3, Shelf B"
                                    {...register('location')}
                                />
                            </FieldGroup>
                        </div>

                        {/* Description */}
                        <FieldGroup label="Description" icon={FileText} error={errors.description?.message}>
                            <textarea
                                rows={2}
                                className={`${INPUT_CLASS} resize-none`}
                                placeholder="Optional product notes..."
                                {...register('description')}
                            />
                        </FieldGroup>
                    </div>
                )}

                {/* ═══════════════════ Step 2: Stock & Expiry ═══════════════════ */}
                {currentStep === 2 && (
                    <div className="p-6 md:p-8 space-y-8 animate-in slide-in-from-right-8 fade-in duration-500 flex-1">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Quantity Control */}
                            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 relative">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    <Package size={12} className="text-gray-400" />
                                    Initial Stock
                                </label>
                                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                    <button type="button" onClick={() => adjustQuantity(-1)} aria-label="Decrease quantity" className="w-10 h-10 shrink-0 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Minus size={18} strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="number"
                                        className="flex-1 text-center bg-transparent text-2xl font-bold outline-none text-gray-900"
                                        {...register('quantity', { valueAsNumber: true })}
                                    />
                                    <button type="button" onClick={() => adjustQuantity(1)} aria-label="Increase quantity" className="w-10 h-10 shrink-0 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                                {errors.quantity && <span className="absolute bottom-1 left-5 text-[10px] text-red-500 font-bold">{errors.quantity.message}</span>}
                            </div>

                            {/* Low Stock Threshold */}
                            <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 relative">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    <AlertTriangle size={12} className="text-gray-400" />
                                    Alert Threshold
                                    <span className="text-[9px] font-bold text-gray-400 bg-gray-200/80 px-1.5 py-0.5 rounded normal-case tracking-normal">Optional</span>
                                </label>
                                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                    <button type="button" onClick={() => adjustQuantity(-1, 'minStockThreshold')} aria-label="Decrease threshold" className="w-10 h-10 shrink-0 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Minus size={18} strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="number"
                                        className="flex-1 text-center bg-transparent text-2xl font-bold outline-none text-gray-900"
                                        {...register('minStockThreshold', { valueAsNumber: true })}
                                    />
                                    <button type="button" onClick={() => adjustQuantity(1, 'minStockThreshold')} aria-label="Increase threshold" className="w-10 h-10 shrink-0 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:border-gray-300 transition-all text-gray-500 active:scale-95">
                                        <Plus size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                                {errors.minStockThreshold && <span className="absolute bottom-1 left-5 text-[10px] text-red-500 font-bold">{errors.minStockThreshold.message}</span>}
                            </div>
                        </div>

                        {/* Expiry Date Section */}
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <CalendarDays size={12} className="text-gray-400" />
                                    Expiry Date <span className="text-red-400 ml-0.5">*</span>
                                </label>
                                {errors.expiryDate && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">{errors.expiryDate.message}</span>}
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setExpiryMode('manual')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 ${expiryMode === 'manual' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <CalendarDays size={15} /> Pick Date
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setExpiryMode('calculated')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95 ${expiryMode === 'calculated' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
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
                                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none font-bold text-gray-900 bg-gray-50 focus:bg-white transition-colors hover:border-gray-300"
                                            {...register('expiryDate')}
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
                                        <span className="text-xl font-bold text-gray-900">{formData.price ? `₦${Number(formData.price).toFixed(2)}` : <span className="text-gray-300 text-sm">No price</span>}</span>
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
                        {Object.keys(errors).length > 0 ? (
                            <div className="bg-red-50 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm border border-red-100 shadow-sm">
                                <div className="bg-white p-2 rounded-lg shadow-sm text-red-500 shrink-0">
                                    <AlertTriangle size={16} />
                                </div>
                                <div>
                                    <span className="font-bold">Missing required fields.</span>
                                    <span className="text-red-600 ml-1">
                                        Please go back and ensure all required fields are validated.
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
                        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-gray-500 font-bold text-sm hover:bg-white hover:text-gray-900 rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm active:scale-95">
                            Cancel
                        </button>
                    ) : (
                        <button type="button" onClick={prevStep} className="px-5 py-2.5 text-gray-500 font-bold text-sm hover:bg-white hover:text-gray-900 rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm flex items-center gap-1.5 active:scale-95">
                            <ArrowLeft size={14} /> Back
                        </button>
                    )}

                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={() => nextStep()}
                            className="flex items-center gap-2 px-7 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-lg"
                        >
                            Continue <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-7 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-lg"
                        >
                            <Check size={18} strokeWidth={3} /> Confirm & Add
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
};

export default AddItem;