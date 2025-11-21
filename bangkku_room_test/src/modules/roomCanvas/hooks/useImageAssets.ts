// useImageAssets.ts: 코너/선반 PNG 리소스를 비동기로 로드해 공유하는 훅
import { ref, onMounted } from 'vue';

type CornerImageKey = 111 | 222 | 333 | 444;
type ShelfImageKey = 'normal' | 'drawer' | 'hanger';

export type CornerImages = Record<CornerImageKey, HTMLImageElement | null>;
export type ShelfImages = Record<ShelfImageKey, HTMLImageElement | null>;

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

const CORNER_IMAGE_PATHS: Record<CornerImageKey, string> = {
  111: new URL('../../../images/corner/111.png', import.meta.url).href,
  222: new URL('../../../images/corner/222.png', import.meta.url).href,
  333: new URL('../../../images/corner/333.png', import.meta.url).href,
  444: new URL('../../../images/corner/444.png', import.meta.url).href,
};

const CORNER_IMAGE_KEYS: CornerImageKey[] = [111, 222, 333, 444];

const SHELF_IMAGE_PATHS: Record<ShelfImageKey, string> = {
  normal: new URL('../../../images/pillar/일반_선반.png', import.meta.url).href,
  drawer: new URL('../../../images/pillar/서랍_선반.png', import.meta.url).href,
  hanger: new URL('../../../images/pillar/옷걸이_선반.png', import.meta.url).href,
};

const SHELF_IMAGE_KEYS: ShelfImageKey[] = ['normal', 'drawer', 'hanger'];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * 코너/선반 PNG 리소스를 사전에 로드해 캔버스 렌더와 패널에서 공유합니다.
 */
export function useImageAssets() {
  const cornerImages = ref<CornerImages>({ ...INITIAL_CORNER_IMAGES });
  const shelfImages = ref<ShelfImages>({ ...INITIAL_SHELF_IMAGES });

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
      SHELF_IMAGE_KEYS.map((key) =>
        loadImage(SHELF_IMAGE_PATHS[key]).then((image) => ({ key, image }))
      )
    )
      .then((loaded) => {
        const mapped = loaded.reduce<ShelfImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_SHELF_IMAGES });
        shelfImages.value = mapped;
      })
      .catch(console.error);
  });

  return { cornerImages, shelfImages };
}
