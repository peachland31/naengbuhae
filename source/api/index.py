"""
냉부해 레시피 추천 API — v5
=====================================
v4(index.py) 대비 핵심 변경사항:
  [1] FEATURE_COLS: 17개 (v4 16개 + weighted_match_rate, main_protein_score, urgency_weighted)
  [2] extract_features: 육류/해산물 가중 매칭률 + 카테고리별 임박도 추가
  [3] recommend_top_k: pred_score × 100 → 100점 만점으로 변환
  [4] 알레르기 하드 필터: 기존 방식 유지 (전체 텍스트 탐지)
  [5] 변수명/구조/API 엔드포인트: v4와 동일 유지
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

from dotenv import load_dotenv

load_dotenv()
FOOD_API_KEY  = os.environ.get("FOOD_API_KEY", "")
FOOD_API_BASE = "http://openapi.foodsafetykorea.go.kr/api"

BASE_DIR   = Path(__file__).resolve().parent
MODEL_DIR  = BASE_DIR / "models"

MODEL_PATH      = MODEL_DIR / "fridge_recipe_xgboost_v5.pkl"
RECIPES_PATH    = MODEL_DIR / "recipes_df.pkl"
INGREDIENT_PATH = MODEL_DIR / "ingredients_master.pkl"

print(f"DEBUG: MODEL_DIR = {MODEL_DIR}")
print(f"DEBUG: model exists?       {MODEL_PATH.exists()}")
print(f"DEBUG: recipes exists?     {RECIPES_PATH.exists()}")
print(f"DEBUG: ingredients exists? {INGREDIENT_PATH.exists()}")

model             = joblib.load(MODEL_PATH)
recipes           = pd.read_pickle(RECIPES_PATH)
ingredient_master = pd.read_pickle(INGREDIENT_PATH)

ing_by_id      = ingredient_master.set_index("id").to_dict("index")
ing_id_by_name = {row["name"]: row["id"] for _, row in ingredient_master.iterrows()}
# [v5] 카테고리 조회용 맵
ing_cat_by_name = {row["name"]: row["category"] for _, row in ingredient_master.iterrows()}

print(f"✅ 로드 완료: 레시피 {len(recipes)}건 / 식재료 마스터 {len(ingredient_master)}건")

# ── 피처 컬럼 정의 (v5: 17개) ─────────────────────────────────
FEATURE_COLS = [
    # 재료 매칭 (5개)
    "missing_main", "missing_sub", "match_rate", "has_all_main",
    "weighted_match_rate",       # [v5 신규] 육류/해산물 1.8배 가중 매칭률
    # 냉장고 활용 (1개)
    "ingredient_waste_score",
    # 단백질 (1개)
    "main_protein_score",        # [v5 신규] 메인 단백질 보유율
    # 긴급도 (4개)
    "avg_urgency", "absolute_volume", "urgency_x_volume",
    "urgency_weighted",          # [v5 신규] 카테고리별 임박 가중합
    # 보유량 (2개)
    "owned_qty_score", "has_qty_info",
    # 레시피 속성 (2개)
    "time_min", "difficulty_num",
    # 시간 컨텍스트 (4개)
    "time_context_score", "weekend_score", "weekday_dinner_score", "late_night_score",
]

# ── 조미료 키워드 ─────────────────────────────────────────────
CONDIMENT_KEYWORDS = {
    "소금", "후추", "설탕", "간장", "식초", "된장", "고추장", "쌈장", "맛술", "미림",
    "올리고당", "물엿", "다진마늘", "마늘가루", "양파가루", "고춧가루", "고추기름",
    "참기름", "들기름", "올리브오일", "식용유", "버터", "케첩", "마요네즈", "머스타드",
    "굴소스", "피시소스", "치킨스톡", "육수", "다시다", "카레가루", "짜장가루", "전분",
    "밀가루", "토마토소스", "크림소스", "데리야키소스", "칠리소스", "파슬리", "월계수잎"
}

# ── [v5] 육류/해산물 집합 ─────────────────────────────────────
PROTEIN_INGREDIENTS = {
    "돼지고기", "소고기", "닭고기", "오리고기", "양고기",
    "삼겹살", "목살", "항정살", "오겹살", "돼지갈비", "앞다리살", "뒷다리살",
    "소안심", "소등심", "소갈비", "양지", "사태", "차돌박이", "LA갈비",
    "닭가슴살", "닭다리살", "닭봉", "닭날개", "닭안심",
    "우삼겹", "대패삼겹살", "다진소고기", "다진돼지고기",
    "베이컨", "햄", "소시지", "족발", "곱창", "대창", "막창",
    "훈제오리", "오리가슴살",
    "새우", "칵테일새우", "흰다리새우", "생새우", "건새우",
    "오징어", "건오징어", "연어", "고등어", "갈치", "참치",
    "바지락", "홍합", "전복", "굴", "꽃게", "게",
    "황태", "황태채", "북어", "북어채", "멸치", "마른멸치",
    "낙지", "문어", "꼴뚜기", "장어", "가자미", "아귀",
    "우럭", "도미", "삼치", "꽁치", "임연수", "조개",
    "미역", "다시마",
}

INGREDIENT_GROUPS = {
    "돼지고기": ["돼지고기", "삼겹살", "목살", "오겹살", "항정살", "가브리살",
                 "앞다리살", "뒷다리살", "대패삼겹살", "냉동삼겹살",
                 "돼지갈비", "돼지등갈비", "다진돼지고기", "족발", "곱창", "대창", "막창"],
    "소고기":   ["소고기", "우삼겹", "차돌박이", "소안심", "소등심", "소갈비",
                 "양지", "사태", "LA갈비", "다진소고기"],
    "닭고기":   ["닭고기", "닭가슴살", "닭다리살", "닭봉", "닭날개", "닭안심", "닭정육"],
    "오리고기": ["오리고기", "오리가슴살", "오리로스", "훈제오리"],
    "양고기":   ["양고기", "양갈비", "양등심"],
}

REVERSE_GROUP_MAP = {}
for main_name, sub_names in INGREDIENT_GROUPS.items():
    for sub in sub_names:
        REVERSE_GROUP_MAP[sub] = main_name

# ── [v5] 카테고리별 임박 기준일 ───────────────────────────────
CATEGORY_URGENCY_DAYS = {
    "육류": 2, "해산물": 2, "유제품": 5,
    "채소": 3, "과일": 3, "신선식품": 5,
    "견과류": 14, "조미료": 30,
}

# ── FastAPI 앱 설정 ───────────────────────────────────────────
app = FastAPI(title="냉부해 레시피 추천 API v5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_recipe_detail_cache: dict = {}

# ── 재료명 유효성 필터 ────────────────────────────────────────
_INVALID_EXACT = {
    "주재료", "부재료", "재료", "양념", "양념장", "소스", "드레싱",
    "토핑", "장식", "기타", "다진", "볶은", "삶은", "구운", "찐",
    "데친", "무친", "절인", "말린", "건", "생", "냉동", "냉장",
    "유기농", "국내산", "수입산", "적당량", "약간", "조금", "손질",
    "손질한", "다진것", "혼합", "기본", "선택",
}

_INVALID_PREFIXES = (
    "주재료", "부재료", "양념", "소스", "장식", "토핑", "드레싱",
    "다진 ", "볶은 ", "삶은 ", "구운 ", "찐 ", "저염",
)

_CONDIMENT_NAMES = {
    "소금", "후추", "설탕", "간장", "식초", "된장", "고추장", "쌈장",
    "맛술", "미림", "올리고당", "물엿", "마늘가루", "양파가루", "고춧가루",
    "참기름", "들기름", "올리브오일", "식용유", "버터", "케첩", "마요네즈",
    "머스타드", "굴소스", "피시소스", "다시다", "카레가루", "전분", "밀가루",
    "저염소금", "천일염", "꽃소금", "맛소금", "저염간장", "국간장", "진간장",
    "통깨", "깨소금", "참깨", "후춧가루", "녹말가루", "청주", "물",
}

_MIN_LEN = 2
_MAX_LEN = 15


def is_valid_ingredient(name: str) -> bool:
    if not name or not isinstance(name, str):
        return False
    name = name.strip()
    if len(name) < _MIN_LEN or len(name) > _MAX_LEN:
        return False
    if re.match(r"^[0-9]", name):
        return False
    if name in _INVALID_EXACT:
        return False
    for prefix in _INVALID_PREFIXES:
        if name.startswith(prefix):
            return False
    return True


def is_valid_main_ingredient(name: str) -> bool:
    if not is_valid_ingredient(name):
        return False
    if name in _CONDIMENT_NAMES:
        return False
    return True


# ── Pydantic 스키마 ───────────────────────────────────────────
class InventoryItem(BaseModel):
    ingredient_id: str
    owned_qty: Optional[float] = None
    days_left: int


class RecommendRequest(BaseModel):
    household_size: int = 1
    day_of_week: int = 0
    hour: int = 19
    allergies: List[str] = []
    preferred_moods: List[str] = []
    inventory_confidence: float = 0.9
    top_k: int = 10
    inventory: List[InventoryItem]


# ── 헬퍼: 소모량 계산 ─────────────────────────────────────────
def calculate_absolute_volume(matched_names: list, raw_text: str) -> float:
    total_g = 0.0
    chunks  = str(raw_text).split(',')
    UNIT_TO_G = {
        'kg': 1000, '큰술': 15, 'T': 15, '작은술': 5, 't': 5,
        '컵': 200, '개': 150, '뿌리': 50, '톨': 5, '쪽': 5, '마리': 300, '장': 10,
    }
    for ing in matched_names:
        chunk  = next((c for c in chunks if ing in c), "")
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


# ── [v5] 헬퍼: 단백질 여부 ────────────────────────────────────
def _is_protein(name: str) -> bool:
    return (name in PROTEIN_INGREDIENTS or
            (name in REVERSE_GROUP_MAP and REVERSE_GROUP_MAP[name] in PROTEIN_INGREDIENTS))


# ── 헬퍼: TPO 연속값 계산 ─────────────────────────────────────
def compute_tpo_scores(hour: int, day_of_week: int):
    import math
    is_weekend = day_of_week == 0 or day_of_week == 6

    # time_context_score (원형 코사인 인코딩)
    dinner_dist = abs(hour - 19)
    dinner_dist = min(dinner_dist, 24 - dinner_dist)
    dinner_sc   = max(0.0, 1.0 - dinner_dist / 6.0)
    night_dist  = abs(hour - 1)
    night_dist  = min(night_dist, 24 - night_dist)
    night_sc    = max(0.0, 1.0 - night_dist / 3.0)
    time_context_score = round(max(dinner_sc, night_sc), 4)

    weekend_score        = 1.0 if is_weekend else 0.0
    weekday_dinner_score = 0.0 if is_weekend else {18: 0.4, 19: 0.8, 20: 1.0, 21: 0.6}.get(hour, 0.0)

    # late_night_score 연속 사인 곡선
    h = hour if hour >= 22 else hour + 24
    if 22 <= h <= 27:
        t = (h - 22) / 5.0
        late_night_score = round(math.sin(t * math.pi), 4)
    else:
        late_night_score = 0.0

    return time_context_score, weekend_score, weekday_dinner_score, late_night_score


# ── v5 핵심 피처 추출 함수 ────────────────────────────────────
def extract_features(recipe_row: dict, fridge_map: dict, hour: int, day_of_week: int) -> dict:
    """
    fridge_map: {ingredient_name: {days_left, owned_qty}} 형태
    """
    req_ing  = recipe_row.get("required_ingredients", []) or []
    main_ing = recipe_row.get("main_ingredients", []) or []

    def in_fridge(name: str) -> bool:
        return name in fridge_map

    matched_main_set = {i for i in main_ing if in_fridge(i)}
    sub_ing          = [i for i in req_ing if i not in set(main_ing)]
    matched_sub_set  = {i for i in sub_ing if in_fridge(i)}

    missing_main = len(main_ing) - len(matched_main_set)
    missing_sub  = len(sub_ing)  - len(matched_sub_set)
    has_all_main = 1 if missing_main == 0 else 0

    total_matched = len(matched_main_set) + len(matched_sub_set)
    match_rate    = (total_matched / len(req_ing)) if req_ing else 0.0

    # [v5] weighted_match_rate: 육류/해산물 1.8배 가중 (보조 피처, 가중치 0.5)
    # → match_rate(1.5) + weighted_match_rate(0.5) 합산 2.0으로 이중 증폭 방지
    w_num, w_den = 0.0, 0.0
    for ing in req_ing:
        w    = 1.8 if _is_protein(ing) else 1.0
        w_den += w
        if in_fridge(ing):
            w_num += w
    weighted_match_rate = (w_num / w_den) if w_den > 0 else 0.0

    # [v5] main_protein_score
    main_proteins       = [i for i in main_ing if _is_protein(i)]
    matched_proteins    = [i for i in main_proteins if in_fridge(i)]
    main_protein_score  = (len(matched_proteins) / len(main_proteins)
                           if main_proteins else 0.0)

    # 냉장고 소진율
    fridge_count           = len(fridge_map) if fridge_map else 1
    fridge_used_count      = sum(1 for name in fridge_map if name in set(req_ing))
    ingredient_waste_score = fridge_used_count / fridge_count

    # 기존 avg_urgency (7일 선형)
    urgency_scores = []
    for i in req_ing:
        item = fridge_map.get(i)
        if item:
            urgency_scores.append(max(0.0, (7.0 - item["days_left"]) / 7.0))
    avg_urgency = float(np.mean(urgency_scores)) if urgency_scores else 0.0

    matched_list          = list(matched_main_set | matched_sub_set)
    absolute_volume_score = calculate_absolute_volume(matched_list, recipe_row.get("raw_ingredients", ""))
    urgency_x_volume      = avg_urgency * absolute_volume_score

    # [v5] urgency_weighted: 카테고리별 임박 기준일
    uw_scores = []
    for i in req_ing:
        item = fridge_map.get(i)
        if item:
            cat      = ing_cat_by_name.get(i, "신선식품")
            ref_days = CATEGORY_URGENCY_DAYS.get(cat, 7)
            uw_scores.append(max(0.0, (ref_days - item["days_left"]) / ref_days))
    urgency_weighted = float(np.mean(uw_scores)) if uw_scores else 0.0

    # 보유량
    qty_scores = []
    for i in req_ing:
        item = fridge_map.get(i)
        if item and item.get("owned_qty") is not None:
            owned  = float(item["owned_qty"])
            chunks = str(recipe_row.get("raw_ingredients", "")).split(',')
            chunk  = next((c for c in chunks if i in c), "")
            num_m  = re.search(r'(\d+(?:\.\d+)?)', chunk)
            if num_m:
                required_g = float(num_m.group(1))
                if 'kg' in chunk:
                    required_g *= 1000
                qty_scores.append(min(1.0, owned / max(required_g, 1.0)))
    owned_qty_score = float(np.mean(qty_scores)) if qty_scores else 0.0

    time_context_score, weekend_score, weekday_dinner_score, late_night_score = \
        compute_tpo_scores(hour, day_of_week)

    return {
        "missing_main":           missing_main,
        "missing_sub":            missing_sub,
        "match_rate":             round(match_rate, 4),
        "has_all_main":           has_all_main,
        "weighted_match_rate":    round(weighted_match_rate, 4),  # [v5]
        "ingredient_waste_score": round(ingredient_waste_score, 4),
        "main_protein_score":     round(main_protein_score, 4),   # [v5]
        "avg_urgency":            round(avg_urgency, 4),
        "absolute_volume":        round(absolute_volume_score, 4),
        "urgency_x_volume":       round(urgency_x_volume, 4),
        "urgency_weighted":       round(urgency_weighted, 4),      # [v5]
        "owned_qty_score":        round(owned_qty_score, 4),
        "has_qty_info":           1 if qty_scores else 0,
        "time_min":               float(recipe_row.get("timeMin", 30)),
        "difficulty_num":         float(recipe_row.get("difficulty_num", 2.0)),
        "time_context_score":     time_context_score,
        "weekend_score":          weekend_score,
        "weekday_dinner_score":   weekday_dinner_score,
        "late_night_score":       late_night_score,
    }


# ── 추천 핵심 로직 ────────────────────────────────────────────
def recommend_top_k(payload: RecommendRequest) -> list:
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

    # 알레르기 하드 필터 (전체 텍스트 기반 유지)
    filtered = recipes.copy()
    if payload.allergies:
        user_allergy_set = set(payload.allergies)
        def has_allergy(x):
            algs = set(x) if isinstance(x, list) and x else set()
            return bool(algs & user_allergy_set)
        filtered = filtered[~filtered["recipe_allergies"].apply(has_allergy)]

    filtered = filtered[filtered["required_ingredients"].apply(lambda x: bool(x))]

    if filtered.empty:
        return []

    rows = []
    for _, row in filtered.iterrows():
        feat = extract_features(row.to_dict(), fridge_map, payload.hour, payload.day_of_week)
        feat["recipe_id"] = row["recipe_id"]
        rows.append(feat)

    feat_df = pd.DataFrame(rows)
    raw_probs = np.clip(model.predict_proba(feat_df[FEATURE_COLS])[:, 1], 0, 1)
    feat_df["pred_score"]   = raw_probs
    feat_df["score_100"]    = (raw_probs * 100).round(1)   # [v5] 100점 만점

    top_df = feat_df.sort_values("pred_score", ascending=False).head(payload.top_k)

    results = []
    for _, feat_row in top_df.iterrows():
        rid    = feat_row["recipe_id"]
        recipe = filtered[filtered["recipe_id"] == rid].iloc[0]

        req_names  = [n for n in (recipe["required_ingredients"] or []) if is_valid_ingredient(n)]
        main_names = [n for n in (recipe["main_ingredients"] or [])    if is_valid_main_ingredient(n)]
        sub_names  = [n for n in req_names if n not in set(main_names)]

        owned_main   = [n for n in main_names if n in fridge_map]
        missing_main = [n for n in main_names if n not in fridge_map]
        owned_sub    = [n for n in sub_names  if n in fridge_map]
        missing_sub  = [n for n in sub_names  if n not in fridge_map]

        results.append({
            # 기존 App.tsx 호환 필드
            "recipe_id":            rid,
            "title":                recipe["title"],
            "pred_score":           round(float(feat_row["pred_score"]), 4),
            "score_100":            float(feat_row["score_100"]),          # [v5] 100점 만점
            "level":                recipe.get("level", "보통"),
            "timeMin":              float(recipe.get("timeMin", 30)),
            "mood":                 recipe.get("mood", "실속 있는 한 끼"),
            "main_match_ratio":     round(feat_row["match_rate"], 4),
            "required_match_ratio": round(feat_row["match_rate"], 4),
            "weighted_match_ratio": round(feat_row["weighted_match_rate"], 4),  # [v5]
            "urgency_score":        round(feat_row["avg_urgency"], 4),
            "urgency_weighted":     round(feat_row["urgency_weighted"], 4),     # [v5]
            "protein_score":        round(feat_row["main_protein_score"], 4),   # [v5]
            "consume_efficiency":   round(feat_row["absolute_volume"], 4),
            "missing_required":     int(feat_row["missing_sub"]),
            "allergy_hit":          0,
            # 보유/미보유 상세
            "owned_main":           owned_main,
            "missing_main_names":   missing_main,
            "owned_sub":            owned_sub,
            "missing_sub_names":    missing_sub,
            "match_rate_pct":       round(feat_row["match_rate"] * 100, 1),
            "owned_qty_score":      round(feat_row["owned_qty_score"], 4),
        })

    return results


# ── 엔드포인트 ────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "recipes": len(recipes), "ingredients": len(ingredient_master)}


@app.get("/ingredients")
def get_ingredients(limit: int = 1000):
    result = (
        ingredient_master[["id", "name", "category", "expiryDay", "unit", "allergy"]]
        .head(limit)
        .fillna("")
        .rename(columns={
            "id":        "ingredient_id",
            "name":      "ingredient_name",
            "expiryDay": "expiry_day",
        })
        .to_dict(orient="records")
    )
    return {"ingredients": result}


class SelectedRecommendRequest(BaseModel):
    selected_ingredient_ids: List[str]
    match_mode: str = 'or'
    household_size: int = 1
    day_of_week: int = 0
    hour: int = 19
    allergies: List[str] = []
    top_k: int = 20


@app.post("/recommend")
def recommend(payload: RecommendRequest):
    return recommend_top_k(payload)


@app.post("/recommend/selected")
def recommend_selected(payload: SelectedRecommendRequest):
    selected_names = []
    for sid in payload.selected_ingredient_ids:
        info = ing_by_id.get(sid)
        if info:
            selected_names.append(info["name"])
    if not selected_names:
        return []
    selected_set = set(selected_names)

    filtered = recipes.copy()
    if payload.allergies:
        user_allergy_set = set(payload.allergies)
        def has_allergy(x):
            algs = set(x) if isinstance(x, list) and x else set()
            return bool(algs & user_allergy_set)
        filtered = filtered[~filtered["recipe_allergies"].apply(has_allergy)]
    filtered = filtered[filtered["required_ingredients"].apply(lambda x: bool(x))]
    if filtered.empty:
        return []

    if payload.match_mode == 'and':
        def contains_selected(req_list):
            return all(name in set(req_list or []) for name in selected_names)
    else:
        def contains_selected(req_list):
            return any(name in selected_set for name in (req_list or []))

    matched = filtered[filtered["required_ingredients"].apply(contains_selected)].copy()
    if matched.empty:
        return []

    def calc_match_score(row):
        req  = set(row["required_ingredients"] or [])
        main = set(row["main_ingredients"] or [])
        matched_selected = selected_set & req
        # [v5] 메인 재료 보너스, 단백질 메인재료는 3배 가중
        main_bonus = sum(
            3.0 if _is_protein(n) else 2.0
            for n in (selected_set & main)
        )
        return (len(matched_selected) + main_bonus) / max(len(selected_set), 1)

    matched["_score"] = matched.apply(calc_match_score, axis=1)
    top_df = matched.sort_values("_score", ascending=False).head(payload.top_k)

    results = []
    for _, row in top_df.iterrows():
        req_names  = [n for n in (row["required_ingredients"] or []) if is_valid_ingredient(n)]
        main_names = [n for n in (row["main_ingredients"] or [])     if is_valid_main_ingredient(n)]
        sub_names  = [n for n in req_names if n not in set(main_names)]
        owned_main   = [n for n in main_names if n in selected_set]
        missing_main = [n for n in main_names if n not in selected_set]
        owned_sub    = [n for n in sub_names  if n in selected_set]
        missing_sub  = [n for n in sub_names  if n not in selected_set]
        match_rate = len(selected_set & set(req_names)) / max(len(req_names), 1)
        score_100  = round(float(row["_score"]) * 100, 1)   # [v5] 100점 만점

        results.append({
            "recipe_id":            row["recipe_id"],
            "title":                row["title"],
            "pred_score":           round(float(row["_score"]), 4),
            "score_100":            score_100,
            "level":                row.get("level", "보통"),
            "timeMin":              float(row.get("timeMin", 30)),
            "mood":                 row.get("mood", "실속 있는 한 끼"),
            "main_match_ratio":     round(match_rate, 4),
            "required_match_ratio": round(match_rate, 4),
            "weighted_match_ratio": round(match_rate, 4),
            "urgency_score":        0.0,
            "urgency_weighted":     0.0,
            "protein_score":        0.0,
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


# ── 레시피 상세 엔드포인트 ───────────────────────────────────
@app.get("/recipe/detail")
async def get_recipe_detail(title: str):
    cache_key = title.strip()
    if cache_key in _recipe_detail_cache:
        return _recipe_detail_cache[cache_key]
    if not FOOD_API_KEY:
        raise HTTPException(status_code=503, detail="FOOD_API_KEY 환경변수가 설정되지 않았습니다.")

    async def fetch_by_name(name: str):
        url = f"{FOOD_API_BASE}/{FOOD_API_KEY}/COOKRCP01/json/1/5/RCP_NM={name}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url)
            res.raise_for_status()
        data = res.json()
        rows = data.get("COOKRCP01", {}).get("row", [])
        return [r for r in rows if r.get("RCP_NM", "").strip() == name]

    rows = await fetch_by_name(cache_key)
    if not rows:
        no_space = cache_key.replace(" ", "")
        if no_space != cache_key:
            rows = await fetch_by_name(no_space)
    if not rows:
        raise HTTPException(status_code=404,
                            detail=f"'{title}' 레시피를 공공데이터에서 찾을 수 없습니다.")

    row = rows[0]
    steps = []
    for i in range(1, 21):
        key  = f"MANUAL{str(i).zfill(2)}"
        ikey = f"MANUAL_IMG{str(i).zfill(2)}"
        desc = (row.get(key) or "").strip()
        if not desc:
            break
        steps.append({"order": i, "desc": desc, "image": (row.get(ikey) or "").strip()})

    result = {
        "title":       row.get("RCP_NM", "").strip(),
        "image":       (row.get("ATT_FILE_NO_MAIN") or "").strip(),
        "category":    (row.get("RCP_PAT2") or "").strip(),
        "calorie":     (row.get("INFO_ENG") or "").strip(),
        "ingredients": (row.get("RCP_PARTS_DTLS") or "").strip(),
        "steps":       steps,
    }
    _recipe_detail_cache[cache_key] = result
    return result