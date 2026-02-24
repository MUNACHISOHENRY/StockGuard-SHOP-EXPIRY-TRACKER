import { GoogleGenAI } from "@google/genai";
import { Category } from '../types';

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    console.warn("⚠️ Gemini API Key is missing. Smart Scan features will fail.");
    throw new Error("API Key is missing. Please set GEMINI_API_KEY in your environment variables.");
  }

  return new GoogleGenAI({ apiKey });
};

export const analyzeProductImage = async (base64Image: string): Promise<{ name: string; category: Category; estimatedDays: number }> => {
  const ai = getAiClient();

  // NOTE: gemini-2.5-flash-image (nano banana) does NOT support responseSchema or responseMimeType='application/json'.
  // We must prompt for JSON text and parse it manually.

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] // Remove data URL prefix
            }
          },
          {
            text: `Identify this product for a shop inventory system. 
            Return a valid JSON object (NO markdown formatting, just the raw JSON) with these fields:
            - name: string (concise product name like 'Milk 1L')
            - category: string (one of: ${Object.values(Category).join(', ')})
            - estimatedDays: number (conservative shelf life in days from now)
            
            Example: {"name": "Apple", "category": "Produce", "estimatedDays": 14}`
          }
        ]
      },
      config: {
        temperature: 0.4
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");

    // Clean up potential markdown code blocks if the model adds them
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(text);

    return {
      name: data.name || "Unknown Product",
      category: Object.values(Category).includes(data.category) ? data.category as Category : Category.OTHER,
      estimatedDays: typeof data.estimatedDays === 'number' ? data.estimatedDays : 7
    };

  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw error; // Propagate error so UI can handle it
  }
};

export const getExpiryAdvice = async (items: { name: string; expiryDate: string; quantity: number }[]): Promise<string> => {
  const ai = getAiClient();

  if (items.length === 0) return "No items are expiring soon.";

  const prompt = `
    I have a small shop. Here is a list of items expiring very soon or already expired:
    ${JSON.stringify(items)}
    
    Provide 3 concise, actionable business tips on how to handle these specific items to minimize loss (e.g., specific discount amount, bundle idea, or donation). Keep it under 100 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate advice.";
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return "Unable to retrieve advice at this time.";
  }
};