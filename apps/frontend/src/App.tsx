import {
  CreateOrganization,
  SignedIn,
  SignedOut,
  SignInButton,
  useOrganization,
} from "@clerk/clerk-react";
import { Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { BotsPage } from "@/pages/BotsPage";
import { TeamPage } from "@/pages/TeamPage";

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
 * Si el usuario no tiene un tenant activo, le pedimos crear uno: al registrarse
 * crea su organización y queda como administrador (org:admin) automáticamente.
 */
function RequireTenant({ children }: { children: ReactNode }) {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>;
  }

  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
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

export default function App() {
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <RequireTenant>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<BotsPage />} />
              <Route path="/team" element={<TeamPage />} />
            </Route>
          </Routes>
        </RequireTenant>
      </SignedIn>
    </>
  );
}
