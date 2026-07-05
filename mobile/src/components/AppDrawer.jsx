import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../theme';
import { useAuth } from '../hooks/useAuth';

const W = Math.min(320, Math.round(Dimensions.get('window').width * 0.82));

const ITEMS = [
  { label: 'Home',           icon: '🏠', target: 'Home' },
  { label: 'Log Activity',   icon: '✏️', target: 'LogActivity' },
  { label: 'My Activity Logs', icon: '📋', target: 'Logs' },
  { label: 'Check In / Out', icon: '🕐', target: 'InOut' },
  { label: 'Projects',       icon: '🗂️', target: 'Projects' },
  { label: 'Performance',    icon: '📊', target: 'Performance' },
  { label: 'Import Data',    icon: '📥', target: 'Import', roles: ['Director', 'Manager'] },
];

export default function AppDrawer({ visible, onClose, navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const slide = useRef(new Animated.Value(-W)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: visible ? 0 : -W, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  // Home/Logs/InOut/Projects live in the nested tab navigator; the rest are
  // sibling stack screens. Route each to the right place from stack-level nav.
  const TAB_TARGETS = ['Home', 'Logs', 'InOut', 'Projects'];
  const go = (target) => {
    onClose();
    requestAnimationFrame(() =>
      TAB_TARGETS.includes(target)
        ? navigation.navigate('Tabs', { screen: target })
        : navigation.navigate(target)
    );
  };
  const doLogout = () => {
    onClose();
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const items = ITEMS.filter((i) => !i.roles || i.roles.includes(user?.role));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.panel, { width: W, transform: [{ translateX: slide }], paddingTop: insets.top + 12 }]}>
        <View style={s.head}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.welcome}>Welcome :)</Text>
            <Text style={s.name} numberOfLines={1}>{user?.name || 'User'}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {items.map((it) => (
            <TouchableOpacity key={it.label} style={s.item} onPress={() => go(it.target)}>
              <Text style={s.itemIcon}>{it.icon}</Text>
              <Text style={s.itemLabel}>{it.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={s.rate}>Rate Us</Text>
          <TouchableOpacity onPress={doLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.logoutBtn}>
            <Text style={s.power}>🚪</Text>
            <Text style={s.logoutLabel}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: COLORS.white, elevation: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 2, height: 0 } },
  head: { backgroundColor: COLORS.blue, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: -12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  welcome: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  name: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 15, paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  itemLabel: { fontSize: 15.5, color: COLORS.textDark, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#dbe6f5', paddingHorizontal: 22, paddingTop: 14 },
  rate: { color: COLORS.blue, fontWeight: '700', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutLabel: { color: COLORS.textDark, fontWeight: '700', fontSize: 15 },
  power: { fontSize: 18 },
});
