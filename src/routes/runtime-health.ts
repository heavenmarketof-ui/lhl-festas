import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getServerEnv } from "@/lib/runtime-env.server";

export const Route = createFileRoute("/runtime-health")({
  server: {
    handlers: {
      GET: async () => {
        const payload = {
          ok: true,
          version: "runtime-health-v2",
          bindings: {
            SUPABASE_URL: Boolean(getServerEnv("SUPABASE_URL")),
            SUPABASE_PUBLISHABLE_KEY: Boolean(getServerEnv("SUPABASE_PUBLISHABLE_KEY")),
            GAS_ENDPOINT_URL: Boolean(getServerEnv("GAS_ENDPOINT_URL")),
            GAS_SHARED_TOKEN: Boolean(getServerEnv("GAS_SHARED_TOKEN")),
            GAS_LEADS_ADMIN_TOKEN: Boolean(getServerEnv("GAS_LEADS_ADMIN_TOKEN")),
          },
        };

        return Response.json(payload, {
          headers: {
            "Cache-Control": "no-store, max-age=0",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
