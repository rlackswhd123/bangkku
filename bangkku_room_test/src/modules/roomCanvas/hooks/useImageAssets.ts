// useImageAssets.ts: 코너/선반 PNG 리소스를 비동기로 로드해 공유하는 훅
import { ref, onMounted } from 'vue';
import productsData from '../../../data/products.json';

type CornerImageKey = 111 | 222 | 333 | 444;
type ShelfImageKey = 'normal' | 'drawer' | 'hanger';
type PillarImageKey = 'RS' | 'CS' | 'DU';
type WallImageKey = 'front' | 'left' | 'right';

export type CornerImages = Record<CornerImageKey, HTMLImageElement | null>;
export type ShelfImages = Record<ShelfImageKey, HTMLImageElement | null>;
export type PillarImages = Record<PillarImageKey, HTMLImageElement | null>;
export type WallImages = Record<WallImageKey, HTMLImageElement | null>;

const INITIAL_CORNER_IMAGES: CornerImages = {
  111: null,
  222: null,
  333: null,
  444: null,
};

const INITIAL_SHELF_IMAGES: ShelfImages = {
  normal: null,
  drawer: null,
  hanger: null,
};

const INITIAL_PILLAR_IMAGES: PillarImages = {
  RS: null,
  CS: null,
  DU: null,
};

const INITIAL_WALL_IMAGES: WallImages = {
  front: null,
  left: null,
  right: null,
};

const CORNER_IMAGE_PATHS: Record<CornerImageKey, string> = {
  111: new URL('../../../images/corner/111.png', import.meta.url).href,
  222: new URL('../../../images/corner/222.png', import.meta.url).href,
  333: new URL('../../../images/corner/333.png', import.meta.url).href,
  444: new URL('../../../images/corner/444.png', import.meta.url).href,
};

const CORNER_IMAGE_KEYS: CornerImageKey[] = [111, 222, 333, 444];

const shelfProducts: Array<{ type: ShelfImageKey; image?: string }> = (productsData as any)?.shelves ?? [];
const pickImageForType = (type: ShelfImageKey): string | null => {
  const found = shelfProducts.find((p) => p.type === type && p.image);
  return found?.image ?? null;
};

const SHELF_IMAGE_PATHS: Record<ShelfImageKey, string | null> = {
  normal: pickImageForType('normal'),
  drawer: pickImageForType('drawer'),
  hanger: pickImageForType('hanger'),
};

const PILLAR_IMAGE_PATHS: Record<PillarImageKey, string> = {
  RS: new URL('../../../images/pillar/RS.png', import.meta.url).href,
  CS: new URL('../../../images/pillar/CS.png', import.meta.url).href,
  DU: new URL('../../../images/pillar/DU.png', import.meta.url).href,
};

const PILLAR_IMAGE_KEYS: PillarImageKey[] = ['RS', 'CS', 'DU'];

const SHELF_IMAGE_KEYS: ShelfImageKey[] = ['normal', 'drawer', 'hanger'];

const WALL_IMAGE_PATHS: Record<WallImageKey, string> = {
  front: new URL('../../../images/rooms/정면벽2.png', import.meta.url).href,
  left: new URL('../../../images/rooms/왼쪽벽2.png', import.meta.url).href,
  right: new URL('../../../images/rooms/오른쪽벽2.png', import.meta.url).href,
};

const WALL_IMAGE_KEYS: WallImageKey[] = ['front', 'left', 'right'];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * 코너/선반/벽 PNG 리소스를 사전에 로드해 캔버스 렌더와 패널에서 공유합니다.
 */
export function useImageAssets() {
  const cornerImages = ref<CornerImages>({ ...INITIAL_CORNER_IMAGES });
  const shelfImages = ref<ShelfImages>({ ...INITIAL_SHELF_IMAGES });
  const pillarImages = ref<PillarImages>({ ...INITIAL_PILLAR_IMAGES });
  const wallImages = ref<WallImages>({ ...INITIAL_WALL_IMAGES });

  onMounted(() => {
    Promise.all(
      CORNER_IMAGE_KEYS.map((key) =>
        loadImage(CORNER_IMAGE_PATHS[key]).then((image) => ({ key, image }))
      )
    )
      .then((loaded) => {
        const mapped = loaded.reduce<CornerImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_CORNER_IMAGES });
        cornerImages.value = mapped;
      })
      .catch(console.error);

    Promise.all(
      SHELF_IMAGE_KEYS.map((key) => {
        const path = SHELF_IMAGE_PATHS[key];
        if (!path) return Promise.resolve({ key, image: null });
        return loadImage(path).then((image) => ({ key, image }));
      })
    )
      .then((loaded) => {
        const mapped = loaded.reduce<ShelfImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_SHELF_IMAGES });
        shelfImages.value = mapped;
      })
      .catch(console.error);

    Promise.all(
      PILLAR_IMAGE_KEYS.map((key) =>
        loadImage(PILLAR_IMAGE_PATHS[key]).then((image) => ({ key, image }))
      )
    )
      .then((loaded) => {
        const mapped = loaded.reduce<PillarImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_PILLAR_IMAGES });
        pillarImages.value = mapped;
      })
      .catch(console.error);

    Promise.all(
      WALL_IMAGE_KEYS.map((key) =>
        loadImage(WALL_IMAGE_PATHS[key]).then((image) => ({ key, image }))
      )
    )
      .then((loaded) => {
        const mapped = loaded.reduce<WallImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_WALL_IMAGES });
        wallImages.value = mapped;
      })
      .catch(console.error);
  });

  return { cornerImages, shelfImages, pillarImages, wallImages };
}
