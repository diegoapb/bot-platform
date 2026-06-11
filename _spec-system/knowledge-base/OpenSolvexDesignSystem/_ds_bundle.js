/* @ds-bundle: {"format":3,"namespace":"OpenSolvexDesignSystem_019e23","components":[],"sourceHashes":{"design-canvas.jsx":"fb642362a04d","ui_kits/marketing/hospitality.jsx":"42b92b0fac5f","ui_kits/marketing/icons.jsx":"015d71747ff8","ui_kits/marketing/neural-network.jsx":"c6ad878642be","ui_kits/marketing/sections.jsx":"defe4f7c8b66","ui_kits/marketing/tweaks-panel.jsx":"22c052960f83"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OpenSolvexDesignSystem_019e23 = window.OpenSolvexDesignSystem_019e23 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), deletable, labels/titles are
// inline-editable, and any artboard can be opened in a fullscreen focus
// overlay (←/→/Esc). State persists to a .design-canvas.state.json sidecar
// via the host bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
  // isolation:isolate contains artboard content's z-indexes so a
  // z-indexed child (sticky navbar etc.) can't paint over .dc-header or
  // the .dc-menu popover that drops into the top of the card.
  '.dc-card{isolation:isolate;transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}',
  // Per-artboard header: grip + label on the left, delete/expand on the
  // right. Single flex row; when the artboard's on-screen width is too
  // narrow for both the label yields (ellipsis, then hidden entirely below
  // ~4ch via the container query) and the buttons stay on the row.
  '.dc-header{position:absolute;bottom:100%;left:-4px;margin-bottom:calc(4px * var(--dc-inv-zoom,1));z-index:2;', '  display:flex;align-items:center;container-type:inline-size}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px;flex:1 1 auto;min-width:0}', '.dc-grip{flex:0 0 auto;cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s,opacity .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px;padding:3px 6px;', '  display:flex;align-items:center;transition:background .12s;overflow:hidden}',
  // Below ~4ch of label room: hide the label entirely, and drop the grip to
  // hover-only (same reveal rule as .dc-btns) so a narrow header is clean
  // until the card is moused.
  '@container (max-width: 110px){', '  .dc-labeltext{display:none}', '  .dc-grip{opacity:0}', '  [data-dc-slot]:hover .dc-grip{opacity:1}', '}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-labeltext .dc-editable{overflow:hidden;text-overflow:ellipsis;max-width:100%}', '.dc-labeltext .dc-editable:focus{overflow:visible;text-overflow:clip}', '.dc-btns{flex:0 0 auto;margin-left:auto;display:flex;gap:2px;opacity:0;transition:opacity .12s}', '[data-dc-slot]:hover .dc-btns,.dc-btns:has(.dc-menu){opacity:1}', '.dc-expand,.dc-kebab{width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center;', '  font:inherit;transition:background .12s,color .12s}', '.dc-expand:hover,.dc-kebab:hover{background:rgba(0,0,0,.06);color:#2a251f}',
  // Slot hosting an open menu floats above later siblings (which otherwise
  // paint on top — same z-index:auto, later DOM order) so the popup isn't
  // clipped by the next card.
  '[data-dc-slot]:has(.dc-menu){z-index:10}', '.dc-menu{position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border-radius:8px;', '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);padding:4px;min-width:160px;z-index:10}', '.dc-menu button{display:block;width:100%;padding:7px 10px;border:0;background:transparent;', '  border-radius:5px;font-family:inherit;font-size:13px;font-weight:500;line-height:1.2;', '  color:#29261b;cursor:pointer;text-align:left;transition:background .12s;white-space:nowrap}', '.dc-menu button:hover{background:rgba(0,0,0,.05)}', '.dc-menu hr{border:0;border-top:1px solid rgba(0,0,0,.08);margin:4px 2px}', '.dc-menu .dc-danger{color:#c96442}', '.dc-menu .dc-danger:hover{background:rgba(201,100,66,.1)}',
  // Chrome (titles / labels / buttons) counter-scales against the viewport
  // zoom so it stays a constant on-screen size. --dc-inv-zoom is set by
  // DCViewport on every transform update and inherits to all descendants —
  // any overlay inside the world (e.g. a TweaksPanel on an artboard) can use
  // it the same way.
  //
  // The header uses transform:scale (out-of-flow, so layout impact doesn't
  // matter) with its world-space width set to card-width / inv-zoom so that
  // after counter-scaling its on-screen width exactly matches the card's —
  // that's what lets the container query + text-overflow behave against the
  // card's visible edge at every zoom level.
  //
  // The section head uses CSS zoom instead of transform so its layout box
  // grows with the counter-scale, pushing the card row down — otherwise the
  // constant-screen-size title would overflow into the (shrinking) world-
  // space gap and overlap the artboard headers at low zoom.
  '.dc-header{width:calc((100% + 4px) / var(--dc-inv-zoom,1));', '  transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom left}', '.dc-sectionhead{zoom:var(--dc-inv-zoom,1)}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// Recursively unwrap React.Fragment so <>…</> grouping doesn't hide
// DCSection/DCArtboard children from the type-based walks below.
function dcFlatten(children) {
  const out = [];
  React.Children.forEach(children, c => {
    if (c && c.type === React.Fragment) out.push(...dcFlatten(c.props.children));else out.push(c);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, hidden
// artboards, focused artboard). Order/titles/labels/hidden persist to a
// .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Fragments are flattened; wrapping in other
  // elements still opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  dcFlatten(children).forEach(sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const abs = [];
    dcFlatten(sec.props.children).forEach(ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (aid) abs.push([aid, ab]);
    });
    // hidden is scoped to one source revision — when the agent regenerates
    // (artboard-ID set changes), prior deletes don't apply to new content.
    const srcKey = abs.map(([k]) => k).join('\x1f');
    const hidden = persisted.srcKey === srcKey ? persisted.hidden || [] : [];
    const srcIds = [];
    abs.forEach(([aid, ab]) => {
      if (hidden.includes(aid)) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  // Persist viewport across reloads so the user lands back where they were
  // after an agent edit or browser refresh. The sandbox origin is already
  // per-project; pathname keeps multiple canvas files in one project apart.
  const tfKey = 'dc-viewport:' + location.pathname;
  const saveT = React.useRef(0);
  const lastPostedScale = React.useRef();
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    // Exposed for zoom-invariant chrome (labels, buttons, TweaksPanel).
    el.style.setProperty('--dc-inv-zoom', String(1 / scale));
    // Keep the host toolbar's % readout in sync with the canvas scale. Pan
    // ticks leave scale unchanged — skip the cross-frame post for those.
    if (lastPostedScale.current !== scale) {
      lastPostedScale.current = scale;
      window.parent.postMessage({
        type: '__dc_zoom',
        scale
      }, '*');
    }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    }, 200);
  }, [tfKey]);
  React.useLayoutEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    };
    try {
      const s = JSON.parse(localStorage.getItem(tfKey) || 'null');
      if (s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.scale)) {
        tf.current = {
          x: s.x,
          y: s.y,
          scale: Math.min(maxScale, Math.max(minScale, s.scale))
        };
        apply();
      }
    } catch {}
    // Flush on pagehide and unmount so a reload within the 200ms debounce
    // window doesn't drop the last pan/zoom.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // --dc-inv-zoom consumers (.dc-sectionhead's CSS zoom, each section's
      // marginBottom) reflow on every scale change, vertically shifting the
      // world layout — so a world point mathematically pinned under the cursor
      // drifts as you zoom (content creeps up on zoom-in, down on zoom-out).
      // Anchor the DOM element under the cursor instead: record its screen Y,
      // apply the transform + --dc-inv-zoom, then cancel whatever vertical
      // drift the reflow introduced so it stays put on screen.
      let marker = null,
        markerY0 = 0;
      if (k !== 1) {
        const hit = document.elementFromPoint(cx, cy);
        marker = hit && hit.closest ? hit.closest('[data-dc-slot],[data-dc-section]') : null;
        if (marker) markerY0 = marker.getBoundingClientRect().top;
      }
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
      if (marker) {
        // A pure zoom around (cx, cy) maps screen Y → cy + (Y - cy) * k. Any
        // departure after the --dc-inv-zoom reflow is the layout drift.
        const drift = marker.getBoundingClientRect().top - (cy + (markerY0 - cy) * k);
        if (Math.abs(drift) > 0.1) {
          t.y -= drift;
          apply();
        }
      }
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if ((e.ctrlKey || e.metaKey) && !isMouseWheel(e)) {
        // trackpad pinch, or ctrl/cmd + smooth-scroll mouse. Notched
        // wheels fall through to the fixed-step branch below.
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    // Host-driven zoom (toolbar % menu). Zooms around viewport centre so the
    // visible midpoint stays fixed — matching the host's iframe-zoom feel.
    const onHostMsg = e => {
      const d = e.data;
      if (d && d.type === '__dc_set_zoom' && typeof d.scale === 'number') {
        const r = vp.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, d.scale / tf.current.scale);
      } else if (d && d.type === '__dc_probe') {
        // Host's [readyGen] reset asks whether a canvas is present; it
        // fires on the iframe's native 'load', which for canvases with
        // images/fonts is after our mount-time announce, so re-announce.
        // Clear the pan-tick guard so apply() re-posts the current scale
        // even if it's unchanged — the host just reset dcScale to 1.
        window.parent.postMessage({
          type: '__dc_present'
        }, '*');
        lastPostedScale.current = undefined;
        apply();
      }
    };
    window.addEventListener('message', onHostMsg);
    // Announce canvas mode so the host toolbar proxies its % control here
    // instead of scaling the iframe element (which would just shrink the
    // viewport window of an infinite canvas). The apply() that follows emits
    // the initial __dc_zoom so the toolbar % is correct before first pinch.
    // lastPostedScale reset mirrors the __dc_probe handler: the layout
    // effect's restore-path apply() may already have posted the restored
    // scale (before __dc_present), so clear the guard to re-post it in order.
    window.parent.postMessage({
      type: '__dc_present'
    }, '*');
    lastPostedScale.current = undefined;
    apply();
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('message', onHostMsg);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(dcFlatten(children));
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const sec = ctx && sid && ctx.section(sid) || {};
  // Must match DesignCanvas's srcKey computation exactly (it filters falsy
  // IDs), or onDelete persists a srcKey that DesignCanvas never recognizes.
  const allIds = artboards.map(a => a.props.id ?? a.props.label).filter(Boolean);
  const srcKey = allIds.join('\x1f');
  const hidden = sec.srcKey === srcKey ? sec.hidden || [] : [];
  const srcOrder = allIds.filter(k => !hidden.includes(k));
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));

  // marginBottom counter-scales so the on-screen gap between sections stays
  // constant — otherwise at low zoom the (world-space) gap collapses while
  // the screen-constant sectionhead below it doesn't, and the title reads as
  // belonging to the section above. paddingBottom below is just enough for
  // the 24px artboard-header (abs-positioned above each card) plus ~8px, so
  // the title sits tight against its own row at every zoom.
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 'calc(80px * var(--dc-inv-zoom, 1))',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-sectionhead",
    style: {
      paddingBottom: 36
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onDelete: () => ctx && ctx.patchSection(sid, x => ({
      hidden: [...(x.srcKey === srcKey ? x.hidden || [] : []), k],
      srcKey
    })),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}

// Per-artboard export (kind: 'png' | 'html'). Both paths share the same
// self-contained clone: computed styles baked in, @font-face / <img> /
// inline-style background-image urls inlined as data URIs. PNG wraps the
// clone in foreignObject→canvas at 3× the artboard's natural width×height
// (same pipeline the host uses for page captures); HTML wraps it in a
// minimal standalone document. Both are independent of viewport zoom.
async function dcExport(node, w, h, name, kind) {
  try {
    await document.fonts.ready;
  } catch {}
  const toDataURL = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res(url);
    fr.readAsDataURL(b);
  })).catch(() => url);

  // Collect @font-face rules. ss.cssRules throws SecurityError on
  // cross-origin sheets (e.g. fonts.googleapis.com) — in that case fetch
  // the CSS text directly (those endpoints send ACAO:*) and regex-extract
  // the blocks. @import and @media/@supports are walked so nested
  // @font-face rules aren't missed.
  const fontRules = [],
    pending = [],
    seen = new Set();
  const scrapeCss = href => {
    if (seen.has(href)) return;
    seen.add(href);
    pending.push(fetch(href).then(r => r.text()).then(css => {
      for (const m of css.match(/@font-face\s*{[^}]*}/g) || []) fontRules.push({
        css: m,
        base: href
      });
      for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) scrapeCss(new URL(m[1], href).href);
    }).catch(() => {}));
  };
  const walk = (rules, base) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) fontRules.push({
        css: r.cssText,
        base
      });else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        const ibase = r.styleSheet.href || base;
        try {
          walk(r.styleSheet.cssRules, ibase);
        } catch {
          scrapeCss(ibase);
        }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const ss of document.styleSheets) {
    const base = ss.href || location.href;
    try {
      walk(ss.cssRules, base);
    } catch {
      if (ss.href) scrapeCss(ss.href);
    }
  }
  while (pending.length) await pending.shift();
  const fontCss = (await Promise.all(fontRules.map(async rule => {
    let out = rule.css,
      m;
    const re = /url\((['"]?)([^'")]+)\1\)/g;
    while (m = re.exec(rule.css)) {
      if (m[2].indexOf('data:') === 0) continue;
      let abs;
      try {
        abs = new URL(m[2], rule.base).href;
      } catch {
        continue;
      }
      out = out.split(m[0]).join('url("' + (await toDataURL(abs)) + '")');
    }
    return out;
  }))).join('\n');
  const cloneStyled = src => {
    if (src.nodeType === 8 || src.nodeType === 1 && src.tagName === 'SCRIPT') return document.createTextNode('');
    const dst = src.cloneNode(false);
    if (src.nodeType === 1) {
      const cs = getComputedStyle(src);
      let txt = '';
      for (let i = 0; i < cs.length; i++) txt += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
      dst.setAttribute('style', txt + 'animation:none;transition:none;');
      if (src.tagName === 'CANVAS') try {
        const im = document.createElement('img');
        im.src = src.toDataURL();
        im.setAttribute('style', txt);
        return im;
      } catch {}
    }
    for (let c = src.firstChild; c; c = c.nextSibling) dst.appendChild(cloneStyled(c));
    return dst;
  };
  const clone = cloneStyled(node);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // Drop the card's own shadow/radius so the export is a flush w×h rect;
  // the artboard's own background (if any) is already in the computed style.
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  const jobs = [];
  clone.querySelectorAll('img').forEach(el => {
    const s = el.getAttribute('src');
    if (s && s.indexOf('data:') !== 0) jobs.push(toDataURL(el.src).then(d => el.setAttribute('src', d)));
  });
  [clone, ...clone.querySelectorAll('*')].forEach(el => {
    const bg = el.style.backgroundImage;
    if (!bg) return;
    let m;
    const re = /url\(["']?([^"')]+)["']?\)/g;
    while (m = re.exec(bg)) {
      const tok = m[0],
        url = m[1];
      if (url.indexOf('data:') === 0) continue;
      jobs.push(toDataURL(url).then(d => {
        el.style.backgroundImage = el.style.backgroundImage.split(tok).join('url("' + d + '")');
      }));
    }
  });
  await Promise.all(jobs);
  const xml = new XMLSerializer().serializeToString(clone);
  const save = (blob, ext) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (kind === 'html') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' + (fontCss ? '<style>' + fontCss + '</style>' : '') + '</head><body style="margin:0">' + xml + '</body></html>';
    return save(new Blob([html], {
      type: 'text/html'
    }), 'html');
  }

  // PNG: the SVG's own width/height must be the output resolution — an
  // <img>-loaded SVG rasterizes at its intrinsic size, so sizing it at 1×
  // and ctx.scale()-ing up would just upscale a 1× bitmap. viewBox maps the
  // w×h foreignObject onto the px·w × px·h SVG canvas so the browser renders
  // the HTML at full resolution.
  const px = 3;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * px + '" height="' + h * px + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="' + w + '" height="' + h + '">' + (fontCss ? '<style><![CDATA[' + fontCss + ']]></style>' : '') + xml + '</foreignObject></svg>';
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('svg load failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = w * px;
  cv.height = h * px;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv.toBlob(blob => save(blob, 'png'), 'image/png');
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus,
  onDelete
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);
  const cardRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // ⋯ menu: close on any outside pointerdown. Two-click delete lives inside
  // the menu — first click arms the row, second commits; closing disarms.
  React.useEffect(() => {
    if (!menuOpen) {
      setConfirming(false);
      return;
    }
    const off = e => {
      if (!menuRef.current || !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menuOpen]);
  const doExport = kind => {
    setMenuOpen(false);
    if (!cardRef.current) return;
    const name = String(label || id || 'artboard').replace(/[^\w\s.-]+/g, '_');
    dcExport(cardRef.current, width, height, name, kind).catch(e => console.error('[design-canvas] export failed:', e));
  };

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-header",
    style: {
      color: DC.label
    },
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-btns"
  }, /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dc-kebab",
    title: "More",
    onClick: () => setMenuOpen(o => !o)
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2.5",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "6",
    r: "1.1"
  }))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "dc-menu",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('png')
  }, "Download PNG"), /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('html')
  }, "Download HTML"), /*#__PURE__*/React.createElement("hr", null), /*#__PURE__*/React.createElement("button", {
    className: "dc-danger",
    onClick: () => {
      if (confirming) {
        setMenuOpen(false);
        onDelete();
      } else setConfirming(true);
    }
  }, confirming ? 'Click again to delete' : 'Delete'))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))))), /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    // Sections whose artboards are all deleted have slotIds:[] — step past
    // them to the next non-empty section so ↑/↓ doesn't dead-end.
    const n = sectionOrder.length;
    for (let i = 1; i < n; i++) {
      const ns = sectionOrder[((secIdx + d * i) % n + n) % n];
      const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
      if (first) {
        ctx.setFocus(`${ns}/${first}`);
        return;
      }
    }
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.filter(sid => sectionMeta[sid].slotIds.length).map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "design-canvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/hospitality.jsx
try { (() => {
/* global window, React, NeuralNetwork, Ico */
// Hospitality (Hotelería & Turismo) sub-landing sections.

function HotNav() {
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap nav-inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "brand",
    href: "index.html"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mark"
  }, "S"), /*#__PURE__*/React.createElement("span", null, "Open Solvex \xB7 Hoteler\xEDa")), /*#__PURE__*/React.createElement("div", {
    className: "nav-links"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#stack"
  }, "Stack"), /*#__PURE__*/React.createElement("a", {
    href: "#resultados"
  }, "Resultados"), /*#__PURE__*/React.createElement("a", {
    href: "#casos"
  }, "Casos"), /*#__PURE__*/React.createElement("a", {
    href: "#soluciones"
  }, "Soluciones"), /*#__PURE__*/React.createElement("a", {
    href: "index.html"
  }, "Volver")), /*#__PURE__*/React.createElement("div", {
    className: "nav-cta"
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn btn-primary",
    href: "#contacto"
  }, "Agendar demo", /*#__PURE__*/React.createElement(Ico, {
    name: "arrow-right",
    size: 16,
    stroke: 2,
    className: "arr"
  })))));
}
function HotHero() {
  return /*#__PURE__*/React.createElement("header", {
    className: "hero hot-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-bg"
  }, /*#__PURE__*/React.createElement(NeuralNetwork, {
    variant: "growth"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-grad"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-vignette"
  })), /*#__PURE__*/React.createElement("div", {
    className: "wrap hero-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", null, "Vertical \xB7 Hoteler\xEDa & Turismo")), /*#__PURE__*/React.createElement("div", {
    className: "hero-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "h-display"
  }, "M\xE1s reservas ", /*#__PURE__*/React.createElement("em", null, "directas"), ", menos fricci\xF3n."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Implementamos herramientas open-source para que tu hotel capte m\xE1s hu\xE9spedes, reduzca comisiones y opere mejor. Casos reales, stack abierto, soporte continuo."), /*#__PURE__*/React.createElement("div", {
    className: "hero-ctas"
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn btn-primary",
    href: "#contacto"
  }, "Agendar demo", /*#__PURE__*/React.createElement(Ico, {
    name: "arrow-right",
    size: 16,
    stroke: 2,
    className: "arr"
  })), /*#__PURE__*/React.createElement("a", {
    className: "btn btn-ghost-light",
    href: "#stack"
  }, "Ver stack"))), /*#__PURE__*/React.createElement("div", {
    className: "hero-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "+38", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "reservas directas")), /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "\u221242", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "comisi\xF3n a OTAs")), /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "24/7"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "atenci\xF3n al hu\xE9sped")), /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "8", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "sem")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "a producci\xF3n")))), /*#__PURE__*/React.createElement("div", {
    className: "hero-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "// Stack 100 % open-source \xB7 auto-hospedable"), /*#__PURE__*/React.createElement("div", {
    className: "clients"
  }, /*#__PURE__*/React.createElement("span", null, "HOTEL LOMAS"), /*#__PURE__*/React.createElement("span", null, "BAH\xCDA AZUL"), /*#__PURE__*/React.createElement("span", null, "LA POSADA")))));
}
const HOT_PILLARS = [{
  num: '01',
  icon: 'globe',
  title: 'Reservas directas',
  body: 'Motor propio que recupera reservas que se iban a las OTAs.'
}, {
  num: '02',
  icon: 'message-circle',
  title: 'Atención al huésped',
  body: 'Agente conversacional 24/7 conectado a WhatsApp y al PMS.'
}, {
  num: '03',
  icon: 'bar-chart',
  title: 'Decisiones con datos',
  body: 'Dashboards con ADR, RevPAR y origen de canal, en un solo lugar.'
}];
function HotPillars() {
  return /*#__PURE__*/React.createElement("section", {
    className: "pillars"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pillars-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "01"), "\xA0\xA0QU\xC9 RESOLVEMOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Tres frentes donde un hotel deja dinero en la mesa.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Dise\xF1amos por \xE1rea de negocio, no por feature. Cada implementaci\xF3n se mide con m\xE9tricas que tu equipo de operaciones ya entiende.")), /*#__PURE__*/React.createElement("div", {
    className: "pillars-grid"
  }, HOT_PILLARS.map(p => /*#__PURE__*/React.createElement("article", {
    className: "pillar",
    key: p.num
  }, /*#__PURE__*/React.createElement("span", {
    className: "step"
  }, "FRENTE ", p.num), /*#__PURE__*/React.createElement("span", {
    className: "corner"
  }, "\u2192"), /*#__PURE__*/React.createElement("div", {
    className: "icon-wrap"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: p.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("h3", {
    className: "h-card"
  }, p.title), /*#__PURE__*/React.createElement("p", null, p.body))))));
}
const STACK = [{
  sym: 'Cal',
  name: 'Cal.com',
  cat: 'RESERVAS',
  body: 'Motor de reservas auto-hospedado. Sin comisiones, conectado a calendario y CRM.'
}, {
  sym: 'Lis',
  name: 'Listmonk',
  cat: 'EMAIL',
  body: 'Newsletter y campañas transaccionales que tú controlas, sin cuotas por contacto.'
}, {
  sym: 'Pla',
  name: 'Plausible',
  cat: 'ANALÍTICA',
  body: 'Analítica privada, sin cookies. Tus datos no se venden.'
}, {
  sym: 'Noc',
  name: 'NocoDB',
  cat: 'CRM / OPS',
  body: 'Hoja de cálculo + base de datos para el front-office. CRUD para no-devs.'
}, {
  sym: 'Cha',
  name: 'Chatwoot',
  cat: 'INBOX',
  body: 'Bandeja única para WhatsApp, email e Instagram. Bot + agente humano.'
}, {
  sym: 'n8n',
  name: 'n8n',
  cat: 'WORKFLOWS',
  body: 'Pegamento entre PMS, pasarela de pago, contabilidad y agente de IA.'
}, {
  sym: 'Met',
  name: 'Metabase',
  cat: 'DASHBOARDS',
  body: 'ADR, RevPAR, ocupación y canal en un panel que tu equipo entiende.'
}, {
  sym: 'Min',
  name: 'Minio',
  cat: 'ALMACÉN',
  body: 'Documentos, fotos y backups en S3 compatible, en tu infra.'
}];
function HotStack() {
  return /*#__PURE__*/React.createElement("section", {
    className: "services",
    id: "stack"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pillars-head",
    style: {
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "02"), "\xA0\xA0STACK ABIERTO"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Herramientas open-source, ensambladas para hoteler\xEDa.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Cada pieza es est\xE1ndar, auditable y tuya. Si decides operar por dentro, te dejamos todo documentado.")), /*#__PURE__*/React.createElement("div", {
    className: "stack-grid"
  }, STACK.map(s => /*#__PURE__*/React.createElement("article", {
    className: "stack-card",
    key: s.name
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-logo"
  }, s.sym), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "stack-name"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "stack-cat"
  }, s.cat)), /*#__PURE__*/React.createElement("span", {
    className: "stack-os"
  }, "OS")), /*#__PURE__*/React.createElement("p", null, s.body), /*#__PURE__*/React.createElement("div", {
    className: "stack-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "marker"
  }, "\u2192"), " docs"))))));
}
function HotResults() {
  return /*#__PURE__*/React.createElement("section", {
    className: "results",
    id: "resultados"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "results-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "03"), "\xA0\xA0RESULTADOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Las cifras de tres temporadas con clientes activos.")), /*#__PURE__*/React.createElement("div", {
    className: "metrics"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pre"
  }, "+"), "38", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Reservas directas vs. canal OTA"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "90 D\xCDAS")), /*#__PURE__*/React.createElement("div", {
    className: "metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pre"
  }, "\u2212"), "42", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Comisi\xF3n OTA absorbida"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "ANUAL")), /*#__PURE__*/React.createElement("div", {
    className: "metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "24/7"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Cobertura al hu\xE9sped por WhatsApp + email"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "CONTINUO"))), /*#__PURE__*/React.createElement("div", {
    className: "results-foot"
  }, /*#__PURE__*/React.createElement("span", null, "// Hotel Lomas \xB7 Bah\xEDa Azul \xB7 La Posada"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "marker"
  }, "\u25CF"), " Mediciones contra baseline pre-engagement"))));
}
const HOT_CASES = [{
  id: 'lomas',
  tag: 'CASO 01',
  title: 'Hotel Lomas — motor propio y 38 % de reservas directas.',
  body: 'En 12 semanas pasaron de depender de OTAs a tener un canal propio que ya representa el 38 % de las reservas, con flujo directo a contabilidad.',
  tags: ['cal.com', 'chatwoot', 'n8n'],
  kpis: [['+38%', 'RESERVAS DIRECTAS'], ['−42%', 'COMISIÓN OTA']]
}, {
  id: 'bahia',
  tag: 'CASO 02',
  title: 'Bahía Azul — agente 24/7 que conoce el inventario.',
  body: 'Bot conectado a PMS y Cal.com. El equipo de recepción atiende sólo lo que necesita un humano. Tiempo de primera respuesta: < 30 s.',
  tags: ['chatwoot', 'openai', 'n8n'],
  kpis: [['<30s', 'PRIMERA RESPUESTA'], ['3.2x', 'LEADS CALIFICADOS']]
}, {
  id: 'posada',
  tag: 'CASO 03',
  title: 'La Posada — un solo dashboard para tres propiedades.',
  body: 'Operación con ADR, RevPAR y origen de canal unificados. La gerencia toma decisiones de pricing los lunes en 20 minutos.',
  tags: ['metabase', 'nocodb'],
  kpis: [['1 panel', '3 PROPIEDADES'], ['20 min', 'REUNIÓN SEMANAL']]
}];
function HotCases() {
  return /*#__PURE__*/React.createElement("section", {
    className: "cases",
    id: "casos"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cases-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "04"), "\xA0\xA0CASOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Hoteles boutique que ya operan con este stack.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Tres propiedades, tres operaciones distintas. Mismo stack abierto, configurado para cada caso.")), /*#__PURE__*/React.createElement("div", {
    className: "hot-cases-list"
  }, HOT_CASES.map(c => /*#__PURE__*/React.createElement("article", {
    className: "hot-case",
    key: c.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "hot-case-visual",
    "data-img": c.id
  }, /*#__PURE__*/React.createElement("span", {
    className: "hot-case-num"
  }, c.tag), /*#__PURE__*/React.createElement("div", {
    className: "hot-case-pattern"
  })), /*#__PURE__*/React.createElement("div", {
    className: "hot-case-body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hot-case-tag"
  }, c.tag), /*#__PURE__*/React.createElement("h3", {
    className: "h-card",
    style: {
      marginTop: 14,
      fontSize: 24,
      lineHeight: 1.15
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 12,
      color: 'var(--graphite-2)',
      fontSize: 15,
      lineHeight: 1.55
    }
  }, c.body), /*#__PURE__*/React.createElement("div", {
    className: "hot-case-stack"
  }, c.tags.map(t => /*#__PURE__*/React.createElement("span", {
    className: "tag",
    key: t
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "hot-case-kpis"
  }, c.kpis.map(([v, l], i) => /*#__PURE__*/React.createElement("div", {
    className: "hot-case-kpi",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, v), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, l))))))))));
}
const HOT_SOL = [{
  num: '01',
  title: 'Captación',
  items: ['Sitio veloz con motor de reservas propio', 'SEO técnico y schema para hospedaje', 'Captura de leads desde Instagram y WhatsApp']
}, {
  num: '02',
  title: 'Operación',
  items: ['Inbox unificado para huéspedes', 'Workflows entre PMS, pago y contabilidad', 'Notas y SOPs accesibles al personal de recepción']
}, {
  num: '03',
  title: 'Decisión',
  items: ['ADR / RevPAR / ocupación en tiempo real', 'Origen de canal y costo por reserva', 'Reportes para gerencia y para propietarios']
}];
function HotSolutions() {
  return /*#__PURE__*/React.createElement("section", {
    className: "hot-solutions",
    id: "soluciones"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pillars-head",
    style: {
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "05"), "\xA0\xA0SOLUCIONES"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Qu\xE9 entregamos en cada frente.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Tres columnas, tres momentos del negocio. Empezamos por donde m\xE1s duela.")), /*#__PURE__*/React.createElement("div", {
    className: "hot-sol-grid"
  }, HOT_SOL.map(c => /*#__PURE__*/React.createElement("div", {
    className: "hot-sol-col",
    key: c.num
  }, /*#__PURE__*/React.createElement("div", {
    className: "hot-sol-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hot-sol-num"
  }, "\u2014 ", c.num), /*#__PURE__*/React.createElement("h3", {
    className: "h-card"
  }, c.title)), /*#__PURE__*/React.createElement("ul", {
    className: "hot-sol-list"
  }, c.items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "bullet"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "check",
    size: 11,
    stroke: 2.4
  })), /*#__PURE__*/React.createElement("span", null, it)))))))));
}
function HotCTA() {
  return /*#__PURE__*/React.createElement(CTAForm, null);
}
function HotFooter() {
  return /*#__PURE__*/React.createElement(Footer, null);
}
Object.assign(window, {
  HotNav,
  HotHero,
  HotPillars,
  HotStack,
  HotResults,
  HotCases,
  HotSolutions,
  HotCTA,
  HotFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/hospitality.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/icons.jsx
try { (() => {
/* global window */
// Lucide-style stroked icons (1.5–1.6 px). Default size 24 unless overridden via props.
// Lifted to a single <Ico name="..."/> component so any caller does <Ico name="trending-up"/>.

const ICO_PATHS = {
  'arrow-right': /*#__PURE__*/React.createElement("path", {
    d: "M3 12h18M13 5l7 7-7 7"
  }),
  'arrow-up-right': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7 17L17 7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 7h8v8"
  })),
  'check': /*#__PURE__*/React.createElement("path", {
    d: "M4 12l5 5L20 6"
  }),
  'plus': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  })),
  'sparkles': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"
  })),
  'trending-up': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 3v18h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 14l4-4 3 3 6-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 7h4v4"
  })),
  'bar-chart': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 21h18"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "11",
    width: "3",
    height: "8"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11",
    y: "6",
    width: "3",
    height: "13"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "16",
    y: "14",
    width: "3",
    height: "5"
  })),
  'cpu': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "5",
    width: "14",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "6",
    height: "6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"
  })),
  'workflow': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "6",
    height: "6",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "15",
    y: "15",
    width: "6",
    height: "6",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 6h6a3 3 0 0 1 3 3v6"
  })),
  'message-circle': /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-3.6-7.2L21 3l-1 5 .9-.1A9 9 0 0 1 21 12z"
  }),
  'shield-check': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 12l2 2 4-4"
  })),
  'compass': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 8l-2 6-6 2 2-6 6-2z"
  })),
  'building': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 21h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 21V8l7-5 7 5v13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 21v-6h4v6"
  })),
  'shopping-bag': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 7h18l-1.5 12a2 2 0 0 1-2 1.8H6.5A2 2 0 0 1 4.5 19z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 7V5a3 3 0 0 1 6 0v2"
  })),
  'stethoscope': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 4v6a4 4 0 0 0 8 0V4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14v3a4 4 0 0 0 8 0v-2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "11",
    r: "2"
  })),
  'truck': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "6",
    width: "13",
    height: "10",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 9h4l3 4v3h-7"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "18",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "2"
  })),
  'globe': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 12h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
  })),
  'clock': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7v5l3 2"
  })),
  'send': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M22 2L11 13"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 2l-7 20-4-9-9-4z"
  })),
  'mail': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "5",
    width: "18",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 7l9 6 9-6"
  })),
  'phone': /*#__PURE__*/React.createElement("path", {
    d: "M5 4h3l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A18 18 0 0 1 3 6a2 2 0 0 1 2-2z"
  }),
  'linkedin': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 10v8M8 7v.01M12 18v-5a2 2 0 0 1 4 0v5M12 13v5"
  })),
  'twitter': /*#__PURE__*/React.createElement("path", {
    d: "M22 5.8c-.7.3-1.5.6-2.3.7a4 4 0 0 0 1.8-2.2c-.8.5-1.7.8-2.6 1A4 4 0 0 0 12 9v1A11 11 0 0 1 3 4s-4 9 5 13a12 12 0 0 1-7 2c9 5 20 0 20-11.5v-.7c.8-.6 1.5-1.3 2-2z"
  }),
  'github': /*#__PURE__*/React.createElement("path", {
    d: "M9 19c-4 1.3-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6 0-1.2-.4-2.3-1.2-3.2.1-.8.5-2.8-.1-3 0 0-1-.3-3.2 1.2a11 11 0 0 0-5 0C8.3 2.9 7.3 3.2 7.3 3.2c-.6.2-.2 2.2-.1 3-.8.9-1.2 2-1.2 3.2 0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"
  })
};
function Ico({
  name,
  size = 24,
  stroke = 1.6,
  className = '',
  style
}) {
  const path = ICO_PATHS[name];
  if (!path) return null;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: style,
    "aria-hidden": "true"
  }, path);
}
Object.assign(window, {
  Ico,
  ICO_PATHS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/neural-network.jsx
try { (() => {
/* global window, React */
// Animated neural-network canvas used as the hero background.
// Low-density particles in beige + lime nodes, connected by faint lime lines.

function NeuralNetwork({
  density = 1,
  variant = 'neural'
}) {
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
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
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
          accent: Math.random() < 0.18
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
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        ctx.beginPath();
        ctx.fillStyle = n.accent ? '#00FF88' : 'rgba(245,241,232,0.85)';
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    resize();
    init();
    tick();
    const onResize = () => {
      resize();
      init();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [density, variant]);
  if (variant === 'growth') {
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 800 360",
      preserveAspectRatio: "xMidYMid slice",
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%'
      }
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "growth-line",
      x1: "0",
      y1: "1",
      x2: "1",
      y2: "0"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#00FF88",
      stopOpacity: "0"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "60%",
      stopColor: "#00FF88",
      stopOpacity: "1"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#00FF88",
      stopOpacity: "1"
    })), /*#__PURE__*/React.createElement("linearGradient", {
      id: "growth-fill",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#00FF88",
      stopOpacity: "0.16"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#00FF88",
      stopOpacity: "0"
    }))), /*#__PURE__*/React.createElement("g", {
      stroke: "rgba(245,241,232,0.08)",
      strokeWidth: "1"
    }, [60, 140, 220, 300].map(y => /*#__PURE__*/React.createElement("line", {
      key: y,
      x1: "0",
      y1: y,
      x2: "800",
      y2: y
    }))), /*#__PURE__*/React.createElement("path", {
      d: "M 40 310 C 200 300, 280 280, 360 240 S 540 110, 760 50 L 760 360 L 40 360 Z",
      fill: "url(#growth-fill)"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M 40 310 C 200 300, 280 280, 360 240 S 540 110, 760 50",
      fill: "none",
      stroke: "url(#growth-line)",
      strokeWidth: "2.4",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("g", {
      fill: "#00FF88"
    }, [[40, 310], [200, 300], [360, 240], [540, 140], [760, 50]].map(([x, y], i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: x,
      cy: y,
      r: i === 4 ? 4.4 : 3.4
    }))));
  }
  return /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    }
  });
}
Object.assign(window, {
  NeuralNetwork
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/neural-network.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/sections.jsx
try { (() => {
/* global window, React, NeuralNetwork, Ico */
// Marketing section components for the Open Solvex IA landing page.
// Each section is exported to window for consumption by the main script.

// ────────────────────────────────────────────────────────────────
// Top navigation
// ────────────────────────────────────────────────────────────────
function Nav({
  sub = null
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap nav-inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "brand",
    href: "#"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mark"
  }, "S"), /*#__PURE__*/React.createElement("span", null, "Open Solvex", sub ? ' · ' + sub : '')), /*#__PURE__*/React.createElement("div", {
    className: "nav-links"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#servicios"
  }, "Servicios"), /*#__PURE__*/React.createElement("a", {
    href: "#resultados"
  }, "Resultados"), /*#__PURE__*/React.createElement("a", {
    href: "#proceso"
  }, "Proceso"), /*#__PURE__*/React.createElement("a", {
    href: "#casos"
  }, "Casos"), /*#__PURE__*/React.createElement("a", {
    href: "hotelera.html"
  }, "Hoteler\xEDa")), /*#__PURE__*/React.createElement("div", {
    className: "nav-cta"
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn btn-ghost-light",
    href: "#contacto"
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement("a", {
    className: "btn btn-primary",
    href: "#contacto"
  }, "Agendar diagn\xF3stico", /*#__PURE__*/React.createElement(Ico, {
    name: "arrow-right",
    size: 16,
    stroke: 2,
    className: "arr"
  })))));
}

// ────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────
function Hero({
  variant = 'neural'
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-bg"
  }, /*#__PURE__*/React.createElement(NeuralNetwork, {
    variant: variant
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-grad"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-vignette"
  })), /*#__PURE__*/React.createElement("div", {
    className: "wrap hero-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", null, "Aceptando proyectos \xB7 Q4 2025")), /*#__PURE__*/React.createElement("div", {
    className: "hero-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "h-display"
  }, "Software & IA que hace ", /*#__PURE__*/React.createElement("em", null, "crecer"), " tu negocio."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Consultor\xEDa profesional en software e inteligencia artificial. Dise\xF1amos soluciones a medida para impulsar ventas, atraer clientes y elevar la calidad del servicio."), /*#__PURE__*/React.createElement("div", {
    className: "hero-ctas"
  }, /*#__PURE__*/React.createElement("a", {
    className: "btn btn-primary",
    href: "#contacto"
  }, "Agendar diagn\xF3stico", /*#__PURE__*/React.createElement(Ico, {
    name: "arrow-right",
    size: 16,
    stroke: 2,
    className: "arr"
  })), /*#__PURE__*/React.createElement("a", {
    className: "btn btn-ghost-light",
    href: "#casos"
  }, "Ver casos"))), /*#__PURE__*/React.createElement("div", {
    className: "hero-stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "+38", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Ingresos digitales en clientes activos")), /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "\u221242", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Tiempo en operaci\xF3n manual")), /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "24/7"), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Atenci\xF3n automatizada al cliente")), /*#__PURE__*/React.createElement("div", {
    className: "hero-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "12", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "sem")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "De diagn\xF3stico a producci\xF3n")))), /*#__PURE__*/React.createElement("div", {
    className: "hero-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "// Trabajamos con equipos en LATAM"), /*#__PURE__*/React.createElement("div", {
    className: "clients"
  }, /*#__PURE__*/React.createElement("span", null, "HOTEL LOMAS"), /*#__PURE__*/React.createElement("span", null, "BAH\xCDA AZUL"), /*#__PURE__*/React.createElement("span", null, "LA POSADA"), /*#__PURE__*/React.createElement("span", null, "NORTH CRAFT")))));
}

