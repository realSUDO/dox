import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [/^@repo\//], // Only bundle our workspace packages
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
  esbuildOptions(options) {
    // Externalize ALL npm packages by default.
    // tsup's noExternal overrides this for @repo/* workspace packages.
    // This prevents native bindings (sharp, onnxruntime, bcrypt, prisma, etc.)
    // from being bundled — they load from node_modules at runtime instead.
    options.packages = "external";
  },
});
