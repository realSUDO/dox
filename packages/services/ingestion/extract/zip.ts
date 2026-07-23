import yauzl from "yauzl";
import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";

export interface ZipEntry {
  fileName: string;
  filePath: string;
}

export async function extractZip(zipFilePath: string, outputDir: string): Promise<ZipEntry[]> {
  return new Promise((resolve, reject) => {
    const extractedFiles: ZipEntry[] = [];
    let totalUncompressedSize = 0;
    const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      if (!zipfile) return reject(new Error("Failed to open zip"));

      zipfile.readEntry();

      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName) || entry.fileName.includes("__MACOSX/") || entry.fileName.includes(".DS_Store")) {
          // Directory or junk file, skip
          zipfile.readEntry();
        } else {
          // File entry
          totalUncompressedSize += entry.uncompressedSize;
          if (totalUncompressedSize > MAX_SIZE) {
            zipfile.close();
            return reject(new Error("Uncompressed size exceeds 200MB limit"));
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            if (!readStream) return reject(new Error("Failed to read stream"));

            // Output path
            const outputPath = path.join(outputDir, entry.fileName.replace(/\//g, "_"));
            const writeStream = fs.createWriteStream(outputPath);

            readStream.on("end", () => {
              extractedFiles.push({
                fileName: entry.fileName,
                filePath: outputPath,
              });
              zipfile.readEntry();
            });

            readStream.pipe(writeStream);
          });
        }
      });

      zipfile.on("end", () => {
        resolve(extractedFiles);
      });
      
      zipfile.on("error", (err) => {
        reject(err);
      });
    });
  });
}