// ────────────────────────────────────────────────────────────────
// Pilares
// ────────────────────────────────────────────────────────────────
const PILLARS = [{
  num: '01',
  icon: 'compass',
  title: 'Diagnóstico de negocio',
  body: 'Mapeamos procesos, ingresos y cuellos de botella antes de tocar una línea de código.'
}, {
  num: '02',
  icon: 'workflow',
  title: 'Software a medida',
  body: 'Construimos lo que tu equipo realmente usa, sobre stacks abiertos y escalables.'
}, {
  num: '03',
  icon: 'sparkles',
  title: 'IA aplicada al embudo',
  body: 'Modelos, agentes y automatizaciones conectados a tu CRM y canales reales.'
}];
function Pillars() {
  return /*#__PURE__*/React.createElement("section", {
    className: "pillars",
    id: "servicios"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pillars-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "01"), "\xA0\xA0SERVICIOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Tres pilares, un mismo objetivo: ", /*#__PURE__*/React.createElement("em", null, "crecimiento"), ".")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "No vendemos horas ni features sueltas. Dise\xF1amos sistemas que se sostienen solos y se pagan con resultados medibles.")), /*#__PURE__*/React.createElement("div", {
    className: "pillars-grid"
  }, PILLARS.map(p => /*#__PURE__*/React.createElement("article", {
    className: "pillar",
    key: p.num
  }, /*#__PURE__*/React.createElement("span", {
    className: "step"
  }, "PASO ", p.num), /*#__PURE__*/React.createElement("span", {
    className: "corner"
  }, "\u2192"), /*#__PURE__*/React.createElement("div", {
    className: "icon-wrap"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: p.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("h3", {
    className: "h-card"
  }, p.title), /*#__PURE__*/React.createElement("p", null, p.body))))));
}

