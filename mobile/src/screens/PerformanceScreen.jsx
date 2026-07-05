import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import COLORS from '../theme';

const CHART_H = 180;

export default function PerformanceScreen({ navigation }) {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = format(month, 'yyyy-MM-dd');
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const to = format(end, 'yyyy-MM-dd');
    setLoading(true);
    api.get('/reports/summary', { params: { date_from: from, date_to: to, engineer_id: user?.id } })
      .then((r) => setTotals(r.data?.totals || {}))
      .catch(() => setTotals({}))
      .finally(() => setLoading(false));
  }, [month]);

  const t = totals || {};
  const metrics = [
    { label: 'Logs', value: Number(t.total_logs || 0), color: '#eab308' },
    { label: 'Hours', value: Number(t.total_hours || 0), color: COLORS.blue },
    { label: 'Billable', value: Number(t.billable_hours || 0), color: COLORS.green },
    { label: 'Non-Bill', value: Number(t.non_billable_hours || 0), color: COLORS.red },
    { label: 'Travel', value: Number(t.travel_hours || 0), color: COLORS.purple },
    { label: 'Days', value: Number(t.total_hours || 0) / 8, color: COLORS.orange },
  ];
  const max = Math.max(...metrics.map((m) => m.value), 1);

  const shift = (d) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + d, 1));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgSlate }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={s.monthRow}>
          <TouchableOpacity style={s.monthBtn} onPress={() => shift(-1)}><Text style={s.monthBtnText}>‹</Text></TouchableOpacity>
          <Text style={s.monthLabel}>{format(month, 'MMMM yyyy')}</Text>
          <TouchableOpacity style={s.monthBtn} onPress={() => shift(1)}><Text style={s.monthBtnText}>›</Text></TouchableOpacity>
        </View>

        <View style={s.card}>
          {loading ? <Text style={s.loading}>Loading…</Text> : (
            <>
              <View style={s.chart}>
                {metrics.map((m) => (
                  <View key={m.label} style={s.barCol}>
                    <Text style={s.barVal}>{m.value % 1 === 0 ? m.value : m.value.toFixed(1)}</Text>
                    <View style={[s.bar, { height: Math.max((m.value / max) * CHART_H, 3), backgroundColor: m.color }]} />
                    <Text style={s.barLbl}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={s.legend}>
          {metrics.map((m) => (
            <View key={m.label} style={s.legendRow}>
              <View style={[s.dot, { backgroundColor: m.color }]} />
              <Text style={s.legendLabel}>{m.label === 'Non-Bill' ? 'Non-Billable Hours' : m.label === 'Days' ? 'Total Days (hrs ÷ 8)' : m.label === 'Logs' ? 'Activity Logs' : m.label === 'Hours' ? 'Total Hours' : `${m.label} Hours`}</Text>
              <Text style={[s.legendVal, { color: m.color }]}>{m.value.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  back: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  backText: { fontSize: 22, color: COLORS.navy, marginTop: -2 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.blue },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  monthBtn: { width: 40, height: 36, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  monthBtnText: { fontSize: 20, color: COLORS.navy, marginTop: -2 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, minWidth: 140, textAlign: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, elevation: 2 },
  loading: { textAlign: 'center', color: COLORS.textMuted, paddingVertical: 40 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_H + 40, paddingTop: 8 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barVal: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4, fontWeight: '700' },
  barLbl: { fontSize: 10, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
  legend: { backgroundColor: COLORS.white, borderRadius: 14, padding: 8, marginTop: 16, elevation: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.bgAlt },
  dot: { width: 14, height: 14, borderRadius: 4, marginRight: 12 },
  legendLabel: { flex: 1, fontSize: 14, color: COLORS.textDark, fontWeight: '500' },
  legendVal: { fontSize: 15, fontWeight: '800' },
});
