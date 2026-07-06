import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import api from '../api/client';
import COLORS from '../theme';

const ENTITIES = [
  { key: 'customers', label: 'Customers', icon: '🏭', required: ['name'], columns: 'name, code, city, region, contact_name, contact_phone, address' },
  { key: 'engineers', label: 'Engineers', icon: '👷', required: ['name', 'email', 'password'], columns: 'name, email, password, dept, role' },
  { key: 'projects',  label: 'Projects',  icon: '🗂️', required: ['name'], columns: 'name, customer_name, status, category, start_date, end_date, value_inr' },
  { key: 'machines',  label: 'Machines',  icon: '⚙️', required: ['name', 'customer_name'], columns: 'name, customer_name, model, product_type, serial_no, install_year, warranty_until' },
];

export default function ImportScreen() {
  const [entity, setEntity] = useState('customers');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const cfg = ENTITIES.find(e => e.key === entity);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', '*/*'] });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(uri);
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          setRows(data);
          Alert.alert('File Loaded', `${data.length} rows ready to import. Review and tap Import.`);
        },
        error: () => Alert.alert('Error', 'Could not parse CSV file'),
      });
    } catch {
      Alert.alert('Error', 'Could not open file');
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/import/${entity}`, { records: rows });
      Alert.alert('Success', data.message);
      setRows([]);
    } catch (err) {
      Alert.alert('Import Failed', err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const previewCols = rows.length ? Object.keys(rows[0]).filter(k => rows.some(r => r[k])) : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Import Data</Text>
      <Text style={s.sub}>Upload a CSV to bulk-import records</Text>

      {/* Entity selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {ENTITIES.map(e => (
          <TouchableOpacity
            key={e.key}
            style={[s.tab, entity === e.key && s.tabActive]}
            onPress={() => { setEntity(e.key); setRows([]); }}
          >
            <Text style={[s.tabText, entity === e.key && s.tabTextActive]}>
              {e.icon} {e.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Upload card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Upload {cfg.label} CSV</Text>
        <Text style={s.hint}>Required columns: <Text style={s.bold}>{cfg.required.join(', ')}</Text></Text>
        <Text style={s.hint}>All columns: {cfg.columns}</Text>
        <TouchableOpacity style={s.uploadBtn} onPress={pickFile}>
          <Text style={s.uploadBtnText}>📂  Choose CSV File</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      {rows.length > 0 && (
        <View style={s.card}>
          <View style={s.previewHeader}>
            <Text style={s.cardTitle}>{rows.length} rows ready</Text>
            <TouchableOpacity onPress={() => setRows([])}>
              <Text style={s.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* Header row */}
              <View style={s.tableRow}>
                {previewCols.map(c => (
                  <Text key={c} style={[s.cell, s.cellHead]}>{c}</Text>
                ))}
              </View>
              {/* Data rows (max 5 preview) */}
              {rows.slice(0, 5).map((r, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 && s.rowAlt]}>
                  {previewCols.map(c => (
                    <Text key={c} style={s.cell} numberOfLines={1}>{r[c] || '—'}</Text>
                  ))}
                </View>
              ))}
              {rows.length > 5 && (
                <Text style={s.moreRows}>+ {rows.length - 5} more rows</Text>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={s.importBtn} onPress={handleImport} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.importBtnText}>Import {rows.length} {cfg.label}</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },
  content:        { padding: 20, paddingBottom: 40 },
  title:          { fontSize: 22, fontWeight: '800', color: COLORS.navy, marginBottom: 4 },
  sub:            { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  tabRow:         { marginBottom: 16 },
  tab:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.borderInput, marginRight: 8, backgroundColor: COLORS.white },
  tabActive:      { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText:        { fontSize: 13, fontWeight: '600', color: COLORS.text },
  tabTextActive:  { color: COLORS.white },
  card:           { backgroundColor: COLORS.white, borderRadius: 14, padding: 18, marginBottom: 16, elevation: 2 },
  cardTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  hint:           { fontSize: 12, color: COLORS.textFaint, marginBottom: 4 },
  bold:           { fontWeight: '700', color: COLORS.text },
  uploadBtn:      { marginTop: 14, backgroundColor: COLORS.navy, borderRadius: 10, padding: 14, alignItems: 'center' },
  uploadBtnText:  { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  previewHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clearText:      { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  tableRow:       { flexDirection: 'row' },
  rowAlt:         { backgroundColor: COLORS.bgSlate },
  cell:           { width: 120, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, color: COLORS.text, borderBottomWidth: 1, borderBottomColor: COLORS.bgAlt },
  cellHead:       { fontWeight: '700', color: COLORS.navy, backgroundColor: COLORS.bgAlt },
  moreRows:       { textAlign: 'center', padding: 8, color: COLORS.textFaint, fontSize: 12 },
  importBtn:      { marginTop: 16, backgroundColor: COLORS.green, borderRadius: 10, padding: 14, alignItems: 'center' },
  importBtnText:  { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