// ────────────────────────────────────────────────────────────────
// Servicios (bento)
// ────────────────────────────────────────────────────────────────
const SERVICES = [{
  num: '01',
  icon: 'cpu',
  title: 'Aplicaciones web a medida',
  body: 'Dashboards internos, portales de cliente, e-commerce. Stack moderno, mantenibles.',
  tags: ['react', 'next.js', 'supabase'],
  cls: 'col-3'
}, {
  num: '02',
  icon: 'sparkles',
  title: 'IA aplicada al embudo',
  body: 'Agentes que califican leads, redactan respuestas y conectan con tu CRM 24/7.',
  tags: ['openai', 'n8n', 'whatsapp'],
  cls: 'col-3 feature'
}, {
  num: '03',
  icon: 'workflow',
  title: 'Automatización de procesos',
  body: 'De cotizaciones a facturación: menos manual, menos errores.',
  tags: ['zapier', 'n8n'],
  cls: 'col-2'
}, {
  num: '04',
  icon: 'bar-chart',
  title: 'Dashboards & analítica',
  body: 'KPIs unificadas. Decisiones con datos, no con intuición.',
  tags: ['metabase', 'plausible'],
  cls: 'col-2'
}, {
  num: '05',
  icon: 'shield-check',
  title: 'Consultoría técnica',
  body: 'Acompañamos a tu equipo o cubrimos la posición CTO mientras escalas.',
  tags: ['audit', 'strategy'],
  cls: 'col-2'
}];
function Services() {
  return /*#__PURE__*/React.createElement("section", {
    className: "services"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pillars-head",
    style: {
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "02"), "\xA0\xA0QU\xC9 HACEMOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Servicios dise\xF1ados para mover m\xE9tricas, no para llenar slides.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Combinamos producto, ingenier\xEDa e IA. Cada engagement se mide contra una m\xE9trica de negocio acordada antes de empezar.")), /*#__PURE__*/React.createElement("div", {
    className: "bento"
  }, SERVICES.map(s => /*#__PURE__*/React.createElement("article", {
    key: s.num,
    className: `bento-card ${s.cls || ''}`
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "\u2014 ", s.num), /*#__PURE__*/React.createElement("div", {
    className: "svc-icon"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: s.icon,
    size: 20
  }))), /*#__PURE__*/React.createElement("h3", {
    className: "h-card"
  }, s.title), /*#__PURE__*/React.createElement("p", null, s.body)), /*#__PURE__*/React.createElement("div", {
    className: "tag-row"
  }, s.tags.map(t => /*#__PURE__*/React.createElement("span", {
    className: "tag",
    key: t
  }, t))))))));
}

