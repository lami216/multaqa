const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_LONGEST_SIDE = 2048;
const MIN_SHORTEST_SIDE = 512;
const MIN_QUALITY = 0.4;

const isSupportedType = (type: string) => ['image/jpeg', 'image/png', 'image/webp'].includes(type);

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to compress image'));
      resolve(blob);
    }, type, quality);
  });

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Impossible de lire cette image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Impossible de charger le fichier image'));
    reader.readAsDataURL(file);
  });

const computeTargetSize = (width: number, height: number) => {
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);

  const longestSideScale = MAX_LONGEST_SIDE / maxSide;
  let scale = Math.min(1, longestSideScale);

  if (minSide * scale < MIN_SHORTEST_SIDE) {
    const upscale = MIN_SHORTEST_SIDE / minSide;
    scale = Math.min(upscale, longestSideScale);
  }

  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  return { targetWidth, targetHeight };
};

export interface ProcessedImageResult {
  blob: Blob;
  previewUrl: string;
  mimeType: string;
}

export const processImageFile = async (file: File): Promise<ProcessedImageResult> => {
  if (!isSupportedType(file.type)) {
    throw new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.');
  }

  const image = await loadImage(file);
  const { targetWidth, targetHeight } = computeTargetSize(image.width, image.height);

  const minTargetSide = Math.min(targetWidth, targetHeight);
  const maxTargetSide = Math.max(targetWidth, targetHeight);

  if (minTargetSide < MIN_SHORTEST_SIDE || maxTargetSide > MAX_LONGEST_SIDE) {
    throw new Error('Impossible de respecter les dimensions requises (512px min, 2048px max).');
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas non pris en charge dans ce navigateur.');
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const outputType = file.type === 'image/png' ? 'image/jpeg' : file.type;
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, outputType, quality);

  while (blob.size > MAX_FILE_SIZE_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.1);
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Fichier trop volumineux même après compression. Veuillez choisir une image plus légère.');
  }

  const previewUrl = URL.createObjectURL(blob);

  return { blob, previewUrl, mimeType: outputType };
};

export const validateRawFile = (file: File) => {
  if (!isSupportedType(file.type)) {
    throw new Error('Format non supporté. Utilisez JPEG, PNG ou WebP.');
  }

  return file.size <= MAX_FILE_SIZE_BYTES;
};

export const MAX_AVATAR_SIZE = MAX_FILE_SIZE_BYTES;
