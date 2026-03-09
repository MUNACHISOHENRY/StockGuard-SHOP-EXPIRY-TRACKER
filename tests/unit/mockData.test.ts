import { describe, expect, it } from 'vitest';
import { MOCK_DATA } from '../../mockData';
import { Category } from '../../types';

describe('Mock Data', () => {
    it('should have at least 8 items', () => {
        expect(MOCK_DATA.length).toBeGreaterThanOrEqual(8);
    });

    it('every item should have required fields', () => {
        for (const item of MOCK_DATA) {
            expect(item.id).toBeTruthy();
            expect(item.name).toBeTruthy();
            expect(item.category).toBeTruthy();
            expect(item.expiryDate).toBeTruthy();
            expect(typeof item.quantity).toBe('number');
            expect(item.quantity).toBeGreaterThanOrEqual(0);
            expect(item.addedDate).toBeTruthy();
        }
    });

    it('every category should be a valid Category enum value', () => {
        const validCategories = Object.values(Category);
        for (const item of MOCK_DATA) {
            expect(validCategories).toContain(item.category);
        }
    });

    it('should have items from at least 5 different categories', () => {
        const categories = new Set(MOCK_DATA.map(item => item.category));
        expect(categories.size).toBeGreaterThanOrEqual(5);
    });

    it('should have unique IDs for all items', () => {
        const ids = MOCK_DATA.map(item => item.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('some items should have image URLs', () => {
        const withImages = MOCK_DATA.filter(item => item.imageUrl);
        expect(withImages.length).toBeGreaterThan(0);
    });

    it('expiry dates should be valid ISO date strings', () => {
        for (const item of MOCK_DATA) {
            const date = new Date(item.expiryDate);
            expect(date.toString()).not.toBe('Invalid Date');
        }
    });
});
