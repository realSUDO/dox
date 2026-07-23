import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

async function testUpload() {
  const endpoint = process.env.SPACES_ENDPOINT;
  const region = process.env.SPACES_REGION || "us-east-1";
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;
  const bucket = process.env.SPACES_BUCKET;

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: process.env.SPACES_KEY as string,
      secretAccessKey: process.env.SPACES_SECRET as string,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: "test-backend-upload.txt",
    Body: "Hello from backend!",
    ContentType: "text/plain",
  });

  try {
    await client.send(command);
    console.log("SUCCESS! The backend was able to upload a file to DO Spaces.");
  } catch (error) {
    console.error("FAILED to upload file:", error);
  }
}

testUpload();
