// Single source of truth for Paimal's brand palette — kept in sync with the
// webapp's src/theme.js so web and mobile share one brand definition.
// Marigold accent on warm graphite ink and warm paper.
export const COLORS = {
  navy: '#201C16',       // graphite ink — dark surfaces (profile card, tab bar)
  navyDeep: '#33291D',   // warm dark — hero gradient tail
  navyCard: '#2B241B',
  blue: '#E4881F',       // MARIGOLD accent (values, active states, FAB)
  blueLight: '#F6A62A',
  blueDark: '#C2740C',
  // Greeting / highlight accent = marigold (one brand colour)
  orange: '#E4881F',
  orangeLight: '#F6A62A',
  purple: '#7c3aed',
  green: '#3F8F5B',
  greenBg: '#DCF0E6',
  amber: '#C08A1B',
  amberBg: '#FBEFD9',
  red: '#C0492F',
  redBg: '#F7E1DC',
  cyan: '#0891b2',
  pink: '#be185d',

  bg: '#FBFAF7',
  bgAlt: '#F4F1EA',
  bgSlate: '#FBFAF7',
  white: '#fff',
  black: '#000',

  border: '#EAE4DA',
  borderInput: '#DCD4C6',

  text: '#4A443B',
  textDark: '#201C16',
  textMuted: '#8B8375',
  textFaint: '#A79E8C',

  blueBg: '#FBEFD9',
  purpleBg: '#f3e8ff',
};

export default COLORS;
