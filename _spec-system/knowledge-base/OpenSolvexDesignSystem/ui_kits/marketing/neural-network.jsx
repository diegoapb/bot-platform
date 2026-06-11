/* global window, React */
// Animated neural-network canvas used as the hero background.
// Low-density particles in beige + lime nodes, connected by faint lime lines.

function NeuralNetwork({ density = 1, variant = 'neural' }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    if (variant !== 'neural') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;
    const N = Math.round(36 * density);
    const nodes = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function init() {
      nodes.length = 0;
      for (let i = 0; i < N; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: 1.4 + Math.random() * 1.6,
          accent: Math.random() < 0.18,
        });
      }
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const alpha = 0.32 * (1 - d2 / 22000);
            ctx.strokeStyle = `rgba(0,255,136,${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        ctx.beginPath();
        ctx.fillStyle = n.accent ? '#00FF88' : 'rgba(245,241,232,0.85)';
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    resize(); init(); tick();
    const onResize = () => { resize(); init(); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [density, variant]);

  if (variant === 'growth') {
    return (
      <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="growth-line" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"  stopColor="#00FF88" stopOpacity="0" />
            <stop offset="60%" stopColor="#00FF88" stopOpacity="1" />
            <stop offset="100%" stopColor="#00FF88" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#00FF88" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="rgba(245,241,232,0.08)" strokeWidth="1">
          {[60, 140, 220, 300].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} />)}
        </g>
        <path d="M 40 310 C 200 300, 280 280, 360 240 S 540 110, 760 50 L 760 360 L 40 360 Z" fill="url(#growth-fill)" />
        <path d="M 40 310 C 200 300, 280 280, 360 240 S 540 110, 760 50" fill="none" stroke="url(#growth-line)" strokeWidth="2.4" strokeLinecap="round" />
        <g fill="#00FF88">
          {[[40,310],[200,300],[360,240],[540,140],[760,50]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={i===4?4.4:3.4} />)}
        </g>
      </svg>
    );
  }

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

Object.assign(window, { NeuralNetwork });
