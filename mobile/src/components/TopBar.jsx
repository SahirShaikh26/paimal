import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../theme';
import { useDrawer } from '../navigation/DrawerContext';
import PaimalMark from './PaimalMark';

// White app bar: hamburger (opens drawer) · centered brand · notification bell.
export default function TopBar({ showBell = true }) {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();

  return (
    <View style={[s.wrap, { paddingTop: insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight : 0) }]}>
      <View style={s.bar}>
        <TouchableOpacity onPress={open} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={s.iconBtn}>
          <View style={s.burgerLine} />
          <View style={s.burgerLine} />
          <View style={s.burgerLine} />
        </TouchableOpacity>

        <View style={s.brandRow}>
          <PaimalMark size={26} />
          <Text style={s.brand}>Paimal</Text>
        </View>

        {showBell ? (
          <TouchableOpacity style={s.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.bell}>🔔</Text>
            <View style={s.dot} />
          </TouchableOpacity>
        ) : <View style={s.iconBtn} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bar: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  burgerLine: { width: 22, height: 2.5, borderRadius: 2, backgroundColor: COLORS.navy, marginVertical: 2.5 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 18, fontWeight: '800', color: COLORS.navy, letterSpacing: -0.3 },
  bell: { fontSize: 20 },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red, borderWidth: 1.5, borderColor: COLORS.white },
});
