## 0. 문서 정보

* 문서명: **가구 자동 배치 & 드래그 이동 제약 기능 PRD**
* 대상: **AI 기반 개발 도우미(Copilot / Cursor 등)**
* 관련 모듈(가정):

  * `placement.ts` : 배치 가능 영역(PlacementRect) 계산
  * `furnitures.json` : 가구 메타 정보 (width, height 등)
  * 기존 **그리드 기반 드래그 & 고스트 렌더링 로직** 존재

---

## 1. 기능 개요

### 1.1 목표

1. **1단계 – 자동 배치 기능**

   * 현재 선택된 가구를 “적용” 버튼 클릭 시,
   * **현재 면(face)의 배치 가능 영역(PlacementRect)** 중
     **가장 왼쪽에서 가구가 들어갈 수 있는 위치에 자동 배치**한다.

2. **2단계 – 드래그 이동 + 선반 충돌 제약**

   * 이미 배치된 가구를 **드래그로 이동**할 수 있게 하고,
   * **선반으로 인해 막히는 영역(PlacementRect 밖)**으로는
     고스트가 더 이상 따라오지 못하게 만든다.
   * 드래그 중 막힌 지점 이후에는 고스트가 움직이지 않고,
     마우스 업 시 그 위치에 스냅되어 가구가 이동된다.

> **개발 순서**
> 1차 배포: 1단계만 구현 → 테스트 & 안정화
> 2차 배포: 2단계(드래그 이동 제약) 추가

---

## 2. 용어 및 전제

* **Face(면)**: 방의 한 벽면. 현재 편집 중인 면이 항상 하나 존재.
* **Section/Bay(칸)**: 기둥 두 개 사이의 폭. 여러 section이 연속된 영역이 하나의 PlacementRect가 될 수 있음.
* **PlacementRect**:

  * 바닥 가구를 놓을 수 있는 **연속된 가로 영역**과 **최대 높이** 정보를 가진 직사각형.
  * 선반, 기둥 등 제약을 고려해서 계산됨.
* **바닥 가구**:

  * 현재 기능 대상. 바닥 기준(y=0 또는 고정된 y)으로 배치되며,
  * x 좌표와 width(가로 길이)만으로 배치 가능 여부를 판단한다.
* **그리드 스냅**:

  * x 좌표는 지정된 그리드 단위(mm)로 스냅되어 배치된다 (예: 10mm 단위).

---

## 3. 1단계: “적용 버튼 → 자동 배치” 기능

### 3.1 사용자 시나리오

1. 사용자가 가구 리스트에서 가구를 선택한다.

   * 앱 내 상태: `activeFurniture` 또는 유사한 구조에 선택된 가구 정보 저장.
2. “적용” 버튼을 클릭한다.
3. 시스템은:

   * 현재 활성화된 면(face)의 `PlacementRect[]`를 가져온다.
   * 각 rect를 **x 기준으로 정렬**한 뒤,
   * 선택된 가구의 `width`가 들어갈 수 있는 **가장 왼쪽 rect**를 찾는다.
4. 찾은 rect의 **왼쪽 끝을 기준**으로 가구를 그리드에 맞춰 스냅하여 배치한다.
5. 만약 어떤 rect에도 들어갈 수 없다면:

   * “이 면에는 이 가구를 놓을 수 있는 공간이 없습니다.” 같은 토스트/알럿을 보여준다.

### 3.2 요구 동작 (로직 상세)

#### 3.2.1 입력 데이터

* `activeFurniture`:

  * `widthMm`, `heightMm`, `prodKey` 등 필수 정보 포함.
* `currentFaceKey`:

  * 현재 편집 중인 face 식별자.
* `getPlacementRectsForFace(faceKey): PlacementRect[]`

  * 이미 구현되어 있다고 가정.
* (선택) `gridSizeMm`: 스냅 단위 (예: 10mm).

#### 3.2.2 PlacementRect 구조 (예시)

```ts
interface PlacementRect {
  faceKey: number;       // 소속 face
  xMm: number;           // rect의 시작 x
  widthMm: number;       // rect의 폭
  maxHeightMm: number;   // 이 rect에서 허용되는 최대 높이
}
```

