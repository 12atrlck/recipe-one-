
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RecipeData, VideoSearchResult } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Schema for the structured recipe data
const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Name of the dish" },
    description: { type: Type.STRING, description: "A short, appetizing description of the dish" },
    prepTime: { type: Type.STRING, description: "Preparation time (e.g., '15 mins')" },
    cookTime: { type: Type.STRING, description: "Cooking time (e.g., '45 mins')" },
    servings: { type: Type.INTEGER, description: "Number of servings" },
    difficulty: { type: Type.STRING, description: "Difficulty level (Easy, Medium, Hard)" },
    cuisine: { type: Type.STRING, description: "Type of cuisine (Italian, Indian, etc.)" },
    rating: { type: Type.NUMBER, description: "An estimated average rating for this dish from 1.0 to 5.0 (e.g. 4.8)" },
    reviewCount: { type: Type.INTEGER, description: "An estimated number of reviews for this popular dish" },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          amount: { type: Type.STRING },
          notes: { type: Type.STRING, nullable: true },
        },
        required: ["item", "amount"],
      },
    },
    instructions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          instruction: { type: Type.STRING },
          tip: { type: Type.STRING, nullable: true },
        },
        required: ["stepNumber", "instruction"],
      },
    },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.INTEGER },
        protein: { type: Type.STRING },
        carbs: { type: Type.STRING },
        fat: { type: Type.STRING },
      },
      required: ["calories", "protein", "carbs", "fat"],
    },
  },
  required: ["title", "description", "prepTime", "cookTime", "servings", "ingredients", "instructions", "nutrition", "difficulty", "cuisine", "rating", "reviewCount"],
};

interface FilterOptions {
    difficulty?: string;
    dietary?: string[];
}

export const generateRecipe = async (query: string, mode: 'dish' | 'ingredients' = 'dish', filters?: FilterOptions): Promise<RecipeData> => {
  try {
    let prompt = "";
    
    const difficultyStr = filters?.difficulty && filters.difficulty !== 'Any' ? `Difficulty level must be: ${filters.difficulty}.` : "";
    const dietaryStr = filters?.dietary && filters.dietary.length > 0 ? `Dietary requirements: Must be ${filters.dietary.join(', ')}.` : "";

    if (mode === 'ingredients') {
      prompt = `I have the following ingredients: ${query}. Please suggest a creative and delicious dish I can cook using these (assuming basic pantry staples like oil, salt, pepper, flour are available). ${difficultyStr} ${dietaryStr} Create a detailed recipe for that dish. Name the dish creatively.`;
    } else {
      prompt = `Create a detailed and delicious recipe for: ${query}. ${difficultyStr} ${dietaryStr} Ensure the instructions are clear and easy to follow.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.4, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");
    return JSON.parse(text) as RecipeData;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
};

export const findRecipeVideos = async (query: string): Promise<VideoSearchResult[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find the best video tutorial on YouTube for cooking "${query}". Return the title and URL of the video if found.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const results: VideoSearchResult[] = [];

    if (chunks) {
      chunks.forEach((chunk) => {
        if (chunk.web?.uri && chunk.web?.title) {
          // Filter for video platforms primarily
          if (
            chunk.web.uri.includes("youtube.com") || 
            chunk.web.uri.includes("youtu.be") ||
            chunk.web.uri.includes("vimeo.com") ||
            chunk.web.uri.includes("tiktok.com") ||
            chunk.web.title.toLowerCase().includes("video")
          ) {
            results.push({
              title: chunk.web.title,
              uri: chunk.web.uri,
              source: chunk.web.uri.includes("youtube") ? "YouTube" : "Web"
            });
          }
        }
      });
    }
    
    // Dedup results by URI
    return Array.from(new Map(results.map(item => [item.uri, item])).values()).slice(0, 4);

  } catch (error) {
    console.error("Error finding videos:", error);
    return [];
  }
};

export const generateDishImage = async (description: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Using the image generation model
            contents: {
                parts: [{ text: `A professional, high-resolution, appetizing food photography shot of ${description}. Photorealistic, 4k, studio lighting.` }]
            },
            config: {
                responseModalities: ['IMAGE'],
            }
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
             return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;

    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
}
