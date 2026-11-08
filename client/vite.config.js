import { defineConfig } from "vite";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    port: 3000,
    open: true, // Tarayıcıyı otomatik açar
  },
  plugins: [
    tailwindcss(),
    // Plugin sıralaması önemli - React plugin'inden önce olmalı
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
});
