/**
 * Naengbuhae API Service
 * 연결 대상: Render Backend (Python FastAPI)
 */

// 1. Render에서 발급받은 실제 주소로 교체하세요.
const API_BASE_URL = "https://naengbuhae-api.onrender.com"; 

/**
 * [공통] 식재료 검색 (검색창 및 냉장고 등록용)
 */
export async function searchIngredients(query) {
  try {
    const res = await fetch(`${API_BASE_URL}/ingredients?limit=1000`);
    if (!res.ok) throw new Error('식재료 로드 실패');
    const data = await res.json();
    
    const q = (query || '').trim().toLowerCase();
    if (!q) return data.ingredients.slice(0, 20);
    
    // 백엔드 필드명(ingredient_name)에 맞춰 필터링
    return data.ingredients.filter((i) => 
      i.ingredient_name.toLowerCase().includes(q)
    );
  } catch (error) {
    console.error("searchIngredients 에러:", error);
    return [];
  }
}

/**
 * [핵심] 레시피 자동 추천 (모델 기반 추론)
 */
export async function recommendRecipesAuto(inventory, allergyIds, householdSize = 1) {
  // 백엔드 Pydantic 스키마(RecommendRequest)와 형식을 맞춥니다.
  const payload = {
    household_size: Number(householdSize),
    day_of_week: new Date().getDay(),
    hour: new Date().getHours(),
    allergies: allergyIds || [],
    preferred_moods: [],
    inventory: (inventory || []).map(inv => ({
      ingredient_id: String(inv.ingredient_id),
      owned_qty: parseFloat(inv.quantity) || 0,
      // 유통기한까지 남은 날짜 계산
      days_left: Math.max(0, Math.floor((new Date(inv.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)))
    })),
    top_k: 10
  };

  try {
    const res = await fetch(`${API_BASE_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('추천 API 응답 에러');
    return await res.json(); // 백엔드에서 준 Detailed 추천 리스트 반환
  } catch (error) {
    console.error("recommendRecipesAuto 에러:", error);
    return [];
  }
}

/**
 * [기타] 프로필/기타 기능 (기존 Mock 유지 또는 필요시 백엔드 연결)
 * 현재 백엔드(index.py)에는 프로필 저장 API가 없으므로 로컬 시뮬레이션 유지
 */
export async function fetchInitialProfile() {
  return {
    profile_id: 1,
    household_size: 1,
    allergy_info: [],
  };
}

export async function saveProfile(profile) {
  console.log("프로필 저장됨(로컬):", profile);
  return { success: true };
}

// 상세 페이지 데이터는 이미 recommend API 결과에 포함되어 내려오도록 index.py가 짜여 있습니다.
// 만약 개별 호출이 필요하다면 아래처럼 구현합니다.
export async function getRecipeDetail(recipeId) {
  // 이미 추천 리스트에 상세 정보가 포함되어 있으므로 프론트엔드 상태값에서 찾아쓰는 것이 효율적입니다.
  // 필요하다면 백엔드에 전용 엔드포인트를 추가해야 합니다.
  return null; 
}