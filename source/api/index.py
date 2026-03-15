"""
냉부해 레시피 추천 API — v2
=====================================
새 모델(15개 피처) 기준으로 전면 재작성
- 재료 매칭: ingredient_id → ingredient_name 기반
- 피처: missing_main/sub, match_rate, has_all_main, ingredient_waste_score,
        avg_urgency, absolute_volume, urgency_x_volume, owned_qty_score,
        time_min, difficulty_num,
        hour_score, weekend_score, weekday_dinner_score, late_night_score
- 응답 포맷: App.tsx 기존 인터페이스와 호환 유지
"""

import os
import re
from typing import List, Optional
from pathlib import Path

import httpx
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── 경로 설정 ────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
MODEL_DIR  = BASE_DIR / "models"

MODEL_PATH      = MODEL_DIR / "fridge_recipe_xgboost_v2.pkl"
RECIPES_PATH    = MODEL_DIR / "recipes_df.pkl"
INGREDIENT_PATH = MODEL_DIR / "ingredients_master.pkl"

print(f"DEBUG: MODEL_DIR = {MODEL_DIR}")
print(f"DEBUG: model exists?       {MODEL_PATH.exists()}")
print(f"DEBUG: recipes exists?     {RECIPES_PATH.exists()}")
print(f"DEBUG: ingredients exists? {INGREDIENT_PATH.exists()}")

# ── 데이터 로드 ──────────────────────────────────────────────
model              = joblib.load(MODEL_PATH)
recipes            = pd.read_pickle(RECIPES_PATH)
ingredient_master  = pd.read_pickle(INGREDIENT_PATH)

# 빠른 조회용 딕셔너리
# id → {name, category, expiryDay, unit, allergy}
ing_by_id   = ingredient_master.set_index("id").to_dict("index")
# name → id (역방향 조회용)
ing_id_by_name = {row["name"]: row["id"] for _, row in ingredient_master.iterrows()}

print(f"✅ 로드 완료: 레시피 {len(recipes)}건 / 식재료 마스터 {len(ingredient_master)}건")

# ── 피처 컬럼 정의 (학습 시와 동일한 순서 유지 필수) ────────
FEATURE_COLS = [
    "missing_main", "missing_sub", "match_rate", "has_all_main",
    "ingredient_waste_score",
    "avg_urgency", "absolute_volume", "urgency_x_volume", "owned_qty_score",
    "time_min", "difficulty_num",
    "hour_score", "weekend_score", "weekday_dinner_score", "late_night_score",
]

# ── CONDIMENT_KEYWORDS (조미료 제외용) ──────────────────────
CONDIMENT_KEYWORDS = {
    "소금", "후추", "설탕", "간장", "식초", "된장", "고추장", "쌈장", "맛술", "미림",
    "올리고당", "물엿", "다진마늘", "마늘가루", "양파가루", "고춧가루", "고추기름",
    "참기름", "들기름", "올리브오일", "식용유", "버터", "케첩", "마요네즈", "머스타드",
    "굴소스", "피시소스", "치킨스톡", "육수", "다시다", "카레가루", "짜장가루", "전분",
    "밀가루", "토마토소스", "크림소스", "데리야키소스", "칠리소스", "파슬리", "월계수잎"
}

