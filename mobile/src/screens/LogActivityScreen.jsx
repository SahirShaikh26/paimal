import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import api from '../api/client';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { uploadPhoto } from '../api/cloudinary';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { SPEECH_LANGUAGES } from '../constants/languages';
import COLORS from '../theme';

const LANG_STORAGE_KEY = 'fp_dictation_lang';

export default function LogActivityScreen({ navigation, route }) {
  const { submit } = useOfflineQueue();
  const visit = route?.params?.visit;
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]); // { uri, uploading, url }
  const [photoCaptureEnabled, setPhotoCaptureEnabled] = useState(false);
  const [dictationLang, setDictationLang] = useState('hi-IN');
  const { transcript, listening, error: speechError, start: startListening, stop: stopListening } = useSpeechToText(dictationLang);
  const wasListening = useRef(false);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    activity_code: '',
    customer_id: visit?.customer_id || '',
    project_id: visit?.project_id || '',
    query_type: '',
    product_type: '',
    hours: '',
    billing_inr: '',
    cost_inr: '',
    status: '',
    location: '',
    notes: visit?.notes || '',
  });

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data)).catch(() => {});
    api.get('/projects').then(r => setProjects(r.data)).catch(() => {});
    api.get('/tenant').then(r => setPhotoCaptureEnabled(!!r.data.photo_capture_enabled)).catch(() => {});
    api.get('/activity-types').then(r => {
      setActivityTypes(r.data);
      if (r.data.length) setForm(f => (f.activity_code ? f : { ...f, activity_code: r.data[0].code }));
    }).catch(() => {});
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => { if (saved) setDictationLang(saved); }).catch(() => {});
  }, []);

  useEffect(() => {
    // Append the finalized transcript to Notes once recognition stops.
    if (wasListening.current && !listening && transcript) {
      setForm((f) => ({ ...f, notes: f.notes ? `${f.notes} ${transcript}` : transcript }));
    }
    wasListening.current = listening;
  }, [listening, transcript]);

  useEffect(() => {
    if (speechError) Alert.alert('Voice input error', speechError);
  }, [speechError]);

  const changeDictationLang = (code) => {
    setDictationLang(code);
    AsyncStorage.setItem(LANG_STORAGE_KEY, code).catch(() => {});
  };

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const addPhoto = async (fromCamera) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', `Allow ${fromCamera ? 'camera' : 'photo library'} access to attach photos.`);
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const entry = { uri, uploading: true, url: null };
    setPhotos((p) => [...p, entry]);

    try {
      const url = await uploadPhoto(uri);
      setPhotos((p) => p.map((ph) => (ph.uri === uri ? { ...ph, uploading: false, url } : ph)));
    } catch (err) {
      setPhotos((p) => p.filter((ph) => ph.uri !== uri));
      Alert.alert('Upload failed', err.message === 'Photo upload is not configured'
        ? 'Photo upload is not set up yet.'
        : 'Could not upload photo — check your connection and try again.');
    }
  };

  const removePhoto = (uri) => setPhotos((p) => p.filter((ph) => ph.uri !== uri));

  const handleSave = async () => {
    if (!form.activity_code) { Alert.alert('Required', 'Select an activity code'); return; }
    setSaving(true);
    try {
      const photo_urls = photos.filter((p) => p.url).map((p) => p.url);
      const base = { ...form, photo_urls };
      const payload = visit ? { ...base, visit_id: visit.id, machine_id: visit.machine_id } : base;
      const { queued } = await submit('/logs', payload);
      Alert.alert(
        queued ? 'Saved offline' : 'Saved!',
        queued ? 'No connection — this log will sync automatically once you\'re back online.' : 'Activity logged successfully',
        [{ text:'OK', onPress:()=>navigation.navigate('Tabs', { screen: 'Logs' }) }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {visit && (
        <View style={s.visitBanner}>
          <Text style={s.visitBannerText}>📍 Logging scheduled visit — {visit.customer_name}</Text>
        </View>
      )}

      <Field label="Date">
        <TextInput style={s.input} value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" />
      </Field>

      <Field label="Activity Code *">
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.activity_code} onValueChange={set('activity_code')}>
            {activityTypes.map(a => <Picker.Item key={a.id} label={`${a.code} — ${a.label}`} value={a.code} />)}
          </Picker>
        </View>
      </Field>

      <Field label="Customer">
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.customer_id} onValueChange={set('customer_id')}>
            <Picker.Item label="Select customer…" value="" />
            {customers.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
          </Picker>
        </View>
      </Field>

      <Field label="Project">
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.project_id} onValueChange={set('project_id')}>
            <Picker.Item label="Select project…" value="" />
            {projects.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
          </Picker>
        </View>
      </Field>

      <View style={s.row}>
        <Field label="Hours">
          <TextInput style={[s.input, s.half]} value={form.hours} onChangeText={set('hours')} keyboardType="numeric" placeholder="0.0" />
        </Field>
        <Field label="Location">
          <TextInput style={[s.input, s.half]} value={form.location} onChangeText={set('location')} placeholder="City / Site" />
        </Field>
      </View>

      <View style={s.row}>
        <Field label="Billing (₹)">
          <TextInput style={[s.input, s.half]} value={form.billing_inr} onChangeText={set('billing_inr')} keyboardType="numeric" placeholder="0" />
        </Field>
        <Field label="Cost (₹)">
          <TextInput style={[s.input, s.half]} value={form.cost_inr} onChangeText={set('cost_inr')} keyboardType="numeric" placeholder="0" />
        </Field>
      </View>

      <Field label="Query Type">
        <TextInput style={s.input} value={form.query_type} onChangeText={set('query_type')} placeholder="e.g. Breakdown query" />
      </Field>

      <Field label="Notes">
        <TextInput style={[s.input, s.textarea]} value={form.notes} onChangeText={set('notes')}
          placeholder="Describe what was done…" multiline numberOfLines={3} textAlignVertical="top" />
        <View style={s.dictationRow}>
          <View style={[s.pickerWrap, s.dictationPicker]}>
            <Picker selectedValue={dictationLang} onValueChange={changeDictationLang}>
              {SPEECH_LANGUAGES.map((l) => <Picker.Item key={l.code} label={l.label} value={l.code} />)}
            </Picker>
          </View>
          <TouchableOpacity
            style={[s.micBtn, listening && s.micBtnActive]}
            onPress={() => (listening ? stopListening() : startListening())}
          >
            <Text style={s.micBtnText}>{listening ? '⏹ Stop' : '🎤 Dictate'}</Text>
          </TouchableOpacity>
        </View>
        {listening && transcript ? <Text style={s.liveTranscript}>{transcript}</Text> : null}
      </Field>

      {photoCaptureEnabled && (
        <Field label="Photos">
          <View style={s.photoRow}>
            {photos.map((p) => (
              <View key={p.uri} style={s.photoThumbWrap}>
                <Image source={{ uri: p.uri }} style={s.photoThumb} />
                {p.uploading && <View style={s.photoOverlay}><Text style={s.photoOverlayText}>…</Text></View>}
                <TouchableOpacity style={s.photoRemove} onPress={() => removePhoto(p.uri)}>
                  <Text style={s.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={s.row}>
            <TouchableOpacity style={[s.photoBtn, s.half]} onPress={() => addPhoto(true)}>
              <Text style={s.photoBtnText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.photoBtn, s.half]} onPress={() => addPhoto(false)}>
              <Text style={s.photoBtnText}>🖼 Gallery</Text>
            </TouchableOpacity>
          </View>
        </Field>
      )}

      <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={s.btnText}>{saving ? 'Saving…' : 'Save Log'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:COLORS.bg },
  content:    { padding:16, paddingBottom:40 },
  field:      { marginBottom:14, flex:1 },
  label:      { fontSize:13, fontWeight:'600', color:COLORS.text, marginBottom:5 },
  input:      { backgroundColor:COLORS.white, borderWidth:1, borderColor:COLORS.borderInput, borderRadius:8, padding:11, fontSize:14, color:COLORS.textDark },
  textarea:   { height:80 },
  half:       { flex:1 },
  pickerWrap: { backgroundColor:COLORS.white, borderWidth:1, borderColor:COLORS.borderInput, borderRadius:8, overflow:'hidden' },
  row:        { flexDirection:'row', gap:12 },
  btn:        { backgroundColor:COLORS.navy, borderRadius:12, padding:16, alignItems:'center', marginTop:8 },
  btnDisabled:{ opacity:.6 },
  btnText:    { color:COLORS.white, fontSize:16, fontWeight:'700' },
  visitBanner:{ backgroundColor:COLORS.blueBg, borderRadius:8, padding:10, marginBottom:14 },
  visitBannerText:{ fontSize:13, fontWeight:'600', color:COLORS.blueDark },
  photoRow:   { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:10 },
  photoThumbWrap:{ width:64, height:64, borderRadius:8, overflow:'hidden' },
  photoThumb: { width:64, height:64, borderRadius:8 },
  photoOverlay:{ position:'absolute', inset:0, backgroundColor:'rgba(0,0,0,.4)', alignItems:'center', justifyContent:'center' },
  photoOverlayText:{ color:COLORS.white, fontWeight:'700' },
  photoRemove:{ position:'absolute', top:2, right:2, backgroundColor:'rgba(0,0,0,.6)', width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },
  photoRemoveText:{ color:COLORS.white, fontSize:11, fontWeight:'700' },
  photoBtn:   { backgroundColor:COLORS.white, borderWidth:1, borderColor:COLORS.borderInput, borderRadius:8, padding:11, alignItems:'center' },
  photoBtnText:{ color:COLORS.navy, fontSize:13, fontWeight:'600' },
  dictationRow:{ flexDirection:'row', gap:8, marginTop:8, alignItems:'center' },
  dictationPicker:{ flex:1 },
  micBtn:     { backgroundColor:COLORS.purpleBg, borderRadius:8, paddingHorizontal:14, paddingVertical:11 },
  micBtnActive:{ backgroundColor:COLORS.redBg },
  micBtnText: { color:COLORS.purple, fontSize:13, fontWeight:'700' },
  liveTranscript:{ marginTop:6, fontSize:13, color:COLORS.textMuted, fontStyle:'italic' },
});
