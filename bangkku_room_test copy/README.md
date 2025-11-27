# 방꾸 - 시스템 선반 레이아웃 편집기

Vue 3 + TypeScript + Canvas API 조합으로 구현된 시스템 행거(기둥/선반) 배치 편집기입니다. 방 폭을 mm 단위로 정의하면 정면 벽 영역이 자동 스케일링되고, 사용자는 캔버스 위에서 기둥과 선반을 추가·이동·삭제할 수 있습니다.

## 기술 스택

- Vue 3 Composition API
- TypeScript
- HTML Canvas API
- Vite 5

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 번들
npm run preview  # build 결과 미리보기
```

## 디렉터리 개요

```
bangkku_room_test/
├── index.html                 # Vite 진입 HTML
├── package.json               # npm 스크립트·의존성
├── package-lock.json          # 의존성 잠금 파일
├── PRD.md                     # 기능/요구사항 명세
├── README.md                  # 프로젝트 개요 문서
├── src/                       # 앱 소스 코드
│   ├── App.vue                # 최상위 Vue 컴포넌트
│   ├── main.ts                # Vue 부트스트랩
│   ├── index.css              # 전역 스타일
│   ├── images/                # 캔버스용 PNG 자산
│   │   ├── corner/            # 코너장 이미지 4종
│   │   └── pillar/            # 선반 타입별 이미지
│   ├── components/            # UI 컴포넌트
│   │   ├── ObjectInfoPanel.vue
│   │   ├── RoomCanvas.vue
│   │   ├── RoomSettingsPanel.vue
│   │   ├── RoomSizeModal.vue
│   │   └── Toast.vue
│   ├── modules/               # 캔버스 도메인 모듈
│   │   └── roomCanvas/
│   │       ├── canvas/
│   │       │   └── drawers/   # 캔버스 드로잉 함수
│   │       │       ├── buttons.ts
│   │       │       ├── pillars.ts
│   │       │       ├── shelves.ts
│   │       │       ├── skeleton.ts
│   │       │       └── spacings.ts
│   │       ├── hooks/         # 캔버스 관련 훅
│   │       │   ├── useImageAssets.ts
│   │       │   └── useRoomCanvasRenderer.ts
│   │       ├── interactions/  # 배치 제약 로직
│   │       │   └── constraints.ts
│   │       └── components/    # 향후 캔버스 UI용 자리
│   ├── types.ts               # 도메인 타입·상수
│   └── utils/                 # 공통 유틸
│       ├── coordinates.ts
│       └── validation.ts
├── tsconfig.json              # TS 컴파일 설정
├── tsconfig.node.json         # Vite/Node용 TS 설정
└── vite.config.ts             # Vite 설정
```

## 핵심 파일 역할

- `src/App.vue`  
  전체 페이지 레이아웃과 상태를 관리합니다. 방 정보(`RoomState`), 기둥·선반 배열, 선택 상태, 토스트, 삭제 확인 모달 등을 제어하며 자식 컴포넌트로 props/emit을 전달합니다.

- `src/main.ts`, `src/index.css`  
  Vue 앱 마운트 및 전역 스타일 정의입니다. 입력 스핀 버튼 제거, 포커스/버튼 인터랙션과 같은 공통 UI 규칙을 포함합니다.

- `src/components/RoomCanvas.vue`  
  편집기 캔버스.  
  - `useRoomCanvasRenderer`로 캔버스 렌더 사이클과 스케일 계산을 관리합니다.  
  - `useCursorUpdater`로 기둥/선반 드래그 가능한 영역에 따라 커서를 바꿉니다.  
  - 선반 타입 선택 모달, 코너장 확인 모달, 기둥 스타일 드롭다운 등 상호작용 UI를 포함하며, 기둥/선반 추가 버튼은 `calculateShelfButtonPositions` 결과를 사용합니다.

- `src/components/ObjectInfoPanel.vue`  
  선택된 기둥·선반 정보를 표시하고 삭제 버튼을 제공합니다. 기둥 목록을 토대로 선반 길이·높이를 계산하고, PNG 이미지를 동적으로 로드해 썸네일을 보여 줍니다.

- `src/components/RoomSizeModal.vue`  
  방 폭을 재설정하는 모달입니다. `validateRoomWidth`를 이용해 입력값을 검증하고, 가구가 있을 때 경고 메시지를 띄운 뒤 저장 시 부모에 `save` 이벤트를 emit합니다.

- `src/components/RoomSettingsPanel.vue`  
  폭·높이를 입력받는 보조 사이드패널 컴포넌트입니다. 현재 화면에는 노출되지 않지만, 폭/높이 동시 편집과 검증 로직이 구현되어 있어 향후 대시보드나 모바일 UI에서 재사용할 수 있습니다.

- `src/components/Toast.vue`  
  토스트 메시지를 보여주는 오버레이입니다. 지정한 `duration` 이후 자동으로 `close`를 emit하며, 최초 마운트 시 애니메이션 키프레임을 전역 `<style>`에 주입합니다.

- `src/modules/roomCanvas/hooks/useRoomCanvasRenderer.ts`  
  Canvas 렌더 파이프라인을 캡슐화합니다. 컨테이너 크기 → `calculateScale` → skeleton → 기둥/선반/버튼/고스트/치수 순으로 그리며, `ResizeObserver`로 반응형 리사이즈를 처리합니다.

- `src/modules/roomCanvas/hooks/useImageAssets.ts`  
  코너장/선반 PNG를 비동기로 로드해 `RoomCanvas`와 패널들이 공유할 수 있는 `ref`를 제공합니다.

- `src/modules/roomCanvas/canvas/drawers/*.ts`  
  Canvas에서 재사용되는 도형 그리기 유틸입니다.  
  - `skeleton.ts`: 파란/빨간 프레임과 방 너비 라벨을 그립니다.  
  - `buttons.ts`: 기둥/선반 추가 버튼 위치 계산과 드로잉.  
  - `pillars.ts`, `shelves.ts`: 기둥/선반 본체, 고스트, 코너장 이미지를 렌더링합니다.  
  - `spacings.ts`: 기둥 간·선반 간 간격(mm)을 텍스트로 표시합니다.

- `src/modules/roomCanvas/interactions/constraints.ts`  
  기둥 이동 시 최소/최대 간격을 보장하고, 선반 높이 조정 시 타입별 간격 규칙을 적용하도록 하는 검증 함수 팩토리입니다.

- `src/utils/coordinates.ts`  
  mm↔px 변환, 스케일 정보 계산, 그리드 스냅(`snapToGrid`) 등의 좌표계 유틸을 제공합니다. 캔버스 드로잉과 마우스 이벤트 모두에서 공통으로 사용됩니다.

- `src/utils/validation.ts`  
  방 폭·높이 입력값을 `ROOM_CONSTRAINTS` 범위로 검증하는 헬퍼입니다.

- `src/types.ts`  
  `RoomState`, `Pillar`, `Shelf`, `ScaleInfo`, 드래그 상태 타입과 방/가구 제약 상수, `DEFAULT_ROOM` 초기값이 정의되어 있습니다.

- `src/images/`  
  `corner/`는 코너장 이미지, `pillar/`는 선반 유형별 PNG를 담습니다. `useImageAssets`에서 URL 기반으로 불러와 Canvas와 패널에서 사용합니다.

- `PRD.md`  
  요구사항 및 UI 기획 문서입니다. 도메인 규칙과 제약을 확인할 때 참고합니다.

## 동작 흐름 요약

1. `App.vue`가 방/가구 상태와 선택 정보를 보유하고, `RoomCanvas`·`ObjectInfoPanel`·`RoomSizeModal`·`Toast`를 렌더링합니다.  
2. `RoomCanvas`는 `useRoomCanvasRenderer`를 통해 Canvas를 그리고, 사용자 액션을 emit하여 부모 상태를 갱신합니다.  
3. 객체 선택 시 `ObjectInfoPanel`이 상세 정보를 보여주고, 삭제 시 부모에서 실제 배열을 수정합니다.  
4. 방 폭을 재설정하면 모든 기둥/선반 상태를 초기화해 PRD에서 정의한 제약을 유지합니다.

> 새로운 캔버스 보조 UI가 필요하면 `src/modules/roomCanvas/components/` 디렉터리를 활용해 모듈화하고, 공통 로직은 `types.ts`·`utils`에 두면 유지보수가 수월합니다.
