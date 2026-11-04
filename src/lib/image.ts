export const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_DIMENSION = 1800;

const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
};

export function fileType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TYPES[ext] ?? '';
}

export function validateImageFile(file: File): string | null {
  const type = fileType(file);
  if (!type.startsWith('image/')) return `${file.name} isn't an image.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name} is over 30 MB.`;
  return null;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('This image format could not be decoded by your browser.'));
      };
      img.src = url;
    });
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  const source = await decode(file);
  const sw = 'width' in source ? source.width : 0;
  const sh = 'height' in source ? source.height : 0;
  if (!sw || !sh) throw new Error('This image appears to be empty.');

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, 'image/webp', 0.84);
  if (!blob) blob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
  if (!blob) throw new Error('Could not compress this image.');

  if ('close' in source) source.close();
  canvas.width = 0;
  canvas.height = 0;
  return { blob, width, height };
}

export async function makeThumbnail(blob: Blob, maxDimension = 480): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const thumb = (await canvasToBlob(canvas, 'image/webp', 0.78)) ?? blob;
  canvas.width = 0;
  canvas.height = 0;
  return thumb;
}

export function measureImage(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth || 512, height: image.naturalHeight || 512 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 512, height: 512 });
    };
    image.src = url;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {  return new Promise((resolve, reject) => {    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = /data:([^;]+);/.exec(head)?.[1] ?? 'image/webp';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
