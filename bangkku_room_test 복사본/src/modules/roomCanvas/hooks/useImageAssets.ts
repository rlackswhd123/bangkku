import { useEffect, useState } from 'react';

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

const SHELF_IMAGE_PATHS: Record<ShelfImageKey, string> = {
  normal: new URL('../../../images/pillar/일반_선반.png', import.meta.url).href,
  drawer: new URL('../../../images/pillar/서랍_선반.png', import.meta.url).href,
  hanger: new URL('../../../images/pillar/옷걸이_선반.png', import.meta.url).href,
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export function useImageAssets() {
  const [cornerImages, setCornerImages] = useState<CornerImages>(INITIAL_CORNER_IMAGES);
  const [shelfImages, setShelfImages] = useState<ShelfImages>(INITIAL_SHELF_IMAGES);

  useEffect(() => {
    Promise.all(
      (Object.keys(CORNER_IMAGE_PATHS) as CornerImageKey[]).map((key) =>
        loadImage(CORNER_IMAGE_PATHS[key]).then((image) => ({ key, image }))
      )
    )
      .then((loaded) => {
        const mapped = loaded.reduce<CornerImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_CORNER_IMAGES });
        setCornerImages(mapped);
      })
      .catch(console.error);

    Promise.all(
      (Object.keys(SHELF_IMAGE_PATHS) as ShelfImageKey[]).map((key) =>
        loadImage(SHELF_IMAGE_PATHS[key]).then((image) => ({ key, image }))
      )
    )
      .then((loaded) => {
        const mapped = loaded.reduce<ShelfImages>((acc, { key, image }) => {
          acc[key] = image;
          return acc;
        }, { ...INITIAL_SHELF_IMAGES });
        setShelfImages(mapped);
      })
      .catch(console.error);
  }, []);

  return { cornerImages, shelfImages };
}

