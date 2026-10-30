import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["logo.svg", "apple-touch-icon.png"],
      manifest: {
        name: "SpendLens",
        short_name: "SpendLens",
        description: "See every rupee. Keep more of it.",
        theme_color: "#4F46E5",
        background_color: "#F6F7FB",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [192, 512].flatMap((size) => [
          {
            src: `/icon-${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any",
          },
          {
            src: `/maskable-${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "maskable",
          },
        ]),
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
