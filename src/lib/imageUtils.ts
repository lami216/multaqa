import imageCompression from 'browser-image-compression';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 3;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MAX_DIMENSION = 2048;
const MIN_DIMENSION = 512;

export interface PreparedImage {
  file: File;
  previewUrl: string;
}

const readImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire l\'image sélectionnée.'));
    };

    img.src = url;
  });
};

const ensureDimensions = async (file: File) => {
  const { width, height } = await readImageDimensions(file);
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);

  if (minSide < MIN_DIMENSION) {
    throw new Error('L\'image doit mesurer au moins 512px sur son côté le plus court.');
  }

  if (maxSide > MAX_DIMENSION) {
    return { requiresResize: true };
  }

  return { requiresResize: false };
};

export const appendCacheBuster = (url: string, version: number | string) => {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
};

export const prepareImageForUpload = async (file: File): Promise<PreparedImage> => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formats acceptés : JPEG, PNG ou WEBP uniquement.');
  }

  const { requiresResize } = await ensureDimensions(file);
  const shouldCompress = file.size > MAX_SIZE_BYTES || requiresResize;

  const compressedFile = shouldCompress
    ? await imageCompression(file, {
        maxSizeMB: MAX_SIZE_MB,
        maxWidthOrHeight: MAX_DIMENSION,
        useWebWorker: true,
        initialQuality: 0.9,
        alwaysKeepResolution: false
      })
    : file;

  if (compressedFile.size > MAX_SIZE_BYTES) {
    throw new Error('Impossible de réduire l\'image sous 3MB. Choisissez une image plus légère.');
  }

  const { width, height } = await readImageDimensions(compressedFile);
  const minSide = Math.min(width, height);
  if (minSide < MIN_DIMENSION) {
    throw new Error('L\'image traitée est trop petite (min 512px).');
  }

  const previewUrl = URL.createObjectURL(compressedFile);

  return {
    file: compressedFile instanceof File ? compressedFile : new File([compressedFile], file.name, { type: file.type }),
    previewUrl
  };
};

export const allowedMimeTypes = ALLOWED_TYPES;
export const MAX_UPLOAD_SIZE_BYTES = MAX_SIZE_BYTES;
