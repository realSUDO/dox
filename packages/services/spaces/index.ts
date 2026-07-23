import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

export class SpacesService {
  private client: S3Client | null = null;
  private bucket: string;

  constructor() {
    this.bucket = process.env.SPACES_BUCKET || "ragapp-bucket";
    
    // Only initialize if variables are present, else we mock/fail gracefully
    if (process.env.SPACES_ENDPOINT && process.env.SPACES_KEY && process.env.SPACES_SECRET) {
      this.client = new S3Client({
        endpoint: process.env.SPACES_ENDPOINT,
        forcePathStyle: false, // Spaces uses virtual hosted-style requests typically
        region: process.env.SPACES_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.SPACES_KEY,
          secretAccessKey: process.env.SPACES_SECRET,
        },
      });
    }
  }

  async createPresignedPutUrl(key: string, contentType: string, expiresIn: number = 300) {
    if (!this.client) {
      // Return a mock URL for local testing without DO Spaces
      return `http://mock-spaces.local/upload?key=${encodeURIComponent(key)}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ACL: "private",
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async downloadFile(key: string, downloadPath: string) {
    if (!this.client) {
      throw new Error("S3 Client not configured");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error("No body in S3 response");
    }

    const writeStream = fs.createWriteStream(downloadPath);
    const readStream = response.Body as Readable;
    
    readStream.pipe(writeStream);
    await finished(writeStream);
  }
}

export const spacesService = new SpacesService();
