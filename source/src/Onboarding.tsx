import React, { useState } from 'react';

// --- 타입 정의 (App.tsx와 동일하게 맞춤) ---
export type Allergy = '우유' | '계란' | '땅콩' | '견과류' | '밀' | '대두' | '생선' | '갑각류' | '참깨';
export type Avatar = { id: string; emoji: string; label: string };
export interface UserProfile {
  nickname: string;
  householdSize: number;
  allergies: Allergy[];
  avatar: Avatar;
}
type StorageType = '냉장' | '냉동' | '실온';
type Status = '신선' | '보통' | '빠른 소비 필요';

interface InventoryItem {
  id: string;
  ingredientId: string;
  quantity: number;
  initialQuantity: number;
  expiryDate: string;
  storageType: StorageType;
  status: Status;
  createdAt: string;
  unit?: string;
}

// --- 상수 ---
const AVATARS: Avatar[] = [
  { id: 'a1', emoji: '🍅', label: '토마토' },
  { id: 'a2', emoji: '🧅', label: '양파' },
  { id: 'a3', emoji: '🥦', label: '브로콜리' },
  { id: 'a4', emoji: '⬜', label: '두부' },
  { id: 'a5', emoji: '🍎', label: '사과' },
  { id: 'a6', emoji: '🦐', label: '새우' },
  { id: 'a7', emoji: '🥕', label: '당근' },
  { id: 'a8', emoji: '🥬', label: '대파' },
  { id: 'a9', emoji: '🥛', label: '우유' },
  { id: 'a10', emoji: '🍄', label: '버섯' },
];

const ALLERGY_LIST: Allergy[] = ['우유', '계란', '땅콩', '견과류', '밀', '대두', '생선', '갑각류', '참깨'];
const HOUSEHOLD_CHIPS = [1, 2, 3, 4, 5] as const;

const NICKNAME_ADJECTIVES = ['초록빛', '바삭한', '말랑한', '상큼한', '고소한', '달큰한', '포근한', '아삭한', '반짝이는', '부드러운'];
const NICKNAME_INGREDIENTS = ['토마토', '양파', '브로콜리', '두부', '사과', '새우', '당근', '대파', '우유', '버섯'];


// 식재료 온보딩 등록용 추천 재료 목록
// id는 local_* 고정값 — API 없이도 ingredientMap에서 정상 조회 가능하도록 unit/expiryDay 포함
const QUICK_INGREDIENTS = [
  { id: 'local_계란',     emoji: '🥚', name: '계란',     category: '신선식품', unit: '개',  expiryDay: 14 },
  { id: 'local_우유',     emoji: '🥛', name: '우유',     category: '유제품',   unit: 'ml',  expiryDay: 10 },
  { id: 'local_양파',     emoji: '🧅', name: '양파',     category: '채소',     unit: '개',  expiryDay: 30 },
  { id: 'local_당근',     emoji: '🥕', name: '당근',     category: '채소',     unit: '개',  expiryDay: 14 },
  { id: 'local_대파',     emoji: '🥬', name: '대파',     category: '채소',     unit: '대',  expiryDay: 7  },
  { id: 'local_브로콜리', emoji: '🥦', name: '브로콜리', category: '채소',     unit: '개',  expiryDay: 5  },
  { id: 'local_고추',     emoji: '🌶️', name: '고추',     category: '채소',     unit: '개',  expiryDay: 7  },
  { id: 'local_마늘',     emoji: '🧄', name: '마늘',     category: '채소',     unit: 'g',   expiryDay: 30 },
  { id: 'local_토마토',   emoji: '🍅', name: '토마토',   category: '채소',     unit: '개',  expiryDay: 7  },
  { id: 'local_소고기',   emoji: '🥩', name: '소고기',   category: '육류',     unit: 'g',   expiryDay: 3  },
  { id: 'local_닭가슴살', emoji: '🍗', name: '닭가슴살', category: '육류',     unit: 'g',   expiryDay: 3  },
  { id: 'local_베이컨',   emoji: '🥓', name: '베이컨',   category: '육류',     unit: 'g',   expiryDay: 7  },
  { id: 'local_새우',     emoji: '🦐', name: '새우',     category: '해산물',   unit: 'g',   expiryDay: 3  },
  { id: 'local_연어',     emoji: '🐟', name: '연어',     category: '해산물',   unit: 'g',   expiryDay: 2  },
  { id: 'local_치즈',     emoji: '🧀', name: '치즈',     category: '유제품',   unit: 'g',   expiryDay: 14 },
  { id: 'local_두부',     emoji: '⬜', name: '두부',     category: '신선식품', unit: '개',  expiryDay: 5  },
  { id: 'local_사과',     emoji: '🍎', name: '사과',     category: '과일',     unit: '개',  expiryDay: 14 },
  { id: 'local_바나나',   emoji: '🍌', name: '바나나',   category: '과일',     unit: '개',  expiryDay: 5  },
  { id: 'local_버섯',     emoji: '🍄', name: '버섯',     category: '채소',     unit: 'g',   expiryDay: 5  },
  { id: 'local_밀가루',   emoji: '🌾', name: '밀가루',   category: '조미료',   unit: 'g',   expiryDay: 180},
];

