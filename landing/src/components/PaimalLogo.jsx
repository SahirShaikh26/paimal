// Paimal wordmark for the landing site: the "P + check" monogram tile + name.
export default function PaimalLogo({ size = 30 }) {
  return (
    <span className="logo">
      <span style={{ width: size, height: size, borderRadius: '28%', background: '#201C16', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ color: '#E4881F' }} aria-hidden="true">
          <rect x="16" y="13" width="10.5" height="38" rx="5" fill="currentColor" />
          <circle cx="30" cy="23" r="11.5" fill="currentColor" />
          <path d="M24 23 L28.5 27.6 L37 16.4" fill="none" stroke="#201C16" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      Paimal
    </span>
  );
}
