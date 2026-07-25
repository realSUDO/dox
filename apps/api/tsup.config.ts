import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [/^@repo\//],
  external: [
    "bcrypt",
    "sharp",
    "onnxruntime-node",
    "onnxruntime-common",
    "@napi-rs/canvas",
    "@xenova/transformers",
    "tesseract.js",
    "tesseract.js-core",
    "pdfjs-dist",
    "@prisma/client",
    ".prisma/client",
    "jsdom",
    "canvas",
  ],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
