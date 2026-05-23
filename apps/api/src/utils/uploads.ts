import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

let cloudinaryReady = false;

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
}

function initCloudinary(): boolean {
  if (cloudinaryReady) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  cloudinaryReady = true;
  return true;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Invalid image data. Expected a base64 data URL.');
  }
  const mimeType = match[1];
  if (!mimeType.startsWith('image/')) {
    throw new Error('Only image uploads are supported.');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error('Image must be under 8MB');
  }
  return { mimeType, buffer };
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
}

function saveLocal(buffer: Buffer, mimeType: string, prefix: string): { fileName: string; mimeType: string; url: string } {
  ensureUploadDir();
  const ext = extensionForMime(mimeType);
  const fileName = `${prefix}-${randomUUID()}.${ext}`;
  const filePath = path.join(UPLOAD_ROOT, fileName);
  fs.writeFileSync(filePath, buffer);
  return { fileName, mimeType, url: `/uploads/${fileName}` };
}

async function saveCloudinary(
  dataUrl: string,
  folder: string,
  prefix: string
): Promise<{ fileName: string; mimeType: string; url: string }> {
  const { mimeType } = parseDataUrl(dataUrl);
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: `zygo/${folder}`,
    public_id: `${prefix}-${randomUUID()}`,
    resource_type: 'image',
    overwrite: false,
  });
  return {
    fileName: result.public_id,
    mimeType,
    url: result.secure_url,
  };
}

/** Upload a camera/gallery image (base64 data URL) to Cloudinary or local disk in dev. */
export async function saveBase64Document(
  dataUrl: string,
  prefix: string,
  folder = 'documents'
): Promise<{ fileName: string; mimeType: string; url: string }> {
  parseDataUrl(dataUrl);
  if (initCloudinary()) {
    return saveCloudinary(dataUrl, folder, prefix);
  }
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  return saveLocal(buffer, mimeType, prefix);
}

export function uploadsRoot(): string {
  return UPLOAD_ROOT;
}
