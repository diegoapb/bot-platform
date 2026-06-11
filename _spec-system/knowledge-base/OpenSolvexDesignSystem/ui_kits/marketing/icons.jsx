/* global window */
// Lucide-style stroked icons (1.5–1.6 px). Default size 24 unless overridden via props.
// Lifted to a single <Ico name="..."/> component so any caller does <Ico name="trending-up"/>.

const ICO_PATHS = {
  'arrow-right':  <path d="M3 12h18M13 5l7 7-7 7" />,
  'arrow-up-right': <><path d="M7 17L17 7" /><path d="M9 7h8v8" /></>,
  'check':        <path d="M4 12l5 5L20 6" />,
  'plus':         <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  'sparkles':     <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" /></>,
  'trending-up':  <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 6-6" /><path d="M16 7h4v4" /></>,
  'bar-chart':    <><path d="M3 21h18" /><rect x="6"  y="11" width="3" height="8" /><rect x="11" y="6"  width="3" height="13" /><rect x="16" y="14" width="3" height="5" /></>,
  'cpu':          <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6"  height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></>,
  'workflow':     <><rect x="3"  y="3"  width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M9 6h6a3 3 0 0 1 3 3v6" /></>,
  'message-circle': <path d="M21 12a9 9 0 1 1-3.6-7.2L21 3l-1 5 .9-.1A9 9 0 0 1 21 12z" />,
  'shield-check': <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  'compass':      <><circle cx="12" cy="12" r="9" /><path d="M16 8l-2 6-6 2 2-6 6-2z" /></>,
  'building':     <><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M10 21v-6h4v6" /></>,
  'shopping-bag': <><path d="M3 7h18l-1.5 12a2 2 0 0 1-2 1.8H6.5A2 2 0 0 1 4.5 19z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></>,
  'stethoscope':  <><path d="M4 4v6a4 4 0 0 0 8 0V4" /><path d="M8 14v3a4 4 0 0 0 8 0v-2" /><circle cx="18" cy="11" r="2" /></>,
  'truck':        <><rect x="2" y="6" width="13" height="10" rx="1" /><path d="M15 9h4l3 4v3h-7" /><circle cx="7"  cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  'globe':        <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  'clock':        <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  'send':         <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
  'mail':         <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  'phone':        <path d="M5 4h3l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v3a2 2 0 0 1-2 2A18 18 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  'linkedin':     <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10v8M8 7v.01M12 18v-5a2 2 0 0 1 4 0v5M12 13v5" /></>,
  'twitter':      <path d="M22 5.8c-.7.3-1.5.6-2.3.7a4 4 0 0 0 1.8-2.2c-.8.5-1.7.8-2.6 1A4 4 0 0 0 12 9v1A11 11 0 0 1 3 4s-4 9 5 13a12 12 0 0 1-7 2c9 5 20 0 20-11.5v-.7c.8-.6 1.5-1.3 2-2z" />,
  'github':       <path d="M9 19c-4 1.3-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6 0-1.2-.4-2.3-1.2-3.2.1-.8.5-2.8-.1-3 0 0-1-.3-3.2 1.2a11 11 0 0 0-5 0C8.3 2.9 7.3 3.2 7.3 3.2c-.6.2-.2 2.2-.1 3-.8.9-1.2 2-1.2 3.2 0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />,
};

function Ico({ name, size = 24, stroke = 1.6, className = '', style }) {
  const path = ICO_PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true"
    >
      {path}
    </svg>
  );
}

Object.assign(window, { Ico, ICO_PATHS });
