
import React, { useState, useEffect } from 'react';
import { RecipeData, VideoSearchResult, SavedRecipe } from '../types';
import { ClockIcon, UserIcon, FireIcon, ChefHatIcon, PlayIcon, StarIcon } from './Icons';
import { generateDishImage } from '../services/gemini';

interface RecipeDisplayProps {
  recipe: RecipeData;
  videos: VideoSearchResult[];
  isOnline: boolean;
  savedRecipeId?: string;
  userRating?: number;
  onRate?: (rating: number) => void;
}

const RecipeDisplay: React.FC<RecipeDisplayProps> = ({ recipe, videos, isOnline, savedRecipeId, userRating = 0, onRate }) => {
  const [heroImage, setHeroImage] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(true);
  const [hoverRating, setHoverRating] = useState(0);

  // Helper to get YouTube ID from URL
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const embedVideo = videos.find(v => v.source === "YouTube" && getYouTubeId(v.uri));

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
        setIsGeneratingImage(true);
        // Fallback to a nice placeholder first to be instant or if offline
        const placeholder = `https://source.unsplash.com/1200x600/?${encodeURIComponent(recipe.title)}`;
        setHeroImage(placeholder);
        
        // Only try to generate AI image if online
        if (isOnline) {
            try {
                const aiImage = await generateDishImage(recipe.title);
                if (isMounted && aiImage) {
                    setHeroImage(aiImage);
                }
            } catch (e) {
                // Fail silently back to placeholder
            }
        }
        
        if (isMounted) setIsGeneratingImage(false);
    };
    fetchImage();
    return () => { isMounted = false; };
  }, [recipe.title, isOnline]);

  const renderStars = (rating: number, max: number = 5) => {
      return Array.from({ length: max }).map((_, i) => (
          <StarIcon key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} filled={i < Math.round(rating)} />
      ));
  };

  const getDifficultyColor = (diff: string) => {
      const d = diff.toLowerCase();
      if (d.includes('easy')) return 'bg-green-100 text-green-700 border-green-200';
      if (d.includes('medium')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in pb-20 px-4 lg:px-0">
      
      {/* Hero Section */}
      <div className="relative w-full min-h-[20rem] md:h-96 rounded-3xl overflow-hidden shadow-2xl mb-6 md:mb-8 group bg-gray-200">
        {heroImage && (
            <img 
            src={heroImage} 
            alt={recipe.title} 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546549010-63b5dd0d2f18?auto=format&fit=crop&w=1200&q=80'; }}
            className={`w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105 ${isGeneratingImage ? 'animate-pulse' : ''}`}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white w-full">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-block px-3 py-1 bg-orange-500 rounded-full text-[10px] md:text-xs font-bold tracking-wider uppercase shadow-sm">
                {recipe.cuisine}
            </span>
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] md:text-xs font-bold tracking-wider uppercase shadow-sm border ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
            </span>
          </div>
          <h1 className="text-3xl md:text-6xl font-bold font-serif mb-3 leading-tight drop-shadow-sm">
            {recipe.title}
          </h1>
          <div className="flex items-center gap-4 mb-4 text-white/90 text-sm">
              <div className="flex items-center gap-1">
                  {renderStars(recipe.rating)}
                  <span className="ml-1 font-medium">{recipe.rating}</span>
                  <span className="text-white/70">({recipe.reviewCount} reviews)</span>
              </div>
          </div>
          <p className="text-gray-200 text-sm md:text-lg max-w-2xl line-clamp-2 md:line-clamp-3 drop-shadow-sm">
            {recipe.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column: Stats & Ingredients */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
            {/* Stats Card */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="flex flex-col items-center p-3 bg-orange-50 rounded-xl text-center">
                        <ClockIcon className="w-5 h-5 md:w-6 md:h-6 text-orange-500 mb-1" />
                        <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase">Prep</span>
                        <span className="font-semibold text-gray-800 text-sm md:text-base">{recipe.prepTime}</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-orange-50 rounded-xl text-center">
                        <FireIcon className="w-5 h-5 md:w-6 md:h-6 text-orange-500 mb-1" />
                        <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase">Cook</span>
                        <span className="font-semibold text-gray-800 text-sm md:text-base">{recipe.cookTime}</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-orange-50 rounded-xl text-center">
                        <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-orange-500 mb-1" />
                        <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase">Serves</span>
                        <span className="font-semibold text-gray-800 text-sm md:text-base">{recipe.servings}</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-orange-50 rounded-xl text-center">
                        <ChefHatIcon className="w-5 h-5 md:w-6 md:h-6 text-orange-500 mb-1" />
                        <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase">Calories</span>
                        <span className="font-semibold text-gray-800 text-sm md:text-base">{recipe.nutrition.calories}</span>
                    </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="font-serif font-bold text-lg text-gray-800 mb-4">Nutrition</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Protein</span>
                            <span className="font-medium text-gray-900">{recipe.nutrition.protein}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Carbs</span>
                            <span className="font-medium text-gray-900">{recipe.nutrition.carbs}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Fat</span>
                            <span className="font-medium text-gray-900">{recipe.nutrition.fat}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ingredients Card */}
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-serif font-bold text-xl md:text-2xl text-gray-800 mb-4 md:mb-6">Ingredients</h3>
                <ul className="space-y-3">
                    {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start group text-sm md:text-base">
                            <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 border-orange-200 flex items-center justify-center group-hover:border-orange-500 transition-colors">
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="ml-3">
                                <span className="font-bold text-gray-800">{ing.amount}</span> <span className="text-gray-600">{ing.item}</span>
                                {ing.notes && <p className="text-xs text-gray-400 italic mt-0.5">{ing.notes}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

             {/* User Rating Card (Only if saved recipe context exists) */}
             {savedRecipeId && onRate && (
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <h3 className="font-serif font-bold text-lg text-gray-800 mb-2">Rate this Recipe</h3>
                    <p className="text-xs text-gray-500 mb-4">Tried it? Let us know how it was!</p>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => onRate(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <StarIcon 
                                    className={`w-8 h-8 ${star <= (hoverRating || userRating) ? 'text-orange-400 fill-orange-400' : 'text-gray-200'}`} 
                                    filled={star <= (hoverRating || userRating)}
                                />
                            </button>
                        ))}
                    </div>
                </div>
             )}
        </div>

        {/* Right Column: Instructions & Video */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
             
            {/* Video Section - Only show if online */}
            {isOnline ? (
                embedVideo ? (
                <div className="bg-black rounded-2xl overflow-hidden shadow-lg aspect-video relative group">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/${getYouTubeId(embedVideo.uri)}`}
                        title={embedVideo.title} 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="w-full h-full"
                    ></iframe>
                </div>
                ) : (
                    videos.length > 0 && (
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                <PlayIcon className="w-5 h-5" /> Recommended Videos
                            </h3>
                            <div className="flex flex-col gap-2">
                                {videos.map((v, i) => (
                                    <a key={i} href={v.uri} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-800 underline truncate text-sm font-medium">
                                        {v.title}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )
                )
            ) : (
                <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-500">
                     <p className="flex items-center gap-2"><span className="text-xl">📵</span> Videos unavailable in offline mode</p>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-serif font-bold text-xl md:text-2xl text-gray-800 mb-4 md:mb-6">Instructions</h3>
                <div className="space-y-6 md:space-y-8">
                    {recipe.instructions.map((step) => (
                        <div key={step.stepNumber} className="flex gap-3 md:gap-4">
                            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 bg-orange-100 text-orange-600 font-bold rounded-full flex items-center justify-center text-sm font-serif">
                                {step.stepNumber}
                            </div>
                            <div>
                                <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                                    {step.instruction}
                                </p>
                                {step.tip && (
                                    <div className="mt-3 bg-blue-50 text-blue-800 text-xs md:text-sm p-3 rounded-lg inline-block">
                                        <span className="font-bold mr-1">💡 Chef's Tip:</span>
                                        {step.tip}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDisplay;
