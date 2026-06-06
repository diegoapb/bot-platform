import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import { createApi } from "./api";

/** Devuelve el cliente API ligado al token de sesión Clerk actual. */
export function useApi() {
  const { getToken } = useAuth();
  return useMemo(() => createApi(() => getToken()), [getToken]);
}
