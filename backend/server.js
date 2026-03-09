require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Category = {
    DAIRY: 'Dairy',
    BAKERY: 'Bakery',
    MEAT: 'Meat',
    PRODUCE: 'Produce',
    PANTRY: 'Pantry',
    FROZEN: 'Frozen',
    BEVERAGE: 'Beverage',
    HOUSEHOLD: 'Household',
    OTHER: 'Other'
};

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/scan', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'Image is required' });

        const base64Data = image.includes(',') ? image.split(',')[1] : image;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: { mimeType: 'image/jpeg', data: base64Data }
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
            config: { temperature: 0.4 }
        });

        let text = response.text;
        if (!text) throw new Error("No response from AI");

        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(text);

        res.json({
            name: data.name || "Unknown Product",
            category: Object.values(Category).includes(data.category) ? data.category : Category.OTHER,
            estimatedDays: typeof data.estimatedDays === 'number' ? data.estimatedDays : 7
        });

    } catch (error) {
        console.error("Gemini Scan Error:", error);
        res.status(500).json({ error: 'Failed to analyze product' });
    }
});

app.post('/api/advice', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || items.length === 0) return res.json({ advice: "No items are expiring soon." });

        const prompt = `I have a small shop. Here is a list of items expiring very soon or already expired:
    ${JSON.stringify(items)}
    
    Provide 3 concise, actionable business tips on how to handle these specific items to minimize loss (e.g., specific discount amount, bundle idea, or donation). Keep it under 100 words.`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
        });

        res.json({ advice: response.text || "Could not generate advice." });
    } catch (error) {
        console.error("Gemini Advice Error:", error);
        res.status(500).json({ error: 'Failed to fetch advice' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
