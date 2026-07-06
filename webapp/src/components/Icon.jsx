// Lightweight line-icon set (inline SVG, stroke = currentColor) — replaces the
// emoji that used to mark nav items and dashboard tiles. ~1 kB, no dependency.
const P = {
  grid:     'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list:     'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  edit:     'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  folder:   'M3 7.5A2 2 0 0 1 5 5.5h3.2a2 2 0 0 1 1.5.7l1 1.3h7.3a2 2 0 0 1 2 2v7.3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  layers:   'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  calendar: 'M4 5.5h16a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM3 10h18M8 3v4M16 3v4',
  ticket:   'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4zM12 6v2M12 11v2M12 16v2',
  file:     'M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v4h4M8.5 13h7M8.5 16.5h7',
  receipt:  'M6 3.5h12v17l-2.4-1.4-2.4 1.4-2.4-1.4-2.4 1.4L6 20.5zM9.5 8.5h5M9.5 12h5',
  building: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M8 8h3M8 12h3M8 16h3',
  users:    'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3.5 20a5.5 5.5 0 0 1 11 0M16 5a3 3 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2.2-4.4',
  chart:    'M4 4v16h16M8 15v2M12 11v6M16 7v10',
  target:   'M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12h.01',
  clipboard:'M9 4.5h6a1 1 0 0 1 1 1V6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-.5a1 1 0 0 1 1-1zM8 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-2',
  download: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  sparkle:  'M12 3l1.8 4.9L18 9l-4.2 1.1L12 15l-1.8-4.9L6 9l4.2-1.1zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  card:     'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5zM3 10h18M7 14.5h4',
  gear:     'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 12l1.5 1.2-1.4 2.4-1.9-.6a6 6 0 0 1-1.4.8L15.8 18h-2.8l-.4-1.9a6 6 0 0 1-1.4-.8l-1.9.6-1.4-2.4L9.4 12 7.9 10.8l1.4-2.4 1.9.6a6 6 0 0 1 1.4-.8L13 6h2.8l.4 1.9a6 6 0 0 1 1.4.8l1.9-.6 1.4 2.4z',
  pulse:    'M3 12h4l2.5 6 4-13 2.5 7H21',
  bell:     'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0',
};

export default function Icon({ name, size = 18, strokeWidth = 1.7, style }) {
  const d = P[name] || P.grid;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}