// ────────────────────────────────────────────────────────────────
// Resultados
// ────────────────────────────────────────────────────────────────
function Results() {
  return /*#__PURE__*/React.createElement("section", {
    className: "results",
    id: "resultados"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "results-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "03"), "\xA0\xA0RESULTADOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Cifras que se ven en el ", /*#__PURE__*/React.createElement("em", null, "P&L"), ", no en el reporte de marketing.")), /*#__PURE__*/React.createElement("div", {
    className: "metrics"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pre"
  }, "+"), "38", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Reservas directas en hoteles con motor propio"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "90 D\xCDAS \xB7 HOTELER\xCDA")), /*#__PURE__*/React.createElement("div", {
    className: "metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pre"
  }, "\u2212"), "42", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Comisiones a OTAs despu\xE9s de migraci\xF3n"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "ANUAL \xB7 HOTELER\xCDA")), /*#__PURE__*/React.createElement("div", {
    className: "metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "3.2", /*#__PURE__*/React.createElement("span", {
    className: "unit"
  }, "x")), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, "Leads calificados con agente de IA"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "90 D\xCDAS \xB7 RETAIL"))), /*#__PURE__*/React.createElement("div", {
    className: "results-foot"
  }, /*#__PURE__*/React.createElement("span", null, "// Datos agregados de clientes activos entre 2023 y 2025"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "marker"
  }, "\u25CF"), " Medido contra baseline pre-engagement"))));
}

