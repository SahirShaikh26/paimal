// The Paimal mark: a solid "P" monogram whose counter is a checkmark — every
// visit known, logged, verified. `hover` makes the tick re-draw on hover;
// `drawIn` draws it once on mount. Falls back to a static, fully-drawn mark
// when the viewer prefers reduced motion (see brand.css).
export function PaimalMark({ size = 32, tile = '#201C16', glyph = '#E4881F', radius = '26%', hover = false, drawIn = false, style }) {
  const cls = ['pm', hover && 'pm-hover', drawIn && 'pm-drawin'].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ width: size, height: size, borderRadius: radius, background: tile, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      <svg viewBox="0 0 64 64" width={size} height={size} style={{ color: glyph }} aria-hidden="true">
        <rect x="16" y="13" width="10.5" height="38" rx="5" fill="currentColor" />
        <circle cx="30" cy="23" r="11.5" fill="currentColor" />
        <path className="pm-chk" style={{ '--pml': 26 }} d="M24 23 L28.5 27.6 L37 16.4" fill="none" stroke={tile} strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// The compact glyph: the bare checkmark, for tight spots (favicons, buttons,
// toasts, loaders, list bullets).
export function Tick({ size = 18, color = 'currentColor', strokeWidth = 8, hover = false, style }) {
  return (
    <svg className={hover ? 'pm-hover' : undefined} viewBox="0 0 64 64" width={size} height={size} style={{ color, ...style }} aria-hidden="true">
      <path className="pm-tick-path" style={{ '--pml': 46 }} d="M17 34 L27 44 L47 21" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Wordmark lockup: mark + "Paimal".
export function PaimalWordmark({ size = 30, color = '#201C16', tile = '#201C16', glyph = '#E4881F', hover = true, drawIn = false, gap = 10, fontSize }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <PaimalMark size={size} tile={tile} glyph={glyph} hover={hover} drawIn={drawIn} />
      <span style={{ fontWeight: 750, letterSpacing: '-0.03em', color, fontSize: fontSize || Math.round(size * 0.62) }}>Paimal</span>
    </span>
  );
}

export default PaimalMark;
