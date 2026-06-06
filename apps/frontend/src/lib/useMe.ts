import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "./useApi";

/** Identidad + contexto de tenant + rol de plataforma del usuario actual. */
export function useMe() {
  const api = useApi();
  const { orgId } = useAuth();
  return useQuery({
    // Re-consulta al cambiar de tenant activo (cambia el org_id del token).
    queryKey: ["me", orgId ?? null],
    queryFn: () => api.me(),
  });
}
