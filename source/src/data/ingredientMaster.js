/**
 * Ingredient Master Data (ERD: Ingredient, Category)
 * Used for Add Ingredient autocomplete/dropdown - no plain text input (typo prevention).
 */

export const STORAGE_TYPES = ['Fridge', 'Freezer', 'Room Temp'];
export const UNITS = ['g', 'ea', 'ml'];

export const categories = [
  { category_id: 1, name: '채소' },
  { category_id: 2, name: '과일' },
  { category_id: 3, name: '육류' },
  { category_id: 4, name: '해산물' },
  { category_id: 5, name: '유제품' },
  { category_id: 6, name: '계란·알류' },
  { category_id: 7, name: '곡류·면류' },
  { category_id: 8, name: '조미료·소스' },
  { category_id: 9, name: '기타' },
];

// expiry_day: default days from today for expiry_date when added
export const ingredientMaster = [
  { ingredient_id: 1, name: '양파', category_id: 1, expiry_day: 14, kcal: 40 },
  { ingredient_id: 2, name: '당근', category_id: 1, expiry_day: 14, kcal: 41 },
  { ingredient_id: 3, name: '감자', category_id: 1, expiry_day: 21, kcal: 77 },
  { ingredient_id: 4, name: '대파', category_id: 1, expiry_day: 7, kcal: 32 },
  { ingredient_id: 5, name: '버섯', category_id: 1, expiry_day: 5, kcal: 22 },
  { ingredient_id: 6, name: '브로콜리', category_id: 1, expiry_day: 5, kcal: 34 },
  { ingredient_id: 7, name: '시금치', category_id: 1, expiry_day: 4, kcal: 23 },
  { ingredient_id: 8, name: '양배추', category_id: 1, expiry_day: 14, kcal: 25 },
  { ingredient_id: 9, name: '토마토', category_id: 1, expiry_day: 7, kcal: 18 },
  { ingredient_id: 10, name: '오이', category_id: 1, expiry_day: 7, kcal: 15 },
  { ingredient_id: 11, name: '사과', category_id: 2, expiry_day: 21, kcal: 52 },
  { ingredient_id: 12, name: '바나나', category_id: 2, expiry_day: 5, kcal: 89 },
  { ingredient_id: 13, name: '레몬', category_id: 2, expiry_day: 14, kcal: 29 },
  { ingredient_id: 14, name: '닭가슴살', category_id: 3, expiry_day: 2, kcal: 165 },
  { ingredient_id: 15, name: '돼지고기', category_id: 3, expiry_day: 3, kcal: 242 },
  { ingredient_id: 16, name: '소고기', category_id: 3, expiry_day: 3, kcal: 250 },
  { ingredient_id: 17, name: '베이컨', category_id: 3, expiry_day: 7, kcal: 417 },
  { ingredient_id: 18, name: '새우', category_id: 4, expiry_day: 2, kcal: 99 },
  { ingredient_id: 19, name: '연어', category_id: 4, expiry_day: 2, kcal: 208 },
  { ingredient_id: 20, name: '두부', category_id: 1, expiry_day: 5, kcal: 76 },
  { ingredient_id: 21, name: '우유', category_id: 5, expiry_day: 7, kcal: 42 },
  { ingredient_id: 22, name: '치즈', category_id: 5, expiry_day: 30, kcal: 402 },
  { ingredient_id: 23, name: '계란', category_id: 6, expiry_day: 21, kcal: 155 },
  { ingredient_id: 24, name: '밀가루', category_id: 7, expiry_day: 180, kcal: 364 },
  { ingredient_id: 25, name: '간장', category_id: 8, expiry_day: 365, kcal: 53 },
  { ingredient_id: 26, name: '된장', category_id: 8, expiry_day: 90, kcal: 49 },
  { ingredient_id: 27, name: '고추장', category_id: 8, expiry_day: 90, kcal: 80 },
  { ingredient_id: 28, name: '마늘', category_id: 1, expiry_day: 30, kcal: 149 },
  { ingredient_id: 29, name: '생강', category_id: 1, expiry_day: 21, kcal: 80 },
];
