
export enum Category {
  DAIRY = 'Dairy',
  BAKERY = 'Bakery',
  MEAT = 'Meat',
  PRODUCE = 'Produce',
  PANTRY = 'Pantry',
  FROZEN = 'Frozen',
  BEVERAGE = 'Beverage',
  HOUSEHOLD = 'Household',
  OTHER = 'Other'
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  expiryDate: string; // ISO Date String YYYY-MM-DD
  quantity: number;
  addedDate: string;
  imageUrl?: string; // Optional Base64 or URL

  // New detailed fields
  description?: string;
  price?: number;
  sku?: string;
  location?: string;
  minStockThreshold?: number; // For low stock alerts
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'ADD_ITEM' | 'PRODUCT_DETAILS';

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.DAIRY]: 'bg-blue-100 text-blue-800',
  [Category.BAKERY]: 'bg-amber-100 text-amber-800',
  [Category.MEAT]: 'bg-red-100 text-red-800',
  [Category.PRODUCE]: 'bg-green-100 text-green-800',
  [Category.PANTRY]: 'bg-orange-100 text-orange-800',
  [Category.FROZEN]: 'bg-cyan-100 text-cyan-800',
  [Category.BEVERAGE]: 'bg-purple-100 text-purple-800',
  [Category.HOUSEHOLD]: 'bg-slate-100 text-slate-800',
  [Category.OTHER]: 'bg-gray-100 text-gray-800',
};

export const CATEGORY_DOT_COLORS: Record<Category, string> = {
  [Category.DAIRY]: 'bg-blue-500',
  [Category.BAKERY]: 'bg-amber-500',
  [Category.MEAT]: 'bg-red-500',
  [Category.PRODUCE]: 'bg-green-500',
  [Category.PANTRY]: 'bg-orange-500',
  [Category.FROZEN]: 'bg-cyan-500',
  [Category.BEVERAGE]: 'bg-purple-500',
  [Category.HOUSEHOLD]: 'bg-slate-500',
  [Category.OTHER]: 'bg-gray-500',
};
