import {
  CreateOrganization,
  SignedIn,
  SignedOut,
  SignInButton,
  useOrganization,
} from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { BotsPage } from "@/pages/BotsPage";
import { BotDetailPage } from "@/pages/bots/BotDetailPage";
import { TeamPage } from "@/pages/TeamPage";
import { AdminPage } from "@/pages/AdminPage";
import { useMe } from "@/lib/useMe";

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">{children}</div>;
}

/** Pantalla de bienvenida / login. */
function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">bot-plataform</h1>
      <p className="text-muted-foreground">Inicia sesión para gestionar tus bots.</p>
      <SignInButton mode="modal">
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Iniciar sesión
        </button>
      </SignInButton>
    </div>
  );
}

/**
 * Páginas que requieren tenant activo. Si no hay org: el super admin va al
 * dashboard de plataforma; cualquier otro usuario crea su tenant (y queda admin).
 */
function TenantGate({ children }: { children: ReactNode }) {
  const { organization, isLoaded } = useOrganization();
  const { data: me, isLoading } = useMe();

  if (!isLoaded || isLoading) return <Centered>Cargando…</Centered>;

  if (!organization) {
    if (me?.isSuperAdmin) return <Navigate to="/admin" replace />;
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Crea tu tenant</h1>
          <p className="text-muted-foreground">
            Serás el administrador y podrás invitar usuarios para gestionar los bots.
          </p>
        </div>
        <CreateOrganization afterCreateOrganizationUrl="/" hideSlug />
      </div>
    );
  }

  return <>{children}</>;
}

/** Páginas exclusivas de super admin de plataforma. */
function SuperAdminGate({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <Centered>Cargando…</Centered>;
  if (!me?.isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TenantGate><BotsPage /></TenantGate>} />
            <Route path="bots/:botId" element={<TenantGate><BotDetailPage /></TenantGate>} />
            <Route path="team" element={<TenantGate><TeamPage /></TenantGate>} />
            <Route path="admin" element={<SuperAdminGate><AdminPage /></SuperAdminGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SignedIn>
    </>
  );
}
