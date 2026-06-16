import { defineConfig } from "tsup";

// Bundla el backend a un único dist/index.js inlineando @bot/shared.
// @bot/shared se publica como TypeScript fuente (main: src/index.ts) y Node no
// puede cargar .ts en runtime; al bundlearlo (igual que Vite hace con el
// frontend) el backend queda sin esa dependencia en runtime. El resto de
// dependencias quedan external → se instalan en el node_modules de producción.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  noExternal: ["@bot/shared"],
  clean: true,
  sourcemap: true,
});
