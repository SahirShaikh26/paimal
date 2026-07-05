import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import COLORS from '../theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Small QR-code-style glyph (three finder squares) drawn with Views.
function QrGlyph() {
  const sq = (extra) => <View style={[q.finder, extra]}><View style={q.finderDot} /></View>;
  return (
    <View style={q.box}>
      <View style={q.rowTop}>{sq()}{sq()}</View>
      <View style={q.rowBot}>{sq()}<View style={q.finderEmpty} /></View>
    </View>
  );
}

const TILES = [
  { label: 'Log Activity', icon: '✏️', bg: '#dbeafe', target: 'LogActivity' },
  { label: 'My Logs', icon: '📋', bg: '#fef3c7', target: 'Logs' },
  { label: 'Check In/Out', icon: '🕐', bg: '#dcfce7', target: 'InOut' },
  { label: 'Projects', icon: '🗂️', bg: '#e0e7ff', target: 'Projects' },
  { label: 'Performance', icon: '📊', bg: '#fae8ff', target: 'Performance' },
  { label: 'Import', icon: '📥', bg: '#ffe4e6', target: 'Import', roles: ['Director', 'Manager'] },
];

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [hoursToday, setHoursToday] = useState(0);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
    api.get('/reports/summary', { params: { date_from: monthStart } }).then((r) => setSummary(r.data)).catch(() => {});
    api.get('/logs', { params: { date_from: today, date_to: today } })
      .then((r) => setHoursToday((r.data?.data || []).reduce((s2, l) => s2 + (Number(l.hours) || 0), 0)))
      .catch(() => {});
    api.get('/visits', { params: { date: 'today', status: 'Scheduled' } }).then((r) => setVisits(r.data || [])).catch(() => {});
  }, []);

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const t = summary?.totals;
  const tiles = TILES.filter((x) => !x.roles || x.roles.includes(user?.role));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgSlate }}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Profile greeting card */}
        <View style={s.profile}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.greet}>{greeting()}</Text>
            <Text style={s.name} numberOfLines={1}>{(user?.name || 'User').toUpperCase()}</Text>
            <Text style={s.role}>{(user?.job_title || user?.role || '').toUpperCase()}</Text>
          </View>
          <QrGlyph />
        </View>

        {/* Hours logged today */}
        <View style={s.hoursCard}>
          <View>
            <Text style={s.hoursLabel}>Hours Logged</Text>
            <Text style={s.hoursDate}>{format(new Date(), 'EEE, MMM d').toUpperCase()}</Text>
          </View>
          <Text style={s.hoursValue}>{hoursToday.toFixed(2)} <Text style={s.hoursUnit}>Hrs</Text></Text>
        </View>

        {/* Today's visits (pending-style) */}
        <TouchableOpacity
          style={s.pending}
          activeOpacity={0.8}
          onPress={() => visits.length && navigation.navigate('InOut')}
        >
          <Text style={s.pendingLabel}>🗓️  Today's Scheduled Visits</Text>
          <View style={s.badge}><Text style={s.badgeText}>{visits.length}</Text></View>
        </TouchableOpacity>

        {/* This month mini-stats */}
        <View style={s.miniRow}>
          <View style={s.mini}><Text style={s.miniVal}>{t?.total_logs ?? '—'}</Text><Text style={s.miniLbl}>Logs (MTD)</Text></View>
          <View style={s.mini}><Text style={[s.miniVal, { color: COLORS.green }]}>{Number(t?.total_hours || 0).toFixed(0)}</Text><Text style={s.miniLbl}>Hours</Text></View>
          <View style={s.mini}><Text style={[s.miniVal, { color: COLORS.orange }]}>{t?.customers_served ?? '—'}</Text><Text style={s.miniLbl}>Customers</Text></View>
        </View>

        {/* Feature grid */}
        <View style={s.grid}>
          {tiles.map((tile) => (
            <TouchableOpacity key={tile.label} style={s.tile} activeOpacity={0.75} onPress={() => navigation.navigate(tile.target)}>
              <View style={[s.tileIcon, { backgroundColor: tile.bg }]}><Text style={{ fontSize: 24 }}>{tile.icon}</Text></View>
              <Text style={s.tileLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const q = StyleSheet.create({
  box: { width: 40, height: 40, justifyContent: 'space-between' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  rowBot: { flexDirection: 'row', justifyContent: 'space-between' },
  finder: { width: 17, height: 17, borderWidth: 2.5, borderColor: COLORS.white, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  finderDot: { width: 5, height: 5, backgroundColor: COLORS.white },
  finderEmpty: { width: 17, height: 17 },
});

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.navy, borderRadius: 18, padding: 18 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: COLORS.navy },
  greet: { color: COLORS.orange, fontSize: 18, fontWeight: '800' },
  name: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginTop: 2 },
  role: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  hoursCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: 12, padding: 18, marginTop: 16, elevation: 2 },
  hoursLabel: { fontSize: 15, color: COLORS.textDark, fontWeight: '600' },
  hoursDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  hoursValue: { fontSize: 24, fontWeight: '800', color: COLORS.blue },
  hoursUnit: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  pending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginTop: 12, elevation: 2 },
  pendingLabel: { fontSize: 14.5, color: COLORS.textDark, fontWeight: '600' },
  badge: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  badgeText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  miniRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  mini: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, paddingVertical: 14, alignItems: 'center', elevation: 1 },
  miniVal: { fontSize: 20, fontWeight: '800', color: COLORS.navy },
  miniLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  tile: { width: '33.33%', alignItems: 'center', marginBottom: 22 },
  tileIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { fontSize: 12.5, color: COLORS.textDark, fontWeight: '600', textAlign: 'center' },
});
