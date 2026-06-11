/* global window, React, NeuralNetwork, Ico */
// Hospitality (Hotelería & Turismo) sub-landing sections.

function HotNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a className="brand" href="index.html">
          <span className="mark">S</span>
          <span>Open Solvex · Hotelería</span>
        </a>
        <div className="nav-links">
          <a href="#stack">Stack</a>
          <a href="#resultados">Resultados</a>
          <a href="#casos">Casos</a>
          <a href="#soluciones">Soluciones</a>
          <a href="index.html">Volver</a>
        </div>
        <div className="nav-cta">
          <a className="btn btn-primary" href="#contacto">
            Agendar demo
            <Ico name="arrow-right" size={16} stroke={2} className="arr" />
          </a>
        </div>
      </div>
    </nav>
  );
}

function HotHero() {
  return (
    <header className="hero hot-hero">
      <div className="hero-bg">
        <NeuralNetwork variant="growth" />
        <div className="hero-grad" />
        <div className="hero-vignette" />
      </div>
      <div className="wrap hero-inner">
        <div className="hero-tag">
          <span className="dot" />
          <span>Vertical · Hotelería &amp; Turismo</span>
        </div>
        <div className="hero-grid">
          <div>
            <h1 className="h-display">
              Más reservas <em>directas</em>, menos fricción.
            </h1>
            <p className="lede">
              Implementamos herramientas open-source para que tu hotel capte más
              huéspedes, reduzca comisiones y opere mejor. Casos reales, stack abierto,
              soporte continuo.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#contacto">
                Agendar demo
                <Ico name="arrow-right" size={16} stroke={2} className="arr" />
              </a>
              <a className="btn btn-ghost-light" href="#stack">Ver stack</a>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><div className="v">+38<span className="unit">%</span></div><div className="l">reservas directas</div></div>
            <div className="hero-stat"><div className="v">−42<span className="unit">%</span></div><div className="l">comisión a OTAs</div></div>
            <div className="hero-stat"><div className="v">24/7</div><div className="l">atención al huésped</div></div>
            <div className="hero-stat"><div className="v">8<span className="unit">sem</span></div><div className="l">a producción</div></div>
          </div>
        </div>
        <div className="hero-bottom">
          <span>// Stack 100 % open-source · auto-hospedable</span>
          <div className="clients">
            <span>HOTEL LOMAS</span><span>BAHÍA AZUL</span><span>LA POSADA</span>
          </div>
        </div>
      </div>
    </header>
  );
}

