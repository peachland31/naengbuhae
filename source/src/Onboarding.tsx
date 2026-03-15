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

// --- 원래 있던 10개의 과일/채소 아바타 및 랜덤 로직 완벽 복구 ---
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

const hideScroll = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

// --- 컴포넌트 프롭스 ---
interface OnboardingProps {
  setProfile: React.Dispatch<React.SetStateAction<any>>; // App.tsx의 profile과 연결
  onComplete: () => void;
}

export default function Onboarding({ setProfile, onComplete }: OnboardingProps) {
  // 스텝 관리: 'login' (로그인) -> 'profile' (프로필 설정)
  const [step, setStep] = useState<'login' | 'profile'>('login');
  
  // 로그인 상태 관리
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 프로필 설정 상태 관리 (기존 스크린샷과 동일하게 랜덤 데이터로 시작)
  const [localProfile, setLocalProfile] = useState<UserProfile>(() => {
    const { nickname, avatar } = createRandomProfileData();
    return { nickname, householdSize: 1, allergies: [], avatar };
  });

  const handleLogin = () => {
    if (email && password) {
      setStep('profile'); // 로그인 성공 시 원래 있던 프로필 설정 화면으로 이동!
    } else {
      alert("이메일과 비밀번호를 입력해주세요.");
    }
  };

  const toggleAllergy = (allergy: Allergy) => {
    setLocalProfile((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy) ? prev.allergies.filter((a) => a !== allergy) : [...prev.allergies, allergy],
    }));
  };

  // -------------------------
  // 1. 로그인 화면 렌더링
  // -------------------------
  if (step === 'login') {
    return (
      <div className="flex h-full flex-col justify-center px-5 py-10">
        <div className="text-center mb-10">
          <div className="text-[54px] mb-3">🍳</div>
          <h1 className="text-[28px] font-bold text-[#1A1F27] tracking-tight">나만의 냉장고<br/>냉부해 시작하기</h1>
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
  // 2. 프로필 설정 화면 렌더링 (원본 UI 완벽 복구!)
  // -------------------------
  return (
    <div className={`flex h-full flex-col justify-between py-2 overflow-y-auto ${hideScroll}`}>
      <div>
        <section className="rounded-[28px] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <p className="text-[11px] font-semibold text-[#8B95A1]">WELCOME</p>
          <h1 className="mt-1 text-[28px] leading-[1.1] font-bold tracking-[-0.04em] text-[#1A1F27]">나에게 맞는<br />냉장고를 시작해요</h1>
        </section>

        <section className="mt-3 rounded-[28px] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div>
            <p className="text-[13px] font-bold text-[#1A1F27]">프로필 이미지</p>
            <p className="mt-0.5 text-[11px] text-[#8B95A1]">슬라이드로 넘겨 선택할 수 있어요.</p>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-[#f4f4f4] px-4 py-4">
            <button onClick={() => setLocalProfile((prev) => ({ ...prev, avatar: getNextAvatar(prev.avatar.id, 'prev') }))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[16px] text-[#1A1F27] outline-none focus:outline-none shadow-sm">‹</button>
            <div className="flex flex-1 flex-col items-center justify-center py-2">
              <div className="text-[54px] leading-none">{localProfile.avatar.emoji}</div>
              <p className="mt-3 text-[13px] font-bold text-[#6B7684]">{localProfile.avatar.label}</p>
            </div>
            <button onClick={() => setLocalProfile((prev) => ({ ...prev, avatar: getNextAvatar(prev.avatar.id, 'next') }))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[16px] text-[#1A1F27] outline-none focus:outline-none shadow-sm">›</button>
          </div>
        </section>

        <section className="mt-3 rounded-[28px] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
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
                  <button key={allergy} onClick={() => toggleAllergy(allergy)} className={`rounded-full px-4 py-2 text-[13px] font-bold outline-none focus:outline-none transition-colors ${selected ? 'bg-[#18CA87] text-white shadow-md shadow-[#18CA87]/20' : 'bg-[#f4f4f4] text-[#6B7684]'}`}>{allergy}</button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      <button onClick={() => { setProfile(localProfile); onComplete(); }} className="mt-5 w-full shrink-0 rounded-[20px] bg-[#18CA87] px-5 py-4 text-[16px] font-bold text-white shadow-lg outline-none focus:outline-none shadow-[#18CA87]/30 transition-transform active:scale-[0.98]">
        시작하기
      </button>
    </div>
  );
}