/**
 * Mock Recipe + Recipe_item (ERD)
 * recipe_item links Recipe to Ingredient with quantity, unit for auto-deduction.
 */

export const recipes = [
  {
    recipe_id: 1,
    title: '양파달걀볶음',
    description: '간단한 양파와 계란으로 만드는 한 그릇 요리.',
    level: 1,
    total_cook_min: 15,
    steps: [
      '양파는 채 썰고, 계란은 풀어둡니다.',
      '팬에 기름을 두르고 양파를 볶다가 반투명해지면 소금을 뿌립니다.',
      '계란을 넣고 스크램블하듯 볶아 완성합니다.',
    ],
  },
  {
    recipe_id: 2,
    title: '당근샐러드',
    description: '당근과 레몬 드레싱의 상큼한 샐러드.',
    level: 1,
    total_cook_min: 10,
    steps: [
      '당근은 채 썰어 찬물에 담갔다가 물기를 제거합니다.',
      '레몬즙, 올리브오일, 소금, 후추로 드레싱을 만듭니다.',
      '당근과 드레싱을 섞어 완성합니다.',
    ],
  },
  {
    recipe_id: 3,
    title: '버섯토마토스크램블',
    description: '버섯과 토마토를 넣은 부드러운 스크램블 에그.',
    level: 1,
    total_cook_min: 12,
    steps: [
      '버섯과 토마토는 잘게 다집니다.',
      '계란을 풀고 버섯, 토마토를 섞습니다.',
      '팬에 기름을 두르고 부드럽게 스크램블해 완성합니다.',
    ],
  },
  {
    recipe_id: 4,
    title: '대파계란국',
    description: '대파와 계란으로 만드는 따뜻한 국.',
    level: 1,
    total_cook_min: 15,
    steps: [
      '대파는 어슷 썰어둡니다.',
      '물을 끓이고 국간장으로 간을 맞춥니다.',
      '대파를 넣고 한 소끔 끓인 뒤 계란을 풀어 넣어 완성합니다.',
    ],
  },
  {
    recipe_id: 5,
    title: '닭가슴살브로콜리볶음',
    description: '단백질 가득 닭가슴살과 브로콜리 볶음.',
    level: 2,
    total_cook_min: 25,
    steps: [
      '닭가슴살은 한입 크기로 썰고, 브로콜리는 작은 송이로 나눕니다.',
      '닭가슴살을 팬에 볶다가 표면이 하얗게 되면 브로콜리를 넣습니다.',
      '간장, 다진 마늘로 간하고 후추를 뿌려 완성합니다.',
    ],
  },
  {
    recipe_id: 6,
    title: '시금치된장국',
    description: '시금치와 두부가 들어간 구수한 된장국.',
    level: 1,
    total_cook_min: 20,
    steps: [
      '시금치는 끓는 물에 데친 뒤 물기를 짜고 먹기 좋게 자릅니다.',
      '두부는 작은 김이나 정육면체로 썹니다.',
      '물을 끓이고 된장을 풀어 넣은 뒤 두부, 시금치를 넣어 한 소끔 끓입니다.',
    ],
  },
  {
    recipe_id: 7,
    title: '연어구이',
    description: '간단한 연어 스테이크.',
    level: 2,
    total_cook_min: 20,
    steps: [
      '연어는 소금, 후추로 밑간합니다.',
      '팬에 기름을 두르고 연어를 굽습니다 (양면 각 3~4분).',
      '레몬을 곁들여 완성합니다.',
    ],
  },
  {
    recipe_id: 8,
    title: '바나나우유스무디',
    description: '바나나와 우유로 만드는 스무디.',
    level: 1,
    total_cook_min: 5,
    steps: [
      '바나나는 껍질을 벗겨 잘라둡니다.',
      '블렌더에 바나나, 우유, 얼음을 넣고 갑니다.',
      '컵에 담아 완성합니다.',
    ],
  },
];

// recipe_id, ingredient_id, quantity, unit (for auto-deduction)
export const recipeItems = [
  { recipe_item_id: 1, recipe_id: 1, ingredient_id: 1, quantity: 1, unit: 'ea' },
  { recipe_item_id: 2, recipe_id: 1, ingredient_id: 23, quantity: 2, unit: 'ea' },
  { recipe_item_id: 3, recipe_id: 2, ingredient_id: 2, quantity: 150, unit: 'g' },
  { recipe_item_id: 4, recipe_id: 2, ingredient_id: 13, quantity: 1, unit: 'ea' },
  { recipe_item_id: 5, recipe_id: 3, ingredient_id: 5, quantity: 50, unit: 'g' },
  { recipe_item_id: 6, recipe_id: 3, ingredient_id: 9, quantity: 1, unit: 'ea' },
  { recipe_item_id: 7, recipe_id: 3, ingredient_id: 23, quantity: 2, unit: 'ea' },
  { recipe_item_id: 8, recipe_id: 4, ingredient_id: 4, quantity: 1, unit: 'ea' },
  { recipe_item_id: 9, recipe_id: 4, ingredient_id: 23, quantity: 1, unit: 'ea' },
  { recipe_item_id: 10, recipe_id: 5, ingredient_id: 14, quantity: 200, unit: 'g' },
  { recipe_item_id: 11, recipe_id: 5, ingredient_id: 6, quantity: 100, unit: 'g' },
  { recipe_item_id: 12, recipe_id: 5, ingredient_id: 28, quantity: 10, unit: 'g' },
  { recipe_item_id: 13, recipe_id: 6, ingredient_id: 7, quantity: 100, unit: 'g' },
  { recipe_item_id: 14, recipe_id: 6, ingredient_id: 20, quantity: 100, unit: 'g' },
  { recipe_item_id: 15, recipe_id: 6, ingredient_id: 26, quantity: 15, unit: 'ml' },
  { recipe_item_id: 16, recipe_id: 7, ingredient_id: 19, quantity: 150, unit: 'g' },
  { recipe_item_id: 17, recipe_id: 7, ingredient_id: 13, quantity: 1, unit: 'ea' },
  { recipe_item_id: 18, recipe_id: 8, ingredient_id: 12, quantity: 1, unit: 'ea' },
  { recipe_item_id: 19, recipe_id: 8, ingredient_id: 21, quantity: 200, unit: 'ml' },
];