# ── FastAPI 앱 설정 ──────────────────────────────────────────
app = FastAPI(title="냉부해 레시피 추천 API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 공공데이터 레시피 API 설정 ────────────────────────────────
# Render 환경변수 FOOD_API_KEY 에 식약처 API 키를 등록하세요.
FOOD_API_KEY  = os.environ.get("FOOD_API_KEY", "")
FOOD_API_BASE = "http://openapi.foodsafetykorea.go.kr/api"

# 서버 재시작 전까지 유지되는 메모리 캐시
# 동일 레시피명 재요청 시 공공API 호출 없이 즉시 반환
_recipe_detail_cache: dict = {}


# ── Pydantic 스키마 ──────────────────────────────────────────
class InventoryItem(BaseModel):
    """
    냉장고 재료 1개 항목
    - ingredient_id: 마스터 DB의 id (기존 App.tsx 호환)
    - owned_qty: 보유 수량 (선택, 없으면 None → owned_qty_score = 0.5 중립값)
    - days_left: 유통기한까지 남은 일수
    """
    ingredient_id: str
    owned_qty: Optional[float] = None
    days_left: int

class RecommendRequest(BaseModel):
    household_size: int = 1
    day_of_week: int = 0        # 0=월 ~ 6=일 (App.tsx에서 now.getDay() 전송)
    hour: int = 19
    allergies: List[str] = []
    preferred_moods: List[str] = []
    inventory_confidence: float = 0.9   # 하위 호환용 (현재 모델에서 미사용)
    top_k: int = 10
    inventory: List[InventoryItem]


# ── 헬퍼: 소모량 계산 (raw_ingredients 텍스트에서 g 파싱) ───
def calculate_absolute_volume(matched_names: list, raw_text: str) -> float:
    """냉장고에 있는 재료만 기준으로 소모량을 0~1로 정규화"""
    total_g = 0.0
    chunks  = str(raw_text).split(',')
    UNIT_TO_G = {
        'kg': 1000, '큰술': 15, 'T': 15, '작은술': 5, 't': 5,
        '컵': 200, '개': 150, '뿌리': 50, '톨': 5, '쪽': 5, '마리': 300, '장': 10,
    }
    for ing in matched_names:
        chunk = next((c for c in chunks if ing in c), "")
        if not chunk:
            continue
        num_m  = re.search(r'(\d+(?:\.\d+)?|\d+/\d+)', chunk)
        unit_m = re.search(r'(g|kg|ml|컵|큰술|작은술|T|t|개|뿌리|톨|쪽|마리|장)', chunk)
        if not num_m:
            continue
        num_str = num_m.group(1)
        val     = (float(num_str.split('/')[0]) / float(num_str.split('/')[1])
                   if '/' in num_str else float(num_str))
        unit    = unit_m.group(1) if unit_m else ""
        val    *= UNIT_TO_G.get(unit, 1)
        total_g += val
    return min(1.0, total_g / 1000.0)


# ── 헬퍼: TPO 연속값 계산 ───────────────────────────────────
def compute_tpo_scores(hour: int, day_of_week: int):
    """
    시간/요일을 0.0~1.0 연속값으로 변환
    day_of_week: 0=월 ~ 6=일 (JS getDay()는 0=일이지만 index.py에서 그대로 받음)
    """
    # JS getDay(): 0=일, 1=월 ... 6=토
    is_weekend = day_of_week == 0 or day_of_week == 6

    # hour_score: 저녁/야식 활성도
    if 22 <= hour <= 23:
        hour_score = round(0.5 + (hour - 22) * 0.25, 2)
    elif 0 <= hour <= 2:
        hour_score = 1.0
    elif hour == 3:
        hour_score = 0.7
    elif hour == 4:
        hour_score = 0.4
    elif hour == 18:
        hour_score = 0.4
    elif hour == 19:
        hour_score = 0.7
    elif hour == 20:
        hour_score = 1.0
    elif hour == 21:
        hour_score = 0.6
    else:
        hour_score = 0.1

    # weekend_score
    weekend_score = 1.0 if is_weekend else 0.0

    # weekday_dinner_score
    if is_weekend:
        weekday_dinner_score = 0.0
    else:
        weekday_dinner_score = {18: 0.4, 19: 0.8, 20: 1.0, 21: 0.6}.get(hour, 0.0)

    # late_night_score
    if 22 <= hour <= 23:
        late_night_score = round(0.4 + (hour - 22) * 0.3, 2)
    elif 0 <= hour <= 2:
        late_night_score = 1.0
    elif hour == 3:
        late_night_score = 0.6
    elif hour == 4:
        late_night_score = 0.2
    else:
        late_night_score = 0.0

    return hour_score, weekend_score, weekday_dinner_score, late_night_score


# ── 핵심 피처 추출 함수 ──────────────────────────────────────
def extract_features(recipe_row: dict, fridge_map: dict, hour: int, day_of_week: int) -> dict:
    """
    fridge_map: {ingredient_name: {days_left, owned_qty}} 형태
    recipe_row: recipes_df의 row (dict)
    """
    req_ing  = recipe_row.get("required_ingredients", []) or []
    main_ing = recipe_row.get("main_ingredients", []) or []

    def in_fridge(name: str) -> bool:
        return name in fridge_map

    # 매칭 집합
    matched_main_set = {i for i in main_ing if in_fridge(i)}
    sub_ing          = [i for i in req_ing if i not in set(main_ing)]
    matched_sub_set  = {i for i in sub_ing if in_fridge(i)}

    missing_main = len(main_ing) - len(matched_main_set)
    missing_sub  = len(sub_ing)  - len(matched_sub_set)
    has_all_main = 1 if missing_main == 0 else 0

    total_matched = len(matched_main_set) + len(matched_sub_set)
    match_rate    = (total_matched / len(req_ing)) if req_ing else 0.0

    # 냉장고 소진율
    fridge_count          = len(fridge_map) if fridge_map else 1
    fridge_used_count     = sum(1 for name in fridge_map if name in set(req_ing))
    ingredient_waste_score = fridge_used_count / fridge_count

    # 임박도 — 냉장고 보유 재료 기준
    urgency_scores = []
    for i in req_ing:
        item = fridge_map.get(i)
        if item:
            score = max(0.0, (7.0 - item["days_left"]) / 7.0)
            urgency_scores.append(score)
    avg_urgency = float(np.mean(urgency_scores)) if urgency_scores else 0.0

    # 소모량 — 냉장고 보유 재료만 기준
    matched_list          = list(matched_main_set | matched_sub_set)
    absolute_volume_score = calculate_absolute_volume(matched_list, recipe_row.get("raw_ingredients", ""))
    urgency_x_volume      = avg_urgency * absolute_volume_score

    # 남은양 충족도
    qty_scores = []
    for i in req_ing:
        item = fridge_map.get(i)
        if item and item.get("owned_qty") is not None:
            owned = float(item["owned_qty"])
            chunks = str(recipe_row.get("raw_ingredients", "")).split(',')
            chunk  = next((c for c in chunks if i in c), "")
            num_m  = re.search(r'(\d+(?:\.\d+)?)', chunk)
            if num_m:
                required_g = float(num_m.group(1))
                if 'kg' in chunk:
                    required_g *= 1000
                qty_scores.append(min(1.0, owned / max(required_g, 1.0)))
    owned_qty_score = float(np.mean(qty_scores)) if qty_scores else 0.5

    # TPO 연속값
    hour_score, weekend_score, weekday_dinner_score, late_night_score = compute_tpo_scores(hour, day_of_week)

    return {
        "missing_main":           missing_main,
        "missing_sub":            missing_sub,
        "match_rate":             round(match_rate, 4),
        "has_all_main":           has_all_main,
        "ingredient_waste_score": round(ingredient_waste_score, 4),
        "avg_urgency":            round(avg_urgency, 4),
        "absolute_volume":        round(absolute_volume_score, 4),
        "urgency_x_volume":       round(urgency_x_volume, 4),
        "owned_qty_score":        round(owned_qty_score, 4),
        "time_min":               float(recipe_row.get("timeMin", 30)),
        "difficulty_num":         float(recipe_row.get("difficulty_num", 2.0)),
        "hour_score":             hour_score,
        "weekend_score":          weekend_score,
        "weekday_dinner_score":   weekday_dinner_score,
        "late_night_score":       late_night_score,
    }


# ── 추천 핵심 로직 ───────────────────────────────────────────
def recommend_top_k(payload: RecommendRequest) -> list:

    # 1. 냉장고 재료를 name 기반 맵으로 변환
    # App.tsx는 ingredient_id로 보내므로 → id를 name으로 변환
    fridge_map = {}
    for item in payload.inventory:
        ing_info = ing_by_id.get(item.ingredient_id)
        if not ing_info:
            continue
        name = ing_info["name"]
        fridge_map[name] = {
            "days_left": item.days_left,
            "owned_qty": item.owned_qty,
        }

    # 2. 알레르기 하드 필터
    filtered = recipes.copy()
    if payload.allergies:
        user_allergy_set = set(payload.allergies)
        def has_allergy(x):
            algs = set(x) if isinstance(x, list) and x else set()
            return bool(algs & user_allergy_set)
        filtered = filtered[~filtered["recipe_allergies"].apply(has_allergy)]

    # 3. 필수 재료 없는 레시피 제외
    filtered = filtered[filtered["required_ingredients"].apply(lambda x: bool(x))]

    if filtered.empty:
        return []

    # 4. 피처 추출 + 모델 추론
    rows = []
    for _, row in filtered.iterrows():
        feat = extract_features(row.to_dict(), fridge_map, payload.hour, payload.day_of_week)
        feat["recipe_id"] = row["recipe_id"]
        rows.append(feat)

    feat_df = pd.DataFrame(rows)
    feat_df["pred_score"] = np.clip(
        model.predict_proba(feat_df[FEATURE_COLS])[:, 1], 0, 1
    )

    # 5. 상위 k개 선택
    top_df = feat_df.sort_values("pred_score", ascending=False).head(payload.top_k)

    # 6. 응답 조립 — App.tsx의 AIRecipeRecommendation 인터페이스에 맞게
    results = []
    for _, feat_row in top_df.iterrows():
        rid    = feat_row["recipe_id"]
        recipe = filtered[filtered["recipe_id"] == rid].iloc[0]

        # 보유/미보유 재료 분리
        req_names  = recipe["required_ingredients"] or []
        main_names = recipe["main_ingredients"] or []
        sub_names  = [n for n in req_names if n not in set(main_names)]

        owned_main    = [n for n in main_names if n in fridge_map]
        missing_main  = [n for n in main_names if n not in fridge_map]
        owned_sub     = [n for n in sub_names  if n in fridge_map]
        missing_sub   = [n for n in sub_names  if n not in fridge_map]

        # App.tsx 호환 필드 + 신규 필드
        results.append({
            # ── 기존 App.tsx AIRecipeRecommendation 인터페이스 호환 ──
            "recipe_id":            rid,
            "title":                recipe["title"],
            "pred_score":           round(float(feat_row["pred_score"]), 4),
            "level":                recipe.get("level", "보통"),
            "timeMin":              float(recipe.get("timeMin", 30)),
            "mood":                 recipe.get("mood", "실속 있는 한 끼"),
            "main_match_ratio":     round(feat_row["match_rate"], 4),       # 호환 필드명 유지
            "required_match_ratio": round(feat_row["match_rate"], 4),
            "urgency_score":        round(feat_row["avg_urgency"], 4),
            "consume_efficiency":   round(feat_row["absolute_volume"], 4),
            "missing_required":     int(feat_row["missing_sub"]),
            "allergy_hit":          0,   # 하드필터 통과한 레시피는 항상 0

            # ── 신규 필드: 보유/미보유 재료 상세 ──────────────────
            "owned_main":           owned_main,
            "missing_main_names":   missing_main,
            "owned_sub":            owned_sub,
            "missing_sub_names":    missing_sub,
            "match_rate_pct":       round(feat_row["match_rate"] * 100, 1),
            "owned_qty_score":      round(feat_row["owned_qty_score"], 4),
        })

    return results


# ── 엔드포인트 ───────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "recipes": len(recipes), "ingredients": len(ingredient_master)}


@app.get("/ingredients")
def get_ingredients(limit: int = 1000):
    """
    식재료 마스터 목록 반환
    App.tsx는 ingredient_id, ingredient_name, category 필드를 기대하므로
    새 컬럼명(id, name)을 기존 필드명으로 매핑하여 반환
    """
    result = (
        ingredient_master[["id", "name", "category", "expiryDay", "unit", "allergy"]]
        .head(limit)
        .fillna("")
        .rename(columns={
            "id":       "ingredient_id",    # App.tsx 호환
            "name":     "ingredient_name",  # App.tsx 호환
            "expiryDay": "expiry_day",
        })
        .to_dict(orient="records")
    )
    return {"ingredients": result}


class SelectedRecommendRequest(BaseModel):
    selected_ingredient_ids: List[str]   # 선택한 재료 id 목록
    match_mode: str = 'or'               # 'or': 하나라도 포함 / 'and': 모두 포함
    household_size: int = 1
    day_of_week: int = 0
    hour: int = 19
    allergies: List[str] = []
    top_k: int = 20


@app.post("/recommend")
def recommend(payload: RecommendRequest):
    """
    AI 레시피 추천 엔드포인트
    입력: inventory (ingredient_id 기반)
    출력: AIRecipeRecommendation[] + 보유/미보유 재료 상세
    """
    return recommend_top_k(payload)


@app.post("/recommend/selected")
def recommend_selected(payload: SelectedRecommendRequest):
    """
    선택 재료 기반 추천 전용 엔드포인트
    - missing_main 페널티 없이 선택 재료 포함 비율 기준으로 정렬
    - 선택 재료 중 하나라도 포함된 레시피를 모두 반환 (OR 조건)
    - 포함된 선택 재료가 많을수록 상위 노출
    """
    # 선택 재료 id → name 변환
    selected_names = []
    for sid in payload.selected_ingredient_ids:
        info = ing_by_id.get(sid)
        if info:
            selected_names.append(info["name"])

    if not selected_names:
        return []

    selected_set = set(selected_names)

    # 알레르기 하드 필터
    filtered = recipes.copy()
    if payload.allergies:
        user_allergy_set = set(payload.allergies)
        def has_allergy(x):
            algs = set(x) if isinstance(x, list) and x else set()
            return bool(algs & user_allergy_set)
        filtered = filtered[~filtered["recipe_allergies"].apply(has_allergy)]

    # 필수 재료 없는 레시피 제외
    filtered = filtered[filtered["required_ingredients"].apply(lambda x: bool(x))]

    if filtered.empty:
        return []

    # match_mode에 따라 OR / AND 조건으로 필터링
    # OR: 선택 재료 중 하나라도 포함된 레시피
    # AND: 선택 재료가 모두 포함된 레시피
    if payload.match_mode == 'and':
        def contains_selected(req_list):
            return all(name in set(req_list or []) for name in selected_names)
    else:
        def contains_selected(req_list):
            return any(name in selected_set for name in (req_list or []))

    matched = filtered[filtered["required_ingredients"].apply(contains_selected)].copy()

    if matched.empty:
        return []

    # 점수 계산: 선택 재료 중 몇 개가 레시피에 포함되는지 비율
    def calc_match_score(row):
        req = set(row["required_ingredients"] or [])
        main = set(row["main_ingredients"] or [])
        # 선택 재료 중 레시피에 있는 것
        matched_selected = selected_set & req
        # 메인 재료에 포함된 선택 재료에 가중치 2배
        main_bonus = len(selected_set & main) * 2
        return (len(matched_selected) + main_bonus) / max(len(selected_set), 1)

    matched["_score"] = matched.apply(calc_match_score, axis=1)
    top_df = matched.sort_values("_score", ascending=False).head(payload.top_k)

    # TPO 연속값 계산
    hour_score, weekend_score, weekday_dinner_score, late_night_score = compute_tpo_scores(
        payload.hour, payload.day_of_week
    )

    # 응답 조립 — AI 추천과 동일한 포맷
    results = []
    for _, row in top_df.iterrows():
        req_names  = row["required_ingredients"] or []
        main_names = row["main_ingredients"] or []
        sub_names  = [n for n in req_names if n not in set(main_names)]

        # 선택 재료 기준으로 보유/미보유 구분
        owned_main   = [n for n in main_names if n in selected_set]
        missing_main = [n for n in main_names if n not in selected_set]
        owned_sub    = [n for n in sub_names  if n in selected_set]
        missing_sub  = [n for n in sub_names  if n not in selected_set]

        match_rate = len(selected_set & set(req_names)) / max(len(req_names), 1)

        results.append({
            "recipe_id":            row["recipe_id"],
            "title":                row["title"],
            "pred_score":           round(float(row["_score"]), 4),
            "level":                row.get("level", "보통"),
            "timeMin":              float(row.get("timeMin", 30)),
            "mood":                 row.get("mood", "실속 있는 한 끼"),
            "main_match_ratio":     round(match_rate, 4),
            "required_match_ratio": round(match_rate, 4),
            "urgency_score":        0.0,
            "consume_efficiency":   0.0,
            "missing_required":     len(missing_sub),
            "allergy_hit":          0,
            "owned_main":           owned_main,
            "missing_main_names":   missing_main,
            "owned_sub":            owned_sub,
            "missing_sub_names":    missing_sub,
            "match_rate_pct":       round(match_rate * 100, 1),
            "owned_qty_score":      0.5,
        })

    return results

# ── 레시피 상세 엔드포인트 ──────────────────────────────────
@app.get("/recipe/detail")
async def get_recipe_detail(title: str):
    """
    레시피 타이틀로 식약처 공공데이터 레시피 상세 조회.

    1. 메모리 캐시 확인 → 히트 시 즉시 반환
    2. 공공데이터 API 정확 매칭(RCP_NM=title) 호출
    3. 결과 없으면 공백 제거 후 재시도 (예: "김치 볶음밥" → "김치볶음밥")
    4. 그래도 없으면 404

    반환 필드:
      title       - 레시피명
      image       - 대표 이미지 URL
      category    - 요리 종류 (예: 볶음, 국·찌개)
      calorie     - 열량 (kcal)
      ingredients - 재료 문자열 (원문 그대로)
      steps       - [{order, desc, image}] 조리 순서
    """
    # 1. 캐시 확인
    cache_key = title.strip()
    if cache_key in _recipe_detail_cache:
        return _recipe_detail_cache[cache_key]

    if not FOOD_API_KEY:
        raise HTTPException(status_code=503, detail="FOOD_API_KEY 환경변수가 설정되지 않았습니다.")

    async def fetch_by_name(name: str):
        """공공API에서 RCP_NM 정확 매칭으로 1건 조회"""
        url = f"{FOOD_API_BASE}/{FOOD_API_KEY}/COOKRCP01/json/1/5/RCP_NM={name}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            res.raise_for_status()
        data = res.json()
        rows = data.get("COOKRCP01", {}).get("row", [])
        # RCP_NM이 정확히 일치하는 것만 반환
        return [r for r in rows if r.get("RCP_NM", "").strip() == name]

    # 2. 정확 매칭 시도
    rows = await fetch_by_name(title.strip())

    # 3. 결과 없으면 공백 제거 후 재시도
    if not rows:
        no_space = title.replace(" ", "")
        if no_space != title.strip():
            rows = await fetch_by_name(no_space)

    if not rows:
        raise HTTPException(status_code=404, detail=f"'{title}' 레시피를 공공데이터에서 찾을 수 없습니다.")

    row = rows[0]

    # 4. 조리 순서 파싱 (MANUAL01~20, MANUAL_IMG01~20)
    steps = []
    for i in range(1, 21):
        key     = f"MANUAL{str(i).zfill(2)}"
        img_key = f"MANUAL_IMG{str(i).zfill(2)}"
        desc    = (row.get(key) or "").strip()
        if not desc:
            break
        steps.append({
            "order": i,
            "desc":  desc,
            "image": (row.get(img_key) or "").strip(),
        })

    result = {
        "title":       row.get("RCP_NM", "").strip(),
        "image":       (row.get("ATT_FILE_NO_MAIN") or "").strip(),
        "category":    (row.get("RCP_PAT2") or "").strip(),
        "calorie":     (row.get("INFO_ENG") or "").strip(),
        "ingredients": (row.get("RCP_PARTS_DTLS") or "").strip(),
        "steps":       steps,
    }

    # 5. 캐시 저장
    _recipe_detail_cache[cache_key] = result
    return result