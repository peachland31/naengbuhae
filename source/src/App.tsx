import React, { useMemo, useState, useRef, useEffect } from 'react';
import Onboarding from './Onboarding';

type Allergy = '우유' | '계란' | '땅콩' | '견과류' | '밀' | '대두' | '생선' | '갑각류' | '참깨';
type StorageType = '냉장' | '냉동' | '실온';
type Status = '신선' | '보통' | '빠른 소비 필요';
type Tab = 'onboarding' | 'home' | 'fridge' | 'recipe' | 'recipe_detail' | 'profile';
type Category = '전체' | '육류' | '채소' | '유제품' | '과일' | '해산물' | '조미료' | '신선식품';
type SortMode = 'expiry' | 'remainingRatio' | 'recent';
type RecipeSortMode = 'match' | 'urgent' | 'recent';
type RecipeRecommendTab = 'ai' | 'selected';
type Avatar = { id: string; emoji: string; label: string };
type NotificationType = 'EXPIRY' | 'RECIPE' | 'NOTICE';

const MASTER_INGREDIENTS: any[] = [];

// 온보딩에서 API 없이 등록된 local_* ID 재료들을 앱 전체에서 정상 표시하기 위한 fallback 맵
// Onboarding.tsx의 QUICK_INGREDIENTS와 id/name이 반드시 일치해야 함
const LOCAL_FALLBACK_INGREDIENTS: Record<string, any> = {
  'local_계란':     { id: 'local_계란',     name: '계란',     category: '신선식품', emoji: '🥚', unit: '개',  expiryDay: 14 },
  'local_우유':     { id: 'local_우유',     name: '우유',     category: '유제품',   emoji: '🥛', unit: 'ml',  expiryDay: 10 },
  'local_양파':     { id: 'local_양파',     name: '양파',     category: '채소',     emoji: '🧅', unit: '개',  expiryDay: 30 },
  'local_당근':     { id: 'local_당근',     name: '당근',     category: '채소',     emoji: '🥕', unit: '개',  expiryDay: 14 },
  'local_대파':     { id: 'local_대파',     name: '대파',     category: '채소',     emoji: '🥬', unit: '대',  expiryDay: 7  },
  'local_브로콜리': { id: 'local_브로콜리', name: '브로콜리', category: '채소',     emoji: '🥦', unit: '개',  expiryDay: 5  },
  'local_고추':     { id: 'local_고추',     name: '고추',     category: '채소',     emoji: '🌶️', unit: '개',  expiryDay: 7  },
  'local_마늘':     { id: 'local_마늘',     name: '마늘',     category: '채소',     emoji: '🧄', unit: 'g',   expiryDay: 30 },
  'local_토마토':   { id: 'local_토마토',   name: '토마토',   category: '채소',     emoji: '🍅', unit: '개',  expiryDay: 7  },
  'local_소고기':   { id: 'local_소고기',   name: '소고기',   category: '육류',     emoji: '🥩', unit: 'g',   expiryDay: 3  },
  'local_닭가슴살': { id: 'local_닭가슴살', name: '닭가슴살', category: '육류',     emoji: '🍗', unit: 'g',   expiryDay: 3  },
  'local_베이컨':   { id: 'local_베이컨',   name: '베이컨',   category: '육류',     emoji: '🥓', unit: 'g',   expiryDay: 7  },
  'local_새우':     { id: 'local_새우',     name: '새우',     category: '해산물',   emoji: '🦐', unit: 'g',   expiryDay: 3  },
  'local_연어':     { id: 'local_연어',     name: '연어',     category: '해산물',   emoji: '🐟', unit: 'g',   expiryDay: 2  },
  'local_치즈':     { id: 'local_치즈',     name: '치즈',     category: '유제품',   emoji: '🧀', unit: 'g',   expiryDay: 14 },
  'local_두부':     { id: 'local_두부',     name: '두부',     category: '신선식품', emoji: '⬜', unit: '개',  expiryDay: 5  },
  'local_사과':     { id: 'local_사과',     name: '사과',     category: '과일',     emoji: '🍎', unit: '개',  expiryDay: 14 },
  'local_바나나':   { id: 'local_바나나',   name: '바나나',   category: '과일',     emoji: '🍌', unit: '개',  expiryDay: 5  },
  'local_버섯':     { id: 'local_버섯',     name: '버섯',     category: '채소',     emoji: '🍄', unit: 'g',   expiryDay: 5  },
  'local_밀가루':   { id: 'local_밀가루',   name: '밀가루',   category: '조미료',   emoji: '🌾', unit: 'g',   expiryDay: 180},
};

type AIRecipeRecommendation = {
  recipe_id: string;
  title: string;
  pred_score: number;
  level: string;
  timeMin: number;
  mood: string;
  // 기존 호환 필드
  main_match_ratio: number;
  required_match_ratio: number;
  urgency_score: number;
  consume_efficiency: number;
  missing_required: number;
  allergy_hit: number;
  // 신규: 보유/미보유 재료 상세 (name 기반)
  owned_main: string[];
  missing_main_names: string[];
  owned_sub: string[];
  missing_sub_names: string[];
  match_rate_pct: number;
  owned_qty_score: number;
};

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  date: string;
}

interface UserProfile {
  nickname: string;
  householdSize: number;
  allergies: Allergy[];
  avatar: Avatar;
}

interface IngredientMaster {
  id: string;
  name: string;
  category: Exclude<Category, '전체'>;
  expiryDay: number;
  unit: string;
  allergy?: Allergy;
  emoji: string;
}

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

interface RecipeItem {
  ingredientId: string;
  baseQuantity: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  level: string;
  timeMin: number;
  items: RecipeItem[];
  reasons: string[];
  steps: string[];
  sauce?: string[];
  mood: string;
}

type ScaledRecipe = Recipe & {
  score: number;
  items: Array<RecipeItem & { scaledQuantity: number }>;
};

// 스크롤바 숨김 유틸리티 클래스
const hideScroll = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

// src/services/api.js 예시
const API_BASE_URL = "https://naengbuhae-api.onrender.com";  // Vercel rewrite 설정 덕분에 /api로 시작하면 백엔드로 연결됩니다.

