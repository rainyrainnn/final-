document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT = '#ff7a59';
  function hexToRgb(hex){
    hex = hex.replace('#','');
    if(hex.length===3) hex = hex.split('').map(h=>h+h).join('');
    const bigint = parseInt(hex,16);
    return {r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255};
  }
  function getContrastColor(hex){
    if(!hex) return '#ffffff';
    const clean = hex.replace('#','').toLowerCase();
    // Force white text for the default orange accent for readability
    if(clean === 'ff7a59') return '#ffffff';
    const {r,g,b} = hexToRgb(hex);
    // Perceived luminance
    const lum = (0.299*r + 0.587*g + 0.114*b)/255;
    return lum > 0.6 ? '#000000' : '#ffffff';
  }
  function shade(hex, percent){
    const {r,g,b} = hexToRgb(hex);
    const t = percent<0?0:255;
    const p = Math.abs(percent)/100;
    const R = Math.round((t - r)*p) + r;
    const G = Math.round((t - g)*p) + g;
    const B = Math.round((t - b)*p) + b;
    return `#${((1<<24) + (R<<16) + (G<<8) + B).toString(16).slice(1)}`;
  }
  function setAccent(hex){
    if(!hex) hex = DEFAULT;
    document.documentElement.style.setProperty('--accent-color', hex);
    const contrast = getContrastColor(hex);
    document.documentElement.style.setProperty('--accent-text', contrast);
    // set a simple gradient using a slightly darker shade
    const darker = shade(hex, -18);
    document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${hex}, ${darker})`);
    // expose variables some page-specific CSS expects
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-dark', darker);
    // create an rgba transparent version for overlays
    try{
      const {r,g,b} = hexToRgb(hex);
      document.documentElement.style.setProperty('--accent-transparent', `rgba(${r}, ${g}, ${b}, 0.15)`);
    }catch(e){
      document.documentElement.style.setProperty('--accent-transparent', hex);
    }
    document.querySelectorAll('.accent-swatch').forEach(s => {
      if(s.dataset && s.dataset.accent){
        s.classList.toggle('selected', s.dataset.accent.toLowerCase() === hex.toLowerCase());
        s.style.outline = s.classList.contains('selected') ? '3px solid rgba(0,0,0,0.12)' : 'none';
      }
    });
  }

  // Wire swatches
  const swatches = Array.from(document.querySelectorAll('.accent-swatch'));
  swatches.forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.accent;
      setAccent(color);
      try{ localStorage.setItem('edu_accent', color); }catch(e){}
    });
    btn.addEventListener('keyup', (e)=>{ if(e.key==='Enter' || e.key===' ') btn.click(); });
  });

  // Apply saved or default on load
  try{
    const saved = localStorage.getItem('edu_accent');
    setAccent(saved || DEFAULT);
  }catch(e){ setAccent(DEFAULT); }
});

// accent.js
// Robust accent color helper for EduHub
// - Reads localStorage.edu_accent (preferred) or localStorage.edu_user.accent
// - Normalizes color, sets CSS variables, computes accessible foreground
// - Exposes an API: window.eduAccent.getAccent(), .setAccent(hex)
// - Emits 'edu:accent-changed' DOM event and listens for storage changes

(function () {
  'use strict';

  // helpers
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function parseUserAccent() {
    const userRaw = safeGet('edu_user');
    if (!userRaw) return null;
    try {
      const u = JSON.parse(userRaw);
      if (u && u.accent) return String(u.accent).trim();
    } catch (e) { /* ignore parse errors */ }
    return null;
  }

  function normalizeHex(input) {
    if (!input) return null;
    let s = String(input).trim();
    // Accept forms: '123456', '#123456', '#abc', 'abc'
    if (/^#?[0-9A-Fa-f]{3}$/.test(s)) {
      s = s.replace(/^#/, '');
      s = s.split('').map(ch => ch + ch).join('');
    } else {
      s = s.replace(/^#/, '');
    }
    if (/^[0-9A-Fa-f]{6}$/.test(s)) return '#' + s.toUpperCase();
    return null;
  }

  // compute luminance per WCAG formula (returns 0..1)
  function luminance(hex) {
    if (!hex) return 0;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0,2),16)/255;
    const g = parseInt(c.substring(2,4),16)/255;
    const b = parseInt(c.substring(4,6),16)/255;
    const srgb = [r,g,b].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  }

  // choose foreground color (white or dark)
  function bestForeground(hex) {
    const lum = luminance(hex);
    // threshold chosen to favor white on darker colors; tweak if needed
    return lum > 0.5 ? '#0f172a' : '#ffffff';
  }

  // apply CSS variables to :root
  function applyVars(hex) {
    const root = document.documentElement;
    const fg = bestForeground(hex);
    root.style.setProperty('--accent-color', hex);
    root.style.setProperty('--accent-foreground', fg);
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${hex}, ${hex}CC)`);
    // optional convenience aliases for older styles
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-text', fg);
  }

  // internal state
  const DEFAULT = '#FF7A59';
  let current = null;

  function detectAccent() {
    // priority: explicit key -> user object -> default
    const direct = safeGet('edu_accent');
    let candidate = direct || parseUserAccent() || DEFAULT;
    const normalized = normalizeHex(candidate) || DEFAULT;
    return normalized;
  }

  function setAccent(hexLike, opts = {}) {
    // hexLike may be null/undefined -> revert to detected/default
    let desired = hexLike ? normalizeHex(hexLike) : detectAccent();
    if (!desired) desired = DEFAULT;
    if (desired === current && !opts.force) return current;

    current = desired;
    applyVars(current);

    // store to localStorage (only if explicit hex passed)
    if (hexLike) {
      try { localStorage.setItem('edu_accent', current); } catch (e) { /* ignore */ }
    }

    // dispatch a custom event so other modules can listen
    try {
      const ev = new CustomEvent('edu:accent-changed', { detail: { accent: current } });
      window.dispatchEvent(ev);
    } catch (e) { /* ignore */ }

    return current;
  }

  function getAccent() { return current || detectAccent(); }

  // init
  document.addEventListener('DOMContentLoaded', () => {
    // apply immediately on DOM ready
    current = detectAccent();
    applyVars(current);
  });

  // listen for storage changes (other tabs or scripts)
  window.addEventListener('storage', (ev) => {
    if (!ev) return;
    if (ev.key === 'edu_accent' || ev.key === 'edu_user') {
      const newAccent = detectAccent();
      if (newAccent && newAccent !== current) {
        setAccent(newAccent, { force: true });
      }
    }
  });

  // expose API (non-writable)
  Object.defineProperty(window, 'eduAccent', {
    value: {
      getAccent,
      setAccent,
      // convenience: allow setting via CSS var string too
      setAccentFromCSSVar: (varName) => {
        try {
          const root = getComputedStyle(document.documentElement);
          const val = root.getPropertyValue(varName);
          if (val) setAccent(val.trim());
        } catch (e) {}
      }
    },
    writable: false,
    configurable: false,
    enumerable: true
  });

  // also allow immediate manual call (for scripts loaded after DOMContentLoaded):
  // window.eduAccent.setAccent('#2B8BF2')
})();
