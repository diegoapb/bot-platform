import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/clerk-react";
import { NavLink, Outlet } from "react-router-dom";
import { Bot, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout() {
  const { orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">bot-plataform</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              <Bot className="h-4 w-4" /> Bots
            </NavLink>
            {isAdmin && (
              <NavLink to="/team" className={linkClass}>
                <Users className="h-4 w-4" /> Equipo
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Selector / creación de tenant (organización). */}
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
          />
          <UserButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
