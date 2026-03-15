import { useState, useCallback } from 'react';
import { Loader2, ChefHat } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { recommendRecipesAuto, recommendRecipesManual } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Recommend() {
  const { inventory, userProfile, getIngredientById } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  const allergyIds = userProfile?.allergy_info || [];

  const toggleSelect = useCallback((ingredient_id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient_id)) next.delete(ingredient_id);
      else next.add(ingredient_id);
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setRecipes([]);
    try {
      if (mode === 'auto') {
        const list = await recommendRecipesAuto(inventory, allergyIds);
        setRecipes(list);
      } else {
        const list = await recommendRecipesManual([...selectedIds], allergyIds);
        setRecipes(list);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, inventory, allergyIds, selectedIds]);

  const sortedInventory = [...inventory].sort((a, b) =>
    new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#faf8f5]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">레시피 추천</h1>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-smooth ${
              mode === 'auto' ? 'bg-[#10B981] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            자동 (유통기한 임박)
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-smooth ${
              mode === 'manual' ? 'bg-[#10B981] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            수동 (재료 선택)
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {mode === 'manual' && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">냉장고 재료 선택 (체크 후 생성)</h2>
            <div className="space-y-2">
              {sortedInventory.map((inv) => {
                const ing = getIngredientById(inv.ingredient_id);
                const checked = selectedIds.has(inv.ingredient_id);
                return (
                  <label
                    key={inv.inventory_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-smooth ${
                      checked ? 'border-[#10B981] bg-[#10B981]/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(inv.ingredient_id)}
                      className="rounded border-gray-300 text-[#10B981] focus:ring-[#10B981]"
                    />
                    <span className="font-medium text-gray-900">{ing?.name ?? '재료'}</span>
                    <span className="text-sm text-gray-500">{inv.quantity} {inv.unit}</span>
                  </label>
                );
              })}
            </div>
            {inventory.length === 0 && (
              <p className="text-gray-500 text-sm py-4">냉장고에 재료를 먼저 추가해 주세요.</p>
            )}
            <Button
              className="w-full mt-3"
              onClick={handleGenerate}
              disabled={loading || (mode === 'manual' && selectedIds.size === 0)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>레시피 생성</>
              )}
            </Button>
          </section>
        )}

        {mode === 'auto' && (
          <div className="mb-4">
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading || inventory.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>유통기한 임박 재료로 추천받기</>
              )}
            </Button>
            {inventory.length === 0 && (
              <p className="text-gray-500 text-sm mt-2">냉장고에 재료를 먼저 추가해 주세요.</p>
            )}
          </div>
        )}

        {!loading && recipes.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-2">추천 레시피</h2>
            <p className="text-xs text-gray-500 mb-3">알레르기 정보에 따라 제외된 레시피는 표시되지 않습니다.</p>
            <div className="space-y-3">
              {recipes.map((r) => (
                <Card
                  key={r.recipe_id}
                  className="cursor-pointer hover:shadow-md transition-smooth active:scale-[0.99]"
                  onClick={() => navigate(`/recipe/${r.recipe_id}`)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981]">
                      <ChefHat className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{r.title}</h3>
                      <p className="text-sm text-gray-500">약 {r.total_cook_min}분 · Lv.{r.level}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
