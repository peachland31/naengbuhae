# 냉장부해 (NaengBuHae) – 내 냉장고 관리

모바일 퍼스트 냉장고 재고·레시피 추천 웹 앱 MVP입니다.

## 실행 방법

```bash
cd naengbuhae
npm install
npm run dev
```

`npm install` 시 캐시 권한 오류가 나면:

```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

## 기술 스택

- **React** (함수형 컴포넌트, Hooks)
- **Tailwind CSS** (Fresh Green #10B981, Warm Orange #F97316)
- **Lucide React** 아이콘
- **React Router** (하단 탭: 냉장고 | 추천 | 프로필)

## 주요 기능

- **탭 1 – 냉장고**: 유통기한 오름차순 정렬, 만료(빨강)/3일 이내(주황) 표시, FAB으로 재료 추가, Bottom Sheet에서 마스터 데이터 기반 자동완성·단위·유통기한·보관 유형 입력
- **탭 2 – 추천**: 자동(유통기한 임박 우선) / 수동(재료 체크 후 생성), 알레르기 정보로 레시피 제외, 1.5초 모의 분석
- **탭 3 – 레시피 상세**: 필요 재료·조리 순서, 하단 고정 "요리 완료" 버튼, 완료 시 재료 자동 차감 및 성공 모달
- **탭 4 – 프로필**: 가구 인원 수, 알레르기 정보(태그 선택)

## 프로젝트 구조

```
src/
├── components/   # UI 컴포넌트 (Card, Button, Badge, Input, BottomSheet), AddIngredientSheet
├── context/      # AppContext (Inventory, UserProfile, Cooking_history)
├── data/         # ingredientMaster, recipes, recipeItems, allergyOptions
├── pages/        # Fridge, Recommend, RecipeDetail, Profile
├── services/     # api.js (모의 API)
├── App.jsx
└── index.css
```

빌드: `npm run build`  
미리보기: `npm run preview`
