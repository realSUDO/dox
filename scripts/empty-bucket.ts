import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function emptyBucket() {
  const bucket = process.env.SPACES_BUCKET || "ragapp-bucket";
  console.log(`Attempting to empty bucket: ${bucket}`);

  if (!process.env.SPACES_ENDPOINT || !process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
    console.error("S3 configuration is missing in .env");
    process.exit(1);
  }

  const client = new S3Client({
    endpoint: process.env.SPACES_ENDPOINT,
    forcePathStyle: false,
    region: process.env.SPACES_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    },
  });

  try {
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    let totalDeleted = 0;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      });

      const listResponse = await client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        console.log("Bucket is currently empty or no more objects found.");
        break;
      }

      const objectsToDelete = listResponse.Contents.map((item) => ({ Key: item.Key }));
      
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objectsToDelete,
          Quiet: true,
        },
      });

      await client.send(deleteCommand);
      totalDeleted += objectsToDelete.length;
      console.log(`Deleted ${objectsToDelete.length} objects...`);

      isTruncated = listResponse.IsTruncated ?? false;
      continuationToken = listResponse.NextContinuationToken;
    }

    console.log(`Successfully emptied bucket. Total objects deleted: ${totalDeleted}`);
  } catch (err) {
    console.error("Error emptying bucket:", err);
    process.exit(1);
  }
}

emptyBucket();
