import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import sitemapPlugin from "vite-plugin-sitemap";

export default defineConfig({
  plugins: [
    react(),
    sitemapPlugin({
      hostname: "https://gotype-alpha.vercel.app",
      dynamicRoutes: [],
      outDir: "dist"
    })
  ],
  optimizeDeps: {
    exclude: ["lucide-react", "canvas-confetti", "framer-motion"]
  },
  test: {
    globals: true,
    environment: "jsdom"
  }
});
