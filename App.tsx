import { AlertTriangle, Bell, Check, ChevronLeft, ChevronRight, Info, LayoutDashboard, List, PackageOpen, PlusCircle, Search, Settings, ShoppingBasket, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AddItem from './components/AddItem';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import ProductDetails from './components/ProductDetails';
import { isFirebaseConfigured } from './services/firebaseConfig';
import * as firestoreService from './services/firestoreService';
import { Category, CATEGORY_COLORS, Product, ViewState } from './types';

// Mock Initial Data if storage is empty
const MOCK_DATA: Product[] = [
  {
    id: '1',
    name: 'Whole Milk 2L',
    category: Category.DAIRY,
    expiryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    quantity: 5,
    addedDate: new Date().toISOString(),
    description: 'Fresh whole milk sourced from local farms. Ideal for daily consumption and baking.',
    price: 4.99,
    sku: 'ORM1L',
    location: 'Dairy Fridge R-03',
    minStockThreshold: 10
  },
  {
    id: '2',
    name: 'Sliced Bread',
    category: Category.BAKERY,
    expiryDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    quantity: 8,
    addedDate: new Date().toISOString(),
    price: 3.50,
    sku: 'BRD002',
    minStockThreshold: 5
  },
  {
    id: '3',
    name: 'Chicken Breast',
    category: Category.MEAT,
    expiryDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    quantity: 2,
    addedDate: new Date().toISOString(),
    price: 12.99,
    minStockThreshold: 5
  },
  {
    id: '4',
    name: 'Canned Beans',
    category: Category.PANTRY,
    expiryDate: new Date(Date.now() + 86400000 * 300).toISOString().split('T')[0],
    quantity: 12,
    addedDate: new Date().toISOString(),
    price: 1.20,
    minStockThreshold: 20
  },
];

const useFirebase = isFirebaseConfigured();

// ─── Toast System ─────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast {
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

// ─── Skeleton Loading ─────────────────────────────────────────────
const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#f8fafc] flex">
    {/* Sidebar skeleton */}
    <div className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 h-screen p-6 gap-6">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-lg"></div>
        <div className="skeleton w-28 h-5"></div>
      </div>
      <div className="space-y-2 mt-6">
        <div className="skeleton w-full h-10 rounded-lg"></div>
        <div className="skeleton w-full h-10 rounded-lg opacity-70"></div>
        <div className="skeleton w-full h-10 rounded-lg opacity-50"></div>
      </div>
    </div>
    {/* Content skeleton */}
    <div className="flex-1 p-8">
      <div className="skeleton w-48 h-6 mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton h-28 rounded-xl" style={{ animationDelay: `${i * 100}ms` }}></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="skeleton h-64 rounded-xl"></div>
        <div className="skeleton h-64 rounded-xl" style={{ animationDelay: '200ms' }}></div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const seededRef = useRef(false);

  // Global Search State
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Data source indicator
  const dataSource = useFirebase ? 'Firestore' : 'localStorage';

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

  // ─── Data Loading ───────────────────────────────────────────────
  useEffect(() => {
    if (useFirebase) {
      const unsubscribe = firestoreService.subscribeToProducts(
        (firestoreProducts) => {
          setProducts(firestoreProducts);
          setIsLoading(false);

          const alreadySeeded = seededRef.current || localStorage.getItem('stockguard_seeded') === 'true';
          if (firestoreProducts.length === 0 && !alreadySeeded) {
            seededRef.current = true;
            localStorage.setItem('stockguard_seeded', 'true');
            firestoreService.seedDemoData(MOCK_DATA).catch(console.error);
          }
        },
        (error) => {
          console.error('Firestore error, falling back to localStorage:', error);
          const stored = localStorage.getItem('freshTrack_inventory');
          setProducts(stored ? JSON.parse(stored) : MOCK_DATA);
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      const stored = localStorage.getItem('freshTrack_inventory');
      const alreadySeeded = localStorage.getItem('stockguard_seeded') === 'true';
      if (stored) {
        setProducts(JSON.parse(stored));
      } else if (!alreadySeeded) {
        setProducts(MOCK_DATA);
        localStorage.setItem('freshTrack_inventory', JSON.stringify(MOCK_DATA));
        localStorage.setItem('stockguard_seeded', 'true');
      }
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage (only when not using Firebase)
  useEffect(() => {
    if (!useFirebase && !isLoading) {
      localStorage.setItem('freshTrack_inventory', JSON.stringify(products));
    }
  }, [products, isLoading]);

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

  // ─── Computed ───────────────────────────────────────────────────
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

  // ─── CRUD Handlers ─────────────────────────────────────────────
  const handleAddItem = async (newProduct: Omit<Product, 'id' | 'addedDate'>) => {
    const product: Product = {
      ...newProduct,
      id: crypto.randomUUID(),
      addedDate: new Date().toISOString()
    };

    if (useFirebase) {
      await firestoreService.addProduct(product);
    } else {
      setProducts(prev => [...prev, product]);
    }
    addToast('success', `"${product.name}" added to inventory`);
    setCurrentView('INVENTORY');
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    const itemName = products.find(p => p.id === id)?.name || 'Item';

    if (useFirebase) {
      await firestoreService.deleteProduct(id);
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
    }

    addToast('info', `"${itemName}" removed from inventory`);

    if (selectedProduct?.id === id) {
      setSelectedProduct(null);
      setCurrentView('INVENTORY');
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (useFirebase) {
      await firestoreService.updateProduct(id, { quantity: newQuantity });
    } else {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: newQuantity } : p));
    }

    if (selectedProduct?.id === id) {
      setSelectedProduct(prev => prev ? ({ ...prev, quantity: newQuantity }) : null);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (useFirebase) {
      await firestoreService.updateProduct(updatedProduct.id, updatedProduct);
    } else {
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    }
    setSelectedProduct(updatedProduct);
    addToast('success', `"${updatedProduct.name}" updated`);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('PRODUCT_DETAILS');
  };

  const handleSearchSelect = (product: Product) => {
    setGlobalSearch('');
    setShowSearchResults(false);
    handleProductSelect(product);
  };

  // ─── UI Components ─────────────────────────────────────────────
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view && !selectedProduct;
    return (
      <button
        onClick={() => {
          setCurrentView(view);
          setSelectedProduct(null);
        }}
        className={`group flex items-center gap-3 py-2.5 rounded-xl transition-all w-full text-sm font-medium relative overflow-hidden ${isActive
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

  // ─── Loading State ─────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar Navigation (Desktop) */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 z-20 transition-all duration-300 ease-in-out relative ${isSidebarCollapsed ? 'w-[72px]' : 'w-64'
          }`}
      >
        {/* Brand */}
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

        {/* Navigation */}
        <div className="px-3 py-5 flex-1 overflow-y-auto">
          <p className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 transition-all ${isSidebarCollapsed ? 'opacity-0 h-0 mb-0' : 'px-2'}`}>Menu</p>
          <nav className="space-y-1">
            <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="INVENTORY" icon={List} label="Inventory" />
            <NavItem view="ADD_ITEM" icon={PlusCircle} label="Add Item" />
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className={`px-3 py-4 border-t border-gray-100 space-y-2 ${isSidebarCollapsed ? 'items-center flex flex-col' : ''}`}>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-3 p-2.5 w-full text-sm font-medium text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all ${isSidebarCollapsed ? 'justify-center' : 'px-3'}`}
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

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1.5 text-gray-400 hover:text-primary-600 shadow-md hover:shadow-lg transition-all z-30 flex items-center justify-center hover:scale-110"
        >
          {isSidebarCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/80 h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Brand */}
          <div className="md:hidden flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-1.5 rounded-lg text-white shadow-sm">
              <ShoppingBasket size={18} />
            </div>
            <h1 className="text-lg font-extrabold text-gray-900">StockGuard</h1>
          </div>

          {/* Desktop Section Title */}
          <div className="hidden md:flex items-center gap-3 text-sm">
            <h2 className="font-bold text-gray-900 text-base">
              {currentView === 'DASHBOARD' && 'Overview'}
              {currentView === 'INVENTORY' && 'Inventory'}
              {currentView === 'ADD_ITEM' && 'Add New Item'}
              {currentView === 'PRODUCT_DETAILS' && 'Product Details'}
            </h2>
            {/* Data source badge */}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${useFirebase
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
              {useFirebase ? '☁️ ' : '💾 '}{dataSource}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Global Search */}
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

            {/* Notification Bell */}
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
                            onClick={() => { handleProductSelect(item); setShowNotifications(false); }}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentView === 'DASHBOARD' && <Dashboard products={products} />}
            {currentView === 'INVENTORY' && (
              <InventoryList
                products={products}
                onDelete={handleDeleteItem}
                onUpdateQuantity={handleUpdateQuantity}
                onSelectProduct={handleProductSelect}
                onAddItem={() => setCurrentView('ADD_ITEM')}
              />
            )}
            {currentView === 'ADD_ITEM' && <AddItem onAdd={handleAddItem} onCancel={() => setCurrentView('INVENTORY')} />}
            {currentView === 'PRODUCT_DETAILS' && selectedProduct && (
              <ProductDetails
                product={selectedProduct}
                allProducts={products}
                onBack={() => setCurrentView('INVENTORY')}
                onUpdateProduct={handleUpdateProduct}
                onUpdateQuantity={handleUpdateQuantity}
                onSelectProduct={handleProductSelect}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 p-2 pb-safe-area flex justify-around shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.08)] z-50">
        {[
          { view: 'DASHBOARD' as ViewState, icon: LayoutDashboard, label: 'Home' },
          { view: 'INVENTORY' as ViewState, icon: List, label: 'Inventory' },
          { view: 'ADD_ITEM' as ViewState, icon: PlusCircle, label: 'Add' },
        ].map(item => {
          const isActive = currentView === item.view || (item.view === 'INVENTORY' && currentView === 'PRODUCT_DETAILS');
          return (
            <button
              key={item.view}
              onClick={() => { setCurrentView(item.view); setSelectedProduct(null); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-20 ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Modal */}
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
                  <p className="text-xs text-gray-500 mt-0.5">{useFirebase ? 'Firebase Firestore (cloud)' : 'Local browser storage'}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${useFirebase
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                  : 'text-gray-500 bg-gray-100 border-gray-200'
                  }`}>
                  {useFirebase ? '☁️ Cloud' : '💾 Local'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">Total Products</p>
                  <p className="text-xs text-gray-500 mt-0.5">{products.length} unique items in inventory</p>
                </div>
                <span className="text-lg font-extrabold text-gray-900">{products.length}</span>
              </div>
              <button
                onClick={async () => {
                  if (window.confirm('This will clear all inventory data and load demo products. Are you sure?')) {
                    if (useFirebase) {
                      const deletePromises = products.map(p => firestoreService.deleteProduct(p.id));
                      await Promise.all(deletePromises);
                      await firestoreService.seedDemoData(MOCK_DATA);
                    } else {
                      localStorage.removeItem('freshTrack_inventory');
                      setProducts(MOCK_DATA);
                    }
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

export default App;