const HOT_PILLARS = [
  { num: '01', icon: 'globe',        title: 'Reservas directas',    body: 'Motor propio que recupera reservas que se iban a las OTAs.' },
  { num: '02', icon: 'message-circle', title: 'Atención al huésped', body: 'Agente conversacional 24/7 conectado a WhatsApp y al PMS.' },
  { num: '03', icon: 'bar-chart',    title: 'Decisiones con datos', body: 'Dashboards con ADR, RevPAR y origen de canal, en un solo lugar.' },
];
function HotPillars() {
  return (
    <section className="pillars">
      <div className="wrap">
        <div className="pillars-head">
          <div>
            <div className="eyebrow"><span className="num">01</span>&nbsp;&nbsp;QUÉ RESOLVEMOS</div>
            <h2 className="h-section">Tres frentes donde un hotel deja dinero en la mesa.</h2>
          </div>
          <p className="lede">Diseñamos por área de negocio, no por feature. Cada implementación se mide con métricas que tu equipo de operaciones ya entiende.</p>
        </div>
        <div className="pillars-grid">
          {HOT_PILLARS.map(p => (
            <article className="pillar" key={p.num}>
              <span className="step">FRENTE {p.num}</span>
              <span className="corner">→</span>
              <div className="icon-wrap"><Ico name={p.icon} size={22} /></div>
              <h3 className="h-card">{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STACK = [
  { sym: 'Cal',  name: 'Cal.com',    cat: 'RESERVAS',    body: 'Motor de reservas auto-hospedado. Sin comisiones, conectado a calendario y CRM.' },
  { sym: 'Lis',  name: 'Listmonk',   cat: 'EMAIL',       body: 'Newsletter y campañas transaccionales que tú controlas, sin cuotas por contacto.' },
  { sym: 'Pla',  name: 'Plausible',  cat: 'ANALÍTICA',   body: 'Analítica privada, sin cookies. Tus datos no se venden.' },
  { sym: 'Noc',  name: 'NocoDB',     cat: 'CRM / OPS',   body: 'Hoja de cálculo + base de datos para el front-office. CRUD para no-devs.' },
  { sym: 'Cha',  name: 'Chatwoot',   cat: 'INBOX',       body: 'Bandeja única para WhatsApp, email e Instagram. Bot + agente humano.' },
  { sym: 'n8n',  name: 'n8n',        cat: 'WORKFLOWS',   body: 'Pegamento entre PMS, pasarela de pago, contabilidad y agente de IA.' },
  { sym: 'Met',  name: 'Metabase',   cat: 'DASHBOARDS',  body: 'ADR, RevPAR, ocupación y canal en un panel que tu equipo entiende.' },
  { sym: 'Min',  name: 'Minio',      cat: 'ALMACÉN',     body: 'Documentos, fotos y backups en S3 compatible, en tu infra.' },
];
function HotStack() {
  return (
    <section className="services" id="stack">
      <div className="wrap">
        <div className="pillars-head" style={{ marginBottom: 48 }}>
          <div>
            <div className="eyebrow"><span className="num">02</span>&nbsp;&nbsp;STACK ABIERTO</div>
            <h2 className="h-section">Herramientas open-source, ensambladas para hotelería.</h2>
          </div>
          <p className="lede">Cada pieza es estándar, auditable y tuya. Si decides operar por dentro, te dejamos todo documentado.</p>
        </div>
        <div className="stack-grid">
          {STACK.map(s => (
            <article className="stack-card" key={s.name}>
              <div className="stack-head">
                <div className="stack-logo">{s.sym}</div>
                <div>
                  <div className="stack-name">{s.name}</div>
                  <div className="stack-cat">{s.cat}</div>
                </div>
                <span className="stack-os">OS</span>
              </div>
              <p>{s.body}</p>
              <div className="stack-foot"><span className="marker">→</span> docs</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HotResults() {
  return (
    <section className="results" id="resultados">
      <div className="wrap">
        <div className="results-head">
          <div className="eyebrow"><span className="num">03</span>&nbsp;&nbsp;RESULTADOS</div>
          <h2 className="h-section">Las cifras de tres temporadas con clientes activos.</h2>
        </div>
        <div className="metrics">
          <div className="metric"><div className="v"><span className="pre">+</span>38<span className="unit">%</span></div><div className="l">Reservas directas vs. canal OTA</div><span className="tag">90 DÍAS</span></div>
          <div className="metric"><div className="v"><span className="pre">−</span>42<span className="unit">%</span></div><div className="l">Comisión OTA absorbida</div><span className="tag">ANUAL</span></div>
          <div className="metric"><div className="v">24/7</div><div className="l">Cobertura al huésped por WhatsApp + email</div><span className="tag">CONTINUO</span></div>
        </div>
        <div className="results-foot">
          <span>// Hotel Lomas · Bahía Azul · La Posada</span>
          <span><span className="marker">●</span> Mediciones contra baseline pre-engagement</span>
        </div>
      </div>
    </section>
  );
}

const HOT_CASES = [
  { id: 'lomas',  tag: 'CASO 01',  title: 'Hotel Lomas — motor propio y 38 % de reservas directas.', body: 'En 12 semanas pasaron de depender de OTAs a tener un canal propio que ya representa el 38 % de las reservas, con flujo directo a contabilidad.', tags: ['cal.com','chatwoot','n8n'], kpis: [['+38%','RESERVAS DIRECTAS'],['−42%','COMISIÓN OTA']] },
  { id: 'bahia',  tag: 'CASO 02',  title: 'Bahía Azul — agente 24/7 que conoce el inventario.',     body: 'Bot conectado a PMS y Cal.com. El equipo de recepción atiende sólo lo que necesita un humano. Tiempo de primera respuesta: < 30 s.',                  tags: ['chatwoot','openai','n8n'], kpis: [['<30s','PRIMERA RESPUESTA'],['3.2x','LEADS CALIFICADOS']] },
  { id: 'posada', tag: 'CASO 03',  title: 'La Posada — un solo dashboard para tres propiedades.',   body: 'Operación con ADR, RevPAR y origen de canal unificados. La gerencia toma decisiones de pricing los lunes en 20 minutos.',                                  tags: ['metabase','nocodb'],       kpis: [['1 panel','3 PROPIEDADES'],['20 min','REUNIÓN SEMANAL']] },
];
function HotCases() {
  return (
    <section className="cases" id="casos">
      <div className="wrap">
        <div className="cases-head">
          <div>
            <div className="eyebrow"><span className="num">04</span>&nbsp;&nbsp;CASOS</div>
            <h2 className="h-section">Hoteles boutique que ya operan con este stack.</h2>
          </div>
          <p className="lede">Tres propiedades, tres operaciones distintas. Mismo stack abierto, configurado para cada caso.</p>
        </div>
        <div className="hot-cases-list">
          {HOT_CASES.map(c => (
            <article className="hot-case" key={c.id}>
              <div className="hot-case-visual" data-img={c.id}>
                <span className="hot-case-num">{c.tag}</span>
                <div className="hot-case-pattern" />
              </div>
              <div className="hot-case-body">
                <span className="hot-case-tag">{c.tag}</span>
                <h3 className="h-card" style={{ marginTop: 14, fontSize: 24, lineHeight: 1.15 }}>{c.title}</h3>
                <p style={{ marginTop: 12, color: 'var(--graphite-2)', fontSize: 15, lineHeight: 1.55 }}>{c.body}</p>
                <div className="hot-case-stack">{c.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div>
                <div className="hot-case-kpis">
                  {c.kpis.map(([v, l], i) => (
                    <div className="hot-case-kpi" key={i}>
                      <div className="v">{v}</div>
                      <div className="l">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const HOT_SOL = [
  { num: '01', title: 'Captación', items: ['Sitio veloz con motor de reservas propio', 'SEO técnico y schema para hospedaje', 'Captura de leads desde Instagram y WhatsApp'] },
  { num: '02', title: 'Operación', items: ['Inbox unificado para huéspedes', 'Workflows entre PMS, pago y contabilidad', 'Notas y SOPs accesibles al personal de recepción'] },
  { num: '03', title: 'Decisión',  items: ['ADR / RevPAR / ocupación en tiempo real', 'Origen de canal y costo por reserva', 'Reportes para gerencia y para propietarios'] },
];
function HotSolutions() {
  return (
    <section className="hot-solutions" id="soluciones">
      <div className="wrap">
        <div className="pillars-head" style={{ marginBottom: 48 }}>
          <div>
            <div className="eyebrow"><span className="num">05</span>&nbsp;&nbsp;SOLUCIONES</div>
            <h2 className="h-section">Qué entregamos en cada frente.</h2>
          </div>
          <p className="lede">Tres columnas, tres momentos del negocio. Empezamos por donde más duela.</p>
        </div>
        <div className="hot-sol-grid">
          {HOT_SOL.map(c => (
            <div className="hot-sol-col" key={c.num}>
              <div className="hot-sol-head">
                <span className="hot-sol-num">— {c.num}</span>
                <h3 className="h-card">{c.title}</h3>
              </div>
              <ul className="hot-sol-list">
                {c.items.map((it, i) => (
                  <li key={i}><span className="bullet"><Ico name="check" size={11} stroke={2.4} /></span><span>{it}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HotCTA()    { return <CTAForm />; }
function HotFooter() { return <Footer />; }

Object.assign(window, { HotNav, HotHero, HotPillars, HotStack, HotResults, HotCases, HotSolutions, HotCTA, HotFooter });