export const getRecommendations = async (data) => {
  const response = await fetch(`${API_BASE_URL}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
};

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
const CATEGORY_LIST: Category[] = ['전체', '육류', '채소', '유제품', '과일', '해산물', '조미료', '신선식품'];
const HOUSEHOLD_CHIPS = [1, 2, 3, 4, 5] as const;
const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', '개', '알', '모', '대', '봉', '팩', '캔', '송이', '마리'];

const NICKNAME_ADJECTIVES = ['초록빛', '바삭한', '말랑한', '상큼한', '고소한', '달큰한', '포근한', '아삭한', '반짝이는', '부드러운'];
const NICKNAME_INGREDIENTS = ['토마토', '양파', '브로콜리', '두부', '사과', '새우', '당근', '대파', '우유', '버섯'];

// 카테고리별 기본 이모지 매핑 딕셔너리
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  '육류': '🥩',
  '채소': '🥬',
  '유제품': '🥛',
  '과일': '🍎',
  '해산물': '🐟',
  '조미료': '🧂',
  '신선식품': '🥚',
  '전체': '🛒' // 기본값
};

// 이름 키워드 기반 상세 매핑 (옵션: 더 디테일하게 주고 싶을 때)
const getIngredientEmoji = (category: string, name: string) => {
  if (name.includes('돼지')) return '🐖';
  if (name.includes('양파')) return '🧅';
  if (name.includes('당근')) return '🥕';
  if (name.includes('호박')) return '🎃';
  if (name.includes('고추')) return '🌶️';
  if (name.includes('파')) return '🥬';
  if (name.includes('버섯')) return '🍄';
  if (name.includes('브로콜리')) return '🥦';
  if (name.includes('시금치')) return '🥬';
  if (name.includes('양배추')) return '🥬';
  if (name.includes('토마토')) return '🍅';
  if (name.includes('오이')) return '🍆';
  if (name.includes('사과')) return '🍎';
  if (name.includes('바나나')) return '🍌';
  if (name.includes('레몬')) return '🍋';
  if (name.includes('닭가슴살')) return '🍗';
  if (name.includes('돼지고기')) return '🥩';
  if (name.includes('소고기')) return '🥩';
  if (name.includes('베이컨')) return '🥓';
  if (name.includes('새우')) return '🦐';
  if (name.includes('연어')) return '🐟';
  if (name.includes('두부')) return '⬜';
  if (name.includes('우유')) return '🥛';
  if (name.includes('치즈')) return '🧀';
  if (name.includes('계란')) return '🥚';
  if (name.includes('고추장')) return '🌶️';
  if (name.includes('땅콩')) return '🥜';
  if (name.includes('호두')) return '🌰';
  if (name.includes('밀가루')) return '🌾';
  if (name.includes('고등어')) return '🐟';
  if (name.includes('참기름')) return '🛢️';   
  if (name.includes('김치')) return '🥬'; 
  if (name.includes('마늘')) return '🧄'; 
  if (name.includes('생강')) return '🫚'; 
  if (name.includes('망고')) return '🥭';
  if (name.includes('딸기')) return '🍓';
  if (name.includes('포도')) return '🍇';
  if (name.includes('블루베리')) return '🫐';
  if (name.includes('라즈베리')) return '🍒';
  if (name.includes('체리')) return '🍒';
  if (name.includes('레몬')) return '🍋';
  if (name.includes('파인애플')) return '🍍';
  if (name.includes('오렌지')) return '🍊';
  if (name.includes('멜론')) return '🍈';
  if (name.includes('수박')) return '🍉'; 
  if (name.includes('코코넛')) return '🥥';
  if (name.includes('피자')) return '🍕'; 
  if (name.includes('파스타')) return '🍝'; 
  if (name.includes('햄')) return '🍖'; 
  if (name.includes('소시지')) return '🍖'; 
  if (name.includes('치즈')) return '🧀';
  if (name.includes('감자')) return '🥔';
  if (name.includes('고구마')) return '🍠'; 


  return CATEGORY_EMOJI_MAP[category] || '🥦';
};

const STORAGE_TIPS = [
  { id: 1, ingredient: "양파", tip: "냉장고보다 서늘하고 건조한 곳에 보관하는 것이 좋아요. 껍질을 벗기지 않은 상태로 통풍이 되는 곳에 두면 더 오래 신선합니다." },
  { id: 2, ingredient: "감자", tip: "햇빛이 없는 서늘한 곳에 보관하세요. 빛을 받으면 싹이 빨리 나고 품질이 떨어질 수 있습니다." },
  { id: 3, ingredient: "양파·감자", tip: "양파와 감자는 함께 보관하지 마세요. 감자에서 나오는 수분과 가스 때문에 양파가 더 빨리 상할 수 있습니다." },
  { id: 4, ingredient: "마늘", tip: "냉장고보다는 통풍이 잘 되는 서늘한 곳에 보관하는 것이 좋아요. 습기가 많으면 곰팡이가 생길 수 있습니다." },
  { id: 5, ingredient: "토마토", tip: "실온에서 보관하면 맛과 향이 더 잘 유지돼요. 충분히 익었을 때만 냉장 보관하여 숙성을 늦추세요." },
  { id: 7, ingredient: "바나나", tip: "냉장고에 넣으면 껍질이 검게 변할 수 있어요. 실온 보관이 가장 좋으며, 사과 근처에 두면 더 빨리 익습니다." },
  { id: 8, ingredient: "사과", tip: "냉장 보관이 신선도 유지에 좋습니다. 다른 과일을 빨리 익게 하는 에틸렌 가스를 방출하므로 단독 밀폐 보관하세요." },
  { id: 11, ingredient: "잎채소", tip: "상추나 시금치는 씻지 않은 상태로 냉장 보관하세요. 키친타월로 감싸면 수분을 조절해 더 오래 신선합니다." },
  { id: 14, ingredient: "당근", tip: "잎이 붙어 있다면 먼저 제거하세요. 잎이 수분을 빼앗아 빨리 마를 수 있습니다. 밀폐 용기에 냉장 보관하세요." },
  { id: 17, ingredient: "브로콜리", tip: "냉장 보관할 때 구멍이 있는 봉투에 넣어두면 수분이 빠져나가 신선도가 더 오래 유지됩니다." },
  { id: 18, ingredient: "버섯", tip: "플라스틱 밀폐용기 대신 종이봉투에 넣어 냉장 보관하세요. 종이가 습기를 흡수해 상하는 것을 막아줍니다." },
  { id: 20, ingredient: "대파", tip: "물이 담긴 컵에 뿌리 쪽을 세워 냉장 보관하거나, 미리 썰어 밀폐 용기에 보관하면 편리하고 신선합니다." },
  { id: 22, ingredient: "계란", tip: "온도 변화가 잦은 냉장고 문보다 안쪽 선반에 보관하세요. 보관 시 씻어내면 보호막이 제거되니 주의하세요." },
  { id: 25, ingredient: "유제품", tip: "우유도 온도 변화를 피하기 위해 냉장고 문보다 안쪽 선반에 보관하는 것이 신선도 유지에 유리합니다." },
  { id: 28, ingredient: "고기", tip: "생고기는 냉장 보관 시 1~2일 안에 사용하는 것이 좋고, 포장 상태 그대로 보관하는 것이 신선도에 도움이 됩니다." },
  { id: 31, ingredient: "생선", tip: "가능한 당일이나 다음 날 소비하고, 얼음 위에 올려 냉장 보관하면 온도를 낮게 유지해 신선도를 지킬 수 있습니다." },
  { id: 34, ingredient: "빵", tip: "실온 보관이 좋으며, 냉장 보관 시 더 빨리 굳습니다. 오래 보관하려면 냉동 보관 후 자연 해동하세요." },
  { id: 39, ingredient: "견과류", tip: "공기와 접촉하면 산패하기 쉬우니 반드시 밀폐 용기에 담아 냉장 또는 냉동 보관하세요." },
];

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}.${m}.${d}`;
};

const calculateDaysLeft = (expiryDate: string) => {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(expiryDate).getTime();
  return Math.ceil((target - base) / (1000 * 3600 * 24));
};

const getStatus = (expiryDate: string): Status => {
  const left = calculateDaysLeft(expiryDate);
  if (left <= 2) return '빠른 소비 필요';
  if (left <= 5) return '보통';
  return '신선';
};

const getDefaultExpiry = (days: number, storageType: StorageType) => {
  if (storageType === '냉동') return addDays(days + 14);
  if (storageType === '실온') return addDays(Math.max(1, Math.floor(days * 0.6)));
  return addDays(days);
};

const getHouseholdIcon = (count: number) => {
  if (count <= 1) return '🧍';
  if (count === 2) return '🧑‍🤝‍🧑';
  if (count === 3) return '👨‍👩‍👧';
  if (count === 4) return '👨‍👩‍👧‍👦';
  return '👨‍👩‍👧‍👦+';
};

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

const getRemainingRatio = (item: InventoryItem) => {
  if (item.initialQuantity <= 0 || item.initialQuantity < item.quantity) return 1;
  return item.quantity / item.initialQuantity;
};

const formatRatioPercent = (item: InventoryItem) => {
  if (item.initialQuantity <= 0 || item.initialQuantity < item.quantity) return 100;
  return Math.round(getRemainingRatio(item) * 100);
};

// --- 드래그 스크롤 기능을 위한 컴포넌트 ---
function DraggableScrollContainer({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    ref.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className={`flex flex-nowrap overflow-x-auto ${hideScroll} ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </div>
  );
}

// --- 벡터 아이콘 컴포넌트 모음 ---
const IconHome = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconFridge = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="10" height="20" x="7" y="2" rx="2"/>
    <path d="M7 9h10"/>
    <path d="M10 5v2"/>
    <path d="M10 12v3"/>
  </svg>
);

const IconRecipe = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
    <path d="M7 2v20"/>
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
  </svg>
);

const IconProfile = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconBell = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const IconBasket = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/>
  </svg>
);

const IconClock = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/>
  </svg>
);

const IconFlame = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const IconChefHat = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" x2="18" y1="17" y2="17"/>
  </svg>
);

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('onboarding');
  const [recipeRecommendTab, setRecipeRecommendTab] = useState<RecipeRecommendTab>('ai');
  const [aiRecommendations, setAiRecommendations] = useState<AIRecipeRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // 선택 재료 기반 추천 상태
  const [selectedRecommendations, setSelectedRecommendations] = useState<AIRecipeRecommendation[]>([]);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState('');

  // 1. 식재료 마스터 상태
  const [masterIngredients, setMasterIngredients] = useState<any[]>([]);

  // 2. 백엔드에서 데이터 불러오고 이모지 입히기
  useEffect(() => {
    const fetchMasterIngredients = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/ingredients?limit=1000`);
        const data = await res.json();
        // 백엔드가 ingredient_id, ingredient_name 으로 내려줌 (index.py에서 rename 처리)
        const mappedIngredients = data.ingredients.map((item: any) => ({
          id:        item.ingredient_id,
          name:      item.ingredient_name,
          category:  item.category,
          emoji:     getIngredientEmoji(item.category, item.ingredient_name),
          expiryDay: item.expiry_day || 7,   // 마스터 DB의 실제 유통기한 사용
          unit:      item.unit      || 'g',  // 마스터 DB의 실제 단위 사용
        }));
        setMasterIngredients(mappedIngredients);
      } catch (error) {
        console.error("Failed to fetch ingredients:", error);
      }
    };
    fetchMasterIngredients();
  }, []);

  // 3. 앱 전체에서 쓸 ingredientMap
  // 우선순위: API 마스터 데이터 > 온보딩 local_* fallback > 최후 방어값
  const ingredientMap = useMemo(() => {
    const map: Record<string, any> = { ...LOCAL_FALLBACK_INGREDIENTS };
    masterIngredients.forEach(item => { map[item.id] = item; });

    return new Proxy(map, {
      get: (target, prop: string) => {
        return target[prop] || { id: prop, name: '알 수 없음', category: '전체', emoji: '❓', unit: 'g', expiryDay: 7 };
      }
    });
  }, [masterIngredients]);

  const randomTip = useMemo(() => STORAGE_TIPS[Math.floor(Math.random() * STORAGE_TIPS.length)], []);

  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: 'n1', type: 'EXPIRY', title: '유통기한 임박!', content: '등록하신 양파의 소비기한이 1일 남았습니다.', isRead: false, date: new Date().toISOString() },
    { id: 'n2', type: 'RECIPE', title: '오늘 저녁 메뉴 추천', content: '냉장고에 있는 시금치로 시금치 된장국 어떠세요?', isRead: false, date: new Date().toISOString() },
    { id: 'n3', type: 'NOTICE', title: '시스템 점검 안내', content: '내일 새벽 2시부터 서버 점검이 있습니다.', isRead: true, date: new Date(Date.now() - 86400000).toISOString() },
  ]);
  const [isNotiOpen, setIsNotiOpen] = useState(false);

  // 시작 시 빈 프로필로 초기화 (온보딩에서 채울 예정)
  const [profile, setProfile] = useState<UserProfile>({
    nickname: '사용자', // 임시 닉네임 (온보딩 전)
    householdSize: 1,
    allergies: [],
    avatar: { id: 'a1', emoji: '🧑‍🍳', label: '요리사' }
  });

  // 냉장고 재고 완전히 비우기!
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isInventoryDetailOpen, setIsInventoryDetailOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  // selectedRecipeId: 공공데이터 모달로 전환되어 미사용
  const [recipeDetail, setRecipeDetail] = useState<any>(null);
  const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);
  const recipeDetailCacheRef = useRef<Record<string, any>>({});  // 레시피 상세 캐시
  const [selectedAiRecipe, setSelectedAiRecipe] = useState<AIRecipeRecommendation | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category>('전체');
  const [sortMode, setSortMode] = useState<SortMode>('expiry');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const [recipeSortMode, setRecipeSortMode] = useState<RecipeSortMode>('match');
  const [recipeSortDropdownOpen, setRecipeSortDropdownOpen] = useState(false);
  
  const [priorityIngredientIds, setPriorityIngredientIds] = useState<string[]>([]);

  const urgentItems = useMemo(() => inventory.filter((item) => calculateDaysLeft(item.expiryDate) <= 3), [inventory]);
  const lowRatioItems = useMemo(() => inventory.filter((item) => getRemainingRatio(item) <= 0.3), [inventory]);
  const recentItems = useMemo(() => [...inventory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3), [inventory]);

  // 냉장고 보유 재료의 총 절약 가능량 (g 환산)
  const foodSavedGrams = useMemo(() => {
    const UNIT_G: Record<string, number> = {
      'g': 1, 'kg': 1000, 'ml': 1, 'l': 1000,
      '개': 150, '대': 80, '모': 300, '알': 60,
      '봉': 200, '팩': 200, '캔': 400, '병': 500,
    };
    return inventory.reduce((sum, item) => {
      const master = ingredientMap[item.ingredientId];
      const unit = item.unit ?? master?.unit ?? 'g';
      const perUnit = UNIT_G[unit] ?? 100;
      return sum + item.quantity * perUnit;
    }, 0);
  }, [inventory, ingredientMap]);

  // 기존 하드코딩된 MOCK_RECIPES 대신, 필요에 따라 빈 배열이나 API 결과를 활용하도록 수정
  const safeRecipes = useMemo<ScaledRecipe[]>(() => {
    return []; // 임시 조치: 추후 선택 재료 기반 백엔드 연동 시 이 부분을 대체합니다.
  }, [profile.allergies, profile.householdSize, inventory, priorityIngredientIds, ingredientMap]);

  const selectedBasedRecipes = useMemo(() => {
  // 전체 선택 상태
  if (priorityIngredientIds.length === 0) return safeRecipes;

  // OR 조건: 선택한 재료 중 하나라도 포함된 레시피 필터링
  const matchedRecipes = safeRecipes.filter((recipe) =>
    priorityIngredientIds.some((id) =>
      recipe.items.some((item) => item.ingredientId === id),
    ),
  );

  // 정렬: 선택한 재료가 많이 포함될수록 우선 노출
  return matchedRecipes.sort((a, b) => {
    const matchCountA = a.items.filter(item => priorityIngredientIds.includes(item.ingredientId)).length;
    const matchCountB = b.items.filter(item => priorityIngredientIds.includes(item.ingredientId)).length;
    return matchCountB - matchCountA; 
  });
}, [safeRecipes, priorityIngredientIds]);

  const sortedSelectedRecipes = useMemo(() => {
    let list = [...selectedBasedRecipes];

    if (recipeSortMode === 'urgent') {
      list.sort((a, b) => {
        const minDaysA = Math.min(...a.items.map(item => {
          const inv = inventory.find(i => i.ingredientId === item.ingredientId);
          return inv ? calculateDaysLeft(inv.expiryDate) : Infinity;
        }));
        const minDaysB = Math.min(...b.items.map(item => {
          const inv = inventory.find(i => i.ingredientId === item.ingredientId);
          return inv ? calculateDaysLeft(inv.expiryDate) : Infinity;
        }));
        return minDaysA - minDaysB;
      });
    } else if (recipeSortMode === 'recent') {
      list.reverse();
    } else {
      list.sort((a, b) => b.score - a.score);
    }

    return list;
  }, [selectedBasedRecipes, inventory, recipeSortMode]);

  const sortedAiRecommendations = useMemo(() => {
    const list = [...aiRecommendations];

    if (recipeSortMode === 'urgent') {
      list.sort((a, b) => b.urgency_score - a.urgency_score);
    } else if (recipeSortMode === 'recent') {
      list.reverse();
    } else {
      list.sort((a, b) => b.pred_score - a.pred_score);
    }

    return list;
  }, [aiRecommendations, recipeSortMode]);

  const sortedInventory = useMemo(() => {
    const list = [...inventory].filter((item) => {
      const master = ingredientMap[item.ingredientId];
      const searchMatched = master.name.includes(searchQuery);
      const categoryMatched = categoryFilter === '전체' || master.category === categoryFilter;
      return searchMatched && categoryMatched;
    });

    if (sortMode === 'remainingRatio') {
      return list.sort((a, b) => {
        const ratioA = getRemainingRatio(a);
        const ratioB = getRemainingRatio(b);
        if (ratioA !== ratioB) return ratioA - ratioB;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    }
    if (sortMode === 'recent') {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [inventory, searchQuery, categoryFilter, sortMode]);

  const selectedInventory = inventory.find((item) => item.id === selectedInventoryId) ?? null;
  // selectedRecipe: 공공데이터 모달로 전환되어 미사용

  const handleSaveInventory = (updated: InventoryItem) => {
    setInventory((prev) => prev.map((item) => (item.id === updated.id ? { ...updated, status: getStatus(updated.expiryDate) } : item)));
    setIsInventoryDetailOpen(false);
  };


  // 레시피 카드 클릭 → 상세 페이지로 이동 (캐시 적용)
  const handleRecipeCardClick = async (title: string, aiRecipe: AIRecipeRecommendation) => {
    setSelectedAiRecipe(aiRecipe);
    setCurrentTab('recipe_detail');
    // 캐시 히트: 즉시 표시
    if (recipeDetailCacheRef.current[title]) {
      setRecipeDetail(recipeDetailCacheRef.current[title]);
      setRecipeDetailLoading(false);
      return;
    }
    setRecipeDetail(null);
    setRecipeDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/recipe/detail?title=${encodeURIComponent(title)}`);
      if (res.status === 404) {
        const fallback = { title, image: '', category: '', calorie: '', ingredients: '', steps: [], notFound: true };
        recipeDetailCacheRef.current[title] = fallback;
        setRecipeDetail(fallback);
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      recipeDetailCacheRef.current[title] = data;  // 캐시 저장
      setRecipeDetail(data);
    } catch {
      // 네트워크 오류는 캐시에 저장 안 함 (다음에 재시도 가능)
      setRecipeDetail({ title, image: '', category: '', calorie: '', ingredients: '', steps: [], notFound: true, networkError: true });
    } finally {
      setRecipeDetailLoading(false);
    }
  };

  const handleCompleteRecipe = (recipeId: string) => {
    const recipe = safeRecipes.find((item) => item.id === recipeId);
    if (!recipe) return;

    setInventory((prev) =>
      prev
        .map((inv) => {
          const used = recipe.items.find((item) => item.ingredientId === inv.ingredientId);
          if (!used) return inv;
          const remain = Math.max(0, inv.quantity - used.scaledQuantity);
          return { ...inv, quantity: remain };
        })
        .filter((item) => item.quantity > 0),
    );
  // setSelectedRecipeId: 공공데이터 모달로 전환되어 미사용
  };

  const handleMarkNotiRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const unreadNotiCount = notifications.filter((n) => !n.isRead).length;


  // local_* ID → 실제 마스터 DB ID 변환 헬퍼
  // 온보딩에서 API 연결 없이 등록된 재료는 local_계란 등의 ID를 가짐.
  // 백엔드는 숫자 ID만 인식하므로, 이름으로 실제 ID를 역조회해 교체.
  const resolveIngredientId = (id: string): string => {
    if (!id.startsWith('local_')) return id;
    const name = id.replace('local_', '');
    const matched = masterIngredients.find((m) => m.name === name);
    return matched ? String(matched.id) : id;
  };

  const fetchAiRecommendations = async () => {
  try {
    setAiLoading(true);
    setAiError('');

    const now       = new Date();
    const dayOfWeek = now.getDay();  // 0=일, 1=월 ... 6=토 (JS 기본값 그대로 전송)

    const inventoryPayload = inventory
      .map((item) => ({
        ingredient_id: resolveIngredientId(String(item.ingredientId)),
        owned_qty:     Number(item.quantity),
        days_left:     calculateDaysLeft(item.expiryDate),
      }))
      .filter((item) => !item.ingredient_id.startsWith('local_')); // 변환 못 된 항목 제외
    const response = await fetch(`${API_BASE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        household_size:       profile.householdSize,
        day_of_week:          dayOfWeek,
        hour:                 now.getHours(),
        allergies:            profile.allergies,
        preferred_moods:      [],
        inventory_confidence: 0.9,
        top_k:                15,
        inventory:            inventoryPayload,
      }),
    });

    if (!response.ok) throw new Error(`추천 실패: ${response.status}`);

    const data = await response.json();
    setAiRecommendations(data);
  } catch (error) {
    setAiError('AI 추천 엔진이 응답하지 않습니다.');
  } finally {
    setAiLoading(false);
  }
};

  // 선택 재료 기반 추천 — 선택 재료를 임박도 높은 inventory로 넣어 /recommend 별도 호출
  const fetchSelectedRecommendations = async (selectedIds: string[], matchMode: 'or' | 'and' = 'or') => {
    try {
      setSelectedLoading(true);
      setSelectedError('');
      const now       = new Date();
      const dayOfWeek = now.getDay();

      // 전체(선택 없음): 냉장고 재료 전체를 OR 조건으로 보냄
      // 재료 선택: 선택한 재료를 AND 또는 OR 조건으로 보냄
      const idsToSend = (selectedIds.length === 0
        ? inventory.map((item) => item.ingredientId)
        : selectedIds)
        .map((id) => resolveIngredientId(String(id)))
        .filter((id) => !id.startsWith('local_'));

      if (idsToSend.length === 0) {
        setSelectedRecommendations([]);
        setSelectedLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/recommend/selected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_ingredient_ids: idsToSend,
          match_mode:              selectedIds.length === 0 ? 'or' : matchMode,
          household_size:          profile.householdSize,
          day_of_week:             dayOfWeek,
          hour:                    now.getHours(),
          allergies:               profile.allergies,
          top_k:                   30,  // 한번에 더 많이 가져와 재호출 최소화
        }),
      });
      if (!response.ok) throw new Error(`추천 실패: ${response.status}`);
      const data = await response.json();
      setSelectedRecommendations(data);
    } catch (error) {
      setSelectedError('선택 재료 추천이 응답하지 않습니다.');
    } finally {
      setSelectedLoading(false);
    }
  };

  // AI 추천: inventory 실제 변경 시만 호출
  const inventoryHashRef = useRef('');
  useEffect(() => {
    if (currentTab !== 'recipe' || recipeRecommendTab !== 'ai') return;
    const hash = inventory.map(i => `${i.ingredientId}:${i.quantity}:${i.expiryDate}`).sort().join('|') + `|${profile.householdSize}|${profile.allergies.join(',')}`;
    if (hash === inventoryHashRef.current && aiRecommendations.length > 0) return;
    inventoryHashRef.current = hash;
    fetchAiRecommendations();
  }, [currentTab, recipeRecommendTab, inventory, profile.householdSize, profile.allergies]);

  // 선택 탭: 조건이 실제로 바뀔 때만 호출
  const prevSelKeyRef = useRef('');
  useEffect(() => {
    if (currentTab !== 'recipe' || recipeRecommendTab !== 'selected') return;
    const key = [...priorityIngredientIds].sort().join(',') + `|${profile.householdSize}|${profile.allergies.join(',')}|${inventory.map(i => i.ingredientId).sort().join(',')}`;
    if (key === prevSelKeyRef.current && selectedRecommendations.length > 0) return;
    prevSelKeyRef.current = key;
    fetchSelectedRecommendations(priorityIngredientIds, priorityIngredientIds.length > 0 ? 'and' : 'or');
  }, [currentTab, recipeRecommendTab, priorityIngredientIds, profile.householdSize, profile.allergies, inventory]);

  return (
    <div className={`flex min-h-screen items-center justify-center bg-[#f4f4f4] py-4 font-sans`}>
      <div className="relative mx-auto flex h-[780px] w-full max-w-[390px] flex-col overflow-hidden rounded-[34px] bg-[#f4f4f4] shadow-2xl ring-1 ring-black/[0.04]">
        {currentTab !== 'onboarding' && currentTab !== 'recipe_detail' && (
          <header className="bg-[#f4f4f4] px-5 pt-6 pb-4 shrink-0 z-10 flex items-center justify-between">
            <h1 className="text-[26px] font-bold tracking-[-0.05em] text-[#1A1F27]">
              {currentTab === 'home' && '홈'}
              {currentTab === 'fridge' && '나의 냉장고'}
              {currentTab === 'recipe' && '맞춤 레시피'}
              {currentTab === 'profile' && '내 프로필'}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNotiOpen(true)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/[0.04] text-[#1A1F27]"
              >
                <IconBell className="w-5 h-5" />
                {unreadNotiCount > 0 && (
                  <span className="absolute right-2.5 top-2.5 flex h-2 w-2 items-center justify-center rounded-full bg-[#F04438] ring-2 ring-white" />
                )}
              </button>
              <button
                onClick={() => setCurrentTab('profile')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-black/[0.04]"
              >
                {profile.avatar.emoji}
              </button>
            </div>
          </header>
        )}

        <main className={`flex-1 flex flex-col ${currentTab === 'onboarding' ? 'px-5 overflow-hidden pb-4' : currentTab === 'recipe_detail' ? 'overflow-hidden p-0' : currentTab === 'home' ? 'px-5 pb-[80px]' : `px-5 overflow-y-auto pb-[100px] ${hideScroll}`}`}>
          {currentTab === 'onboarding' && (
            <Onboarding
              setProfile={setProfile}
              setInventory={setInventory}
              masterIngredients={masterIngredients}
              onComplete={() => setCurrentTab('home')}
            />
          )}

          {currentTab === 'home' && (
            <div className="flex flex-col gap-3 pt-1">
              <section className="rounded-[28px] bg-[#18CA87] px-5 py-4 text-white shadow-[0_8px_24px_rgba(24,202,135,0.35)] flex flex-col gap-3">
                <div>
                  <p className="text-[11px] font-medium text-white/80">오늘 구출해야 할 재료</p>
                  <h2 className="mt-0.5 text-[20px] font-bold tracking-[-0.03em]">
                    {profile.nickname}님의 냉장고 리포트
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <DashboardMiniCard title="보관 재료 수" value={`${inventory.length}개`} icon={IconBasket} />
                  <DashboardMiniCard title="마감 임박 재료 수" value={`${urgentItems.length}개`} icon={IconClock} />
                  <DashboardMiniCard title="소진 우선 재료 수" value={`${lowRatioItems.length}개`} icon={IconFlame} />
                  <DashboardMiniCard title="음식물 절약량" value={foodSavedGrams >= 1000 ? `${(foodSavedGrams/1000).toFixed(1)}kg` : `${foodSavedGrams}g`} icon={IconChefHat} />
                </div>
                <div className="rounded-[16px] bg-white p-3">
                  <div className="flex flex-col gap-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#8B95A1] shrink-0">최근 추가 재료</span>
                      <span className="text-right font-bold text-[#1A1F27] truncate">
                        {recentItems.length > 0 ? recentItems.map((item) => ingredientMap[item.ingredientId].name).join(', ') : '없음'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#8B95A1] shrink-0">알레르기 제외 상태</span>
                      <span className="text-right font-bold text-[#1A1F27] truncate">
                        {profile.allergies.length > 0 ? `${profile.allergies.join(', ')} 제외` : '설정 없음'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
              <section className="flex gap-2">
                <button onClick={() => setCurrentTab('fridge')} className="flex-1 flex items-center justify-between rounded-[20px] bg-white px-4 py-5 text-left shadow-[0_3px_14px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03]">
                  <div>
                    <p className="text-[13px] font-bold tracking-[-0.02em] text-[#1A1F27]">나의 냉장고</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-[#8B95A1]">재고 등록, 관리</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#E6F8ED] text-[#18CA87]">
                    <IconFridge className="w-5 h-5" />
                  </div>
                </button>
                <button onClick={() => setCurrentTab('recipe')} className="flex-1 flex items-center justify-between rounded-[20px] bg-white px-4 py-5 text-left shadow-[0_3px_14px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03]">
                  <div>
                    <p className="text-[13px] font-bold tracking-[-0.02em] text-[#1A1F27]">맞춤 레시피</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-[#8B95A1]">알레르기 필터</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#FEECEB] text-[#F04438]">
                    <IconRecipe className="w-5 h-5" />
                  </div>
                </button>
              </section>
              <section className="rounded-[20px] bg-white px-4 py-3 shadow-[0_3px_14px_rgba(0,0,0,0.08)] flex gap-3 items-start ring-1 ring-black/[0.03]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF9E6] text-[16px] leading-none">💡</div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#1A1F27]">{randomTip.ingredient} 보관 팁</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7684]">{randomTip.tip}</p>
                </div>
              </section>
            </div>
          )}

          {currentTab === 'fridge' && (
            <div className="flex flex-col flex-1 relative pt-1 gap-2">
              <section className="rounded-[24px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shrink-0 z-10 min-w-0">
                <div className="flex flex-col gap-3 min-w-0">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="식재료 검색"
                    className="w-full rounded-[14px] border-0 bg-[#f4f4f4] px-4 py-2.5 text-[13px] outline-none placeholder:text-[#8B95A1]"
                  />
                  <DraggableScrollContainer className="gap-2 pb-2 -mx-4 px-4">
                    {CATEGORY_LIST.map((category) => {
                      const active = categoryFilter === category;
                      return (
                        <button
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                          className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold outline-none focus:outline-none select-none transition-all ${
                            active 
                              ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20 border border-[#18CA87]' 
                              : 'bg-white text-[#6B7684] border border-[#E5E8EB]'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </DraggableScrollContainer>
                </div>
              </section>

              <div className="flex items-center justify-between px-1 pt-1 shrink-0">
              <span className="text-[12px] font-medium text-[#6B7684]">
                전체 {sortedInventory.length}건
              </span>
                <div className="relative">
                  <button onClick={() => setSortDropdownOpen(!sortDropdownOpen)} className="flex items-center gap-1 text-[12px] font-bold text-[#1A1F27] outline-none focus:outline-none">
                    {sortMode === 'expiry' ? '기간 임박순' : sortMode === 'remainingRatio' ? '남은 수량 순(%)' : '최근 등록 순'} ▾
                  </button>
                  {sortDropdownOpen && (
                    <div className="absolute right-0 top-6 z-30 w-32 rounded-[14px] bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.04]">
                      <SortDropdownItem label="기간 임박순" active={sortMode === 'expiry'} onClick={() => { setSortMode('expiry'); setSortDropdownOpen(false); }} />
                      <SortDropdownItem label="남은 수량 순(%)" active={sortMode === 'remainingRatio'} onClick={() => { setSortMode('remainingRatio'); setSortDropdownOpen(false); }} />
                      <SortDropdownItem label="최근 등록 순" active={sortMode === 'recent'} onClick={() => { setSortMode('recent'); setSortDropdownOpen(false); }} />
                    </div>
                  )}
                </div>
              </div>

              <section className={`flex-1 overflow-y-auto pb-4 ${hideScroll}`}>
                {sortedInventory.map((item) => {
                  const master = ingredientMap[item.ingredientId];
                  const daysLeft = calculateDaysLeft(item.expiryDate);
                  
                  let dDayLabel = '';
                  let dDayColor = '';
                  
                  if (daysLeft >= 7) {
                    dDayLabel = `${daysLeft}일 남음`;
                    dDayColor = 'bg-[#f4f4f4] text-[#6B7684]'; 
                  } else if (daysLeft >= 3) {
                    dDayLabel = `${daysLeft}일 남음`;
                    dDayColor = 'bg-[#FFF9E6] text-[#D49B00]'; 
                  } else if (daysLeft > 0) {
                    dDayLabel = `${daysLeft}일 남음`;
                    dDayColor = 'bg-[#FFF0E6] text-[#FF8A00]'; 
                  } else if (daysLeft === 0) {
                    dDayLabel = '오늘 만료';
                    dDayColor = 'bg-[#FFF0E6] text-[#FF8A00]'; 
                  } else {
                    dDayLabel = `${Math.abs(daysLeft)}일 지남`;
                    dDayColor = 'bg-[#FEECEB] text-[#F04438]'; 
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedInventoryId(item.id); setIsInventoryDetailOpen(true); }}
                      className="w-full rounded-[24px] bg-white p-4 text-left outline-none focus:outline-none shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-[32px] leading-none mt-0.5 shrink-0">
                          {master.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-[16px] font-bold text-[#1A1F27]">{master.name}</h3>
                            </div>
                            <div className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${dDayColor}`}>
                              {dDayLabel}
                            </div>
                          </div>
                          <p className="mt-1 text-[13px] text-[#6B7684]">
                            {item.storageType} · {item.quantity}{item.unit ?? master.unit} ({formatRatioPercent(item)}%) · {master.category}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 flex justify-between border-t border-[#F2F4F8] text-[11px] text-[#8B95A1] font-medium">
                        <span>소비기한 {formatDateLabel(item.expiryDate)}</span>
                        <span>등록일 {formatDateLabel(item.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
                {sortedInventory.length === 0 && (
                  <div className="rounded-[20px] bg-white px-5 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    {inventory.length === 0 ? (
                      <>
                        <div className="text-[40px] mb-3">🧊</div>
                        <p className="text-[14px] font-bold text-[#1A1F27]">냉장고가 비어있어요</p>
                        <p className="mt-1 text-[12px] text-[#8B95A1]">식재료를 등록하면 맞춤 레시피를 추천받을 수 있어요.</p>
                        <button onClick={() => setIsAddSheetOpen(true)} className="mt-4 rounded-[16px] bg-[#18CA87] px-6 py-3 text-[13px] font-bold text-white shadow-md shadow-[#18CA87]/30 outline-none focus:outline-none">
                          🥬 식재료 등록하기
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-[40px] mb-3">🔍</div>
                        <p className="text-[14px] font-bold text-[#1A1F27]">조건에 맞는 식재료가 없어요</p>
                        <p className="mt-1 text-[12px] text-[#8B95A1]">검색어나 카테고리 필터를 변경해보세요.</p>
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* --- 레시피 탭 --- */}
          {currentTab === 'recipe' && (
            <div className="flex h-full flex-col px-5 pt-4">
              {/* 탭바만 — 타이틀 제거 */}
              <div className="mb-4 shrink-0 flex rounded-[16px] bg-[#f4f4f4] p-1">
                <button
                  onClick={() => setRecipeRecommendTab('ai')}
                  className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-bold transition-all outline-none focus:outline-none ${recipeRecommendTab === 'ai' ? 'bg-white text-[#1A1F27] shadow-sm' : 'text-[#8B95A1]'}`}
                >
                  AI 추천
                </button>
                <button
                  onClick={() => setRecipeRecommendTab('selected')}
                  className={`flex-1 rounded-[12px] py-2.5 text-[13px] font-bold transition-all outline-none focus:outline-none ${recipeRecommendTab === 'selected' ? 'bg-white text-[#1A1F27] shadow-sm' : 'text-[#8B95A1]'}`}
                >
                  재료 선택
                </button>
              </div>
              <section className={`flex-1 overflow-y-auto space-y-3 pb-4 ${hideScroll}`}>
                {recipeRecommendTab === 'ai' ? (
                  <>
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[12px] text-[#6B7684]">냉장고 재고 기반 AI 추천 결과예요.</p>
                      <button onClick={fetchAiRecommendations} className="rounded-full bg-[#18CA87] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-[#18CA87]/20">
                        {aiLoading ? '불러오는 중...' : '다시 추천'}
                      </button>
                    </div>

                    {!aiLoading && !aiError && (
                      <>
                        {/* 분기 1: 등록된 식재료가 아예 없는 경우 */}
                        {inventory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center rounded-[32px] bg-white px-6 py-12 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            <div className="text-5xl mb-5">🛒</div>
                            <h3 className="text-[17px] font-bold text-[#1A1F27]">냉장고가 비어있어요</h3>
                            <p className="mt-2 text-[13px] leading-6 text-[#8B95A1]">식재료를 먼저 등록해보세요!<br />딱 맞는 맞춤 레시피를 찾아드릴게요.</p>
                            <button onClick={() => setCurrentTab('fridge')} className="mt-6 rounded-full bg-[#18CA87] px-8 py-3.5 text-[14px] font-bold text-white">식재료 등록하러 가기</button>
                          </div>
                        ) : sortedAiRecommendations.length === 0 ? (
                          /* 분기 2: 적합한 레시피를 찾지 못한 경우 */
                          <div className="flex flex-col items-center justify-center rounded-[32px] bg-white px-6 py-12 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            <div className="text-5xl mb-5">😥</div>
                            <h3 className="text-[17px] font-bold text-[#1A1F27]">맞춤 레시피를 찾지 못했어요</h3>
                            <p className="mt-2 text-[13px] text-[#8B95A1]">추천드릴 만한 레시피가 없어요. :(</p>
                          </div>
                        ) : (
                          /* 추천 카드 리스트 */
                          sortedAiRecommendations.map((recipe) => (
                            <button key={recipe.recipe_id} onClick={() => handleRecipeCardClick(recipe.title, recipe)} className="w-full overflow-hidden rounded-[24px] bg-white text-left outline-none focus:outline-none shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform">
                              <div className="bg-[#18CA87] px-5 py-5 text-white">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">{recipe.mood || 'AI 추천'}</span>
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#1A1F27]">점수 {(recipe.pred_score * 100).toFixed(0)}</span>
                                </div>
                                <h3 className="mt-3.5 text-[20px] font-bold tracking-[-0.03em]">{recipe.title}</h3>
                              </div>
                              <div className="p-5 grid grid-cols-2 gap-2">
                                <DashboardMetric label="메인재료 매치" value={`${(recipe.main_match_ratio * 100).toFixed(0)}%`} />
                                <DashboardMetric label="필수재료 매치" value={`${(recipe.required_match_ratio * 100).toFixed(0)}%`} />
                              </div>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </>
                ) : (
                  /* ── 재료 선택 추천 탭 ── */
                  <SelectedRecipeTab
                    inventory={inventory}
                    ingredientMap={ingredientMap}
                    priorityIngredientIds={priorityIngredientIds}
                    setPriorityIngredientIds={setPriorityIngredientIds}
                    selectedRecommendations={selectedRecommendations}
                    selectedLoading={selectedLoading}
                    selectedError={selectedError}
                    fetchSelectedRecommendations={fetchSelectedRecommendations}
                    onRecipeClick={handleRecipeCardClick}
                    onGoFridge={() => setCurrentTab('fridge')}
                  />
                )}
              </section>
            </div>
          )}

          {currentTab === 'recipe_detail' && selectedAiRecipe && (
            <RecipeDetailPage
              recipeDetail={recipeDetail}
              recipeDetailLoading={recipeDetailLoading}
              aiRecipe={selectedAiRecipe}
              inventory={inventory}
              setInventory={setInventory}
              ingredientMap={ingredientMap}
              onBack={() => { setCurrentTab('recipe'); setRecipeDetail(null); setSelectedAiRecipe(null); }}
            />
          )}

          {currentTab === 'profile' && <ProfileView profile={profile} setProfile={setProfile} />}
        </main>
        {/* --- 메인 끝 --- */}

        {currentTab === 'fridge' && (
          <button
            onClick={() => setIsAddSheetOpen(true)}
            className="absolute bottom-28 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#18CA87] text-3xl text-white shadow-[0_8px_20px_rgba(24,202,135,0.3)]"
          >
            +
          </button>
        )}

        {currentTab !== 'onboarding' && currentTab !== 'recipe_detail' && (
          <nav className="absolute bottom-0 left-0 right-0 z-50 rounded-b-[34px] bg-white px-6 pb-6 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <NavItem icon={IconHome} label="홈" active={currentTab === 'home'} onClick={() => setCurrentTab('home')} />
              <NavItem icon={IconFridge} label="냉장고" active={currentTab === 'fridge'} onClick={() => setCurrentTab('fridge')} />
              <NavItem icon={IconRecipe} label="레시피" active={currentTab === 'recipe'} onClick={() => setCurrentTab('recipe')} />
              <NavItem icon={IconProfile} label="프로필" active={currentTab === 'profile'} onClick={() => setCurrentTab('profile')} />
            </div>
          </nav>
        )}

        {isAddSheetOpen && <AddIngredientSheet masterIngredients={masterIngredients} onClose={() => setIsAddSheetOpen(false)} onAdd={(item) => { setInventory((prev) => [item, ...prev]); setIsAddSheetOpen(false); }} />}
        {isInventoryDetailOpen && selectedInventory && <InventoryDetailModal item={selectedInventory} ingredientMap={ingredientMap} onClose={() => setIsInventoryDetailOpen(false)} onSave={handleSaveInventory} />}
        {isNotiOpen && <NotificationModal notifications={notifications} onClose={() => setIsNotiOpen(false)} onMarkRead={handleMarkNotiRead} />}
      </div>
    </div>
  );
}

function DashboardMiniCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-[20px] bg-white p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col gap-2.5">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-bold text-[#8B95A1] leading-snug break-keep pr-1">{title}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F8ED] text-[#18CA87]">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-[18px] font-bold tracking-[-0.03em] text-[#1A1F27]">{value}</p>
    </div>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#f4f4f4] p-3">
      <p className="text-[11px] font-bold text-[#8B95A1]">{label}</p>
      <p className="mt-1 text-[16px] font-bold text-[#1A1F27]">{value}</p>
    </div>
  );
}

function SortDropdownItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[10px] px-3 py-2 text-left text-[12px] font-bold outline-none focus:outline-none ${active ? 'bg-[#18CA87] text-white' : 'text-[#1A1F27]'}`}
    >
      {label}
    </button>
  );
}

function SimpleUnitSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-[16px] bg-[#f4f4f4] px-4 py-2.5 text-[13px] font-semibold text-[#1A1F27] outline-none focus:outline-none"
      >
        <span>{value || '단위 선택'}</span>
        <span>▾</span>
      </button>
      {open && (
        <div className={`absolute left-0 right-0 top-12 z-30 rounded-[16px] bg-white p-2 shadow-lg ring-1 ring-black/[0.06] max-h-40 overflow-y-auto ${hideScroll}`}>
          {UNIT_OPTIONS.map((unit) => (
            <button
              key={unit}
              onClick={() => { onChange(unit); setOpen(false); }}
              className={`w-full rounded-[10px] px-3 py-2 text-left text-[12px] font-semibold outline-none focus:outline-none ${value === unit ? 'bg-[#18CA87] text-white' : 'text-[#1A1F27]'}`}
            >
              {unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddIngredientSheet({ masterIngredients, onClose, onAdd }: { masterIngredients: any[]; onClose: () => void; onAdd: (item: InventoryItem) => void }) {
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [storageType, setStorageType] = useState<StorageType>('냉장');
  const [expiryDate, setExpiryDate] = useState('');

  const filteredIngredients = (masterIngredients || []).filter((item) => item.name.includes(ingredientQuery));

  const handleSelectIngredient = (ingredient: any) => {
    setSelectedIngredient(ingredient);
    setQuantity(ingredient.unit === 'g' || ingredient.unit === 'ml' ? 300 : 1);
    setUnit(ingredient.unit);
    setStorageType('냉장');
    setExpiryDate(getDefaultExpiry(ingredient.expiryDay, '냉장'));
  };

  const handleAdd = () => {
    if (!selectedIngredient) return;
    const newItem: InventoryItem = {
      id: `inv_${Date.now()}`,
      ingredientId: selectedIngredient.id,
      quantity,
      initialQuantity: quantity,
      expiryDate,
      storageType,
      status: getStatus(expiryDate),
      createdAt: new Date().toISOString(),
      unit,
    };
    onAdd(newItem);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px]">
      <div className="flex max-h-[86%] w-full flex-col overflow-hidden rounded-t-[34px] bg-white px-5 pt-4 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E5E8EB]" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#8B95A1]">ADD INGREDIENT</p>
            <h3 className="mt-1 text-[20px] font-bold tracking-[-0.04em] text-[#1A1F27]">식재료 등록</h3>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1A1F27] shadow-sm outline-none focus:outline-none">✕</button>
        </div>

        <div className={`mt-4 flex-1 overflow-y-auto space-y-4 pr-1 ${hideScroll}`}>
          <section className="rounded-[20px] bg-white p-4 ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <p className="text-[12px] font-bold text-[#1A1F27]">식재료 선택</p>
            <input
              value={ingredientQuery}
              onChange={(e) => setIngredientQuery(e.target.value)}
              placeholder="돼지고기, 양파 등 검색"
              className="mt-2 w-full rounded-[14px] bg-[#f4f4f4] px-4 py-2.5 text-[13px] outline-none placeholder:text-[#8B95A1]"
            />
            {/* ⭐️ 여기에 백엔드에서 매핑된 재료 목록이 렌더링 됩니다! */}
            <div className={`mt-2 max-h-40 overflow-y-auto space-y-1.5 ${hideScroll}`}>
              {filteredIngredients.map((item) => {
                const active = selectedIngredient?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectIngredient(item)}
                    className={`w-full rounded-[14px] px-3 py-2.5 text-left ring-1 transition-colors outline-none focus:outline-none ${active ? 'bg-[#18CA87] text-white ring-[#18CA87]' : 'bg-white text-[#1A1F27] ring-[#f4f4f4] hover:bg-[#f4f4f4]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{item.emoji}</span>
                      <div>
                        <p className="text-[13px] font-bold">{item.name}</p>
                        <p className={`text-[11px] ${active ? 'text-white/80' : 'text-[#8B95A1]'}`}>{item.category} · 기본 {item.unit}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedIngredient && (
            <section className="rounded-[20px] bg-white p-4 ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E6F8ED] text-2xl">{selectedIngredient.emoji}</div>
                <div>
                  <p className="text-[16px] font-bold text-[#1A1F27]">{selectedIngredient.name}</p>
                  <p className="text-[11px] text-[#6B7684]">{selectedIngredient.category}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold text-[#1A1F27]">수량</span>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full rounded-[16px] bg-[#f4f4f4] px-4 py-2.5 text-[13px] outline-none" />
                </label>
                <div>
                  <span className="mb-2 block text-[12px] font-bold text-[#1A1F27]">단위</span>
                  <SimpleUnitSelect value={unit} onChange={setUnit} />
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-2 block text-[12px] font-bold text-[#1A1F27]">보관 장소</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['냉장', '냉동', '실온'] as StorageType[]).map((storage) => {
                    const active = storageType === storage;
                    return (
                      <button
                        key={storage}
                        onClick={() => { setStorageType(storage); setExpiryDate(getDefaultExpiry(selectedIngredient.expiryDay, storage)); }}
                        className={`rounded-[14px] px-3 py-2.5 text-[12px] font-bold transition-colors outline-none focus:outline-none ${active ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'}`}
                      >
                        {storage}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-2 block text-[12px] font-bold text-[#1A1F27]">소비기한</span>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full rounded-[16px] bg-[#f4f4f4] px-4 py-2.5 text-[13px] outline-none" />
              </div>

              <button onClick={handleAdd} className="mt-5 w-full rounded-[18px] bg-[#18CA87] px-4 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-[#18CA87]/30 outline-none focus:outline-none transition-transform active:scale-[0.98]">
                식재료 등록하기
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ profile, setProfile }: { profile: UserProfile; setProfile: React.Dispatch<React.SetStateAction<UserProfile>> }) {
  const toggleAllergy = (allergy: Allergy) => {
    setProfile((prev) => ({ ...prev, allergies: prev.allergies.includes(allergy) ? prev.allergies.filter((a) => a !== allergy) : [...prev.allergies, allergy] }));
  };

  return (
    <div className="space-y-4 pt-1 pb-6">
      <section className="rounded-[28px] bg-[#18CA87] p-5 text-white shadow-[0_4px_20px_rgba(24,202,135,0.2)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-[32px] text-[#1A1F27] shadow-inner">{profile.avatar.emoji}</div>
          <div>
            <p className="text-[11px] font-medium text-white/80">my profile</p>
            <h2 className="mt-1 text-[22px] font-bold tracking-[-0.03em]">{profile.nickname}</h2>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
        <div>
          <label className="text-[13px] font-bold text-[#1A1F27]">프로필 이미지</label>
          <div className="mt-2 flex items-center gap-3 rounded-[20px] bg-[#f4f4f4] p-4">
            <button onClick={() => setProfile((prev) => ({ ...prev, avatar: getNextAvatar(prev.avatar.id, 'prev') }))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1A1F27] outline-none focus:outline-none shadow-sm">‹</button>
            <div className="flex flex-1 items-center justify-center py-2 text-[54px] leading-none">{profile.avatar.emoji}</div>
            <button onClick={() => setProfile((prev) => ({ ...prev, avatar: getNextAvatar(prev.avatar.id, 'next') }))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1A1F27] outline-none focus:outline-none shadow-sm">›</button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-bold text-[#1A1F27]">닉네임 수정</label>
            <button onClick={() => setProfile((prev) => ({ ...prev, ...createRandomProfileData() }))} className="rounded-full bg-[#18CA87] px-3 py-1.5 text-[11px] font-bold text-white outline-none focus:outline-none shadow-sm shadow-[#18CA87]/20">랜덤</button>
          </div>
          <input maxLength={15} value={profile.nickname} onChange={(e) => setProfile((prev) => ({ ...prev, nickname: e.target.value }))} className="mt-2 w-full rounded-[16px] border-0 bg-[#f4f4f4] px-4 py-3 text-[14px] outline-none placeholder:text-[#8B95A1]" />
        </div>

        <div>
          <label className="text-[13px] font-bold text-[#1A1F27]">가구원 수 수정</label>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {HOUSEHOLD_CHIPS.map((num) => {
              const label = num < 5 ? `${num}인` : '5+인';
              const selected = (num < 5 && profile.householdSize === num) || (num === 5 && profile.householdSize >= 5);
              return (
                <button key={num} onClick={() => setProfile((prev) => ({ ...prev, householdSize: num }))} className={`rounded-[14px] px-1 py-2.5 text-[13px] font-bold outline-none focus:outline-none transition-colors ${selected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'}`}>{label}</button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[13px] font-bold text-[#1A1F27]">알레르기 필터</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALLERGY_LIST.map((allergy) => {
              const selected = profile.allergies.includes(allergy);
              return (
                <button key={allergy} onClick={() => toggleAllergy(allergy)} className={`rounded-full px-4 py-2 text-[13px] font-bold outline-none focus:outline-none transition-colors ${selected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'}`}>{allergy}</button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function InventoryDetailModal({ item, ingredientMap, onClose, onSave }: { item: InventoryItem; ingredientMap: Record<string, any>; onClose: () => void; onSave: (item: InventoryItem) => void }) {
  const [draft, setDraft] = useState(item);
  const master = ingredientMap[item.ingredientId] ?? { id: item.ingredientId, name: '로딩중...', category: '전체', emoji: '⏳', unit: 'g', expiryDay: 7 };

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px]">
      <div className={`max-h-[84%] w-full overflow-y-auto rounded-t-[34px] bg-white px-5 pt-4 pb-8 shadow-2xl ${hideScroll}`}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E5E8EB]" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E6F8ED] text-2xl">{master.emoji}</div>
            <div>
              <h3 className="text-[20px] font-bold tracking-[-0.04em] text-[#1A1F27]">{master.name}</h3>
              <p className="text-[12px] text-[#6B7684]">재고 상세 수정</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1A1F27] outline-none focus:outline-none shadow-sm">✕</button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-[13px] font-bold text-[#1A1F27]">수량</span>
              <input type="number" value={draft.quantity} onChange={(e) => setDraft((prev) => ({ ...prev, quantity: Number(e.target.value) }))} className="w-full rounded-[16px] border-0 bg-white px-4 py-3 outline-none ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-bold text-[#1A1F27]">단위</span>
              <SimpleUnitSelect value={draft.unit ?? master.unit} onChange={(value) => setDraft((prev) => ({ ...prev, unit: value }))} />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-[13px] font-bold text-[#1A1F27]">보관 장소</span>
            <div className="grid grid-cols-3 gap-2">
              {(['냉장', '냉동', '실온'] as StorageType[]).map((storage) => {
                const selected = draft.storageType === storage;
                return (
                  <button
                    key={storage}
                    onClick={() => {
                      const nextExpiry = getDefaultExpiry(master.expiryDay, storage);
                      setDraft((prev) => ({ ...prev, storageType: storage, expiryDate: nextExpiry, status: getStatus(nextExpiry) }));
                    }}
                    className={`rounded-[16px] px-3 py-3 text-[13px] font-bold outline-none focus:outline-none transition-colors ${selected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-white text-[#6B7684] ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]'}`}
                  >
                    {storage}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-[13px] font-bold text-[#1A1F27]">소비기한</span>
            <input type="date" value={draft.expiryDate} onChange={(e) => setDraft((prev) => ({ ...prev, expiryDate: e.target.value, status: getStatus(e.target.value) }))} className="w-full rounded-[16px] border-0 bg-white px-4 py-3 outline-none ring-1 ring-[#f4f4f4] shadow-[0_2px_10px_rgba(0,0,0,0.02)]" />
          </label>

          <button onClick={() => onSave(draft)} className="mt-2 w-full rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-lg outline-none focus:outline-none shadow-[#18CA87]/30 transition-transform active:scale-[0.98]">수정 저장</button>
        </div>
      </div>
    </div>
  );
}

function RecipeDetailPage({
  recipeDetail,
  recipeDetailLoading,
  aiRecipe,
  inventory,
  setInventory,
  ingredientMap,
  onBack,
}: {
  recipeDetail: any;
  recipeDetailLoading: boolean;
  aiRecipe: AIRecipeRecommendation;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  ingredientMap: Record<string, any>;
  onBack: () => void;
}) {
  const [showCookPopup, setShowCookPopup] = useState(false);
  const [cookRating, setCookRating] = useState(0);
  const [cookedIngredients, setCookedIngredients] = useState<{name: string; qty: number; emoji: string}[]>([]);

  // 보유 재료 이름 목록
  const ownedNames = new Set([...(aiRecipe.owned_main ?? []), ...(aiRecipe.owned_sub ?? [])]);

  const handleCook = () => {
    // deducted 계산을 setInventory 콜백 밖에서 수행 (React strict mode 두 번 실행 방지)
    const snapshot = inventory; // 현재 inventory 스냅샷
    const deducted: {name: string; qty: number; emoji: string}[] = [];
    snapshot.forEach((inv) => {
      const master = ingredientMap[inv.ingredientId];
      const name = master?.name ?? '';
      if (name && ownedNames.has(name)) {
        deducted.push({ name, qty: 1, emoji: master?.emoji ?? '🥘' });
      }
    });
    if (ownedNames.size > 0) {
      setInventory((prev) =>
        prev
          .map((inv) => {
            const master = ingredientMap[inv.ingredientId];
            const name = master?.name ?? '';
            if (name && ownedNames.has(name)) {
              return { ...inv, quantity: Math.max(0, inv.quantity - 1) };
            }
            return inv;
          })
          .filter((inv) => inv.quantity > 0)
      );
    }
    setCookedIngredients(deducted);
    setShowCookPopup(true);
  };

  const handlePopupClose = () => {
    setShowCookPopup(false);
    onBack();
  };

  return (
    <div className={`flex h-full flex-col bg-[#f4f4f4]`}>
      {/* ── 뒤로가기 헤더 — 항상 고정 ── */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-6 pb-3 bg-[#f4f4f4]/80 backdrop-blur-md z-20">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-[#1A1F27] outline-none focus:outline-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h2 className="text-[18px] font-bold tracking-[-0.03em] text-[#1A1F27] truncate flex-1">
          {recipeDetail?.title || aiRecipe.title}
        </h2>
      </div>

      {/* ── 스크롤 컨텐츠 영역 ── */}
      <div className={`flex-1 overflow-y-auto ${hideScroll}`}>
        <div className="space-y-3 px-5 pb-8">
          {/* 대표 이미지 — 텍스트 오버레이 없음 */}
          {recipeDetail?.image ? (
            <div className="relative w-full overflow-hidden rounded-[24px]" style={{ height: 220 }}>
              <img src={recipeDetail.image} alt={recipeDetail?.title || aiRecipe.title} className="h-full w-full object-cover" />
            </div>
          ) : null}

        {/* 메타 정보 */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '난이도', value: aiRecipe.level || '-' },
            { label: '조리시간', value: `${aiRecipe.timeMin ?? '-'}분` },
            { label: '종류', value: recipeDetail?.category || '-' },
            { label: '열량', value: recipeDetail?.calorie ? `${recipeDetail.calorie}kcal` : '-' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[16px] bg-white p-3 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <p className="text-[10px] font-bold text-[#8B95A1]">{label}</p>
              <p className="mt-1 text-[12px] font-bold text-[#1A1F27] leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* 냉장고 재료 매칭 */}
        <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-[#1A1F27]">냉장고 재료 매칭</p>
            <span className="rounded-full bg-[#E6F8ED] px-2.5 py-1 text-[11px] font-bold text-[#00A36F]">{aiRecipe.match_rate_pct ?? 0}% 보유</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(aiRecipe.owned_main ?? []).map((n: string) => <span key={`om-${n}`} className="rounded-full bg-[#E6F8ED] px-2.5 py-1 text-[11px] font-bold text-[#00A36F]">✓ {n}</span>)}
            {(aiRecipe.missing_main_names ?? []).map((n: string) => <span key={`mm-${n}`} className="rounded-full bg-[#FEECEB] px-2.5 py-1 text-[11px] font-bold text-[#F04438]">✕ {n}</span>)}
            {(aiRecipe.owned_sub ?? []).map((n: string) => <span key={`os-${n}`} className="rounded-full bg-[#E6F8ED] px-2.5 py-1 text-[11px] font-bold text-[#00A36F] opacity-70">✓ {n}</span>)}
            {(aiRecipe.missing_sub_names ?? []).map((n: string) => <span key={`ms-${n}`} className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-[11px] font-bold text-[#8B95A1] border border-[#E5E8EB]">✕ {n}</span>)}
          </div>
        </div>

        {/* 전체 재료 */}
        {recipeDetail?.ingredients && (
          <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <p className="text-[13px] font-bold text-[#1A1F27] mb-2">전체 재료</p>
            <p className="text-[12px] leading-relaxed text-[#6B7684] whitespace-pre-wrap">{recipeDetail.ingredients}</p>
          </div>
        )}

        {/* 로딩 */}
        {recipeDetailLoading && (
          <div className="rounded-[20px] bg-white px-5 py-10 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <p className="text-[13px] text-[#8B95A1]">조리 순서 불러오는 중...</p>
          </div>
        )}

        {/* 조리 순서 */}
        {!recipeDetailLoading && recipeDetail?.steps && recipeDetail.steps.length > 0 && (
          <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <p className="text-[13px] font-bold text-[#1A1F27] mb-3">조리 순서</p>
            <ol className="space-y-5">
              {recipeDetail.steps.map((step: { order: number; desc: string; image: string }) => (
                <li key={step.order} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#18CA87] text-[11px] font-bold text-white shadow-sm">{step.order}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-6 text-[#6B7684]">{step.desc}</p>
                    {step.image && (
                      <img src={step.image} alt={`step-${step.order}`} className="mt-2 w-full rounded-[16px] object-cover" style={{ maxHeight: 200 }} />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 공공데이터 없음 */}
        {!recipeDetailLoading && recipeDetail?.notFound && (
          <div className="rounded-[20px] bg-white px-5 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="text-[36px] mb-3">📭</div>
            <p className="text-[13px] font-bold text-[#1A1F27]">공공데이터에 등록되지 않은 레시피예요</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#8B95A1]">
              재료 매칭 정보를 참고해 직접 요리해보세요!
            </p>
          </div>
        )}

          {/* 조리 순서 없음 */}
          {!recipeDetailLoading && !recipeDetail?.notFound && recipeDetail?.steps?.length === 0 && (
            <div className="rounded-[20px] bg-white px-5 py-6 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <p className="text-[13px] text-[#8B95A1]">조리 순서 정보가 없어요.</p>
            </div>
          )}
        </div>

        {/* ── 플로팅 버튼 ── */}
        <div className="sticky bottom-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#f4f4f4] via-[#f4f4f4] to-transparent">
          <button
            onClick={handleCook}
            className="w-full rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] outline-none focus:outline-none active:scale-[0.98] transition-transform"
          >
            🍳 요리 완료 · 재료 차감
          </button>
        </div>
      </div>

      {/* ── 요리 완료 팝업 ── */}
      {showCookPopup && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="w-full rounded-t-[34px] bg-white px-6 pb-10 pt-6 shadow-2xl">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#E5E8EB]" />
            <div className="text-center mb-5">
              <div className="text-[48px] mb-2">🎉</div>
              <h3 className="text-[20px] font-bold tracking-[-0.03em] text-[#1A1F27]">요리 완료!</h3>
              <p className="mt-1 text-[13px] text-[#6B7684]">냉장고 재료를 맛있게 사용했어요</p>
            </div>
            {cookedIngredients.length > 0 ? (
              <div className="rounded-[20px] bg-[#f4f4f4] p-4 mb-5 space-y-2.5">
                {cookedIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[22px]">{ing.emoji}</span>
                      <span className="text-[14px] font-bold text-[#1A1F27]">{ing.name}</span>
                    </div>
                    <span className="rounded-full bg-[#E6F8ED] px-3 py-1 text-[12px] font-bold text-[#00A36F]">
                      {ing.qty}개 구출 성공! 🌿
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] bg-[#f4f4f4] p-4 mb-5 text-center">
                <p className="text-[13px] text-[#8B95A1]">차감할 냉장고 재료가 없었어요</p>
              </div>
            )}
            <div className="text-center mb-6">
              <p className="text-[13px] font-bold text-[#1A1F27] mb-3">이 레시피는 어땠나요?</p>
              <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setCookRating(star)}
                    className="text-[36px] outline-none focus:outline-none transition-transform active:scale-90"
                    style={{ filter: star <= cookRating ? 'none' : 'grayscale(1) opacity(0.35)' }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              {cookRating > 0 && (
                <p className="mt-2 text-[12px] font-semibold text-[#18CA87]">
                  {cookRating === 5 ? '최고예요! 👏' : cookRating >= 4 ? '맛있었어요 😊' : cookRating >= 3 ? '괜찮았어요 🙂' : '아쉬웠어요 😅'}
                </p>
              )}
            </div>
            <button
              onClick={handlePopupClose}
              className="w-full rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] outline-none focus:outline-none active:scale-[0.98] transition-transform"
            >
              냉장고로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationModal({ notifications, onClose, onMarkRead }: { notifications: AppNotification[]; onClose: () => void; onMarkRead: (id: string) => void }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#f4f4f4]">
      <header className="flex items-center justify-between px-5 py-4 bg-white shadow-sm shrink-0">
        <h2 className="text-[20px] font-bold text-[#1A1F27]">알림 센터</h2>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f4f4] text-[#1A1F27] shadow-sm outline-none focus:outline-none">✕</button>
      </header>
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${hideScroll}`}>
        {notifications.length === 0 && (
          <p className="text-center text-[14px] text-[#8B95A1] py-10">새로운 알림이 없습니다.</p>
        )}
        {notifications.map((noti) => (
          <div key={noti.id} className={`flex items-start justify-between gap-3 rounded-[24px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${noti.isRead ? 'bg-[#f4f4f4] opacity-60' : 'bg-white'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${noti.type === 'EXPIRY' ? 'bg-[#FEECEB] text-[#F04438]' : noti.type === 'RECIPE' ? 'bg-[#E6F8ED] text-[#18CA87]' : 'bg-[#f4f4f4] text-[#6B7684]'}`}>
                  {noti.type}
                </span>
                <span className="text-[11px] text-[#8B95A1]">{formatDateLabel(noti.date)}</span>
              </div>
              <h4 className="mt-2 text-[15px] font-bold text-[#1A1F27]">{noti.title}</h4>
              <p className="mt-1 text-[13px] leading-5 text-[#6B7684]">{noti.content}</p>
            </div>
            {!noti.isRead && (
              <button
                onClick={() => onMarkRead(noti.id)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#18CA87] text-white shadow-md outline-none focus:outline-none shadow-[#18CA87]/20"
              >
                ✔️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 선택 재료 추천 탭 컴포넌트
// - 전체 칩 (OR) / 개별 칩 다중선택 (AND)
// - 무한 스크롤 (4개씩)
// - 이미지 카드 UI
const SELECTED_PAGE_SIZE = 4;

function SelectedRecipeTab({
  inventory, ingredientMap, priorityIngredientIds, setPriorityIngredientIds,
  selectedRecommendations, selectedLoading, selectedError,
  fetchSelectedRecommendations, onRecipeClick, onGoFridge,
}: {
  inventory: InventoryItem[];
  ingredientMap: Record<string, any>;
  priorityIngredientIds: string[];
  setPriorityIngredientIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedRecommendations: AIRecipeRecommendation[];
  selectedLoading: boolean;
  selectedError: string;
  fetchSelectedRecommendations: (ids: string[], mode: 'or' | 'and') => void;
  onRecipeClick: (title: string, recipe: AIRecipeRecommendation) => void;
  onGoFridge: () => void;
}) {
  const [visibleCount, setVisibleCount] = React.useState(SELECTED_PAGE_SIZE);
  const loaderRef = React.useRef<HTMLDivElement>(null);
  const isAllSelected = priorityIngredientIds.length === 0;

  // 선택 조건 변경 시 페이지 초기화
  React.useEffect(() => { setVisibleCount(SELECTED_PAGE_SIZE); }, [selectedRecommendations]);

  // 무한 스크롤 IntersectionObserver
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < selectedRecommendations.length) {
          setVisibleCount((prev) => Math.min(prev + SELECTED_PAGE_SIZE, selectedRecommendations.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, selectedRecommendations.length]);

  const handleChipClick = (ingredientId: string) => {
    const next = priorityIngredientIds.includes(ingredientId)
      ? priorityIngredientIds.filter((id) => id !== ingredientId)
      : [...priorityIngredientIds, ingredientId];
    setPriorityIngredientIds(next);
    fetchSelectedRecommendations(next, next.length > 0 ? 'and' : 'or');
  };

  const handleAllClick = () => {
    setPriorityIngredientIds([]);
    fetchSelectedRecommendations([], 'or');
  };

  const visibleRecipes = selectedRecommendations.slice(0, visibleCount);

  return (
    <>
      {/* 안내 + 다시 추천 */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[12px] text-[#6B7684]">
          {isAllSelected ? '전체 재료 OR 조건으로 추천해요.' : `${priorityIngredientIds.length}개 선택 · AND 조건 추천`}
        </p>
        <button
          onClick={() => fetchSelectedRecommendations(priorityIngredientIds, isAllSelected ? 'or' : 'and')}
          className="rounded-full bg-[#18CA87] px-3 py-1.5 text-[11px] font-bold text-white outline-none focus:outline-none shadow-sm shadow-[#18CA87]/20"
        >
          {selectedLoading ? '추천 중...' : '다시 추천'}
        </button>
      </div>

      {/* 재료 칩 선택 */}
      {inventory.length === 0 ? (
        <div className="rounded-[24px] bg-white px-5 py-10 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[40px] mb-3">🧊</div>
          <p className="text-[14px] font-bold text-[#1A1F27]">냉장고가 비어있어요</p>
          <p className="mt-1 text-[12px] text-[#8B95A1]">식재료를 먼저 등록하면 추천받을 수 있어요.</p>
          <button onClick={onGoFridge} className="mt-4 rounded-full bg-[#18CA87] px-6 py-3 text-[13px] font-bold text-white outline-none focus:outline-none">
            🥬 냉장고에 재료 등록하기
          </button>
        </div>
      ) : (
        <div className="rounded-[24px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-[#1A1F27]">냉장고 재료 선택</p>
            {!isAllSelected && (
              <button onClick={handleAllClick} className="text-[11px] font-semibold text-[#8B95A1] outline-none focus:outline-none">
                전체 해제
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 전체 칩 (OR 조건) */}
            <button
              onClick={handleAllClick}
              className={`flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-bold outline-none focus:outline-none transition-all active:scale-95 ${
                isAllSelected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'
              }`}
            >
              전체
            </button>
            {/* 개별 재료 칩 (AND 조건) */}
            {inventory.map((item) => {
              const master = ingredientMap[item.ingredientId];
              const isSelected = priorityIngredientIds.includes(item.ingredientId);
              return (
                <button
                  key={item.id}
                  onClick={() => handleChipClick(item.ingredientId)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold outline-none focus:outline-none transition-all active:scale-95 ${
                    isSelected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#1A1F27]'
                  }`}
                >
                  <span className="text-[14px] leading-none">{master.emoji}</span>
                  <span>{master.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 에러 */}
      {selectedError && (
        <div className="rounded-[20px] bg-white px-4 py-6 text-center text-[13px] text-[#F04438] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">{selectedError}</div>
      )}

      {/* 로딩 스켈레톤 */}
      {selectedLoading && (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="overflow-hidden rounded-[24px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] animate-pulse">
              <div className="h-[140px] bg-[#f4f4f4]" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 rounded-full bg-[#f4f4f4]" />
                <div className="h-3 w-1/2 rounded-full bg-[#f4f4f4]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {!selectedLoading && !isAllSelected && selectedRecommendations.length === 0 && !selectedError && (
        <div className="rounded-[20px] bg-white px-5 py-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[40px] mb-3">🔍</div>
          <p className="text-[14px] font-bold text-[#1A1F27]">선택한 재료 조합의 레시피가 없어요</p>
          <p className="mt-1 text-[12px] text-[#8B95A1]">다른 재료를 선택하거나 재료를 줄여보세요.</p>
        </div>
      )}

      {/* 이미지 카드 리스트 */}
      {!selectedLoading && visibleRecipes.map((recipe) => (
        <button
          key={recipe.recipe_id}
          onClick={() => onRecipeClick(recipe.title, recipe)}
          className="w-full overflow-hidden rounded-[24px] bg-white text-left outline-none focus:outline-none shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-transform"
        >
          {/* 이미지 or 초록 헤더 */}
          {(recipe as any).image ? (
            <div className="relative h-[140px] w-full overflow-hidden">
              <img src={(recipe as any).image} alt={recipe.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">{recipe.mood || '추천'}</span>
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">{recipe.level || '-'}</span>
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white">⏱ {recipe.timeMin ?? '-'}분</span>
                </div>
                <h3 className="text-[17px] font-bold text-white tracking-[-0.03em] leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{recipe.title}</h3>
              </div>
            </div>
          ) : (
            <div className="bg-[#18CA87] px-4 py-4 text-white">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{recipe.mood || '추천'}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{recipe.level || '-'}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">⏱ {recipe.timeMin ?? '-'}분</span>
              </div>
              <h3 className="text-[18px] font-bold tracking-[-0.03em]">{recipe.title}</h3>
            </div>
          )}
          {/* 재료 매칭 */}
          <div className="px-4 py-3">
            <p className="text-[11px] font-bold text-[#1A1F27] mb-2">
              필요한 재료 <span className="ml-1 font-normal text-[#8B95A1]">{recipe.match_rate_pct ?? 0}% 보유</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(recipe.owned_main ?? []).map((n: string) => <span key={`om-${n}`} className="rounded-full bg-[#E6F8ED] px-2.5 py-1 text-[11px] font-bold text-[#00A36F]">✓ {n}</span>)}
              {(recipe.missing_main_names ?? []).map((n: string) => <span key={`mm-${n}`} className="rounded-full bg-[#FEECEB] px-2.5 py-1 text-[11px] font-bold text-[#F04438]">✕ {n}</span>)}
              {(recipe.owned_sub ?? []).slice(0, 2).map((n: string) => <span key={`os-${n}`} className="rounded-full bg-[#E6F8ED] px-2.5 py-1 text-[11px] font-bold text-[#00A36F] opacity-70">✓ {n}</span>)}
            </div>
          </div>
        </button>
      ))}

      {/* 무한 스크롤 감지 영역 */}
      {!selectedLoading && visibleCount < selectedRecommendations.length && (
        <div ref={loaderRef} className="py-4 text-center">
          <p className="text-[12px] text-[#8B95A1]">스크롤하면 더 불러와요 ({visibleCount}/{selectedRecommendations.length})</p>
        </div>
      )}

      {/* 모두 표시됨 */}
      {!selectedLoading && selectedRecommendations.length > 0 && visibleCount >= selectedRecommendations.length && (
        <p className="text-center text-[11px] text-[#C5CACC] py-2">전체 {selectedRecommendations.length}개 레시피</p>
      )}
    </>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-w-[64px] flex-col items-center gap-1.5 py-1 relative outline-none focus:outline-none">
      <Icon className={`w-6 h-6 transition-all ${active ? 'text-[#18CA87] scale-110' : 'text-[#8B95A1] opacity-70'}`} />
      <span className={`text-[10px] transition-colors ${active ? 'font-bold text-[#18CA87]' : 'font-semibold text-[#8B95A1]'}`}>{label}</span>
      {/* 활성화 시 하단 라인 인디케이터 표시 */}
      {active && <div className="absolute -bottom-2 h-[3px] w-6 rounded-full bg-[#18CA87]" />}
    </button>
  );
}