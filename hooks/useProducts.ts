import { useQuery } from '@tanstack/react-query';
import { MOCK_DATA } from '../mockData';
import { Product } from '../types';

const STORAGE_KEY = 'stockguard_inventory';

const getStoredProducts = (): Product[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // Corrupted data — reset
    }
    // Seed with mock data on first load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
};

export const useProducts = () => {
    return useQuery({
        queryKey: ['products'],
        queryFn: async (): Promise<Product[]> => getStoredProducts(),
        staleTime: 1000 * 60 * 5,
    });
};