// ────────────────────────────────────────────────────────────────
// Proceso
// ────────────────────────────────────────────────────────────────
const STEPS = [{
  n: '01',
  t: 'Diagnóstico',
  d: 'Workshops con stakeholders, mapeo de procesos y métricas baseline.',
  dur: '1–2 sem'
}, {
  n: '02',
  t: 'Diseño',
  d: 'Arquitectura, prototipos navegables y acuerdo de KPIs.',
  dur: '2–3 sem'
}, {
  n: '03',
  t: 'Construcción',
  d: 'Sprints semanales, demos en vivo, deploy continuo a staging.',
  dur: '4–8 sem'
}, {
  n: '04',
  t: 'Operación',
  d: 'Lanzamiento, capacitación al equipo y soporte mensual.',
  dur: 'Continuo'
}];
function Process() {
  const [active, setActive] = React.useState(2);
  return /*#__PURE__*/React.createElement("section", {
    className: "process",
    id: "proceso"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pillars-head",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "04"), "\xA0\xA0PROCESO"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Cuatro pasos. Sin teatro de consultor\xEDa.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Cada paso tiene un entregable concreto y una m\xE9trica clara. T\xFA decides si seguimos al siguiente.")), /*#__PURE__*/React.createElement("div", {
    className: "timeline",
    style: {
      '--active-step': active
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "tl-rail"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tl-rail-fill"
  }), STEPS.map((s, i) => {
    const state = i < active ? 'done' : i === active ? 'active' : '';
    return /*#__PURE__*/React.createElement("div", {
      key: s.n,
      className: `tl-step ${state}`,
      onMouseEnter: () => setActive(i)
    }, /*#__PURE__*/React.createElement("div", {
      className: "tl-node"
    }, s.n), /*#__PURE__*/React.createElement("div", {
      className: "tl-drop"
    }), /*#__PURE__*/React.createElement("div", {
      className: "tl-meta"
    }, /*#__PURE__*/React.createElement("span", null, state === 'active' ? '● ACTIVO' : `FASE ${s.n}`), /*#__PURE__*/React.createElement("span", {
      className: "tl-dur"
    }, s.dur)), /*#__PURE__*/React.createElement("h3", null, s.t), /*#__PURE__*/React.createElement("p", null, s.d));
  }))));
}