#### 3.2.3 배치 알고리즘 요구사항

1. **Rect 정렬**

   * `xMm` 오름차순으로 정렬한다.

2. **가구가 들어갈 수 있는 Rect 탐색**

   * 순서대로 반복하면서,
   * `furniture.widthMm <= rect.widthMm` 인 첫 번째 rect를 선택한다.
   * 이 rect가 바로 **“가장 왼쪽에서 가능한 위치”**를 제공하게 된다.

3. **좌표 계산**

   * `rawX = rect.xMm` (rect의 왼쪽 끝)
   * `snappedX = round(rawX / gridSizeMm) * gridSizeMm`
   * `y`는 바닥 기준: `yMm = 0` (혹은 프로젝트에서 정의한 바닥 높이)

4. **실제 배치**

   * `placeFurniture` 혹은 유사한 함수로 상태/스토어에 추가:

     * faceKey, prodKey, xMm, yMm 등 저장.
   * 뷰에서는 해당 좌표 기반으로 렌더링.

5. **예외 처리**

   * `activeFurniture`가 없는 상태에서 “적용” 클릭 시:

     * 아무 동작도 하지 않거나, “가구를 먼저 선택하세요” 안내.
   * 적합한 rect가 없을 때:

     * 토스트/알럿 + 배치 시도 취소.

> **1단계에서는**
> 이미 배치된 다른 가구와의 **겹침 여부를 무시**하고,
> 순수하게 PlacementRect 기준으로만 “처음 하나”를 찾는 단순 버전으로 구현한다.
> (추후 필요시 “이미 배치된 가구와 충돌하지 않는 가장 왼쪽 위치”로 확장 가능.)

---

## 4. 2단계: “드래그 이동 + 선반 충돌 시 멈춤”

### 4.1 사용자 시나리오

1. 사용자가 이미 배치된 가구를 클릭한 상태에서 드래그를 시작한다.

   * `mousedown` / `dragstart` 시점에 **고스트(반투명 가구)**가 생성된다.
   * 원래 가구는 숨기거나 흐리게 보이게 한다 (현재 구현 방식 유지).
2. 마우스를 움직이면:

   * 고스트가 **그리드 스냅**을 유지하며 따라오지만,
   * 만약 이동하려는 방향에 **PlacementRect 밖(= 선반에 막힌 영역)**이 나오면:

     * 고스트는 **그 지점을 넘어서 더 이상 이동하지 않는다.**
     * 사용자는 계속 마우스를 움직일 수 있지만, 고스트는 마지막 유효 위치에 머무른다.
3. 마우스를 놓으면 (`mouseup`):

   * 고스트의 현재 위치로 실제 가구를 이동시킨다.
   * 드래그 상태 종료.

### 4.2 요구 동작 (로직 상세)

#### 4.2.1 재사용할 기존 기능

* 그리드 기반 드래그 로직:

  * 마우스 좌표 → 그리드 스냅 좌표로 변환.
* 고스트 렌더링:

  * 드래그 중 실제 가구 대신 고스트가 화면에 보이는 기능.

#### 4.2.2 새로 필요한 개념/함수

1. **위치 유효성 검사 함수**

   ```ts
   // 예시 시그니처
   function canPlaceHereOnFace(
     faceKey: number,
     furnitureWidthMm: number,
     candidateXMm: number,
   ): boolean
   ```

   * 동작 요구사항:

     1. `faceKey`에 해당하는 `PlacementRect[]`를 가져옴.
     2. “바닥 가구” 전제하에, y는 고정이라고 보고 x만 판단.
     3. `candidateXMm` ~ `candidateXMm + furnitureWidthMm` 범위 전체가
        어떤 하나의 PlacementRect의 `[xMm, xMm + widthMm]` 안에 **완전히 포함되면 true**.
     4. 아니면 false.

2. **마지막 유효 위치 기억**

   ```ts
   let lastValidX: number;
   ```

   * 드래그 시작 시:

     * `lastValidX = initialFurnitureX`.
   * `mousemove`마다:

     * candidateX를 계산하고 스냅한 후 `canPlaceHereOnFace`로 체크.
     * `true`면:

       * 고스트 x를 candidateX로 업데이트.
       * `lastValidX = candidateX`.
     * `false`면:

       * 고스트 x를 `lastValidX`로 유지 (더 이상 끌려오지 않음).

