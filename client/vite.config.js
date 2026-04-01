import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    base: "/app/",
    server: {
        port: 5173,
    },
    build: {
        outDir: path.resolve(__dirname, "../public/app"),
        emptyOutDir: true,
    },
});