// ────────────────────────────────────────────────────────────────
// Casos
// ────────────────────────────────────────────────────────────────
const CASES = [{
  initials: 'MG',
  name: 'María González',
  role: 'Hotel Lomas · Directora general',
  quote: 'En tres meses cambió por completo la forma en que recibimos reservas. Menos llamadas, más confirmaciones directas.',
  v: '+38%',
  l: 'RESERVAS DIRECTAS'
}, {
  initials: 'RA',
  name: 'Rodrigo Alcocer',
  role: 'Bahía Azul · Operations',
  quote: 'El agente de WhatsApp responde en segundos a lo que antes nos tomaba la mañana entera.',
  v: '24/7',
  l: 'ATENCIÓN AUTOMÁTICA'
}, {
  initials: 'LP',
  name: 'Lucía Peña',
  role: 'North Craft · Founder',
  quote: 'Pasamos de hojas de cálculo a un dashboard donde todo el equipo ve los mismos números.',
  v: '3.2x',
  l: 'LEADS CALIFICADOS'
}];
function Cases() {
  return /*#__PURE__*/React.createElement("section", {
    className: "cases",
    id: "casos"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cases-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "05"), "\xA0\xA0CASOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Negocios que ya est\xE1n ", /*#__PURE__*/React.createElement("em", null, "creciendo"), " con nosotros.")), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Peque\xF1os cambios sostenidos en el tiempo ganan a grandes lanzamientos. Estos son algunos resultados.")), /*#__PURE__*/React.createElement("div", {
    className: "cases-grid"
  }, CASES.map(c => /*#__PURE__*/React.createElement("article", {
    className: "case",
    key: c.initials
  }, /*#__PURE__*/React.createElement("p", {
    className: "quote"
  }, c.quote), /*#__PURE__*/React.createElement("div", {
    className: "person"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, c.initials), /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "n"
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "r"
  }, c.role))), /*#__PURE__*/React.createElement("div", {
    className: "result"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, /*#__PURE__*/React.createElement("em", null, c.v)), /*#__PURE__*/React.createElement("div", {
    className: "l"
  }, c.l)))))));
}

