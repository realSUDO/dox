import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

async function configureCors() {
  const endpoint = process.env.SPACES_ENDPOINT;
  const region = process.env.SPACES_REGION || "us-east-1";
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;
  const bucket = process.env.SPACES_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.error("Missing Spaces environment variables in .env");
    process.exit(1);
  }

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
          AllowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  });

  try {
    await client.send(command);
    console.log("Successfully configured CORS for bucket:", bucket);
  } catch (error) {
    console.error("Failed to configure CORS:", error);
  }
}

configureCors();
