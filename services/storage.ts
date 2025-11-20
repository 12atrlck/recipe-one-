
import { RecipeData, VideoSearchResult, SavedRecipe } from '../types';

const STORAGE_KEY = 'culinaryai_history';

export const saveRecipeToHistory = (query: string, recipe: RecipeData, videos: VideoSearchResult[]) => {
  try {
    const newItem: SavedRecipe = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      query,
      recipe,
      videos
    };

    const existingHistoryJSON = localStorage.getItem(STORAGE_KEY);
    let history: SavedRecipe[] = existingHistoryJSON ? JSON.parse(existingHistoryJSON) : [];

    // Add new item to the beginning
    history.unshift(newItem);

    // Limit history to last 20 items to save space
    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newItem;
  } catch (error) {
    console.error("Failed to save recipe", error);
    return null;
  }
};

export const getSavedRecipes = (): SavedRecipe[] => {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error("Failed to load history", error);
    return [];
  }
};

export const updateRecipeRating = (id: string, rating: number): SavedRecipe[] => {
  try {
    const existingHistoryJSON = localStorage.getItem(STORAGE_KEY);
    if (!existingHistoryJSON) return [];
    
    let history: SavedRecipe[] = JSON.parse(existingHistoryJSON);
    history = history.map(item => {
        if (item.id === id) {
            return { ...item, userRating: rating };
        }
        return item;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history;
  } catch (error) {
    console.error("Failed to update rating", error);
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
