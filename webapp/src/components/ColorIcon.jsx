// Multi-colour flat illustration icons for Paimal (matches the marketing site's
// ColorIcon set). Used for the dashboard quick-action tiles. Each icon is a small
// composition of filled shapes in several brand hues.
const P = {
  mar: '#E4881F', marD: '#C2740C', sun: '#F6C453',
  blue: '#3B78E7', blueL: '#9CC0F7',
  teal: '#12A594', tealL: '#8AD9CE',
  green: '#41945E', greenL: '#93CBA6',
  violet: '#7A5AF0', violetL: '#B9A8F7',
  pink: '#D6459B', pinkL: '#F1A9D2',
  ink: '#2A2118', paper: '#FFFFFF', line: '#E3DCCF',
};

const ICONS = {
  // 5 bars in 5 colours
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

  // pencil writing (log activity)
  edit: (
    <g transform="rotate(45 20 21)">
      <rect x="15" y="5" width="10" height="30" rx="3" fill={P.blue} />
      <rect x="15" y="5" width="10" height="5" rx="3" fill={P.pink} />
      <rect x="15" y="10.5" width="10" height="2.6" fill={P.mar} />
      <path d="M15 31 h10 l-5 7 z" fill="#F2D9A8" />
      <path d="M17.6 35.4 h4.8 l-2.4 3.4 z" fill={P.ink} />
    </g>
  ),

  // bulleted log list
  list: (
    <>
      <circle cx="9" cy="11" r="2.8" fill={P.mar} />
      <rect x="15" y="9.4" width="20" height="3.2" rx="1.6" fill={P.line} />
      <circle cx="9" cy="20" r="2.8" fill={P.blue} />
      <rect x="15" y="18.4" width="20" height="3.2" rx="1.6" fill={P.line} />
      <circle cx="9" cy="29" r="2.8" fill={P.green} />
      <rect x="15" y="27.4" width="15" height="3.2" rx="1.6" fill={P.line} />
    </>
  ),

  // two-tone folder with a peeking doc
  folder: (
    <>
      <rect x="13" y="6" width="14" height="11" rx="2" fill={P.blue} />
      <rect x="15.5" y="9" width="9" height="1.8" rx="0.9" fill="#fff" opacity="0.8" />
      <path d="M5 13 a2 2 0 0 1 2 -2 h7 l3 3.2 h14 a2 2 0 0 1 2 2 v11 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 z" fill={P.marD} />
      <path d="M5 17 h30 v9 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 z" fill={P.mar} />
    </>
  ),

  // building (customers)
  building: (
    <>
      <rect x="8" y="7" width="18" height="28" rx="2.5" fill={P.teal} />
      <g fill="#E7F7F3">
        <rect x="11.5" y="11" width="4" height="4" rx="1" />
        <rect x="18.5" y="11" width="4" height="4" rx="1" />
        <rect x="11.5" y="18" width="4" height="4" rx="1" />
        <rect x="18.5" y="18" width="4" height="4" rx="1" />
      </g>
      <rect x="14.5" y="27" width="5" height="8" rx="1" fill={P.mar} />
      <rect x="26" y="16" width="8" height="19" rx="2" fill={P.tealL} />
      <g fill="#E7F7F3">
        <rect x="28" y="19" width="3.5" height="3.5" rx="0.8" />
        <rect x="28" y="25" width="3.5" height="3.5" rx="0.8" />
      </g>
    </>
  ),

  // arrow into tray (import)
  download: (
    <>
      <rect x="16.5" y="6" width="7" height="15" rx="3.5" fill={P.green} />
      <path d="M11 18 L20 29 L29 18 Z" fill={P.green} />
      <rect x="6" y="30" width="28" height="5.5" rx="2.7" fill={P.blue} />
      <circle cx="11" cy="32.7" r="1.3" fill="#fff" opacity="0.85" />
    </>
  ),
};

export default function ColorIcon({ name, size = 34, style, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={style} aria-hidden="true" {...rest}>
      {ICONS[name] || null}
    </svg>
  );
}
