import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/clerk-react";
import { NavLink, Outlet } from "react-router-dom";
import { Bot, BrainCircuit, Users, Shield, MessagesSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/useMe";
import { Logo } from "@/components/ui";

export function Layout() {
  const { orgRole } = useAuth();
  const { data: me } = useMe();
  const isAdmin = orgRole === "org:admin";
  const hasTenant = !!me?.tenantId;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors duration-200",
      isActive
        ? "bg-chip text-fg"
        : "text-fg3 hover:text-accent",
    );

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-rail items-center justify-between gap-6 px-[clamp(20px,4vw,48px)]">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex">
              {hasTenant && (
                <>
                  <NavLink to="/" end className={linkClass}>
                    <Bot className="h-4 w-4" /> Bots
                  </NavLink>
                  <NavLink to="/agents" className={linkClass}>
                    <BrainCircuit className="h-4 w-4" /> Agentes
                  </NavLink>
                  <NavLink to="/conversations" className={linkClass}>
                    <MessagesSquare className="h-4 w-4" /> Conversaciones
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/metrics" className={linkClass}>
                      <BarChart3 className="h-4 w-4" /> Métricas
                    </NavLink>
                  )}
                  {isAdmin && (
                    <NavLink to="/team" className={linkClass}>
                      <Users className="h-4 w-4" /> Equipo
                    </NavLink>
                  )}
                </>
              )}
              {me?.isSuperAdmin && (
                <NavLink to="/admin" className={linkClass}>
                  <Shield className="h-4 w-4" /> Plataforma
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/"
              afterSelectOrganizationUrl="/"
            />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-rail flex-1 px-[clamp(20px,4vw,48px)] py-10">
        <Outlet />
      </main>
    </div>
  );
}
