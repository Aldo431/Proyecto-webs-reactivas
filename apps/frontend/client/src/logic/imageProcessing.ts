/*
 * Origen: código propio de tiendaDCC (spec 008, RF-17).
 * Convierte el archivo elegido en un data URL de a lo sumo 1 MB. El acceso a
 * `createImageBitmap`/`canvas` se inyecta (`ImageDeps`) para testear la lógica
 * sin navegador; `browserImageDeps` es la implementación real.
 */
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  base64DecodedBytes,
} from "@tiendadcc/utils";

export const MAX_IMAGE_SIDE = 1200;
export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
export const QUALITY_STEPS = [0.8, 0.7, 0.6, 0.5] as const;

export const IMAGE_TYPE_ERROR =
  "Formato de imagen no permitido. Usa JPG, PNG o WebP.";
export const IMAGE_ORIGINAL_SIZE_ERROR =
  "La imagen original no puede superar 10 MB.";
export const IMAGE_UNREADABLE_ERROR = "No se pudo leer la imagen.";
export const IMAGE_TOO_HEAVY_ERROR =
  "No pudimos reducir la imagen a 1 MB. Prueba con otra foto.";

export type EncodeMime = "image/webp" | "image/jpeg";

export interface DecodedImage {
  width: number;
  height: number;
}

export interface ImageDeps {
  // Decodifica respetando la orientación EXIF; lanza si no es una imagen.
  decode: (file: File) => Promise<DecodedImage>;
  // Dibuja a `width`×`height` y devuelve el data URL. Con JPEG el fondo es
  // blanco. Si el navegador no soporta `mime`, devuelve otro tipo (PNG).
  encode: (
    file: File,
    size: DecodedImage,
    mime: EncodeMime,
    quality: number,
  ) => Promise<string>;
}

export type ProcessImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

export function validateImageFile(
  file: Pick<File, "type" | "size">,
): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return IMAGE_TYPE_ERROR;
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    return IMAGE_ORIGINAL_SIZE_ERROR;
  }
  return null;
}

// Lado mayor <= `maxSide`, misma proporción, sin agrandar.
export function computeTargetDimensions(
  width: number,
  height: number,
  maxSide: number = MAX_IMAGE_SIDE,
): DecodedImage {
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width, height };
  }
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return 0;
  }
  return base64DecodedBytes(dataUrl.slice(commaIndex + 1));
}

// Prueba las calidades en orden descendente hasta que el resultado cabe en
// 1 MB. `encodeAt` devuelve el data URL para una calidad.
export async function encodeWithinLimit(
  encodeAt: (quality: number) => Promise<string>,
  maxBytes: number = MAX_IMAGE_BYTES,
): Promise<ProcessImageResult> {
  for (const quality of QUALITY_STEPS) {
    const dataUrl = await encodeAt(quality);
    if (estimateDataUrlBytes(dataUrl) <= maxBytes) {
      return { ok: true, dataUrl };
    }
  }
  return { ok: false, message: IMAGE_TOO_HEAVY_ERROR };
}

export async function processImageFile(
  file: File,
  deps: ImageDeps,
): Promise<ProcessImageResult> {
  const invalid = validateImageFile(file);
  if (invalid !== null) {
    return { ok: false, message: invalid };
  }

  let size: DecodedImage;
  try {
    const decoded = await deps.decode(file);
    size = computeTargetDimensions(decoded.width, decoded.height);
  } catch {
    return { ok: false, message: IMAGE_UNREADABLE_ERROR };
  }

  try {
    // Si el navegador no soporta WebP en canvas, devuelve PNG: se detecta por
    // el tipo del data URL y se recodifica como JPEG.
    const probe = await deps.encode(file, size, "image/webp", QUALITY_STEPS[0]);
    const mime: EncodeMime = probe.startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg";
    return await encodeWithinLimit((quality) =>
      mime === "image/webp" && quality === QUALITY_STEPS[0]
        ? Promise.resolve(probe)
        : deps.encode(file, size, mime, quality),
    );
  } catch {
    return { ok: false, message: IMAGE_UNREADABLE_ERROR };
  }
}

export const browserImageDeps: ImageDeps = {
  async decode(file) {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  },
  async encode(file, size, mime, quality) {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    try {
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("canvas no disponible");
      }
      if (mime === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size.width, size.height);
      }
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      return canvas.toDataURL(mime, quality);
    } finally {
      bitmap.close();
    }
  },
};
