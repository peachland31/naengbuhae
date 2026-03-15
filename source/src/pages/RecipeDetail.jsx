import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';

export default function RecipeDetail() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { getRecipeById, getRecipeItemsWithNames, deductIngredientsForRecipe, addCookingLog } = useApp();
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const recipe = getRecipeById(Number(recipeId));
  const items = getRecipeItemsWithNames(Number(recipeId)) || [];

  const handleComplete = () => {
    const deducted = deductIngredientsForRecipe(Number(recipeId));
    addCookingLog(Number(recipeId));
    const first = deducted[0];
    const name = items.find((i) => i.ingredient_id === first?.ingredient_id)?.name ?? '재료';
    setSavedMessage(`Success! You saved ${first?.quantity ?? 0} ${first?.unit ?? ''} of ${name}! Keep going!`);
    setShowSuccess(true);
  };

  if (!recipe) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <p className="text-gray-500">레시피를 찾을 수 없어요.</p>
        <Button variant="outline" className="ml-2" onClick={() => navigate('/recommend')}>
          추천으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#faf8f5] pb-24">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">{recipe.title}</h1>
        <div className="flex gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {recipe.total_cook_min}분
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> Lv.{recipe.level}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-gray-600 mb-6">{recipe.description}</p>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">필요 재료</h2>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {items.map((ri) => (
                  <li key={ri.recipe_item_id} className="flex justify-between text-gray-800">
                    <span>{ri.name}</span>
                    <span className="text-gray-500">{ri.quantity} {ri.unit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">조리 순서</h2>
          <ol className="space-y-4">
            {recipe.steps?.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white text-sm font-medium">
                  {i + 1}
                </span>
                <span className="text-gray-700 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 pb-safe">
        <Button className="w-full" size="lg" onClick={handleComplete}>
          요리 완료
        </Button>
      </div>

      {showSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            setShowSuccess(false);
            navigate('/');
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-semibold text-[#10B981] mb-2">성공!</p>
            <p className="text-gray-700">{savedMessage}</p>
            <Button className="w-full mt-4" onClick={() => { setShowSuccess(false); navigate('/'); }}>
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
