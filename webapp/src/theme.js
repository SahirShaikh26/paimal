// Single source of truth for Paimal's brand palette — edit here to re-skin the
// whole app instead of hunting hex codes across every page.
//
// System: marigold accent on warm graphite ink and warm paper. Primary actions
// use ink (white text = high contrast); marigold is the recognisable brand pop
// reserved for highlights, links, active states, and the mark. Green / amber /
// red stay for status only.
export const colors = {
  navy: '#201C16',        // graphite ink — dark surfaces, primary buttons, headings
  ink:  '#201C16',
  inkSoft: '#4A443B',

  blue: '#E4881F',        // MARIGOLD — the accent (links, active states, values)
  accent: '#E4881F',
  blueLight: '#F6A62A',   // brighter marigold (highlights)
  blueDark: '#C2740C',    // deeper marigold (info status text)

  purple: '#7c3aed',
  purpleBg: '#f3e8ff',
  green: '#3F8F5B',
  greenBg: '#DCF0E6',
  amber: '#C08A1B',
  amberBg: '#FBEFD9',
  orange: '#E4881F',      // greeting = marigold
  orangeLight: '#F6A62A',
  red: '#C0492F',
  redBg: '#F7E1DC',
  cyan: '#0891b2',
  pink: '#be185d',

  // Soft tile backgrounds — warm-leaning so they sit with marigold
  tileBlue: '#FDECD2',
  tileAmber: '#FBEFD9',
  tileGreen: '#DCF0E6',
  tileIndigo: '#E7E3F5',
  tileFuchsia: '#F6E6F0',
  tileRose: '#FBE6DE',

  bg: '#FBFAF7',          // warm paper
  bgAlt: '#F4F1EA',
  bgSlate: '#FBFAF7',
  white: '#FFFFFF',

  border: '#EAE4DA',
  borderInput: '#DCD4C6',

  text: '#4A443B',
  textDark: '#201C16',
  textMuted: '#8B8375',
  textFaint: '#A79E8C',

  blueBg: '#FBEFD9',      // marigold tint (info badges)
};

export default colors;
