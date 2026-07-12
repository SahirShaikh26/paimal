// Multi-colour flat illustration icons for Paimal's marketing sections.
// Each icon is a small composition of filled shapes using several brand hues,
// so the icons read as colourful illustrations rather than monochrome glyphs.
const P = {
  mar: '#E4881F', marD: '#C2740C', sun: '#F6C453',
  blue: '#3B78E7', blueL: '#9CC0F7',
  teal: '#12A594', tealL: '#8AD9CE',
  green: '#41945E', greenL: '#93CBA6',
  violet: '#7A5AF0', violetL: '#B9A8F7',
  pink: '#D6459B', pinkL: '#F1A9D2',
  ink: '#2A2118', paper: '#FFFFFF', line: '#E3DCCF',
};

// person = head + rounded-shoulder bust, used by the team icon
function Bust({ cx, hy, color, r = 5, halo }) {
  const bodyR = 7.6;
  return (
    <>
      {halo && <circle cx={cx} cy={hy} r={r + 0.9} fill={P.paper} />}
      {halo && <path d={`M${cx - bodyR - 0.9} 35 V28.4 A${bodyR + 0.9} ${bodyR + 0.9} 0 0 1 ${cx + bodyR + 0.9} 28.4 V35 Z`} fill={P.paper} />}
      <circle cx={cx} cy={hy} r={r} fill={color} />
      <path d={`M${cx - bodyR} 35 V29 A${bodyR} ${bodyR} 0 0 1 ${cx + bodyR} 29 V35 Z`} fill={color} />
    </>
  );
}

