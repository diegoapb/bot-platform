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
import { ConversationsList } from "@/pages/conversations/ConversationsList";
import { ConversationView } from "@/pages/conversations/ConversationView";
import { MetricsDashboard } from "@/pages/metrics/MetricsDashboard";
import { useMe } from "@/lib/useMe";
import { Button, Eyebrow, Loading, Logo } from "@/components/ui";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">{children}</div>
  );
}

/** Pantalla de bienvenida / login — superficie forest del DS. */
function Landing() {
  return (
    <div
      data-surface="dark"
      className="ds-dotgrid relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 10%, rgba(0,255,136,0.12), transparent 60%), radial-gradient(50% 50% at 90% 90%, rgba(0,255,136,0.08), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-8">
        <Logo surface="dark" className="[&_span]:text-fg" />
        <div className="space-y-5">
          <Eyebrow num="01">Plataforma de bots</Eyebrow>
          <h1 className="ds-display max-w-[18ch] text-fg">
            Gestiona tus bots de WhatsApp <em>sin fricción</em>.
          </h1>
          <p className="mx-auto max-w-[46ch] text-base leading-relaxed text-fg2">
            Conecta números, entrena la identidad y atiende conversaciones desde un
            solo lugar.
          </p>
        </div>
        <SignInButton mode="modal">
          <Button size="lg">Iniciar sesión</Button>
        </SignInButton>
      </div>
    </div>
  );
}

/** Suscripción bloqueada (SUB-E08): el panel no opera hasta resolver el pago. */
function SubscriptionBlocked({ reason, paymentUrl }: { reason: string; paymentUrl: string | null }) {
  const message =
    reason === "no_subscription" || reason === "no_customer"
      ? "Tu organización aún no tiene un plan contratado."
      : "La suscripción de tu organización está suspendida.";
  return (
    <Centered>
      <div className="max-w-md space-y-5 text-center">
        <Eyebrow num="!!">Suscripción</Eyebrow>
        <h1 className="font-display text-2xl font-medium text-fg">Acceso bloqueado</h1>
        <p className="text-sm leading-relaxed text-fg2">
          {message} El panel y tus bots quedan pausados hasta regularizarla; tus datos y
          conversaciones se conservan.
        </p>
        {paymentUrl && (
          <Button size="lg" onClick={() => window.open(paymentUrl, "_blank")}>
            Resolver suscripción
          </Button>
        )}
      </div>
    </Centered>
  );
}

/** Banner de gracia (past_due): se puede operar, pero hay un pago pendiente. */
function SubscriptionBanner({ paymentUrl }: { paymentUrl: string | null }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-fg">
      <span>
        Hay un pago pendiente en la suscripción de tu organización: si no se resuelve, el
        acceso se suspenderá.
      </span>
      {paymentUrl && (
        <a className="shrink-0 underline" href={paymentUrl} target="_blank" rel="noreferrer">
          Pagar ahora →
        </a>
      )}
    </div>
  );
}

/**
 * Páginas que requieren tenant activo. Si no hay org: el super admin va al
 * dashboard de plataforma; cualquier otro usuario crea su tenant (y queda admin).
 * Con tenant, aplica el estado de la suscripción (SUB-E08): bloqueada → pantalla
 * de pago; en gracia → banner.
 */
function TenantGate({ children }: { children: ReactNode }) {
  const { organization, isLoaded } = useOrganization();
  const { data: me, isLoading } = useMe();

  if (!isLoaded || isLoading)
    return (
      <Centered>
        <Loading />
      </Centered>
    );

  if (!organization) {
    if (me?.isSuperAdmin) return <Navigate to="/admin" replace />;
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-medium text-fg">Crea tu tenant</h1>
          <p className="text-sm text-fg2">
            Serás el administrador y podrás invitar usuarios para gestionar los bots.
          </p>
        </div>
        <CreateOrganization afterCreateOrganizationUrl="/" hideSlug />
      </div>
    );
  }

  const subscription = me?.subscription;
  if (subscription?.access === "blocked") {
    return <SubscriptionBlocked reason={subscription.reason} paymentUrl={subscription.paymentUrl} />;
  }

  return (
    <>
      {subscription?.access === "restricted" && (
        <SubscriptionBanner paymentUrl={subscription.paymentUrl} />
      )}
      {children}
    </>
  );
}

/** Páginas exclusivas de super admin de plataforma. */
function SuperAdminGate({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading)
    return (
      <Centered>
        <Loading />
      </Centered>
    );
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
            <Route path="conversations" element={<TenantGate><ConversationsList /></TenantGate>} />
            <Route path="conversations/:conversationId" element={<TenantGate><ConversationView /></TenantGate>} />
            <Route path="metrics" element={<TenantGate><MetricsDashboard /></TenantGate>} />
            <Route path="team" element={<TenantGate><TeamPage /></TenantGate>} />
            <Route path="admin" element={<SuperAdminGate><AdminPage /></SuperAdminGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SignedIn>
    </>
  );
}