// ────────────────────────────────────────────────────────────────
// Sectores
// ────────────────────────────────────────────────────────────────
const SECTORS = [{
  icon: 'building',
  label: 'Hotelería',
  sub: 'TURISMO'
}, {
  icon: 'shopping-bag',
  label: 'Retail',
  sub: 'D2C / OMNI'
}, {
  icon: 'stethoscope',
  label: 'Salud',
  sub: 'CLÍNICAS'
}, {
  icon: 'truck',
  label: 'Logística',
  sub: 'SMB'
}];
function Sectors() {
  return /*#__PURE__*/React.createElement("section", {
    className: "sectors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sectors-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "06"), "\xA0\xA0SECTORES"), /*#__PURE__*/React.createElement("h3", null, "Aplicamos lo aprendido en industrias donde el detalle importa.")), /*#__PURE__*/React.createElement("div", {
    className: "sectors-row"
  }, SECTORS.map(s => /*#__PURE__*/React.createElement("a", {
    className: "sector",
    href: "#",
    key: s.label
  }, /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: s.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, s.sub)))))));
}

// ────────────────────────────────────────────────────────────────
// CTA + Form
// ────────────────────────────────────────────────────────────────
function CTAForm() {
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    className: "cta-section",
    id: "contacto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap cta-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "07"), "\xA0\xA0EMPECEMOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h-section"
  }, "Cu\xE9ntanos d\xF3nde te ", /*#__PURE__*/React.createElement("em", null, "estancas"), ". Te respondemos en menos de 24 h."), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Diagn\xF3stico inicial sin costo, 45 minutos por videollamada. Sales con un plan claro, decidas o no trabajar con nosotros."), /*#__PURE__*/React.createElement("div", {
    className: "cta-list"
  }, /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "check"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "check",
    size: 14,
    stroke: 2.2
  })), " Reuni\xF3n de 45 min con uno de nuestros leads"), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "check"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "check",
    size: 14,
    stroke: 2.2
  })), " Documento con hallazgos y prioridades"), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "check"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "check",
    size: 14,
    stroke: 2.2
  })), " Propuesta con plazos y costos, en 5 d\xEDas"))), /*#__PURE__*/React.createElement("form", {
    className: "form",
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    }
  }, sent ? /*#__PURE__*/React.createElement("div", {
    className: "form-success"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ok"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "check",
    size: 28,
    stroke: 2.4
  })), /*#__PURE__*/React.createElement("h4", null, "Gracias. Te respondemos en menos de 24 h."), /*#__PURE__*/React.createElement("p", null, "Mientras tanto, recibir\xE1s un correo con disponibilidad para tu diagn\xF3stico.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "Agenda tu diagn\xF3stico"), /*#__PURE__*/React.createElement("div", {
    className: "form-sub"
  }, "Sin compromiso. Sin pitch."), /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Nombre"), /*#__PURE__*/React.createElement("input", {
    required: true,
    placeholder: "Mar\xEDa Gonz\xE1lez"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Empresa"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Hotel Lomas"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "field-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Email"), /*#__PURE__*/React.createElement("input", {
    required: true,
    type: "email",
    placeholder: "tucorreo@empresa.com"
  })), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Tel\xE9fono"), /*#__PURE__*/React.createElement("input", {
    placeholder: "+52 ..."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "Sector"), /*#__PURE__*/React.createElement("select", {
    defaultValue: ""
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, "Selecciona uno"), /*#__PURE__*/React.createElement("option", null, "Hoteler\xEDa"), /*#__PURE__*/React.createElement("option", null, "Retail"), /*#__PURE__*/React.createElement("option", null, "Salud"), /*#__PURE__*/React.createElement("option", null, "Log\xEDstica"), /*#__PURE__*/React.createElement("option", null, "Otro"))), /*#__PURE__*/React.createElement("div", {
    className: "field"
  }, /*#__PURE__*/React.createElement("label", null, "\xBFEn qu\xE9 te ayudamos?"), /*#__PURE__*/React.createElement("textarea", {
    rows: "3",
    placeholder: "Cu\xE9ntanos brevemente lo que necesitas..."
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "btn btn-primary btn-glow"
  }, "Solicitar diagn\xF3stico", /*#__PURE__*/React.createElement(Ico, {
    name: "arrow-right",
    size: 16,
    stroke: 2,
    className: "arr"
  })), /*#__PURE__*/React.createElement("div", {
    className: "legal"
  }, "Al enviar aceptas nuestra ", /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "pol\xEDtica de privacidad"), ".")))));
}

