import { createContext, useContext, useReducer, useCallback } from 'react';
import { ingredientMaster } from '../data/ingredientMaster';
import { recipes, recipeItems } from '../data/recipes';

const AppContext = createContext(null);

const initialUserProfile = {
  profile_id: 1,
  user_id: 1,
  household_size: 2,
  allergy_info: [], // array of allergy option ids
};

const initialInventory = [];
const initialCookingHistory = [];

function inventoryReducer(state, action) {
  switch (action.type) {
    case 'SET_INVENTORY':
      return Array.isArray(action.payload) ? action.payload : state;
    case 'ADD_ITEM': {
      const newItem = {
        inventory_id: state.length ? Math.max(...state.map((i) => i.inventory_id)) + 1 : 1,
        user_id: 1,
        ingredient_id: action.payload.ingredient_id,
        quantity: Math.max(0, Number(action.payload.quantity) || 0),
        unit: action.payload.unit || 'g',
        expiry_date: action.payload.expiry_date,
        storage_type: action.payload.storage_type || 'Fridge',
        created_at: new Date().toISOString(),
        status: 'active',
      };
      return [...state, newItem];
    }
    case 'UPDATE_ITEM': {
      return state.map((item) =>
        item.inventory_id === action.payload.inventory_id
          ? { ...item, ...action.payload.updates }
          : item
      );
    }
    case 'REMOVE_ITEM':
      return state.filter((i) => i.inventory_id !== action.payload.inventory_id);
    case 'DEDUCT_INGREDIENTS': {
      const deductions = action.payload; // [{ ingredient_id, quantity, unit }, ...]
      return state
        .map((item) => {
          const d = deductions.find(
            (x) => x.ingredient_id === item.ingredient_id && (x.unit === item.unit || x.unit === 'ea')
          );
          if (!d) return item;
          const deductQty = Math.min(item.quantity, d.quantity);
          const newQty = Math.max(0, item.quantity - deductQty);
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        })
        .filter(Boolean);
    }
    default:
      return state;
  }
}

function profileReducer(state, action) {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...initialUserProfile, ...action.payload };
    case 'UPDATE_PROFILE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

function cookingHistoryReducer(state, action) {
  switch (action.type) {
    case 'ADD_LOG':
      return [
        ...state,
        {
          log_id: state.length ? Math.max(...state.map((l) => l.log_id)) + 1 : 1,
          user_id: 1,
          recipe_id: action.payload.recipe_id,
          rating: action.payload.rating ?? 0,
          cooked_at: new Date().toISOString(),
        },
      ];
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [inventory, dispatchInventory] = useReducer(inventoryReducer, initialInventory);
  const [userProfile, dispatchProfile] = useReducer(profileReducer, initialUserProfile);
  const [cookingHistory, dispatchCooking] = useReducer(cookingHistoryReducer, initialCookingHistory);

  const addInventoryItem = useCallback((item) => {
    dispatchInventory({ type: 'ADD_ITEM', payload: item });
  }, []);

  const updateInventoryItem = useCallback((inventory_id, updates) => {
    dispatchInventory({ type: 'UPDATE_ITEM', payload: { inventory_id, updates } });
  }, []);

  const removeInventoryItem = useCallback((inventory_id) => {
    dispatchInventory({ type: 'REMOVE_ITEM', payload: { inventory_id } });
  }, []);

  const deductIngredientsForRecipe = useCallback((recipeId) => {
    const items = recipeItems.filter((ri) => ri.recipe_id === recipeId);
    const deductions = items.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit,
    }));
    dispatchInventory({ type: 'DEDUCT_INGREDIENTS', payload: deductions });
    return items;
  }, []);

  const updateProfile = useCallback((updates) => {
    dispatchProfile({ type: 'UPDATE_PROFILE', payload: updates });
  }, []);

  const addCookingLog = useCallback((recipe_id, rating = 0) => {
    dispatchCooking({ type: 'ADD_LOG', payload: { recipe_id, rating } });
  }, []);

  const getIngredientById = useCallback((id) => {
    return ingredientMaster.find((i) => i.ingredient_id === id);
  }, []);

  const getRecipeById = useCallback((id) => {
    return recipes.find((r) => r.recipe_id === id);
  }, []);

  const getRecipeItemsWithNames = useCallback((recipeId) => {
    const items = recipeItems.filter((ri) => ri.recipe_id === recipeId);
    return items.map((ri) => ({
      ...ri,
      name: getIngredientById(ri.ingredient_id)?.name ?? '재료',
    }));
  }, [getIngredientById]);

  const value = {
    inventory,
    userProfile,
    cookingHistory,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    deductIngredientsForRecipe,
    updateProfile,
    addCookingLog,
    getIngredientById,
    getRecipeById,
    getRecipeItemsWithNames,
    ingredientMaster,
    recipes,
    recipeItems,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
