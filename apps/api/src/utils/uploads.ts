import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_ROOT)) {
    fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
}

export function saveBase64Document(
  dataUrl: string,
  prefix: string
): { fileName: string; mimeType: string; url: string } {
  ensureUploadDir();
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid document data. Expected a base64 data URL.');
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Document must be under 5MB');
  }
  const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
  const fileName = `${prefix}-${randomUUID()}.${ext}`;
  const filePath = path.join(UPLOAD_ROOT, fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    fileName,
    mimeType,
    url: `/uploads/${fileName}`,
  };
}

export function uploadsRoot(): string {
  return UPLOAD_ROOT;
}
