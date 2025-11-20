## 1. 큰 구조: 이미 있는 “방 좌표계”를 전부 재사용한다

우리가 이미 정해둔 게 있어:

* `roomWidthMm`, `roomHeightMm`
* `scale` (1mm → 몇 px)
* `wallRect = { x, y, width, height }` (정면 벽 사각형 위치/크기)

👉 **기둥/선반은 전부 “mm 좌표계”로만 생각**하고,
화면에 그릴 때만 `mm → px` 로 변환해서 그린다고 보면 돼.

그래서 큰 구조는:

1. **Room 모듈**

   * 방 크기 입력 폼 (mm)
   * 정면 벽 렌더링
   * `getRoomMetrics()` 같은 형태로 `roomWidthMm, roomHeightMm, scale, wallRect` 제공

2. **Pillar & Shelf 모듈**

   * 기둥/선반의 **데이터 구조를 mm 단위로 관리**
   * Room 모듈이 준 `scale, wallRect`로 화면 위치 계산
   * 드래그 이벤트 처리, 제약 체크, 길이/거리 계산

---

## 2. 데이터 구조를 어떻게 잡을지 (개념)

### 2-1. 기둥(Pillar)

* 최소 정보는 이 정도면 충분해:

```text
Pillar {
  id: 고유 ID
  xMm: 방의 왼쪽 벽을 기준으로 한 기둥의 x 위치 (mm)
  type: 'wall' | 'normal'  // 왼쪽/오른쪽 벽 기둥인지, 일반 기둥인지 구분
}
```

* 예:

  * 방 폭: 5000mm일 때

    * 왼쪽 벽 기둥: `xMm = 0` (type: 'wall')
    * 오른쪽 벽 기둥: `xMm = 5000` (type: 'wall')
    * 중간 기둥: `xMm = 1200`, `xMm = 3000` …

* 정렬 규칙:

  * 항상 `xMm` 기준으로 오름차순 정렬해두면,
  * **왼쪽/오른쪽 이웃 기둥** 찾기가 쉬워짐.

### 2-2. 선반(Shelf)

* 선반은 “어떤 기둥에서 어떤 기둥까지, 어느 높이”가 핵심:

```text
Shelf {
  id: 고유 ID
  startPillarId: 시작 기둥 ID
  endPillarId: 끝 기둥 ID
  heightMm: 바닥(또는 벽 아래 기준)에서의 높이 (mm)
}
```

* 선반 길이는 **렌더링하거나 표시할 때 계산**:

  * `길이(mm) = endPillar.xMm - startPillar.xMm`

---

## 3. 좌표 변환 로직 (mm ↔ px)

**공통 함수**를 하나 정해두면 좋아:

* `mmToPxX(xMm) = wallRect.x + xMm * scale`

* `mmToPxY(yMm) = wallRect.y + wallRect.height - (yMm * scale)`

  * (y는 아래에서 위로 올라가는 좌표계라고 가정했을 때)

* 반대로:

  * `pxToMmX(xPx) = (xPx - wallRect.x) / scale`
  * `pxToMmY(yPx) = (wallRect.y + wallRect.height - yPx) / scale`

👉 드래그할 때는 **마우스(px) → mm로 역변환한 뒤, 기둥/선반 데이터를 mm 단위로 업데이트**하면 깔끔함.

---

## 4. 기둥을 드래그로 움직이는 플로우

### 4-1. 무엇을 드래그하냐?

* 기둥 본체(세로 막대)를 잡고 **수평으로만** 드래그.
* 왼쪽/오른쪽 벽(type: 'wall') 기둥은 고정 (드래그 불가).

### 4-2. 드래그 시작

1. 사용자가 기둥을 클릭 (mousedown)
2. 상태에 저장:

   * `draggingPillarId`
   * `originalXmm`
3. **실제 기둥은 그대로 두고**, 그 위에 **ghost pillar(잔상 기둥)** 을 하나 더 띄워서 그걸 움직이게 함.

### 4-3. 이동 가능한 영역 계산 (from~to)

* 현재 기둥이 `pillars[i]`라고 할 때:

  * 왼쪽 이웃 기둥: `pillars[i-1]`
  * 오른쪽 이웃 기둥: `pillars[i+1]`

* 기본 범위:

  * `minXmm = leftNeighbor.xMm + 최소간격`
  * `maxXmm = rightNeighbor.xMm - 최소간격`

* 여기에 **이 기둥에 붙은 선반들의 최소 길이 조건**도 반영할 수 있음:

  * 이 기둥이 움직이면서 선반 길이가 너무 짧아지지 않도록
    각 선반에 대해 “이 지점 이상/이하로는 못 간다”는 값을 계산해서
    `minXmm`, `maxXmm`를 조정.

### 4-4. 드래그 중 (mousemove)

1. 마우스 x(px) → `candidateXmm = pxToMmX(mouseX)`
2. `clampedXmm = clamp(candidateXmm, minXmm, maxXmm)`
3. ghost 기둥의 화면 위치 = `mmToPxX(clampedXmm)` 로 그리기
4. 동시에,
   이 위치를 기준으로 **기둥 간 거리/선반 길이**를 임시로 다시 계산해서 UI에 보여줄 수 있음
   (실제 데이터는 아직 안 바꿈)

