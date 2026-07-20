import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { AppTextField } from '../../components/AppTextField';
import { DatePickerField } from '../../components/DatePickerField';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { getLabours, addLabour, updateLabour } from '../../api/labourApi';
import { markAttendance } from '../../api/attendanceApi';

function parseTimeToMinutes(t) {
  const s = String(t || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function diffHours(start, end) {
  const a = parseTimeToMinutes(start);
  const b = parseTimeToMinutes(end);
  if (a == null || b == null || b <= a) return '';
  return ((b - a) / 60).toFixed(1);
}

export function LabourFormScreen({ route, navigation }) {
  const { labourId: routeLabourId } = route.params || {};
  const { vendors, fetchVendors,dateKey } = useApp();

  const [phone, setPhone] = useState('');
  const [lookupHit, setLookupHit] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [photoUri, setPhotoUri] = useState(null);
  const [labourId, setLabourId] = useState(null);
  const [vendorId, setVendorId] = useState(null);
  const [joinedDate, setJoinedDate] = useState(dateKey());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [totalHrs, setTotalHrs] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [labourListCache, setLabourListCache] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load labour list on mount for phone lookup
  useFocusEffect(
    useCallback(() => {
      fetchVendors?.();
      (async () => {
        try {
          const res = await getLabours({ date: dateKey() });
          const raw = res?.data?.data ?? res?.data ?? [];
          setLabourListCache(Array.isArray(raw) ? raw : []);
        } catch (err) {
          console.log('[LabourForm] Failed to load labour list:', err.message);
        }
      })();
    }, [])
  );

  // If editing via routeLabourId, fetch from API
  useEffect(() => {
    if (!routeLabourId) return;
    (async () => {
      try {
        const { getLabourById } = await import('../../api/labourApi');
        const res = await getLabourById(routeLabourId);
        const data = res?.data?.data ?? res?.data ?? {};
        setLabourId(routeLabourId);
        setPhone(data?.phone ?? '');
        setName(data?.full_name ?? data?.name ?? '');
        setAge(String(data?.age ?? ''));
        setGender(data?.gender ?? 'male');
        setPhotoUri(data?.profile_pic ?? null);
        setVendorId(data?.vendor_id ?? data?.vendor?.id ?? null);
        setJoinedDate(data?.effective_from ?? dateKey());
        setLookupHit({ id: routeLabourId, name: data?.full_name ?? data?.name ?? '' });
      } catch (err) {
        console.log('[LabourForm] Failed to load labour by id:', err.message);
      }
    })();
  }, [routeLabourId]);

  // Auto-calculate hours when start or end time changes
  useEffect(() => {
    const auto = diffHours(startTime, endTime);
    if (auto) setTotalHrs(auto);
  }, [startTime, endTime]);

  const openCamera = async () => {
    setShowPhotoModal(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    setShowPhotoModal(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const onLookup = () => {
    const q = phone.trim().toLowerCase();
    if (!q) {
      Alert.alert('Error', 'Enter a phone number to search.');
      return;
    }
    const found = (labourListCache || []).find(
      (l) => String(l.phone).toLowerCase() === q
    );
    if (found) {
      setLookupHit({ id: found.id, name: found.full_name || found.name || '' });
      setLabourId(found.id);
      setName(found.full_name || found.name || '');
      setAge(String(found.age ?? ''));
      setGender(found.gender || 'male');
      setPhotoUri(found.profile_pic || null);
      setVendorId(found.vendor_id ?? found?.vendor?.id ?? null);
      Alert.alert('Found', `Matched: ${found.full_name || found.name}`);
    } else {
      setLookupHit(null);
      setLabourId(null);
      Alert.alert('Not found', 'No worker with this phone. Fill details below to create a new profile.');
    }
  };

  const savePerson = async () => {
    const payload = {
      full_name: name,
      age: Number(age) || 0,
      gender,
      phone,
      vendor_id: vendorId,
      effective_from: joinedDate,
    };
    if (photoUri && photoUri.startsWith('file://')) {
      payload.profile_pic = photoUri;
    }
    console.log('[LabourForm] Saving labour payload:', JSON.stringify(payload));
    if (labourId) {
      const res = await updateLabour(labourId, payload);
      console.log('[LabourForm] Update response:', res?.data);
      return { id: labourId, ...payload };
    } else {
      const res = await addLabour(payload);
      console.log('[LabourForm] Add response:', res?.data);
      const created = res?.data?.data ?? res?.data ?? {};
      return { id: created.id || created.labour_id, ...payload };
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Phone lookup ── */}
          <Text style={styles.sectionLabel}>Phone Lookup</Text>
          <View style={styles.rowPhone}>
            <AppTextField
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.input, styles.inputFlex]}
              placeholder="Search by phone number"
            />
            <Pressable onPress={onLookup} style={styles.lookupBtn}>
              <MaterialCommunityIcons name="magnify" size={18} color="#215da1" />
              <Text style={styles.lookupText}>Find</Text>
            </Pressable>
          </View>
          {lookupHit ? (
            <View style={styles.matchBadge}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#137333" />
              <Text style={styles.hintGreen}>Matched: {lookupHit.name}</Text>
            </View>
          ) : (
            <Text style={styles.hintMuted}>New worker — complete profile below.</Text>
          )}

          {/* ── Name + Photo ── */}
          <Text style={styles.sectionLabel}>Worker Info</Text>
          <View style={styles.photoRow}>
            <View style={{ flex: 1 }}>
              <AppTextField
                label="Full name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Enter full name"
              />
            </View>

            {/* Photo tap → custom modal (not Alert) */}
            <Pressable style={styles.photoCircle} onPress={() => setShowPhotoModal(true)}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoIcon} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={26} color="#4A90E2" />
                  <Text style={styles.photoHint}>Add Photo</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Age + Gender ── */}
          <View style={styles.grid2}>
            <AppTextField
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              style={[styles.input, styles.half]}
              placeholder="Age"
            />
            <View style={styles.half}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <SegmentedButtons
                value={gender}
                onValueChange={setGender}
                buttons={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
                style={styles.segment}
                theme={{
                  colors: {
                    secondaryContainer: 'rgba(125,211,252,0.2)',
                    onSecondaryContainer: colors.text,
                    outline: colors.outline,
                  },
                }}
              />
            </View>
          </View>

          {/* ── Date + Vendor ── */}
          <View style={styles.grid2}>
            <DatePickerField label="Date" value={joinedDate} onChange={setJoinedDate} style={styles.half} />
            <SelectField
              label="Vendor"
              value={vendorId}
              onChange={setVendorId}
              style={styles.half}
              placeholder="Select vendor"
              options={[
                { label: 'Select vendor', value: null },
                ...vendors.map((v) => ({ label: v.name, value: v.id })),
              ]}
            />
          </View>

          {/* ── Attendance Hours ── */}
          <Text style={styles.sectionLabel}>Attendance Hours</Text>
          <Text style={styles.hintMuted}>Use 12h or 24h — e.g. 9:00 AM or 17:30</Text>
          <View style={styles.grid3}>
            <AppTextField
              label="Start time"
              value={startTime}
              onChangeText={setStartTime}
              style={styles.third}
              placeholder="9:00 AM"
            />
            <AppTextField
              label="Close time"
              value={endTime}
              onChangeText={setEndTime}
              style={styles.third}
              placeholder="5:30 PM"
            />
            <View style={styles.third}>
              <Text style={styles.fieldLabel}>Total hrs</Text>
              <View style={styles.hrsPill}>
                <MaterialCommunityIcons name="clock-outline" size={15} color="#2563eb" />
                <Text style={styles.hrsValue}>{totalHrs || '—'}</Text>
              </View>
            </View>
          </View>

          {/* ── Save ── */}
          <GradientButton
            title={saving ? 'Saving…' : routeLabourId ? 'Update Labour' : 'Save Labour'}
            disabled={saving}
            onPress={async () => {
              if (!phone.trim() || name.trim().length < 2) {
                Alert.alert('Missing info', 'Enter phone and name.');
                return;
              }
              setSaving(true);
              try {
                const saved = await savePerson();
                // Mark attendance if start/end times provided
                if (saved?.id && (startTime.trim() || endTime.trim())) {
                  try {
                    await markAttendance({
                      labour_id: saved.id,
                      date: joinedDate,
                      start_time: startTime.trim() || null,
                      end_time: endTime.trim() || null,
                    });
                  } catch (attErr) {
                    console.log('[LabourForm] Attendance mark error:', attErr.message);
                    // Non-blocking: don't prevent navigation
                  }
                }
                navigation.goBack();
              } catch (err) {
                console.log('[LabourForm] Save err:', err.message);
                Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to save labour.');
              } finally {
                setSaving(false);
              }
            }}
            left={<MaterialCommunityIcons name="content-save" size={18} color="#fff" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Photo source picker modal ── */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPhotoModal(false)}>
          <View style={styles.photoModalCard}>
            <Text style={styles.photoModalTitle}>Add Photo</Text>

            <Pressable style={styles.photoOption} onPress={openCamera}>
              <View style={styles.photoOptionIcon}>
                <MaterialCommunityIcons name="camera" size={26} color="#2563eb" />
              </View>
              <View style={styles.photoOptionMeta}>
                <Text style={styles.photoOptionTitle}>Take Photo</Text>
                <Text style={styles.photoOptionDesc}>Use camera to capture now</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#b0bec5" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.photoOption} onPress={openGallery}>
              <View style={[styles.photoOptionIcon, { backgroundColor: '#f0fdf4' }]}>
                <MaterialCommunityIcons name="image-multiple" size={26} color="#16a34a" />
              </View>
              <View style={styles.photoOptionMeta}>
                <Text style={styles.photoOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.photoOptionDesc}>Pick an existing photo</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#b0bec5" />
            </Pressable>

            {photoUri && (
              <>
                <View style={styles.divider} />
                <Pressable
                  style={styles.photoOption}
                  onPress={() => { setPhotoUri(null); setShowPhotoModal(false); }}
                >
                  <View style={[styles.photoOptionIcon, { backgroundColor: '#fef2f2' }]}>
                    <MaterialCommunityIcons name="delete-outline" size={26} color="#ef4444" />
                  </View>
                  <View style={styles.photoOptionMeta}>
                    <Text style={[styles.photoOptionTitle, { color: '#ef4444' }]}>Remove Photo</Text>
                    <Text style={styles.photoOptionDesc}>Clear current photo</Text>
                  </View>
                </Pressable>
              </>
            )}

            <Pressable style={styles.cancelBtn} onPress={() => setShowPhotoModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    color: '#1a2f4e',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    paddingLeft: 8,
  },
  fieldLabel: { color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 6 },

  rowPhone: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 8 },
  inputFlex: { flex: 1 },
  input: { marginBottom: 12 },
  lookupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14, marginBottom: 12,
    backgroundColor: 'rgba(59,144,232,0.10)',
    borderWidth: 1, borderColor: 'rgba(59,144,232,0.28)',
  },
  lookupText: { color: '#215da1', fontWeight: '900', fontSize: 14 },

  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  hintGreen: { color: '#137333', fontWeight: '700', fontSize: 13 },
  hintMuted: { color: colors.mutedText, marginBottom: 12, fontSize: 13, lineHeight: 18 },

  photoRow: { flexDirection: 'row', gap: 14, marginBottom: 14, alignItems: 'center' },
  photoCircle: {
    width: 86,
    height: 86,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf3ff',
    overflow: 'hidden',
  },
  photoIcon: { width: 86, height: 86 },
  photoPlaceholder: { alignItems: 'center', gap: 4 },
  photoHint: { color: '#4A90E2', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  grid2: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 4 },
  grid3: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 16 },
  half: { flex: 1 },
  third: { flex: 1 },
  segment: { marginBottom: 14 },

  hrsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 11,
    justifyContent: 'center',
  },
  hrsValue: { color: '#1d4ed8', fontWeight: '900', fontSize: 15 },

  /* Photo modal */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'flex-end',
  },
  photoModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  photoModalTitle: { fontSize: 18, fontWeight: '900', color: '#1a2f4e', marginBottom: 16 },
  photoOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12,
  },
  photoOptionIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  photoOptionMeta: { flex: 1 },
  photoOptionTitle: { fontSize: 15, fontWeight: '800', color: '#1a2f4e' },
  photoOptionDesc: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  cancelBtn: {
    marginTop: 16, alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
  },
  cancelText: { color: '#ef4444', fontWeight: '800', fontSize: 15 },
});