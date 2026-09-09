import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { fileURLToPath, URL } from "node:url";

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
  // Aliases soberanos explícitos: Vite, Vitest e SSR devem resolver exatamente
  // as mesmas regras LHL, sem cair acidentalmente nos módulos-base legados.
  resolve: {
    alias: [
      {
        find: "@/lib/gestao/aggregate",
        replacement: fileURLToPath(new URL("./src/lib/gestao/aggregate-lhl.ts", import.meta.url)),
      },
      {
        find: "@/lib/producao-api",
        replacement: fileURLToPath(new URL("./src/lib/producao-api-lhl.ts", import.meta.url)),
      },
      {
        find: "@/lib/sheets-api",
        replacement: fileURLToPath(new URL("./src/lib/sheets-api-lhl.ts", import.meta.url)),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  // CNPJ é dado público institucional e fica disponível nos documentos gerados.
  define: {
    "import.meta.env.VITE_LHL_CNPJ": JSON.stringify("66.067.187/0001-59"),
  },
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
