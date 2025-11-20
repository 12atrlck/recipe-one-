
import React, { useState, useEffect } from 'react';
import { RecipeData, VideoSearchResult, LoadingState, SavedRecipe } from './types';
import { generateRecipe, findRecipeVideos } from './services/gemini';
import { saveRecipeToHistory, getSavedRecipes, updateRecipeRating } from './services/storage';
import RecipeDisplay from './components/RecipeDisplay';
import { SearchIcon, SparklesIcon, ChefHatIcon, FilterIcon, PlusIcon, XMarkIcon } from './components/Icons';

type SearchMode = 'dish' | 'ingredients';

// Common ingredients for auto-suggestion
const COMMON_INGREDIENTS = [
    "Chicken Breast", "Ground Beef", "Rice", "Pasta", "Eggs", "Milk", "Flour", "Butter", "Cheese", "Onion", "Garlic", 
    "Tomato", "Potato", "Carrot", "Spinach", "Broccoli", "Salmon", "Tuna", "Avocado", "Bread", "Olive Oil", "Lemon",
    "Mushrooms", "Bell Pepper", "Zucchini", "Yogurt", "Heavy Cream", "Bacon", "Shrimp", "Tofu", "Soy Sauce", "Honey"
];

interface IngredientInput {
    item: string;
    amount: string;
    unit: string;
}

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [videos, setVideos] = useState<VideoSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // App Logic State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchMode, setSearchMode] = useState<SearchMode>('dish');
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [currentSavedId, setCurrentSavedId] = useState<string | undefined>(undefined);
  const [currentUserRating, setCurrentUserRating] = useState<number>(0);

  // Filters & Inputs State
  const [showFilters, setShowFilters] = useState(false);
  const [difficulty, setDifficulty] = useState<string>('Any');
  const [dietary, setDietary] = useState<string[]>([]);
  
  // Enhanced Ingredient State
  const [ingredientList, setIngredientList] = useState<IngredientInput[]>([]);
  const [currentIng, setCurrentIng] = useState<IngredientInput>({ item: '', amount: '', unit: '' });

  useEffect(() => {
    // Network Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load history
    setSavedRecipes(getSavedRecipes());

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleDietary = (option: string) => {
      setDietary(prev => prev.includes(option) ? prev.filter(i => i !== option) : [...prev, option]);
  };

  const addIngredient = () => {
      if (currentIng.item.trim()) {
          setIngredientList([...ingredientList, currentIng]);
          setCurrentIng({ item: '', amount: '', unit: '' });
      }
  };

  const removeIngredient = (idx: number) => {
      setIngredientList(ingredientList.filter((_, i) => i !== idx));
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    
    let searchQuery = overrideQuery || query;
    
    // Construct query from ingredients if in that mode
    if (searchMode === 'ingredients' && !overrideQuery) {
        if (ingredientList.length === 0) return;
        searchQuery = ingredientList.map(i => `${i.amount} ${i.unit} ${i.item}`.trim()).join(', ');
    }

    if (!searchQuery.trim()) return;
    
    if (!isOnline) {
        setError("You are offline. Please check your internet connection or view saved recipes.");
        setStatus(LoadingState.ERROR);
        return;
    }

    setStatus(LoadingState.LOADING);
    setError(null);
    setRecipe(null);
    setVideos([]);
    setCurrentSavedId(undefined);
    setCurrentUserRating(0);

    try {
      // Parallel execution for speed
      const [recipeData, videoData] = await Promise.all([
        generateRecipe(searchQuery, searchMode, { difficulty, dietary }),
        findRecipeVideos(searchMode === 'ingredients' ? `recipe using ${searchQuery}` : searchQuery)
      ]);

      setRecipe(recipeData);
      setVideos(videoData);
      setStatus(LoadingState.SUCCESS);
      
      // Auto-save to history
      const saved = saveRecipeToHistory(searchQuery, recipeData, videoData);
      if (saved) {
        setSavedRecipes(prev => [saved, ...prev]);
        setCurrentSavedId(saved.id);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to generate recipe. Please try again.");
      setStatus(LoadingState.ERROR);
    }
  };

  const loadSavedRecipe = (saved: SavedRecipe) => {
      setRecipe(saved.recipe);
      setVideos(saved.videos);
      setQuery(saved.query);
      setCurrentSavedId(saved.id);
      setCurrentUserRating(saved.userRating || 0);
      setStatus(LoadingState.SUCCESS);
  };

  const handleRateRecipe = (rating: number) => {
      if (currentSavedId) {
          const updated = updateRecipeRating(currentSavedId, rating);
          setSavedRecipes(updated);
          setCurrentUserRating(rating);
      }
  };

  const recommendedDishes = [
    { name: "Avocado Toast with Egg", image: "https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=600&q=80" },
    { name: "Classic Beef Burger", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" },
    { name: "Blueberry Pancakes", image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80" },
    { name: "Grilled Salmon Salad", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && (
          <div className="bg-gray-800 text-white text-center py-2 text-sm font-medium">
              You are currently offline. Showing saved recipes.
          </div>
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer" onClick={() => { setRecipe(null); setStatus(LoadingState.IDLE); setQuery(''); }}>
            <div className="bg-orange-500 p-1.5 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-serif font-bold text-gray-900 tracking-tight ${status === LoadingState.SUCCESS ? 'hidden sm:block' : 'block'}`}>CulinaryAI</span>
          </div>
          
          {status === LoadingState.SUCCESS && (
             <div className="flex-grow flex justify-end">
                 <button 
                    onClick={() => { setRecipe(null); setStatus(LoadingState.IDLE); }}
                    className="text-sm font-medium text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-full transition-colors"
                 >
                    New Search
                 </button>
             </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col">
        
        {status === LoadingState.IDLE && (
            <div className="flex-grow flex flex-col px-4 bg-white">
                
                {/* Hero Area */}
                <div className="py-16 sm:py-20 flex flex-col items-center text-center bg-gradient-to-b from-white to-orange-50/30 -mx-4 px-4">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-gray-900 mb-6 tracking-tight leading-tight">
                        What are you <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">craving</span> today?
                    </h1>
                    
                    <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-10 max-w-lg mx-auto">
                        Instant, chef-quality recipes powered by Gemini AI.
                    </p>
                    
                    {/* Search Interface Container */}
                    <div className="w-full max-w-2xl mx-auto relative z-10">
                        {/* Tabs */}
                        <div className="flex justify-center mb-6 gap-2">
                            <button 
                                onClick={() => setSearchMode('dish')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${searchMode === 'dish' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                I want to cook...
                            </button>
                            <button 
                                onClick={() => setSearchMode('ingredients')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${searchMode === 'ingredients' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                I have ingredients...
                            </button>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-xl shadow-orange-100/50 border border-gray-100 p-2">
                            
                            {/* Input Area */}
                            {searchMode === 'dish' ? (
                                <form onSubmit={handleSearch} className="relative w-full">
                                    <input 
                                        type="text" 
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="e.g., Classic Tiramisu..."
                                        disabled={!isOnline}
                                        className="w-full pl-6 pr-14 py-4 text-lg rounded-full bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!isOnline}
                                        className="absolute right-2 top-2 bottom-2 aspect-square bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center transition-colors"
                                    >
                                        <SearchIcon className="w-6 h-6" />
                                    </button>
                                </form>
                            ) : (
                                <div className="p-2">
                                    <div className="flex flex-wrap gap-2 mb-3 px-2">
                                        {ingredientList.map((ing, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-800 rounded-full text-sm border border-orange-100">
                                                {ing.amount} {ing.unit} {ing.item}
                                                <button onClick={() => removeIngredient(idx)} className="hover:text-orange-600"><XMarkIcon className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 items-center bg-gray-50 rounded-xl p-2">
                                        <input 
                                            type="text" 
                                            list="ingredients-list"
                                            value={currentIng.item}
                                            onChange={(e) => setCurrentIng({...currentIng, item: e.target.value})}
                                            placeholder="Item (e.g. Chicken)"
                                            className="flex-grow bg-transparent p-2 outline-none text-sm min-w-[100px]"
                                            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                                        />
                                        <datalist id="ingredients-list">
                                            {COMMON_INGREDIENTS.map(ing => <option key={ing} value={ing} />)}
                                        </datalist>
                                        <input 
                                            type="text"
                                            value={currentIng.amount}
                                            onChange={(e) => setCurrentIng({...currentIng, amount: e.target.value})}
                                            placeholder="Qty"
                                            className="w-16 bg-white rounded-lg p-2 outline-none text-sm border border-gray-200 text-center"
                                            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                                        />
                                        <input 
                                            type="text"
                                            value={currentIng.unit}
                                            onChange={(e) => setCurrentIng({...currentIng, unit: e.target.value})}
                                            placeholder="Unit"
                                            className="w-16 bg-white rounded-lg p-2 outline-none text-sm border border-gray-200 text-center"
                                            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                                        />
                                        <button onClick={addIngredient} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600">
                                            <PlusIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={(e) => handleSearch(e)}
                                        disabled={ingredientList.length === 0 || !isOnline}
                                        className="w-full mt-3 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Find Recipes
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Filter Toggle */}
                        <div className="mt-4 flex justify-center">
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors"
                            >
                                <FilterIcon className="w-4 h-4" />
                                {showFilters ? "Hide Filters" : "Add Filters (Difficulty, Diet)"}
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                             <div className="mt-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-lg animate-fade-in text-left">
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                                    <div className="flex gap-2">
                                        {['Any', 'Easy', 'Medium', 'Hard'].map(level => (
                                            <button 
                                                key={level}
                                                onClick={() => setDifficulty(level)}
                                                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${difficulty === level ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dietary Restrictions</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'].map(opt => (
                                            <button 
                                                key={opt}
                                                onClick={() => toggleDietary(opt)}
                                                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${dietary.includes(opt) ? 'bg-green-50 border-green-200 text-green-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Recommended Section */}
                <div className="max-w-5xl mx-auto w-full py-10">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="text-orange-500">★</span> Recommended for You
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {recommendedDishes.map((dish, idx) => (
                            <div 
                                key={idx}
                                onClick={() => {
                                    if (!isOnline) return;
                                    setSearchMode('dish');
                                    setQuery(dish.name);
                                    handleSearch(undefined, dish.name);
                                }}
                                className={`relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer group shadow-md ${!isOnline ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <img src={dish.image} alt={dish.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                    <h3 className="font-bold leading-tight">{dish.name}</h3>
                                    <p className="text-xs text-orange-300 mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">View Recipe →</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Saved/Recent Recipes */}
                {savedRecipes.length > 0 && (
                    <div className="max-w-5xl mx-auto w-full pb-20 border-t border-gray-100 pt-10">
                        <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6">
                             Saved Recipes
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedRecipes.map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => loadSavedRecipe(item)}
                                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-800 truncate pr-2">{item.recipe.title}</h3>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.recipe.cuisine}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-grow">{item.recipe.description}</p>
                                    
                                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                                        <div className="flex items-center gap-1">
                                            {item.userRating ? (
                                                <span className="text-orange-400 font-bold flex items-center gap-0.5">★ {item.userRating}</span>
                                            ) : (
                                                <span>Not rated</span>
                                            )}
                                        </div>
                                        <span>{item.recipe.prepTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {status === LoadingState.LOADING && (
            <div className="flex-grow flex flex-col items-center justify-center bg-white px-4 text-center">
                <div className="relative w-20 h-20 md:w-24 md:h-24 mb-6 md:mb-8">
                    <div className="absolute inset-0 border-t-4 border-orange-200 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 border-t-4 border-orange-500 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ChefHatIcon className="w-8 h-8 md:w-10 md:h-10 text-orange-500 animate-bounce" />
                    </div>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-800 mb-2">Cooking up magic...</h2>
                <p className="text-gray-500 text-sm md:text-base">
                    {searchMode === 'ingredients' ? 'Creating a dish from your ingredients...' : `Generating recipe for "${query}"`}
                </p>
            </div>
        )}

        {status === LoadingState.ERROR && (
            <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
                <div className="bg-red-50 p-6 rounded-2xl mb-6 max-w-sm w-full">
                    <svg className="w-12 h-12 text-red-500 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-800 font-medium">{error}</p>
                </div>
                <button 
                    onClick={() => setStatus(LoadingState.IDLE)}
                    className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                    Back to Home
                </button>
            </div>
        )}

        {status === LoadingState.SUCCESS && recipe && (
            <div className="bg-gray-50 pt-6 md:pt-8 min-h-screen">
                <RecipeDisplay 
                    recipe={recipe} 
                    videos={videos} 
                    isOnline={isOnline} 
                    savedRecipeId={currentSavedId}
                    userRating={currentUserRating}
                    onRate={handleRateRecipe}
                />
            </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm">
                Powered by Google Gemini 2.5 Flash & Google Search Grounding
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
