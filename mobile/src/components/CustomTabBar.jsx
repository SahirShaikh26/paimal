import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../theme';
import { useDrawer } from '../navigation/DrawerContext';

// Reference-inspired bottom bar: 4 flat tabs + a raised circular centre button
// (In/Out attendance). "More" opens the slide-out drawer instead of a screen.
const LEFT = [
  { name: 'Home', label: 'Home', icon: '🏠' },
  { name: 'Logs', label: 'Activity', icon: '📋' },
];
const RIGHT = [
  { name: 'Projects', label: 'Projects', icon: '🗂️' },
  { name: '__more', label: 'More', icon: '⋯' },
];

export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();
  const activeName = state.routes[state.index]?.name;

  const Item = ({ tab }) => {
    const focused = activeName === tab.name;
    const onPress = () => {
      if (tab.name === '__more') return open();
      navigation.navigate(tab.name);
    };
    return (
      <TouchableOpacity style={s.tab} onPress={onPress} activeOpacity={0.7}>
        <Text style={[s.icon, { opacity: focused ? 1 : 0.55 }]}>{tab.icon}</Text>
        <Text style={[s.label, focused && s.labelActive]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.wrap, { paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 8 : 6) }]}>
      {LEFT.map((t) => <Item key={t.name} tab={t} />)}

      <View style={s.centerSlot}>
        <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => navigation.navigate('InOut')}>
          <Text style={s.fabIcon}>🕐</Text>
        </TouchableOpacity>
        <Text style={[s.label, activeName === 'InOut' && s.labelActive, { marginTop: 30 }]}>In / Out</Text>
      </View>

      {RIGHT.map((t) => <Item key={t.name} tab={t} />)}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 8, alignItems: 'flex-start', justifyContent: 'space-around',
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 2 },
  icon: { fontSize: 20, marginBottom: 3 },
  label: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  labelActive: { color: COLORS.blue },
  centerSlot: { flex: 1, alignItems: 'center' },
  fab: {
    position: 'absolute', top: -28, width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.blue,
    alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: COLORS.blue,
    shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, borderWidth: 4, borderColor: COLORS.white,
  },
  fabIcon: { fontSize: 24 },
});