const hideScroll = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

const getNextAvatar = (currentId: string, direction: 'next' | 'prev' = 'next') => {
  const currentIndex = AVATARS.findIndex((avatar) => avatar.id === currentId);
  if (currentIndex < 0) return AVATARS[0];
  const nextIndex = direction === 'next' ? (currentIndex + 1) % AVATARS.length : (currentIndex - 1 + AVATARS.length) % AVATARS.length;
  return AVATARS[nextIndex];
};

const createRandomProfileData = () => {
  const adjective = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const ingredientLabel = NICKNAME_INGREDIENTS[Math.floor(Math.random() * NICKNAME_INGREDIENTS.length)];
  const avatar = AVATARS.find((a) => a.label === ingredientLabel) || AVATARS[0];
  return { nickname: `${adjective} ${ingredientLabel}`, avatar };
};

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const getStatus = (expiryDate: string): Status => {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(expiryDate).getTime();
  const left = Math.ceil((target - base) / (1000 * 3600 * 24));
  if (left <= 2) return '빠른 소비 필요';
  if (left <= 5) return '보통';
  return '신선';
};

// --- 스텝 바 컴포넌트 ---
function StepBar({ current, total }: { current: number; total: number }) {
  const labels = ['프로필 설정', '식재료 등록'];
  return (
    <div className="px-1 pt-5 pb-4 shrink-0">
      {/* 라벨 */}
      <div className="flex justify-between mb-2">
        {labels.map((label, i) => (
          <span
            key={label}
            className={`text-[11px] font-bold transition-colors ${i + 1 === current ? 'text-[#18CA87]' : i + 1 < current ? 'text-[#8B95A1]' : 'text-[#C5CACC]'}`}
          >
            {label}
          </span>
        ))}
      </div>
      {/* 바 */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i + 1 <= current ? 'bg-[#18CA87]' : 'bg-[#E5E8EB]'}`}
          />
        ))}
      </div>
      {/* 스텝 카운터 */}
      <p className="mt-2 text-right text-[10px] font-semibold text-[#8B95A1]">{current} / {total}</p>
    </div>
  );
}

// --- 컴포넌트 프롭스 ---
interface OnboardingProps {
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  setInventory?: React.Dispatch<React.SetStateAction<any[]>>;
  masterIngredients?: any[]; // App.tsx에서 fetch한 마스터 데이터 — 중복 fetch 방지
  onComplete: () => void;
}

export default function Onboarding({ setProfile, setInventory, masterIngredients: propMasterIngredients = [], onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'login' | 'profile' | 'ingredients'>('login');

  // 로그인 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 프로필 상태
  const [localProfile, setLocalProfile] = useState<UserProfile>(() => {
    const { nickname, avatar } = createRandomProfileData();
    return { nickname, householdSize: 1, allergies: [], avatar };
  });

  // 식재료 등록 상태
  // masterIngredients는 App.tsx에서 fetch한 결과를 prop으로 받음 (중복 fetch 없음)
  const masterIngredients = propMasterIngredients;
  const masterLoading = masterIngredients.length === 0; // App에서 아직 로딩 중이면 true
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 빠른 선택 재료
  // API 성공 시: 실제 ingredient_id로 교체 (레시피 추천 연동 가능)
  // API 실패 시: QUICK_INGREDIENTS의 local_* id 그대로 사용 (unit/expiryDay 포함으로 '로딩중...' 없음)
  const quickItems = QUICK_INGREDIENTS.map((qi) => {
    const matched = masterIngredients.find((m) => m.name === qi.name);
    return matched
      ? { ...qi, id: matched.id, expiryDay: matched.expiryDay, unit: matched.unit }
      : qi; // local_* id + 완전한 메타 데이터 그대로 사용
  });

  // 검색 결과 (마스터 기반, 최대 30개)
  const searchResults = searchQuery.length >= 1
    ? masterIngredients
        .filter((m) => m.name.includes(searchQuery))
        .slice(0, 30)
    : [];

  const toggleIngredient = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleLogin = () => {
    if (email && password) {
      setStep('profile');
    } else {
      alert('이메일과 비밀번호를 입력해주세요.');
    }
  };

  const handleProfileNext = () => {
    setProfile(localProfile);
    setStep('ingredients');
  };

  const handleIngredientsComplete = () => {
    // 선택한 식재료를 InventoryItem 형태로 변환해 App에 주입
    if (setInventory && selectedIds.length > 0) {
      const allItems = [...quickItems, ...masterIngredients].reduce<any[]>((acc, m) => {
        if (!acc.find((x) => x.id === m.id)) acc.push(m);
        return acc;
      }, []);

      const newInventory: InventoryItem[] = selectedIds.map((id) => {
        const master = allItems.find((m) => m.id === id);
        const expiryDate = addDays(master?.expiryDay ?? 7);
        return {
          id: `inv_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ingredientId: id,
          quantity: 1,
          initialQuantity: 1,
          expiryDate,
          storageType: '냉장' as StorageType,
          status: getStatus(expiryDate),
          createdAt: new Date().toISOString(),
          unit: master?.unit ?? 'g',
        };
      });
      setInventory(newInventory);
    }
    onComplete();
  };

  // -------------------------
  // 1. 로그인 화면
  // -------------------------
  if (step === 'login') {
    return (
      <div className="flex h-full flex-col justify-center px-5 py-10">
        <div className="text-center mb-10">
          <div className="text-[54px] mb-3">🍳</div>
          <h1 className="text-[28px] font-bold text-[#1A1F27] tracking-tight">나만의 냉장고<br />냉부해 시작하기</h1>
          <p className="text-[14px] text-[#6B7684] mt-2">식재료 관리부터 맞춤 레시피까지</p>
        </div>

        <div className="space-y-3">
          <input
            type="email" placeholder="이메일 입력" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[16px] bg-white px-4 py-4 text-[15px] outline-none ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          />
          <input
            type="password" placeholder="비밀번호 입력" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[16px] bg-white px-4 py-4 text-[15px] outline-none ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-lg shadow-[#18CA87]/30 active:scale-[0.98] transition-transform"
          >
            이메일로 로그인
          </button>
        </div>
      </div>
    );
  }

  // -------------------------
  // 2. 프로필 설정 화면 (스텝 1/2)
  // -------------------------
  if (step === 'profile') {
    return (
      <div className="flex h-full flex-col">
        <StepBar current={1} total={2} />

        <div className="flex-1 space-y-2 overflow-y-auto pb-1">
          <div className="px-1 pt-1">
            <p className="text-[11px] font-semibold text-[#8B95A1]">WELCOME</p>
            <h1 className="mt-1 text-[26px] leading-[1.1] font-bold tracking-[-0.04em] text-[#1A1F27]">나에게 맞는<br />냉장고를 시작해요</h1>
          </div>

          <section className="rounded-[28px] bg-white px-5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div>
              <p className="text-[13px] font-bold text-[#1A1F27]">프로필 이미지</p>
              <p className="mt-0.5 text-[11px] text-[#8B95A1]">슬라이드로 넘겨 선택할 수 있어요.</p>
            </div>
            <div className="mt-2 flex items-center gap-3 rounded-[20px] bg-[#f4f4f4] px-4 py-3">
              <button onClick={() => setLocalProfile((prev) => ({ ...prev, avatar: getNextAvatar(prev.avatar.id, 'prev') }))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[16px] text-[#1A1F27] outline-none focus:outline-none shadow-sm">‹</button>
              <div className="flex flex-1 flex-col items-center justify-center py-2">
                <div className="text-[44px] leading-none">{localProfile.avatar.emoji}</div>
                <p className="mt-2 text-[13px] font-bold text-[#6B7684]">{localProfile.avatar.label}</p>
              </div>
              <button onClick={() => setLocalProfile((prev) => ({ ...prev, avatar: getNextAvatar(prev.avatar.id, 'next') }))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[16px] text-[#1A1F27] outline-none focus:outline-none shadow-sm">›</button>
            </div>
          </section>

          <section className="rounded-[28px] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#1A1F27]">닉네임</label>
                <button onClick={() => setLocalProfile((prev) => ({ ...prev, ...createRandomProfileData() }))} className="rounded-full bg-[#18CA87] px-3 py-1.5 text-[11px] font-bold text-white outline-none focus:outline-none shadow-sm shadow-[#18CA87]/20">닉네임 랜덤</button>
              </div>
              <input maxLength={15} value={localProfile.nickname} onChange={(e) => setLocalProfile((prev) => ({ ...prev, nickname: e.target.value }))} className="mt-2 w-full rounded-[16px] border-0 bg-[#f4f4f4] px-4 py-3 text-[14px] outline-none placeholder:text-[#8B95A1]" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#1A1F27]">가구원 수</label>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {HOUSEHOLD_CHIPS.map((num) => {
                  const label = num < 5 ? `${num}인` : '5+인';
                  const selected = (num < 5 && localProfile.householdSize === num) || (num === 5 && localProfile.householdSize >= 5);
                  return (
                    <button key={num} onClick={() => setLocalProfile((prev) => ({ ...prev, householdSize: num }))} className={`rounded-[14px] px-1 py-2.5 text-[13px] font-bold outline-none focus:outline-none transition-colors ${selected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'}`}>{label}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-bold text-[#1A1F27]">알레르기 필터</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALLERGY_LIST.map((allergy) => {
                  const selected = localProfile.allergies.includes(allergy);
                  return (
                    <button key={allergy} onClick={() => setLocalProfile((prev) => ({ ...prev, allergies: prev.allergies.includes(allergy) ? prev.allergies.filter((a) => a !== allergy) : [...prev.allergies, allergy] }))} className={`rounded-full px-4 py-2 text-[13px] font-bold outline-none focus:outline-none transition-colors ${selected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'}`}>{allergy}</button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <button
          onClick={handleProfileNext}
          className="mt-4 w-full shrink-0 rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-lg outline-none focus:outline-none shadow-[#18CA87]/30 transition-transform active:scale-[0.98]"
        >
          계속하기
        </button>
      </div>
    );
  }

  // -------------------------
  // 3. 식재료 등록 화면 (스텝 2/2)
  // -------------------------
  // 검색 결과에서 표시할 재료 (quick items와 중복 제거)
  const filteredSearchResults = searchResults.filter(
    (r) => !quickItems.find((q) => q.id === r.id),
  );
  // 표시 목록: 검색 중이면 검색결과, 아니면 quick 목록
  const displayItems = searchQuery.length >= 1 ? filteredSearchResults : quickItems;

  return (
    <div className={`flex h-full flex-col overflow-y-auto ${hideScroll}`}>
      <StepBar current={2} total={2} />

      {/* 헤더 */}
      <section className="rounded-[28px] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0">
        <p className="text-[11px] font-semibold text-[#8B95A1]">STEP 2</p>
        <h1 className="mt-1 text-[24px] leading-[1.2] font-bold tracking-[-0.04em] text-[#1A1F27]">냉장고에 있는<br />재료를 골라보세요</h1>
        <p className="mt-1.5 text-[12px] text-[#8B95A1]">나중에 냉장고 탭에서 수정할 수 있어요.</p>
      </section>

      {/* 검색창 */}
      <div className="mt-3 shrink-0">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none">🔍</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="재료 직접 검색 (예: 된장, 김치...)"
            className="w-full rounded-[20px] bg-white pl-10 pr-4 py-3.5 text-[14px] outline-none ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)] placeholder:text-[#8B95A1]"
          />
          {searchQuery.length > 0 && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B95A1] outline-none focus:outline-none text-[18px] leading-none">×</button>
          )}
        </div>
      </div>

      {/* 선택된 재료 수 표시 */}
      {selectedIds.length > 0 && (
        <div className="mt-3 shrink-0 flex items-center justify-between px-1">
          <span className="text-[12px] font-bold text-[#18CA87]">✓ {selectedIds.length}개 선택됨</span>
          <button onClick={() => setSelectedIds([])} className="text-[11px] font-semibold text-[#8B95A1] outline-none focus:outline-none">전체 해제</button>
        </div>
      )}

      {/* 재료 그리드 */}
      <div className="mt-3 flex-1 overflow-y-auto pb-2">
        {masterLoading && searchQuery.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <span className="text-[13px] text-[#8B95A1]">재료 목록 불러오는 중...</span>
          </div>
        )}

        {/* 검색 결과가 없을 때 */}
        {searchQuery.length >= 1 && filteredSearchResults.length === 0 && !masterLoading && (
          <div className="rounded-[20px] bg-white px-5 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="text-[36px] mb-2">🔍</div>
            <p className="text-[14px] font-bold text-[#1A1F27]">'{searchQuery}' 검색 결과가 없어요</p>
            <p className="mt-1 text-[12px] text-[#8B95A1]">다른 이름으로 검색해보세요.</p>
          </div>
        )}

        {/* 그리드 목록 */}
        {displayItems.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {displayItems.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleIngredient(item.id)}
                  className={`relative flex flex-col items-center justify-center rounded-[20px] px-1 py-4 gap-1.5 outline-none focus:outline-none transition-all ${
                    selected
                      ? 'bg-[#18CA87] shadow-md shadow-[#18CA87]/25'
                      : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {/* 선택 체크 뱃지 */}
                  {selected && (
                    <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#18CA87] text-[10px] font-bold shadow-sm">✓</span>
                  )}
                  <span className="text-[28px] leading-none">{item.emoji}</span>
                  <span className={`text-[11px] font-bold leading-tight text-center ${selected ? 'text-white' : 'text-[#1A1F27]'}`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 검색 모드일 때 quick items도 아래에 표시 */}
        {searchQuery.length >= 1 && filteredSearchResults.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold text-[#8B95A1] mb-2 px-1">자주 쓰는 재료</p>
            <div className="grid grid-cols-4 gap-2">
              {quickItems.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleIngredient(item.id)}
                    className={`relative flex flex-col items-center justify-center rounded-[20px] px-1 py-4 gap-1.5 outline-none focus:outline-none transition-all ${
                      selected
                        ? 'bg-[#18CA87] shadow-md shadow-[#18CA87]/25'
                        : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#18CA87] text-[10px] font-bold shadow-sm">✓</span>
                    )}
                    <span className="text-[28px] leading-none">{item.emoji}</span>
                    <span className={`text-[11px] font-bold leading-tight text-center ${selected ? 'text-white' : 'text-[#1A1F27]'}`}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      <div className="mt-4 shrink-0 space-y-2">
        <button
          onClick={handleIngredientsComplete}
          className="w-full rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-lg outline-none focus:outline-none shadow-[#18CA87]/30 transition-transform active:scale-[0.98]"
        >
          {selectedIds.length > 0 ? `${selectedIds.length}개 등록하고 시작하기 🎉` : '시작하기'}
        </button>
        {selectedIds.length === 0 && (
          <p className="text-center text-[11px] text-[#8B95A1]">재료를 선택하지 않아도 나중에 추가할 수 있어요.</p>
        )}
      </div>
    </div>
  );
}