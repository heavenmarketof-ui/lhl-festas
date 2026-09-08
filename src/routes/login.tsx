import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rota antiga de login local — mantida apenas para redirecionar ao acesso seguro. */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
  component: () => null,
});
