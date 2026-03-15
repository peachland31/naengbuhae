import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddIngredientSheet } from '../components/AddIngredientSheet';
import { useApp } from '../context/AppContext';

function getExpiryStatus(expiryDate) {
  const d = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = (d - today) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { label: '만료', variant: 'danger' };
  if (diffDays <= 3) return { label: '임박', variant: 'accent' };
  return { label: '양호', variant: 'default' };
}

function formatDate(s) {
  const d = new Date(s);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Fridge() {
  const { inventory, getIngredientById } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);

  const sorted = [...inventory].sort((a, b) => {
    const da = new Date(a.expiry_date).getTime();
    const db = new Date(b.expiry_date).getTime();
    if (da !== db) return da - db;
    return (a.quantity || 0) - (b.quantity || 0);
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#faf8f5]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">내 냉장고</h1>
        <p className="text-sm text-gray-500 mt-0.5">유통기한 순으로 정렬돼요</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 mb-4">아직 등록된 재료가 없어요</p>
            <Button onClick={() => setSheetOpen(true)} size="lg">
              <Plus className="h-5 w-5" /> 재료 추가
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((inv) => {
              const ing = getIngredientById(inv.ingredient_id);
              const status = getExpiryStatus(inv.expiry_date);
              return (
                <Card
                  key={inv.inventory_id}
                  className={`overflow-hidden ${
                    status.variant === 'danger' ? 'ring-1 ring-[#EF4444]' : ''
                  } ${status.variant === 'accent' ? 'ring-1 ring-[#F97316]' : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium text-gray-900 truncate">
                        {ing?.name ?? '재료'}
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {inv.quantity} {inv.unit}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        status.variant === 'danger'
                          ? 'text-[#EF4444] font-medium'
                          : status.variant === 'accent'
                          ? 'text-[#F97316]'
                          : 'text-gray-500'
                      }`}
                    >
                      ~ {formatDate(inv.expiry_date)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{inv.storage_type}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <div className="fixed bottom-20 right-4 z-20 pb-safe">
        <Button
          size="icon"
          className="!rounded-full h-14 w-14 shadow-lg"
          onClick={() => setSheetOpen(true)}
          aria-label="재료 추가"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <AddIngredientSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
