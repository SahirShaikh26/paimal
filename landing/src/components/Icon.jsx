// Lightweight stroke line-icon set for the landing site (no icon library).
// Each value is one or more SVG path `d` strings drawn with the current color.
const PATHS = {
  pulse: ['M3 12h4l2.5-7 4 14 2.5-7H21'],
  calendar: ['M7 3v3M17 3v3', 'M4 8h16', 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'M8 12h3M8 16h6'],
  users: ['M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20', 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4', 'M15.5 4.2a3.5 3.5 0 0 1 0 6.6'],
  receipt: ['M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V4a1 1 0 0 1 1-1Z', 'M9 8h6M9 12h6'],
  sparkle: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z'],
  chart: ['M4 20V5', 'M4 20h16', 'M8 20v-5M12 20V9M16 20v-8M20 20v-4'],
  building: ['M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16', 'M15 10h4a1 1 0 0 1 1 1v10', 'M4 21h18', 'M7 8h3M7 12h3M7 16h3'],
  cloud: ['M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1 .5 6.98', 'M12 12v6M12 12l-2.5 2.5M12 12l2.5 2.5'],
  mic: ['M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z', 'M6 11a6 6 0 0 0 12 0', 'M12 17v4M9 21h6'],
  camera: ['M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z', 'M12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  layers: ['M12 3l9 5-9 5-9-5 9-5Z', 'M3 13l9 5 9-5', 'M3 16.5l9 5 9-5'],
  check: ['M20 6L9 17l-5-5'],
  arrow: ['M5 12h14', 'M13 5l7 7-7 7'],
  zap: ['M13 2L4 14h7l-1 8 9-12h-7l1-8Z'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z', 'M9 12l2 2 4-4'],
  rocket: ['M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2', 'M9 12a12 12 0 0 1 8-8 6 6 0 0 1 3 3 12 12 0 0 1-8 8l-3-3Z', 'M14.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
};

export default function Icon({ name, size = 22, stroke = 1.7, style, ...rest }) {
  const paths = PATHS[name] || [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      {...rest}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