3. **드래그 핸들러 흐름 (의사 코드)**

   ```ts
   function onDragStart(furnitureId) {
     const furniture = getFurnitureById(furnitureId);
     startGhost(furniture); // 고스트 생성
     lastValidX = furniture.xMm;
   }

   function onDragMove(event) {
     const mouseX = getMouseWorldX(event);
     const snappedX = snapToGrid(mouseX);

     const canPlace = canPlaceHereOnFace(
       currentFaceKey,
       ghost.widthMm,
       snappedX
     );

     if (canPlace) {
       ghost.xMm = snappedX;
       lastValidX = snappedX;
     } else {
       // 선반/제약에 막힌 상황: 고스트는 더 이상 안 움직임
       ghost.xMm = lastValidX;
     }
   }

   function onDragEnd() {
     moveRealFurnitureTo(ghost.id, lastValidX);
     endGhost();
   }
   ```

#### 4.2.3 UX 세부 요구

* **선반에 부딪힌 느낌**

  * 최초 구현: 고스트가 더 이상 움직이지 않는 것만으로 표현.
  * (추후 개선 여지) 짧은 진동 애니메이션, 붉은 테두리, 커서 모양 변경 등 추가 가능.

* **배치 불가 영역으로 드래그 후 마우스 업**

  * 항상 **마지막 유효 위치**에 스냅된 상태로 실제 가구를 이동.
  * 추가 에러 메시지는 필요하지 않음 (이미 시각적으로 막혔기 때문).

---

## 5. 비기능 요구사항

1. **성능**

   * 드래그 중 `mousemove` 이벤트는 매우 자주 발생하므로:

     * `canPlaceHereOnFace`는 최대한 가벼워야 함.
     * `PlacementRect[]`는 드래그 시작 시 미리 캐싱해두고,
       드래그 중에는 재계산하지 않도록 한다.

2. **유지보수성**

   * 1단계에서 만든 **위치 검증 로직**(PlacementRect 기반)은
     2단계에서도 **그대로 재사용**할 수 있도록 함수화.
   * 추후 “기존 가구와의 충돌 검사”를 추가할 수 있도록
     `canPlaceHereOnFace` 내부 구조를 확장하기 쉽게 작성.

3. **피쳐 플래그 (선택)**

   * 필요 시 2단계 기능은 플래그로 on/off 가능하도록 설계:

     * 예: `enableShelfCollisionOnDrag: boolean`.

---

## 6. 테스트 케이스(요약)

### 6.1 1단계 – 자동 배치

1. **단일 Rect, 여유 공간 충분**

   * Rect 폭 2000mm, 가구 폭 800mm → rect 왼쪽에 배치.
2. **여러 Rect, 가장 왼쪽 Rect에만 들어감**

   * Rect1 폭 700mm, Rect2 폭 1200mm, 가구 폭 800mm
     → Rect1 불가, Rect2 가능 → Rect2 왼쪽에 배치.
3. **어떤 Rect에도 안 들어감**

   * 모든 Rect 폭 < 가구 폭 → 토스트 메시지 출력.
4. **activeFurniture 없음**

   * “적용” 클릭 시 아무 일도 안 일어나거나 안내 메시지.

### 6.2 2단계 – 드래그 이동 + 충돌

1. **PlacementRect 안에서만 좌우 이동**

   * Rect 폭 2000mm, 가구 폭 800mm → Rect 안에서는 자유롭게 드래그.
2. **Rect 오른쪽 끝에서 막히는지 확인**

   * Rect 끝을 넘어가려고 드래그 시 고스트가 더 이상 이동하지 않음.
3. **Rect 사이 빈 영역(= 배치 불가 영역)**

   * Rect1과 Rect2 사이의 갭에는 고스트가 진입하지 못해야 함.
4. **마우스를 Rect 밖으로 훨씬 멀리 끌어도**

   * 고스트는 마지막 유효 위치에만 유지, 마우스 업 시 그 위치로 배치.


