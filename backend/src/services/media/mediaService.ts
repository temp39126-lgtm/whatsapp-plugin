import fs from 'fs/promises';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import crypto from 'crypto';

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

const LOCAL_MEDIA_ROOT = path.join(process.cwd(), '.data', 'media');

let bucketInitialized = false;

async function ensureBucket(): Promise<void> {
  if (bucketInitialized) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      logger.info({ bucket: env.S3_BUCKET }, 'Created S3 bucket');
    } catch (error) {
      logger.warn({ error }, 'Could not create bucket (may already exist)');
    }
  }
  bucketInitialized = true;
}

function localMediaPath(storageKey: string): string {
  return path.join(LOCAL_MEDIA_ROOT, storageKey);
}

export function generateStorageKey(tenantId: string, whatsappAccountId: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  return `${tenantId}/${whatsappAccountId}/${crypto.randomUUID()}.${ext}`;
}

export async function uploadToS3(
  key: string,
  body: Buffer,
  mimeType: string
): Promise<string> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
  );
  return key;
}

export async function storeMediaFile(key: string, body: Buffer, mimeType: string): Promise<void> {
  try {
    await uploadToS3(key, body, mimeType);
  } catch (error) {
    logger.warn({ error, key }, 'S3 unavailable, storing media locally');
    const filePath = localMediaPath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }
}

export async function readMediaFile(
  storageKey: string
): Promise<{ body: Buffer; mimeType: string }> {
  try {
    await ensureBucket();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
      })
    );
    const body = Buffer.from(await response.Body!.transformToByteArray());
    return {
      body,
      mimeType: response.ContentType ?? 'application/octet-stream',
    };
  } catch {
    const filePath = localMediaPath(storageKey);
    const body = await fs.readFile(filePath);
    return { body, mimeType: 'application/octet-stream' };
  }
}

export async function getPresignedUrl(key: string): Promise<string> {
  try {
    await ensureBucket();
    const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
    return getSignedUrl(s3, command, { expiresIn: env.PRESIGNED_URL_EXPIRY });
  } catch {
    return `/api/whatsapp/messages/by-storage/${encodeURIComponent(key)}`;
  }
}

export function getMessageMediaPath(messageId: string): string {
  return `/api/whatsapp/messages/${messageId}/media`;
}

export async function downloadFromUrl(url: string, accessToken?: string): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Failed to download media: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
