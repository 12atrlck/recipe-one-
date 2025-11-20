
export interface Ingredient {
  item: string;
  amount: string;
  notes?: string;
}

export interface InstructionStep {
  stepNumber: number;
  instruction: string;
  tip?: string;
}

export interface NutritionInfo {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
}

export interface RecipeData {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  cuisine: string;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  nutrition: NutritionInfo;
  rating: number;      // AI generated average rating (1-5)
  reviewCount: number; // AI generated review count
}

export interface VideoSearchResult {
  title: string;
  uri: string;
  source: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface SavedRecipe {
  id: string;
  timestamp: number;
  recipe: RecipeData;
  videos: VideoSearchResult[];
  query: string;
  userRating?: number; // User's personal rating
}