// ────────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────────
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "foot-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
    className: "brand",
    href: "#"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mark"
  }, "S"), /*#__PURE__*/React.createElement("span", null, "Open Solvex")), /*#__PURE__*/React.createElement("p", {
    className: "about"
  }, "Consultor\xEDa profesional de software e inteligencia artificial. Dise\xF1amos crecimiento, no slides."), /*#__PURE__*/React.createElement("div", {
    className: "foot-socials"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": "LinkedIn"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "linkedin",
    size: 16
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": "Twitter"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "twitter",
    size: 16
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": "GitHub"
  }, /*#__PURE__*/React.createElement(Ico, {
    name: "github",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Servicios"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Software a medida")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "IA aplicada")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Automatizaci\xF3n")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Anal\xEDtica")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Sectores"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "hotelera.html"
  }, "Hoteler\xEDa")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Retail")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Salud")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Log\xEDstica")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", null, "Contacto"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "mailto:hola@tusolvex.com"
  }, "hola@tusolvex.com")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "+52 999 000 0000")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#contacto"
  }, "Agendar diagn\xF3stico"))))), /*#__PURE__*/React.createElement("div", {
    className: "foot-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2025 Open Solvex"), /*#__PURE__*/React.createElement("span", null, "Hecho con stack abierto en LATAM"))));
}
Object.assign(window, {
  Nav,
  Hero,
  Pillars,
  Services,
  Results,
  Process,
  Cases,
  Sectors,
  CTAForm,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/tweaks-panel.jsx
try { (() => {
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  noDeckControls = false,
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  const hasDeckStage = React.useMemo(() => typeof document !== 'undefined' && !!document.querySelector('deck-stage'), []);
  // deck-stage enables its rail in connectedCallback, but this panel can
  // mount before that element has upgraded. The initial read catches the
  // common case; the listener covers mounting first. (Older deck-stage.js
  // copies still wait for the host's __omelette_rail_enabled postMessage —
  // same listener handles those.)
  const [railEnabled, setRailEnabled] = React.useState(() => hasDeckStage && !!document.querySelector('deck-stage')?._railEnabled);
  React.useEffect(() => {
    if (!hasDeckStage || railEnabled) return undefined;
    const onMsg = e => {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasDeckStage, railEnabled]);
  const [railVisible, setRailVisible] = React.useState(() => {
    try {
      return localStorage.getItem('deck-stage.railVisible') !== '0';
    } catch (e) {
      return true;
    }
  });
  const toggleRail = on => {
    setRailVisible(on);
    window.postMessage({
      type: '__deck_rail_visible',
      on
    }, '*');
  };
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-noncommentable": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children, hasDeckStage && railEnabled && !noDeckControls && /*#__PURE__*/React.createElement(TweakSection, {
    label: "Deck"
  }, /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Thumbnail rail",
    value: railVisible,
    onChange: toggleRail
  })))));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

})();
