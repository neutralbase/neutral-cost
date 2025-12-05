import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  envDir: "../",
  plugins: [react(), tailwindcss()],
  resolve: {
    conditions: ["@convex-dev/component-source"],
  },
});
