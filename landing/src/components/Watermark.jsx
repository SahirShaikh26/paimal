// A giant, faint Paimal tick — the brand's signature glyph used as a background watermark.
export default function Watermark({ size = 300, color = '#E4881F', opacity = 0.08, style, className = '' }) {
  return (
    <svg
      className={`pm-watermark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ opacity, ...style }}
      aria-hidden="true"
    >
      <path d="M18 55 L41 78 L84 26" stroke={color} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
