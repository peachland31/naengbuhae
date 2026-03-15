/**
 * Mock API service (sequence diagram: Client <-> API Server <-> DB)
 * Simulates 1.5s delay for "Analyzing..." and returns filtered recipes.
 */

import { recipes, recipeItems } from '../data/recipes';
import { ingredientMaster } from '../data/ingredientMaster';
import { allergyOptions } from '../data/allergyOptions';

const MOCK_DELAY_MS = 1500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchInitialProfile() {
  await delay(300);
  return {
    profile_id: 1,
    user_id: 1,
    household_size: 2,
    allergy_info: [],
  };
}

export async function saveProfile(profile) {
  await delay(200);
  return { success: true };
}

export async function searchIngredients(query) {
  await delay(150);
  const q = (query || '').trim().toLowerCase();
  if (!q) return ingredientMaster.slice(0, 20);
  return ingredientMaster.filter((i) => i.name.toLowerCase().includes(q));
}

export async function getInventoryList() {
  await delay(200);
  return []; // actual data from context
}

export async function recommendRecipesAuto(inventory, allergyIds) {
  await delay(MOCK_DELAY_MS);
  const expiringIngredientIds = (inventory || [])
    .filter((inv) => {
      const d = new Date(inv.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      const diffDays = (d - today) / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    })
    .map((inv) => inv.ingredient_id);
  return filterRecipesByIngredientsAndAllergy(
    expiringIngredientIds.length ? expiringIngredientIds : inventory?.map((i) => i.ingredient_id) || [],
    allergyIds
  );
}

export async function recommendRecipesManual(selectedIngredientIds, allergyIds) {
  await delay(MOCK_DELAY_MS);
  return filterRecipesByIngredientsAndAllergy(selectedIngredientIds || [], allergyIds);
}

function filterRecipesByIngredientsAndAllergy(ingredientIds, allergyInfoOptionIds) {
  const forbiddenLabels = new Set(
    (allergyInfoOptionIds || [])
      .map((id) => allergyOptions.find((a) => a.id === id)?.label)
      .filter(Boolean)
  );
  const forbiddenIngredientNames = new Set(
    ingredientMaster.filter((i) => forbiddenLabels.has(i.name)).map((i) => i.name)
  );
  const idSet = new Set(ingredientIds);

  const recipeIdsWithForbidden = new Set();
  recipes.forEach((r) => {
    const rItems = recipeItems.filter((ri) => ri.recipe_id === r.recipe_id);
    const hasForbidden = rItems.some((ri) => {
      const ing = ingredientMaster.find((i) => i.ingredient_id === ri.ingredient_id);
      return ing && forbiddenIngredientNames.has(ing.name);
    });
    if (hasForbidden) recipeIdsWithForbidden.add(r.recipe_id);
  });

  const matched = recipes.filter((r) => {
    if (recipeIdsWithForbidden.has(r.recipe_id)) return false;
    const rItems = recipeItems.filter((ri) => ri.recipe_id === r.recipe_id);
    const recipeIngIds = rItems.map((ri) => ri.ingredient_id);
    const hasMatch = recipeIngIds.some((id) => idSet.has(id));
    return hasMatch;
  });

  return matched;
}

export async function getRecipeDetail(recipeId) {
  await delay(200);
  const recipe = recipes.find((r) => r.recipe_id === recipeId);
  if (!recipe) return null;
  const items = recipeItems.filter((ri) => ri.recipe_id === recipeId);
  return { ...recipe, items };
}
