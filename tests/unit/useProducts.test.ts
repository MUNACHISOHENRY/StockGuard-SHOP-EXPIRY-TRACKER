import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_DATA } from '../../mockData';

const STORAGE_KEY = 'stockguard_inventory';

// Replicate the getStoredProducts logic from useProducts.ts
const getStoredProducts = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // Corrupted data — reset
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
    return MOCK_DATA;
};

describe('useProducts storage logic', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should seed localStorage with MOCK_DATA on first load', () => {
        const products = getStoredProducts();
        expect(products).toEqual(MOCK_DATA);
        expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    });

    it('should return existing products from localStorage', () => {
        const customData = [{ id: 'test-1', name: 'Test Product' }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customData));
        const products = getStoredProducts();
        expect(products).toEqual(customData);
    });

    it('should reset to MOCK_DATA if localStorage is corrupted', () => {
        localStorage.setItem(STORAGE_KEY, 'INVALID_JSON{{{');
        const products = getStoredProducts();
        expect(products).toEqual(MOCK_DATA);
    });

    it('should persist data between calls', () => {
        getStoredProducts(); // seeds
        const newData = [{ id: 'new-1', name: 'New Product' }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        const products = getStoredProducts();
        expect(products).toEqual(newData);
    });
});
