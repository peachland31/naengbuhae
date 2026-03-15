from typing import List, Optional
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "fridge_recipe_recommender.pkl"
RECIPES_PATH = MODEL_DIR / "recipes_serving.pkl"
INGREDIENT_MASTER_PATH = MODEL_DIR / "ingredient_master.pkl"
RECIPE_ITEMS_PATH = MODEL_DIR / "recipe_items_serving.pkl"

app = FastAPI(title="Naengbuhae Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모델 및 데이터 로드
model = joblib.load(MODEL_PATH)
recipes = pd.read_pickle(RECIPES_PATH)
ingredient_master = pd.read_pickle(INGREDIENT_MASTER_PATH)
recipe_items_df = pd.read_pickle(RECIPE_ITEMS_PATH)


# --- [Pydantic 스키마 정의] ---
class InventoryItem(BaseModel):
    ingredient_id: str
    owned_qty: float
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

class SelectedRecommendRequest(BaseModel):
    selected_ingredient_ids: List[str]
    household_size: int = 1

# --- [신규 API: 식재료 마스터 목록] ---
@app.get("/ingredients")
def get_ingredients(limit: int = 100):
    # ingredient_master 데이터프레임에서 필요한 컬럼만 추출하여 반환
    # 결측치 처리 및 딕셔너리 변환
    ingredients = ingredient_master[['ingredient_id', 'ingredient_name', 'category']].head(limit).fillna("").to_dict(orient="records")
    return {"ingredients": ingredients}

# (NEW) 프론트엔드에 내려줄 식재료 계량 정보 스키마
class AdjustedIngredient(BaseModel):
    ingredient_id: str
    adjusted_quantity: float
    unit: str
    is_seasoning: bool

class RecipeRecommendation(BaseModel):
    recipe_id: str
    title: str
    pred_score: float
    level: Optional[str] = None
    timeMin: Optional[float] = None
    mood: Optional[str] = None
    main_match_ratio: float
    required_match_ratio: float
    urgency_score: float
    consume_efficiency: float
    missing_required: int
    allergy_hit: int
    adjusted_ingredients: List[AdjustedIngredient] = [] # (NEW) 응답에 추가됨


# --- [핵심 로직 함수] ---
def context_flags(context):
    dow = context["day_of_week"]
    hour = context["hour"]
    is_weekend = int(dow >= 5)
    is_weekday_dinner = int(dow < 5 and 18 <= hour <= 21)
    is_late_night = int(hour >= 22 or hour <= 5)
    return is_weekend, is_weekday_dinner, is_late_night


def compute_features_for_pair(recipe_row, recipe_items_df, inventory_df, context):
    recipe_id = recipe_row["id"]
    sub = recipe_items_df[recipe_items_df["recipe_id"] == recipe_id].copy()

    inv_ids = set(inventory_df["ingredient_id"].astype(str).tolist())
    inv_map = inventory_df.set_index("ingredient_id").to_dict("index") if len(inventory_df) else {}

    all_ing = recipe_row["all_ingredient_ids"] or []
    main_ing = recipe_row["main_ingredient_ids"] or []
    req_ing = recipe_row["required_ingredient_ids"] or []
    seasoning_ing = recipe_row["seasoning_ingredient_ids"] or []

    matched_main = sum(1 for iid in main_ing if iid in inv_ids)
    matched_required = sum(1 for iid in req_ing if iid in inv_ids)
    matched_all = sum(1 for iid in all_ing if iid in inv_ids)
    matched_seasoning = sum(1 for iid in seasoning_ing if iid in inv_ids)

    main_match_ratio = matched_main / max(1, len(main_ing))
    required_match_ratio = matched_required / max(1, len(req_ing))
    overall_match_ratio = matched_all / max(1, len(all_ing))
    seasoning_match_ratio = matched_seasoning / max(1, len(seasoning_ing)) if len(seasoning_ing) else 1.0

    missing_required = max(0, len(req_ing) - matched_required)
    missing_main = max(0, len(main_ing) - matched_main)

    enough_qty_count = 0
    partial_qty_count = 0
    urgency_scores = []
    consumption_eff_list = []

    for _, row in sub.iterrows():
        iid = str(row["ingredient_id"])
        # 가구원 수를 반영하여 내가 가진 재료가 충분한지 확인
        req_qty = float(row["base_quantity"]) * context["household_size"]

        if iid in inv_map:
            owned_qty = float(inv_map[iid]["owned_qty"])
            days_left = int(inv_map[iid]["days_left"])

            if owned_qty >= req_qty:
                enough_qty_count += 1
            elif owned_qty > 0:
                partial_qty_count += 1

            if not bool(row["is_seasoning"]):
                urgency_scores.append(1.0 / (max(days_left, 0) + 1.0))
                consumption_eff_list.append(min(req_qty / max(owned_qty, 1e-6), 1.0))
        else:
            if not bool(row["is_seasoning"]):
                urgency_scores.append(0.0)
                consumption_eff_list.append(0.0)

    quantity_sufficiency_ratio = enough_qty_count / max(1, len(req_ing))
    partial_coverage_ratio = (enough_qty_count + 0.5 * partial_qty_count) / max(1, len(req_ing))
    urgency_score = float(np.mean(urgency_scores)) if urgency_scores else 0.0
    consume_efficiency = float(np.mean(consumption_eff_list)) if consumption_eff_list else 0.0

    # (수정) 하드 필터링을 거쳤으므로 allergy_hit은 사실상 0이 되지만, 피처 구성을 위해 남겨둠
    recipe_allergies = set(recipe_row.get("recipe_allergies", []) or [])
    user_allergies = set(context["allergies"] or [])
    allergy_hit = int(len(recipe_allergies.intersection(user_allergies)) > 0)

    is_weekend, is_weekday_dinner, is_late_night = context_flags(context)
    easy_bonus = 1.0 if recipe_row["difficulty_num"] <= 1 else 0.0
    quick_bonus = 1.0 if float(recipe_row["timeMin"]) <= 20 else 0.0

    if is_weekday_dinner:
        context_fit = 0.6 * quick_bonus + 0.4 * easy_bonus
    elif is_weekend:
        context_fit = 0.5 + 0.2 * int(recipe_row["difficulty_num"] <= 2)
    elif is_late_night:
        context_fit = 1.0 if float(recipe_row["timeMin"]) <= 15 else 0.2
    else:
        context_fit = 0.5 * quick_bonus + 0.5 * easy_bonus

    mood_pref = 1.0 if str(recipe_row.get("mood", "")) in (context["preferred_moods"] or []) else 0.0

    return {
        "recipe_id": recipe_id,
        "household_size": context["household_size"],
        "hour": context["hour"],
        "day_of_week": context["day_of_week"],
        "is_weekend": is_weekend,
        "is_weekday_dinner": is_weekday_dinner,
        "inventory_confidence": context["inventory_confidence"],
        "time_min": float(recipe_row["timeMin"]),
        "difficulty_num": float(recipe_row["difficulty_num"]),
        "recipe_num_ingredients": len(all_ing),
        "recipe_num_required_ingredients": len(req_ing),
        "recipe_num_main_ingredients": len(main_ing),
        "main_match_ratio": main_match_ratio,
        "required_match_ratio": required_match_ratio,
        "overall_match_ratio": overall_match_ratio,
        "seasoning_match_ratio": seasoning_match_ratio,
        "missing_required": missing_required,
        "missing_main": missing_main,
        "quantity_sufficiency_ratio": quantity_sufficiency_ratio,
        "partial_coverage_ratio": partial_coverage_ratio,
        "urgency_score": urgency_score,
        "consume_efficiency": consume_efficiency,
        "total_consumed_ratio": 0.0,
        "expired_count": 0,
        "soon_expiring_count": 0,
        "allergy_hit": allergy_hit,
        "context_fit": context_fit,
        "mood_pref": mood_pref,
    }


def recommend_top_k(payload: RecommendRequest):
    inventory_df = pd.DataFrame([item.model_dump() for item in payload.inventory])
    if len(inventory_df) > 0:
        inventory_df["ingredient_id"] = inventory_df["ingredient_id"].astype(str)
        inventory_df = inventory_df.merge(
            ingredient_master[["ingredient_id", "is_seasoning", "allergy", "expiry_day", "unit"]],
            on="ingredient_id",
            how="left"
        )
        inventory_df["is_seasoning"] = inventory_df["is_seasoning"].fillna(False)

    context = {
        "household_size": payload.household_size,
        "day_of_week": payload.day_of_week,
        "hour": payload.hour,
        "preferred_moods": payload.preferred_moods,
        "allergies": payload.allergies,
        "inventory_confidence": payload.inventory_confidence,
    }

    # --- [1단계 로직: 알레르기 하드 필터링 적용] ---
    filtered_recipes = recipes.copy()
    if payload.allergies:
        user_allergies_set = set(payload.allergies)
        
        def has_allergy(x):
            recipe_algs = set(x) if isinstance(x, (list, np.ndarray)) and x is not None else set()
            return len(recipe_algs.intersection(user_allergies_set)) > 0
            
        # 교집합이 없는(알레르기가 안 겹치는) 레시피만 필터링
        safe_mask = ~filtered_recipes["recipe_allergies"].apply(has_allergy)
        filtered_recipes = filtered_recipes[safe_mask]

    # --- [2단계 로직: 모델 추론 및 랭킹] ---
    rows = []
    for _, recipe_row in filtered_recipes.iterrows():
        rows.append(compute_features_for_pair(recipe_row, recipe_items_df, inventory_df, context))

    if not rows:
        return [] # 필터링 결과 추천할 레시피가 없는 경우 빈 리스트 반환

    feat_df = pd.DataFrame(rows)
    feature_cols = [c for c in feat_df.columns if c != "recipe_id"]
    feat_df["pred_score"] = np.clip(model.predict(feat_df[feature_cols]), 0, 1)

    out = feat_df.merge(
        recipes[["id", "title", "level", "timeMin", "mood"]],
        left_on="recipe_id",
        right_on="id",
        how="left"
    ).sort_values("pred_score", ascending=False).head(payload.top_k)

    top_k_list = out[[
        "recipe_id", "title", "pred_score", "level", "timeMin", "mood",
        "main_match_ratio", "required_match_ratio", "urgency_score",
        "consume_efficiency", "missing_required", "allergy_hit"
    ]].to_dict(orient="records")

    # --- [3단계 로직: 계량 조정 (후처리)] ---
    # ingredient_master에서 unit 정보를 빠르게 매핑하기 위한 딕셔너리 생성
    unit_map = ingredient_master.set_index("ingredient_id")["unit"].to_dict()

    final_response = []
    for recipe in top_k_list:
        # 해당 레시피의 원본 재료 데이터(1인분/기본 분량 기준) 로드
        items = recipe_items_df[recipe_items_df["recipe_id"] == recipe["recipe_id"]]
        
        adjusted_ings = []
        for _, item in items.iterrows():
            iid = str(item["ingredient_id"])
            base_qty = float(item["base_quantity"])
            
            # 가구원 수에 따른 실수량 연산 처리
            adjusted_qty = round(base_qty * payload.household_size, 2)
            
            adjusted_ings.append({
                "ingredient_id": iid,
                "adjusted_quantity": adjusted_qty,
                "unit": str(unit_map.get(iid, "")), # 마스터 DB에서 단위 맵핑
                "is_seasoning": bool(item["is_seasoning"])
            })
            
        recipe["adjusted_ingredients"] = adjusted_ings
        final_response.append(recipe)

    return final_response

# --- [라우터 정의] ---
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/recommend")
def recommend(payload: RecommendRequest):
    recommendations = recommend_top_k(payload)

    detailed_results = []
    for rec in recommendations:
        recipe_detail = recipes[recipes["id"] == rec["recipe_id"]].iloc[0]
        items = recipe_items_df[
            recipe_items_df["recipe_id"] == rec["recipe_id"]
        ].to_dict(orient="records")

        rec_dict = dict(rec)
        rec_dict["steps"] = recipe_detail.get("steps", [])
        rec_dict["sauce"] = recipe_detail.get("sauce", [])
        rec_dict["items"] = items
        detailed_results.append(rec_dict)

    return detailed_results


# --- [신규 API: 수동 선택 추천 (OR 조건)] ---
""" @app.post("/recommend/selected")
def recommend_by_selected(payload: SelectedRecommendRequest):
    # ... (기존 1~4번 로직 동일) ...

    # 5. 프론트엔드 반환 포맷으로 변환 (상세 정보 필드 추가)
    # 6. 각 레시피의 전체 재료 목록도 포함시켜야 상세 모달에서 정상 작동합니다.
    final_list = []
    for _, row in matched_recipes.iterrows():
        r_id = row['recipe_id']
        items = recipe_items_df[recipe_items_df['recipe_id'] == r_id].to_dict(orient='records')
        
        recipe_dict = row.to_dict()
        recipe_dict['items'] = items
        # row에 이미 recipes 데이터가 merge되어 있으므로 steps, sauce가 포함되어 있을 겁니다.
        final_list.append(recipe_dict)
    
    return {"recommended_recipes": final_list} """


"""     @app.post("/recommend", response_model=List[RecipeRecommendation])
def recommend(payload: RecommendRequest):
    # 1. 기존 추천 로직 실행
    recommendations = recommend_top_k(payload) 
    
    # 2. 상세 정보(조리법, 재료 리스트) 추가 로직
    detailed_results = []
    for rec in recommendations:
        # recipes_serving(recipes)에서 해당 레시피의 상세 정보 가져오기
        recipe_detail = recipes[recipes['recipe_id'] == rec.recipe_id].iloc[0]
        recipe_detail = recipes[recipes["id"] == rec["recipe_id"]].iloc[0]

        # 해당 레시피의 전체 재료 목록(recipe_items_df) 가져오기
        items = recipe_items_df[recipe_items_df["recipe_id"] == rec["recipe_id"]].to_dict(orient="records")

        # 기존 추천 정보에 상세 필드 추가
        rec_dict = dict(rec)
        rec_dict["steps"] = recipe_detail.get("steps", [])
        rec_dict["sauce"] = recipe_detail.get("sauce", [])
        rec_dict["items"] = items # 모달에서 재료 체크를 위해 필요
        
        detailed_results.append(rec_dict)
        
    return detailed_results """