### 4-5. 드래그 종료 (mouseup)

1. 마지막 `clampedXmm`이 유효한 범위 안.
2. 실제 데이터 업데이트:

   * `pillars[i].xMm = clampedXmm`
3. `pillars` 배열 다시 xMm 기준으로 정렬.
4. 선반 길이 등 관련 파생 정보 다시 계산.
5. ghost pillar 삭제.

---

## 5. 선반을 드래그로 움직이는 플로우

선반은 크게 두 가지 액션으로 나눌 수 있어:

1. **선반 전체를 위·아래로 이동 (높이 조정)**
2. (차후) 선반의 시작/끝 기둥을 바꿔서 **가로 범위 변경**

우선 1번(높이 드래그)부터 구현하는 흐름을 잡자.

### 5-1. 선반 높이 드래그

* 사용자가 선반 몸통을 클릭하고 위/아래로 드래그.

#### 드래그 시작

* `draggingShelfId`, `originalHeightMm` 저장.
* ghost shelf(잔상 선반)을 만든다.

#### 드래그 중

1. 마우스 y(px) → `candidateHeightMm = pxToMmY(mouseY)`
2. 높이 범위 제한:

   * `minHeightMm` = 예: 0 (바닥)
   * `maxHeightMm` = roomHeightMm (천장 바로 아래)
3. `clampedHeightMm = clamp(candidateHeightMm, minHeightMm, maxHeightMm)`
4. ghost 선반을 이 높이로 렌더링.

#### 드래그 종료

* `shelf.heightMm = clampedHeightMm` 로 실제 업데이트.
* 필요 시, 같은 높이에 있는 선반들의 정렬/충돌 체크(겹쳐도 되는지 등) 추가.

### 5-2. 선반의 “가로” 범위 변경 (나중 단계)

* 선반 양 끝에 작은 핸들을 두고,

  * 왼쪽 핸들 드래그 → `startPillarId` 변경,
  * 오른쪽 핸들 드래그 → `endPillarId` 변경.
* 이건 기둥 좌표와 맞물리는 계산이라
  1차 버전에서는 **“기둥은 따로, 선반은 기둥 선택 UI로만 시작/끝 바꾸기”**로 해도 됨.

---

## 6. 길이/거리 계산 & 표시

이제 기둥과 선반이 mm로 들어왔으니, 표시 로직은 단순해져:

* **기둥 간 거리(mm)**

  * 오름차순 정렬된 `pillars` 배열에서
    인접한 기둥끼리 `delta = p[i+1].xMm - p[i].xMm`
* **선반 길이(mm)**

  * `start = findPillar(startPillarId)`
  * `end = findPillar(endPillarId)`
  * `lengthMm = end.xMm - start.xMm`

UI에서는:

* 방 폭: `5000mm (5.0m)`
* 기둥 간 거리: `1200mm / 900mm / 2000mm …`
* 선반 길이: `1000mm (1.0m)` 등으로 표시.

---

## 7. 단계별 개발 순서 (요약)

**1단계 – 방과 연동만 된 기둥/선반 “정적” 렌더링**

* Room 모듈에서 `getRoomMetrics()`로 `roomWidthMm, roomHeightMm, scale, wallRect` 제공
* Pillar/Shelf 모듈에서:

  * 기본 기둥 3~4개, 선반 1~2개를 하드코딩 데이터로 넣고,
  * mmToPx 변환으로 정면 벽 안에 그려보기 (아직 드래그 없음)

**2단계 – 기둥 드래그 (제약 없이) 구현**

* 기둥을 드래그하면:

  * ghost pillar만 움직이는 단순 드래그
  * 마우스업에 최종 xMm 저장 (지금은 이웃/선반 제약 없이)

**3단계 – 기둥 드래그 제약 추가**

* 이웃 기둥 사이 범위(from~to) 계산
* 최소 간격, 최소 선반 길이 조건 반영
* 드래그 중 mm → px 변환, clamp 적용

**4단계 – 선반 높이 드래그 구현**

* 선반 몸통을 드래그하면 높이(mm) 변경
* 방 높이 범위 내에서 clamp
* ghost shelf → 마우스업에 heightMm 확정

**5단계 – 길이/거리 표시 패널 구현**

* 기둥 간 거리, 선반 길이, 방 폭·높이를 계산해서 UI로 표시
* 기둥/선반이 움직일 때마다 자동 업데이트 되는지 확인

**6단계 – 고급 기능 (선반 가로 범위 변경, 겹침 규칙 등)**

* 선반 끝 핸들 드래그로 start/end 기둥 변경
* 선반끼리 겹칠 수 있는지, 특정 높이 레벨에 개수 제한이 있는지 등 정책 추가

---

## 8. 한 줄 정리

> **이미 “mm 단위 방/정면 벽”이 있으니, 기둥과 선반은 전부 mm 좌표로 관리하고, 드래그 시에는 마우스(px)를 mm로 변환해서 ghost 요소를 움직인 뒤, 마우스업에 실제 데이터를 갱신하는 방식으로 구현하면 된다. 기둥은 x만, 선반은 높이(y) 중심으로 먼저 구현하고, 이후 제약 조건과 가로 범위 변경을 점진적으로 추가한다.**

