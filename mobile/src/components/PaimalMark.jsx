import { View } from 'react-native';
import COLORS from '../theme';

// The compact Paimal glyph for mobile: the checkmark on a rounded tile, drawn
// with Views only (no react-native-svg dependency) — an L-shape rotated 45°.
export default function PaimalMark({ size = 28, tile = COLORS.navy, glyph = COLORS.blue }) {
  const t = Math.max(2, size * 0.11);
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: tile, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.30, height: size * 0.54,
        borderColor: glyph, borderBottomWidth: t, borderRightWidth: t,
        transform: [{ rotate: '45deg' }], marginTop: -size * 0.05,
      }} />
    </View>
  );
}
