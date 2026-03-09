import { Category } from '../types';

const BACKEND_URL = 'http://localhost:3001/api';

/**
 * Check if the AI backend server is running.
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

export const analyzeProductImage = async (base64Image: string): Promise<{ name: string; category: Category; estimatedDays: number }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return {
      name: data.name,
      category: data.category,
      estimatedDays: data.estimatedDays
    };
  } catch (error) {
    console.error("Smart Scan Error:", error);
    throw error;
  }
};

export const getExpiryAdvice = async (items: { name: string; expiryDate: string; quantity: number }[]): Promise<string> => {
  if (items.length === 0) return "No items are expiring soon.";

  try {
    const response = await fetch(`${BACKEND_URL}/advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.advice || "Could not generate advice.";
  } catch (error) {
    console.error("Expiry Advice Error:", error);
    return "Unable to retrieve advice at this time.";
  }
};