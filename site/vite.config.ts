import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 的项目站点挂在 /<repo>/ 下，base 不设会让资源全部 404。
export default defineConfig({
  plugins: [react()],
  base: "/wego-lolm/",
});
