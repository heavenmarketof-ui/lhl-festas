import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

function manualChunks(id: string) {
  if (!id.includes("node_modules")) return undefined;

  // Mantém dependências pesadas fora dos chunks das telas. Assim, por exemplo,
  // as bibliotecas de PDF só são baixadas quando a exportação é realmente usada.
  if (id.includes("html2canvas-pro")) return "vendor-html2canvas";
  if (id.includes("jspdf")) return "vendor-jspdf";
  if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
  if (id.includes("lucide-react")) return "vendor-icons";

  return undefined;
}

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
});
