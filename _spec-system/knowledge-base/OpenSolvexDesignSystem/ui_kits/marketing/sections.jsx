/* global window, React, NeuralNetwork, Ico */
// Marketing section components for the Open Solvex IA landing page.
// Each section is exported to window for consumption by the main script.

// ────────────────────────────────────────────────────────────────
// Top navigation
// ────────────────────────────────────────────────────────────────
function Nav({ sub = null }) {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a className="brand" href="#">
          <span className="mark">S</span>
          <span>Open Solvex{sub ? ' · ' + sub : ''}</span>
        </a>
        <div className="nav-links">
          <a href="#servicios">Servicios</a>
          <a href="#resultados">Resultados</a>
          <a href="#proceso">Proceso</a>
          <a href="#casos">Casos</a>
          <a href="hotelera.html">Hotelería</a>
        </div>
        <div className="nav-cta">
          <a className="btn btn-ghost-light" href="#contacto">Iniciar sesión</a>
          <a className="btn btn-primary" href="#contacto">
            Agendar diagnóstico
            <Ico name="arrow-right" size={16} stroke={2} className="arr" />
          </a>
        </div>
      </div>
    </nav>
  );
}

// ────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────
function Hero({ variant = 'neural' }) {
  return (
    <header className="hero">
      <div className="hero-bg">
        <NeuralNetwork variant={variant} />
        <div className="hero-grad" />
        <div className="hero-vignette" />
      </div>
      <div className="wrap hero-inner">
        <div className="hero-tag">
          <span className="dot" />
          <span>Aceptando proyectos · Q4 2025</span>
        </div>
        <div className="hero-grid">
          <div>
            <h1 className="h-display">
              Software &amp; IA que hace <em>crecer</em> tu negocio.
            </h1>
            <p className="lede">
              Consultoría profesional en software e inteligencia artificial. Diseñamos
              soluciones a medida para impulsar ventas, atraer clientes y elevar la
              calidad del servicio.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary" href="#contacto">
                Agendar diagnóstico
                <Ico name="arrow-right" size={16} stroke={2} className="arr" />
              </a>
              <a className="btn btn-ghost-light" href="#casos">Ver casos</a>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="v">+38<span className="unit">%</span></div>
              <div className="l">Ingresos digitales en clientes activos</div>
            </div>
            <div className="hero-stat">
              <div className="v">−42<span className="unit">%</span></div>
              <div className="l">Tiempo en operación manual</div>
            </div>
            <div className="hero-stat">
              <div className="v">24/7</div>
              <div className="l">Atención automatizada al cliente</div>
            </div>
            <div className="hero-stat">
              <div className="v">12<span className="unit">sem</span></div>
              <div className="l">De diagnóstico a producción</div>
            </div>
          </div>
        </div>
        <div className="hero-bottom">
          <span>// Trabajamos con equipos en LATAM</span>
          <div className="clients">
            <span>HOTEL LOMAS</span>
            <span>BAHÍA AZUL</span>
            <span>LA POSADA</span>
            <span>NORTH CRAFT</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────
// Pilares
// ────────────────────────────────────────────────────────────────
const PILLARS = [
  { num: '01', icon: 'compass',     title: 'Diagnóstico de negocio', body: 'Mapeamos procesos, ingresos y cuellos de botella antes de tocar una línea de código.' },
  { num: '02', icon: 'workflow',    title: 'Software a medida',      body: 'Construimos lo que tu equipo realmente usa, sobre stacks abiertos y escalables.' },
  { num: '03', icon: 'sparkles',    title: 'IA aplicada al embudo',  body: 'Modelos, agentes y automatizaciones conectados a tu CRM y canales reales.' },
];
function Pillars() {
  return (
    <section className="pillars" id="servicios">
      <div className="wrap">
        <div className="pillars-head">
          <div>
            <div className="eyebrow"><span className="num">01</span>&nbsp;&nbsp;SERVICIOS</div>
            <h2 className="h-section">Tres pilares, un mismo objetivo: <em>crecimiento</em>.</h2>
          </div>
          <p className="lede">No vendemos horas ni features sueltas. Diseñamos sistemas que se sostienen solos y se pagan con resultados medibles.</p>
        </div>
        <div className="pillars-grid">
          {PILLARS.map(p => (
            <article className="pillar" key={p.num}>
              <span className="step">PASO {p.num}</span>
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

// ────────────────────────────────────────────────────────────────
// Servicios (bento)
// ────────────────────────────────────────────────────────────────
const SERVICES = [
  { num: '01', icon: 'cpu',          title: 'Aplicaciones web a medida', body: 'Dashboards internos, portales de cliente, e-commerce. Stack moderno, mantenibles.', tags: ['react','next.js','supabase'], cls: 'col-3' },
  { num: '02', icon: 'sparkles',     title: 'IA aplicada al embudo',     body: 'Agentes que califican leads, redactan respuestas y conectan con tu CRM 24/7.',  tags: ['openai','n8n','whatsapp'],   cls: 'col-3 feature' },
  { num: '03', icon: 'workflow',     title: 'Automatización de procesos', body: 'De cotizaciones a facturación: menos manual, menos errores.',                  tags: ['zapier','n8n'],              cls: 'col-2' },
  { num: '04', icon: 'bar-chart',    title: 'Dashboards & analítica',    body: 'KPIs unificadas. Decisiones con datos, no con intuición.',                    tags: ['metabase','plausible'],      cls: 'col-2' },
  { num: '05', icon: 'shield-check', title: 'Consultoría técnica',       body: 'Acompañamos a tu equipo o cubrimos la posición CTO mientras escalas.',         tags: ['audit','strategy'],          cls: 'col-2' },
];
function Services() {
  return (
    <section className="services">
      <div className="wrap">
        <div className="pillars-head" style={{ marginBottom: 48 }}>
          <div>
            <div className="eyebrow"><span className="num">02</span>&nbsp;&nbsp;QUÉ HACEMOS</div>
            <h2 className="h-section">Servicios diseñados para mover métricas, no para llenar slides.</h2>
          </div>
          <p className="lede">Combinamos producto, ingeniería e IA. Cada engagement se mide contra una métrica de negocio acordada antes de empezar.</p>
        </div>
        <div className="bento">
          {SERVICES.map(s => (
            <article key={s.num} className={`bento-card ${s.cls || ''}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="num">— {s.num}</span>
                  <div className="svc-icon"><Ico name={s.icon} size={20} /></div>
                </div>
                <h3 className="h-card">{s.title}</h3>
                <p>{s.body}</p>
              </div>
              <div className="tag-row">{s.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Resultados
// ────────────────────────────────────────────────────────────────
function Results() {
  return (
    <section className="results" id="resultados">
      <div className="wrap">
        <div className="results-head">
          <div className="eyebrow"><span className="num">03</span>&nbsp;&nbsp;RESULTADOS</div>
          <h2 className="h-section">Cifras que se ven en el <em>P&amp;L</em>, no en el reporte de marketing.</h2>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="v"><span className="pre">+</span>38<span className="unit">%</span></div>
            <div className="l">Reservas directas en hoteles con motor propio</div>
            <span className="tag">90 DÍAS · HOTELERÍA</span>
          </div>
          <div className="metric">
            <div className="v"><span className="pre">−</span>42<span className="unit">%</span></div>
            <div className="l">Comisiones a OTAs después de migración</div>
            <span className="tag">ANUAL · HOTELERÍA</span>
          </div>
          <div className="metric">
            <div className="v">3.2<span className="unit">x</span></div>
            <div className="l">Leads calificados con agente de IA</div>
            <span className="tag">90 DÍAS · RETAIL</span>
          </div>
        </div>
        <div className="results-foot">
          <span>// Datos agregados de clientes activos entre 2023 y 2025</span>
          <span><span className="marker">●</span> Medido contra baseline pre-engagement</span>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Proceso
// ────────────────────────────────────────────────────────────────
const STEPS = [
  { n: '01', t: 'Diagnóstico',   d: 'Workshops con stakeholders, mapeo de procesos y métricas baseline.', dur: '1–2 sem' },
  { n: '02', t: 'Diseño',         d: 'Arquitectura, prototipos navegables y acuerdo de KPIs.',           dur: '2–3 sem' },
  { n: '03', t: 'Construcción',   d: 'Sprints semanales, demos en vivo, deploy continuo a staging.',     dur: '4–8 sem' },
  { n: '04', t: 'Operación',      d: 'Lanzamiento, capacitación al equipo y soporte mensual.',           dur: 'Continuo' },
];
function Process() {
  const [active, setActive] = React.useState(2);
  return (
    <section className="process" id="proceso">
      <div className="wrap">
        <div className="pillars-head" style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow"><span className="num">04</span>&nbsp;&nbsp;PROCESO</div>
            <h2 className="h-section">Cuatro pasos. Sin teatro de consultoría.</h2>
          </div>
          <p className="lede">Cada paso tiene un entregable concreto y una métrica clara. Tú decides si seguimos al siguiente.</p>
        </div>
        <div className="timeline" style={{ '--active-step': active }}>
          <div className="tl-rail" />
          <div className="tl-rail-fill" />
          {STEPS.map((s, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : '';
            return (
              <div key={s.n} className={`tl-step ${state}`} onMouseEnter={() => setActive(i)}>
                <div className="tl-node">{s.n}</div>
                <div className="tl-drop" />
                <div className="tl-meta">
                  <span>{state === 'active' ? '● ACTIVO' : `FASE ${s.n}`}</span>
                  <span className="tl-dur">{s.dur}</span>
                </div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Casos
// ────────────────────────────────────────────────────────────────
const CASES = [
  { initials: 'MG', name: 'María González', role: 'Hotel Lomas · Directora general', quote: 'En tres meses cambió por completo la forma en que recibimos reservas. Menos llamadas, más confirmaciones directas.', v: '+38%', l: 'RESERVAS DIRECTAS' },
  { initials: 'RA', name: 'Rodrigo Alcocer', role: 'Bahía Azul · Operations',          quote: 'El agente de WhatsApp responde en segundos a lo que antes nos tomaba la mañana entera.',                                       v: '24/7', l: 'ATENCIÓN AUTOMÁTICA' },
  { initials: 'LP', name: 'Lucía Peña',     role: 'North Craft · Founder',             quote: 'Pasamos de hojas de cálculo a un dashboard donde todo el equipo ve los mismos números.',                                   v: '3.2x', l: 'LEADS CALIFICADOS' },
];
function Cases() {
  return (
    <section className="cases" id="casos">
      <div className="wrap">
        <div className="cases-head">
          <div>
            <div className="eyebrow"><span className="num">05</span>&nbsp;&nbsp;CASOS</div>
            <h2 className="h-section">Negocios que ya están <em>creciendo</em> con nosotros.</h2>
          </div>
          <p className="lede">Pequeños cambios sostenidos en el tiempo ganan a grandes lanzamientos. Estos son algunos resultados.</p>
        </div>
        <div className="cases-grid">
          {CASES.map(c => (
            <article className="case" key={c.initials}>
              <p className="quote">{c.quote}</p>
              <div className="person">
                <div className="avatar">{c.initials}</div>
                <div className="who">
                  <div className="n">{c.name}</div>
                  <div className="r">{c.role}</div>
                </div>
              </div>
              <div className="result">
                <div className="v"><em>{c.v}</em></div>
                <div className="l">{c.l}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Sectores
// ────────────────────────────────────────────────────────────────
const SECTORS = [
  { icon: 'building',     label: 'Hotelería',  sub: 'TURISMO' },
  { icon: 'shopping-bag', label: 'Retail',     sub: 'D2C / OMNI' },
  { icon: 'stethoscope',  label: 'Salud',      sub: 'CLÍNICAS' },
  { icon: 'truck',        label: 'Logística',  sub: 'SMB' },
];
function Sectors() {
  return (
    <section className="sectors">
      <div className="wrap">
        <div className="sectors-head">
          <div className="eyebrow"><span className="num">06</span>&nbsp;&nbsp;SECTORES</div>
          <h3>Aplicamos lo aprendido en industrias donde el detalle importa.</h3>
        </div>
        <div className="sectors-row">
          {SECTORS.map(s => (
            <a className="sector" href="#" key={s.label}>
              <span className="ico"><Ico name={s.icon} size={22} /></span>
              <div>
                <div className="label">{s.label}</div>
                <div className="sub">{s.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// CTA + Form
// ────────────────────────────────────────────────────────────────
function CTAForm() {
  const [sent, setSent] = React.useState(false);
  return (
    <section className="cta-section" id="contacto">
      <div className="wrap cta-grid">
        <div>
          <div className="eyebrow"><span className="num">07</span>&nbsp;&nbsp;EMPECEMOS</div>
          <h2 className="h-section">Cuéntanos dónde te <em>estancas</em>. Te respondemos en menos de 24 h.</h2>
          <p className="lede">Diagnóstico inicial sin costo, 45 minutos por videollamada. Sales con un plan claro, decidas o no trabajar con nosotros.</p>
          <div className="cta-list">
            <div className="item"><span className="check"><Ico name="check" size={14} stroke={2.2} /></span> Reunión de 45 min con uno de nuestros leads</div>
            <div className="item"><span className="check"><Ico name="check" size={14} stroke={2.2} /></span> Documento con hallazgos y prioridades</div>
            <div className="item"><span className="check"><Ico name="check" size={14} stroke={2.2} /></span> Propuesta con plazos y costos, en 5 días</div>
          </div>
        </div>
        <form className="form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          {sent ? (
            <div className="form-success">
              <div className="ok"><Ico name="check" size={28} stroke={2.4} /></div>
              <h4>Gracias. Te respondemos en menos de 24 h.</h4>
              <p>Mientras tanto, recibirás un correo con disponibilidad para tu diagnóstico.</p>
            </div>
          ) : (
            <React.Fragment>
              <h3>Agenda tu diagnóstico</h3>
              <div className="form-sub">Sin compromiso. Sin pitch.</div>
              <div className="field-row">
                <div className="field"><label>Nombre</label><input required placeholder="María González" /></div>
                <div className="field"><label>Empresa</label><input placeholder="Hotel Lomas" /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Email</label><input required type="email" placeholder="tucorreo@empresa.com" /></div>
                <div className="field"><label>Teléfono</label><input placeholder="+52 ..." /></div>
              </div>
              <div className="field">
                <label>Sector</label>
                <select defaultValue="">
                  <option value="" disabled>Selecciona uno</option>
                  <option>Hotelería</option>
                  <option>Retail</option>
                  <option>Salud</option>
                  <option>Logística</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="field">
                <label>¿En qué te ayudamos?</label>
                <textarea rows="3" placeholder="Cuéntanos brevemente lo que necesitas..." />
              </div>
              <button type="submit" className="btn btn-primary btn-glow">
                Solicitar diagnóstico
                <Ico name="arrow-right" size={16} stroke={2} className="arr" />
              </button>
              <div className="legal">Al enviar aceptas nuestra <a href="#">política de privacidad</a>.</div>
            </React.Fragment>
          )}
        </form>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a className="brand" href="#"><span className="mark">S</span><span>Open Solvex</span></a>
            <p className="about">Consultoría profesional de software e inteligencia artificial. Diseñamos crecimiento, no slides.</p>
            <div className="foot-socials">
              <a href="#" aria-label="LinkedIn"><Ico name="linkedin" size={16} /></a>
              <a href="#" aria-label="Twitter"><Ico name="twitter"  size={16} /></a>
              <a href="#" aria-label="GitHub"><Ico name="github"    size={16} /></a>
            </div>
          </div>
          <div>
            <h5>Servicios</h5>
            <ul>
              <li><a href="#">Software a medida</a></li>
              <li><a href="#">IA aplicada</a></li>
              <li><a href="#">Automatización</a></li>
              <li><a href="#">Analítica</a></li>
            </ul>
          </div>
          <div>
            <h5>Sectores</h5>
            <ul>
              <li><a href="hotelera.html">Hotelería</a></li>
              <li><a href="#">Retail</a></li>
              <li><a href="#">Salud</a></li>
              <li><a href="#">Logística</a></li>
            </ul>
          </div>
          <div>
            <h5>Contacto</h5>
            <ul>
              <li><a href="mailto:hola@tusolvex.com">hola@tusolvex.com</a></li>
              <li><a href="#">+52 999 000 0000</a></li>
              <li><a href="#contacto">Agendar diagnóstico</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2025 Open Solvex</span>
          <span>Hecho con stack abierto en LATAM</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, Pillars, Services, Results, Process, Cases, Sectors, CTAForm, Footer });
