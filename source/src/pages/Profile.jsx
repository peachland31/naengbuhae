import { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useApp } from '../context/AppContext';
import { allergyOptions } from '../data/allergyOptions';

export default function Profile() {
  const { userProfile, updateProfile } = useApp();
  const [householdSize, setHouseholdSize] = useState(String(userProfile?.household_size ?? 2));
  const [allergyInfo, setAllergyInfo] = useState(new Set(userProfile?.allergy_info ?? []));
  const [saved, setSaved] = useState(false);

  const toggleAllergy = (id) => {
    setAllergyInfo((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    const size = Math.max(1, Math.min(10, parseInt(householdSize, 10) || 2));
    updateProfile({
      household_size: size,
      allergy_info: [...allergyInfo],
    });
    setHouseholdSize(String(size));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#faf8f5]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900">프로필 & 설정</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <Input
              label="가구 인원 수 (household_size)"
              type="number"
              min={1}
              max={10}
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                알레르기 정보 (allergy_info) – 선택 태그
              </label>
              <p className="text-xs text-gray-500 mb-2">
                선택한 재료가 포함된 레시피는 추천에서 제외됩니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {allergyOptions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAllergy(a.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-smooth ${
                      allergyInfo.has(a.id)
                        ? 'bg-[#EF4444]/15 text-[#EF4444] ring-1 ring-[#EF4444]/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>
              {saved ? '저장됨 ✓' : '설정 저장'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