const ICONS = {
  // 5 bars in 5 colours — the reference icon
  analytics: (
    <>
      <rect x="4" y="32.4" width="32" height="2.2" rx="1.1" fill={P.line} />
      <rect x="5" y="20" width="5" height="13" rx="1.6" fill={P.mar} />
      <rect x="12" y="14" width="5" height="19" rx="1.6" fill={P.blue} />
      <rect x="19" y="24" width="5" height="9" rx="1.6" fill={P.teal} />
      <rect x="26" y="9" width="5" height="24" rx="1.6" fill={P.green} />
      <rect x="33" y="18" width="4" height="15" rx="1.6" fill={P.violet} />
    </>
  ),

  calendar: (
    <>
      <rect x="5" y="9" width="30" height="27" rx="5" fill={P.paper} stroke={P.line} strokeWidth="1.4" />
      <path d="M5 16 V14 a5 5 0 0 1 5 -5 H30 a5 5 0 0 1 5 5 V16 Z" fill={P.blue} />
      <rect x="11.5" y="5.5" width="2.6" height="7" rx="1.3" fill={P.ink} />
      <rect x="25.9" y="5.5" width="2.6" height="7" rx="1.3" fill={P.ink} />
      <circle cx="12" cy="22" r="1.9" fill={P.line} />
      <circle cx="18.5" cy="22" r="1.9" fill={P.mar} />
      <circle cx="25" cy="22" r="1.9" fill={P.line} />
      <circle cx="31" cy="22" r="1.9" fill={P.line} />
      <circle cx="12" cy="29.5" r="1.9" fill={P.line} />
      <circle cx="18.5" cy="29.5" r="1.9" fill={P.line} />
      <circle cx="25" cy="29.5" r="1.9" fill={P.green} />
      <circle cx="31" cy="29.5" r="1.9" fill={P.violet} />
    </>
  ),

  cloud: (
    <>
      <g fill={P.blueL}>
        <circle cx="15" cy="20" r="6.5" />
        <circle cx="24" cy="16.5" r="8.5" />
        <circle cx="29" cy="22" r="6" />
        <rect x="12" y="20" width="20" height="9" rx="4.5" />
      </g>
      <path d="M27 22.5 A5 5 0 1 1 22 17.7" fill="none" stroke={P.green} strokeWidth="2.3" strokeLinecap="round" />
      <path d="M21.4 14 L24.9 17 L20.7 19 Z" fill={P.green} />
      <circle cx="20" cy="22.5" r="1.7" fill={P.mar} />
    </>
  ),

  camera: (
    <>
      <rect x="15" y="9" width="9" height="5" rx="2" fill={P.ink} />
      <rect x="5" y="13" width="30" height="21" rx="5" fill={P.ink} />
      <circle cx="20" cy="23.5" r="8" fill={P.blue} />
      <circle cx="20" cy="23.5" r="5" fill="#17130E" />
      <circle cx="20" cy="23.5" r="2.6" fill={P.mar} />
      <circle cx="17.8" cy="21.3" r="1.1" fill="#fff" opacity="0.85" />
      <circle cx="30" cy="17.6" r="1.7" fill={P.sun} />
    </>
  ),

  mic: (
    <>
      <g fill="none" strokeLinecap="round">
        <path d="M12 16 q-3 4 0 8" stroke={P.mar} strokeWidth="2" />
        <path d="M8.5 13 q-5 7 0 14" stroke={P.teal} strokeWidth="2" />
        <path d="M28 16 q3 4 0 8" stroke={P.blue} strokeWidth="2" />
        <path d="M31.5 13 q5 7 0 14" stroke={P.green} strokeWidth="2" />
      </g>
      <rect x="16" y="6" width="8" height="16" rx="4" fill={P.violet} />
      <path d="M13 18 a7 7 0 0 0 14 0" fill="none" stroke={P.ink} strokeWidth="2" strokeLinecap="round" />
      <rect x="19" y="24.5" width="2" height="5.5" rx="1" fill={P.ink} />
      <rect x="15" y="30" width="10" height="2.2" rx="1.1" fill={P.ink} />
    </>
  ),

  clipboard: (
    <>
      <rect x="7" y="7" width="26" height="29" rx="4" fill={P.paper} stroke={P.line} strokeWidth="1.4" />
      <rect x="14" y="4" width="12" height="6" rx="2.4" fill={P.ink} />
      <rect x="10.5" y="15" width="5" height="5" rx="1.4" fill={P.mar} />
      <path d="M11.7 17.5 l1.2 1.2 2.1 -2.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="16" width="11" height="2.4" rx="1.2" fill={P.line} />
      <rect x="10.5" y="22.5" width="5" height="5" rx="1.4" fill={P.green} />
      <path d="M11.7 25 l1.2 1.2 2.1 -2.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="23.5" width="11" height="2.4" rx="1.2" fill={P.line} />
      <rect x="10.5" y="30" width="5" height="5" rx="1.4" fill={P.blue} />
      <path d="M11.7 32.5 l1.2 1.2 2.1 -2.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="31" width="9" height="2.4" rx="1.2" fill={P.line} />
    </>
  ),

  records: (
    <>
      <rect x="5" y="11" width="17" height="24" rx="2.5" fill={P.teal} />
      <g fill="#E7F7F3">
        <rect x="8" y="15" width="4" height="4" rx="1" />
        <rect x="15" y="15" width="4" height="4" rx="1" />
        <rect x="8" y="22" width="4" height="4" rx="1" />
        <rect x="15" y="22" width="4" height="4" rx="1" />
        <rect x="11" y="29" width="5" height="6" rx="1" />
      </g>
      <circle cx="28" cy="27" r="8.4" fill={P.paper} />
      <g stroke={P.mar} strokeWidth="2.5" strokeLinecap="round">
        <line x1="28" y1="19.6" x2="28" y2="22.4" />
        <line x1="28" y1="31.6" x2="28" y2="34.4" />
        <line x1="20.6" y1="27" x2="23.4" y2="27" />
        <line x1="32.6" y1="27" x2="35.4" y2="27" />
        <line x1="22.8" y1="21.8" x2="24.8" y2="23.8" />
        <line x1="31.2" y1="30.2" x2="33.2" y2="32.2" />
        <line x1="33.2" y1="21.8" x2="31.2" y2="23.8" />
        <line x1="24.8" y1="30.2" x2="22.8" y2="32.2" />
      </g>
      <circle cx="28" cy="27" r="5.4" fill={P.mar} />
      <circle cx="28" cy="27" r="2.3" fill={P.paper} />
    </>
  ),

  team: (
    <>
      <Bust cx={11} hy={16} color={P.blue} />
      <Bust cx={29} hy={16} color={P.green} />
      <Bust cx={20} hy={13.5} color={P.mar} r={5.4} halo />
    </>
  ),

  mobile: (
    <>
      <rect x="11" y="5" width="18" height="30" rx="4.5" fill={P.ink} />
      <rect x="13" y="8.5" width="14" height="21" rx="1.8" fill={P.paper} />
      <rect x="13" y="8.5" width="14" height="4" fill={P.mar} />
      <rect x="15" y="15" width="10" height="2.6" rx="1.3" fill={P.blueL} />
      <rect x="15" y="19.5" width="10" height="2.6" rx="1.3" fill={P.tealL} />
      <rect x="15" y="24" width="6.5" height="2.6" rx="1.3" fill={P.greenL} />
      <rect x="18" y="31.4" width="4" height="1.5" rx="0.75" fill="#fff" opacity="0.65" />
    </>
  ),

  fieldops: (
    <>
      <rect x="5" y="9" width="30" height="22" rx="4" fill={P.paper} stroke={P.line} strokeWidth="1.4" />
      <path d="M8 22 H14 L17.5 15 L23 27 L26 20 H32" fill="none" stroke={P.mar} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="15" r="2.2" fill={P.blue} />
      <circle cx="23" cy="27" r="2.2" fill={P.green} />
    </>
  ),

  invoice: (
    <>
      <path d="M9 6 h18 a2 2 0 0 1 2 2 v26 l-3 -2 -3 2 -3 -2 -3 2 -3 -2 -3 2 V8 a2 2 0 0 1 2 -2 Z" fill={P.paper} stroke={P.line} strokeWidth="1.4" />
      <rect x="12.5" y="12" width="12" height="2.4" rx="1.2" fill={P.mar} />
      <rect x="12.5" y="17" width="8" height="2" rx="1" fill={P.line} />
      <rect x="12.5" y="21" width="10" height="2" rx="1" fill={P.line} />
      <circle cx="27.5" cy="28" r="7.8" fill={P.paper} />
      <circle cx="27.5" cy="28" r="6.3" fill={P.green} />
      <text x="27.5" y="31.3" fontSize="9.5" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="system-ui, sans-serif">₹</text>
    </>
  ),

  ai: (
    <>
      <path d="M15 5 C16.1 11.6 17.4 12.9 24 14 C17.4 15.1 16.1 16.4 15 23 C13.9 16.4 12.6 15.1 6 14 C12.6 12.9 13.9 11.6 15 5 Z" fill={P.pink} />
      <path d="M28 20 C28.7 23.3 29.2 23.8 32.5 24.5 C29.2 25.2 28.7 25.7 28 29 C27.3 25.7 26.8 25.2 23.5 24.5 C26.8 23.8 27.3 23.3 28 20 Z" fill={P.mar} />
      <circle cx="28.5" cy="10.5" r="2.1" fill={P.blue} />
    </>
  ),
};

export default function ColorIcon({ name, size = 40, style, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={style} aria-hidden="true" {...rest}>
      {ICONS[name] || null}
    </svg>
  );
}
