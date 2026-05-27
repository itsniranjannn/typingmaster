import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import sitemapPlugin from "vite-plugin-sitemap";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        legal: resolve(__dirname, "legal.html"),
        privacy: resolve(__dirname, "privacy.html"),
        terms: resolve(__dirname, "terms.html"),
        contact: resolve(__dirname, "contact.html")
      }
    }
  },
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
