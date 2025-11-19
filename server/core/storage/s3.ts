import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Storage } from "./index";

const bucket = process.env.S3_BUCKET!;
const region = process.env.S3_REGION!;
const signed = /^true$/i.test(process.env.STORAGE_SIGNED_URLS || "false");

const s3 = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
    : undefined
});

export const s3Storage: Storage = {
  async put(objectKey, bytes, contentType) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: bytes,
      ContentType: contentType
    }));
    if (signed) {
      return await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: objectKey }), { expiresIn: 60 * 60 });
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
  }
};
