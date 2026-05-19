# 🥦 냉부해 (NaengBuHae) 

- AI 기반 개인화 냉장고 관리 및 레시피 추천 서비스
- 1인 가구의 식재료 소비 효율화를 위한 모바일 퍼스트 재고 관리 및 하이브리드 레시피 추천 웹 앱 MVP


## 🎯 프로젝트 개요 & 핵심 문제 정의

- **배경**: 1인 가구 증가에 따른 혼밥·집밥 문화 확산 및 보관법 미숙으로 인한 식재료 폐기율 증가(2인 가구 대비 2배)
- **핵심 유저 Pain Point**: "냉장고에 재료는 있는데 무엇을 조합해야 할지 모르겠고, 상해서 버리는 식재료가 너무 많다."
- **솔루션**: 17개 피처 기반의 AI/콘텐츠 하이브리드 추천 로직을 통해 유통기한 임박 재료를 우선 소싱하고, 요리 완료 시 실시간 재고 차감 및 수량 중심의 게이미피케이션 UX("식재료 OOg 구출")를 통해 리텐션을 유도합니다.

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
