### 🎯 목표

1. **1단계 – 자동 배치 기능**

   * 현재 **선택된 가구(activeFurniture)** 에 대해 “적용” 버튼을 누르면,
   * **현재 면(face)의 PlacementRect[]** 중
     **가장 왼쪽에서 가구가 들어갈 수 있는 영역**에 자동으로 배치.

2. **2단계 – 드래그 이동 + 선반 충돌 제약**

   * 이미 배치된 가구를 드래그해서 이동할 수 있고,
   * **PlacementRect 밖(= 선반/기둥 등으로 막힌 영역)** 으로는
     고스트가 더 이상 움직이지 못하게 하는 제약 추가.

---

### 📦 전제 / 환경

* 사용 기술: Vue 3 + TypeScript (기존 RoomCanvas/placement 로직과 동일하게 작성).
* 이미 존재한다고 가정:

  * `PlacementRect` 계산 모듈 (예: `placement.ts`)
  * `furnitures.json` : 가구 메타 (widthMm, heightMm, prodKey 등)
  * 현재 face/room 상태를 들고 있는 Store 또는 composable
  * 그리드 기반 드래그 & 고스트 렌더링 로직 (기본 드래그는 이미 있음)

---

### 1단계 구현 지시: “적용 버튼 → 자동 배치”

**해야 할 일**

1. **함수 추가**

   * 예시 이름: `applyActiveFurnitureToCurrentFace()`
   * 위치: 현재 배치/room 상태를 관리하는 곳 (예: `useRoomStore`, `useRoomCanvasRenderer`, 등 적절한 곳)

2. **로직 요구사항**

* 입력 상태:

     * `activeFurniture` (widthMm, heightMm, prodKey 포함)
    * `currentFaceKey: FaceId` (예: 1 | 2 | 3 | 4)
   * 흐름:

   ```text
   1) 현재 face의 PlacementRect[] 가져오기
      - currentFaceKey(FaceId)로 필터링
      - xMm 오름차순 정렬

   2) 선택된 가구의 widthMm 로 들어갈 수 있는 Rect 찾기
      - rect.widthMm >= furniture.widthMm
      - 가장 먼저 만족하는 Rect가 "가장 왼쪽 가능한 위치"

   3) 배치 좌표 계산
      - rawX = rect.xMm
      - snappedX = round(rawX / gridSizeMm) * gridSizeMm
      - yMm = 0 (바닥 기준, 프로젝트에서 쓰는 값 사용)

   4) 상태에 가구 배치
      - store에 가구 엔티티 추가/업데이트
      - 속성: faceKey(FaceId), xMm, yMm, prodKey 등

   5) 예외
      - activeFurniture 없음 → 조용히 리턴 or 안내 토스트
      - 들어갈 수 있는 rect 없음 → "이 면에는 이 가구를 놓을 수 있는 공간이 없습니다" 토스트
   ```

3. **중요 포인트**

   * **1단계에서는** 다른 가구와의 충돌/겹침은 고려하지 말고,
   * 오직 PlacementRect 폭만 보고 “첫 번째로 들어가는 rect”를 찾는 단순 버전으로 구현해줘.

---

### 2단계 구현 지시: 드래그 이동 + 선반 충돌 제약

1단계가 끝난 후에 진행하는 단계.

**핵심 아이디어**

* 드래그 중 고스트는 **항상 그리드에 스냅된 좌표로 이동**하려 한다.
* 이동하려는 위치가 **PlacementRect 범위를 벗어나면**:

  * 고스트는 더 이상 그 방향으로 움직이지 않고,
  * **마지막으로 유효했던 위치에 멈춘다.**
* 마우스를 얼마나 멀리 끌어도, 고스트는 그 경계에서 더 안 나감.

---

#### 2-1. 위치 유효성 검사 함수 추가

* 예시 시그니처:

```ts
function canPlaceHereOnFace(
  faceKey: FaceId,          // 1 | 2 | 3 | 4
  furnitureWidthMm: number,
  candidateXMm: number,
): boolean
```

* 요구사항:

```text
1) faceKey에 해당하는 PlacementRect[] 가져오기

2) 후보 구간: [candidateXMm, candidateXMm + furnitureWidthMm]

3) 각 rect에 대해:
   rect 구간: [rect.xMm, rect.xMm + rect.widthMm]

   만약 후보 구간이 rect 구간 안에 완전히 포함된다면 → true 반환

4) 어떤 rect에도 완전히 포함되지 않으면 → false 반환
```

* 바닥 가구 기준으로 y는 고정이라, x만 검사하면 된다.

---

#### 2-2. 드래그 핸들러 수정

**드래그 시작 시**

```ts
let lastValidX: number;

function onDragStart(furnitureId: string) {
  const furniture = getFurnitureById(furnitureId);
  startGhost(furniture);      // 이미 있는 고스트 생성 로직 사용
  lastValidX = furniture.xMm; // 최초 유효 위치 저장
}
```

**드래그 중 (mousemove)**

```ts
function onDragMove(event: MouseEvent) {
  const mouseX = getMouseWorldX(event);      // 현재 마우스 위치를 mm 단위 or world 좌표로 변환
  const snappedX = snapToGrid(mouseX);       // gridSizeMm 기준으로 스냅

  const canPlace = canPlaceHereOnFace(
    currentFaceKey,
    ghost.widthMm,
    snappedX
  );

  if (canPlace) {
    ghost.xMm = snappedX;
    lastValidX = snappedX;
  } else {
    // 선반/제약에 막혀서 더 이상 이동 불가
    ghost.xMm = lastValidX;
  }
}
```

**드래그 끝 (mouseup)**

```ts
function onDragEnd() {
  moveRealFurnitureTo(ghost.id, lastValidX); // 실제 가구를 마지막 유효 위치로 이동
  endGhost();                                // 고스트 제거
}
```

---

### ✅ 구현 순서 요약 (AI에게 그대로 시키기)

1. **1단계**

   * `applyActiveFurnitureToCurrentFace()` 함수 구현
   * PlacementRect 기반으로 “가장 왼쪽 가능한 rect”를 찾고,
   * 해당 rect의 왼쪽에 스냅해서 가구를 배치하는 로직 작성
   * 예외 케이스 처리 (rect 없음, activeFurniture 없음)

2. **2단계**

   * `canPlaceHereOnFace(faceKey, widthMm, candidateX)` 유틸 함수 구현
   * 드래그 핸들러(`onDragStart`, `onDragMove`, `onDragEnd`)를 수정해서:

     * 매 move마다 `canPlaceHereOnFace` 체크
     * 가능하면 고스트 이동 + lastValidX 업데이트
     * 불가능하면 고스트는 lastValidX에 그대로
     * mouseup 시 lastValidX로 실제 가구 이동

> 코드 작성 시:
>
> * TypeScript 타입 엄격하게
> * 기존 RoomCanvas/placement 구조 최대한 재사용
> * PlacementRect/faceKey(FaceId) 관련된 부분은 현재 프로젝트에 맞게 import/연결해줘.
