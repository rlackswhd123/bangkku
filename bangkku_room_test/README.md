# 방꾸 - 시스템 선반 레이아웃 편집기

방 크기를 mm 단위로 정확하게 입력하고, 3D 원근감 있는 방 뷰에서 시스템 선반과 기둥을 배치할 수 있는 웹 애플리케이션입니다.

## 기능

- ✅ 방 크기 mm 단위 입력 및 검증
- ✅ 3D 원근감 있는 방 렌더링
- ✅ 정면 벽 영역 자동 계산 및 표시
- ✅ mm ↔ pixel 좌표 변환
- ✅ 기둥 배치 기본 기능
- ✅ 치수 표시 (mm 라벨링)

## 설치 및 실행

### 1. 의존성 설치

\`\`\`bash
npm install
\`\`\`

### 2. 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

### 3. 빌드

\`\`\`bash
npm run build
\`\`\`

## 기술 스택

- **React 18** - UI 프레임워크
- **TypeScript** - 타입 안정성
- **Canvas API** - 3D 렌더링
- **Vite** - 빌드 도구

## 프로젝트 구조

\`\`\`
bangkku_room/
├── src/
│   ├── components/       # React 컴포넌트
│   │   ├── RoomCanvas.tsx
│   │   └── RoomSettingsPanel.tsx
│   ├── utils/            # 유틸리티 함수
│   │   ├── coordinates.ts
│   │   └── validation.ts
│   ├── types.ts          # TypeScript 타입 정의
│   ├── App.tsx           # 메인 앱
│   ├── main.tsx          # 엔트리 포인트
│   └── index.css         # 글로벌 스타일
├── PRD.md                # 제품 요구사항 문서
└── package.json
\`\`\`

## 사용 방법

1. 우측 패널에서 방의 **폭(mm)**과 **높이(mm)**를 입력합니다.
2. **적용** 버튼을 클릭하면 3D 방 뷰가 업데이트됩니다.
3. 방 크기에 따라 기둥과 선반을 배치할 수 있습니다.

## 제약사항

- 폭: 1200mm ~ 6000mm
- 높이: 2000mm ~ 3000mm

## 향후 개발 계획

- [ ] 기둥 동적 추가/삭제/이동
- [ ] 선반 배치 기능
- [ ] 방 프로젝트 저장/불러오기

