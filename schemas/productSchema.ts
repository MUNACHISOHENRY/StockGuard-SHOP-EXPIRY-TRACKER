import { z } from 'zod';
import { Category } from '../types';

export const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    category: z.nativeEnum(Category, {
        message: 'Please select a valid category'
    }),
    description: z.string().optional(),
    price: z.number().optional(),
    sku: z.string().optional(),
    location: z.string().optional(),
    expiryDate: z.string().min(1, 'Expiry date is required'),
    quantity: z.number().int().min(0, 'Quantity cannot be negative'),
    minStockThreshold: z.number().int().min(0, 'Threshold cannot be negative').optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
