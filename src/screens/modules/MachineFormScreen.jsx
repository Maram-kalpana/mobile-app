import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppTextField } from '../../components/AppTextField';
import { DatePickerField } from '../../components/DatePickerField';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import { getMachineById, addMachine, updateMachine, deleteMachine, getMachines } from '../../api/machineApi';


function parseTimeToMinutes(t) {
  const s = String(t || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/** MySQL TIME column expects HH:mm:ss (24h). */
function toMysqlTime(raw) {
  const mins = parseTimeToMinutes(raw);
  if (mins == null) return String(raw || '').trim();
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function diffHours(start, end) {
  const a = parseTimeToMinutes(start);
  const b = parseTimeToMinutes(end);
  if (a == null || b == null || b < a) return '';
  const hrs = (b - a) / 60;
  return hrs.toFixed(1);
}

export function MachineFormScreen({ route, navigation }) {
  const { projectId, entryId, workDate: routeWorkDate } = route.params || {};
  const { vendors, fetchVendors, dateKey, projects } = useApp();
  const today = dateKey();
  const [workDate, setWorkDate] = useState(
    routeWorkDate && String(routeWorkDate).length >= 8 ? String(routeWorkDate).slice(0, 10) : today
  );

  const projectTitle =
    (projects || []).find((p) => String(p.id) === String(projectId))?.name || 'Project';

  const [vendorId, setVendorId] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [totalHrs, setTotalHrs] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [machines, setMachines] = useState([]);
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    if (!entryId) return;
    fetchMachine();
  }, [entryId]);
  

  const fetchMachine = async () => {
    try {
      const res = await getMachineById(entryId);
      console.log('MACHINE FETCH RAW:', JSON.stringify(res?.data, null, 2));
      // Handle multiple API response shapes
      const body = res?.data;
      const data =
        body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
          ? body.data
          : body?.machine
          ? body.machine
          : body?.entry
          ? body.entry
          : body?.record
          ? body.record
          : typeof body === 'object' && body !== null && !Array.isArray(body) && !body?.data
          ? body
          : {};
      console.log('MACHINE PARSED DATA:', JSON.stringify(data, null, 2));
      // Normalise to Number so they match the SelectField option values
      const rawVendorId = data.vendor_id ?? data.vendorId;
      setVendorId(rawVendorId != null ? Number(rawVendorId) : null);
      setStartTime(data.start_time ?? data.startTime ?? '');
      setEndTime(data.end_time ?? data.endTime ?? '');
      setTotalHrs(String(data.total_hours ?? data.totalHours ?? data.total_hrs ?? ''));
      setWorkDone(data.work_done ?? data.workDone ?? '');
      const rawEquipId = data.equipment_id ?? data.equipmentId;
      setSelectedMachineId(rawEquipId != null ? Number(rawEquipId) : null);
      // Also prefill the work date from the API response if available
      const apiDate = data.date ?? data.entry_date ?? data.work_date ?? null;
      if (apiDate) {
        const dStr = typeof apiDate === 'string' ? apiDate.slice(0, 10) : String(apiDate).slice(0, 10);
        if (dStr.length === 10) setWorkDate(dStr);
      }
    } catch (err) {
      console.log('Fetch machine error', err?.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      fetchVendors?.();
    }, [])
  );
  
  const fetchDropdownData = async () => {
    try {
      const machineRes = await getMachines();
      setMachines(machineRes?.data?.data || []);
    } catch (err) {
      console.log('Dropdown fetch error', err);
    }
  };
  // Auto-calculate whenever start or end changes
  useEffect(() => {
    const auto = diffHours(startTime, endTime);
    if (auto) setTotalHrs(auto);
  }, [startTime, endTime]);

  

  const onSave = async () => {
    if (!selectedMachineId) {
      Alert.alert('Missing', 'Please select equipment');
      return;
    }
    if (!projectId) {
      Alert.alert('Missing', 'Project not found');
      return;
    }
    if (entryId && !editReason.trim()) {
      Alert.alert('Required', 'Please enter reason for editing this entry.');
      return;
    }

    const startSql = toMysqlTime(startTime);
    const endSql = toMysqlTime(endTime);
    if (!startSql || !endSql || parseTimeToMinutes(startTime) == null || parseTimeToMinutes(endTime) == null) {
      Alert.alert('Invalid time', 'Use times like 9:00 AM or 17:30 so they can be saved correctly.');
      return;
    }

    const payload = {
      project_id: projectId,
      equipment_id: selectedMachineId,
      vendor_id: vendorId,
      start_time: startSql,
      end_time: endSql,
      total_hours: totalHrs,
      work_done: workDone,
      date: workDate,
      ...(entryId ? { remarks: editReason.trim() } : {}),
    };

    try {
      if (entryId) {
        await updateMachine(entryId, payload);
        Alert.alert('Success', 'Updated successfully');
      } else {
        await addMachine(payload);
        Alert.alert('Success', 'Added successfully');
      }
      navigation.goBack();
    } catch (err) {
      console.log('Save error', err?.response?.data || err.message);
      Alert.alert('Error', 'Failed to save');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete', 'Remove this machinery row?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMachine(entryId);
            navigation.goBack();
          } catch (err) {
            console.log('Delete error', err);
          }
        },
      },
    ]);
  };

  const hoursValid = !!diffHours(startTime, endTime);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.projectPill}>
            <MaterialCommunityIcons name="office-building-outline" size={16} color="#1d78d8" />
            <Text style={styles.projectPillText}>{projectTitle}</Text>
          </View>

          {/* ── Date ── */}
          <DatePickerField
            label="Date"
            value={workDate}
            onChange={setWorkDate}
            style={{ marginBottom: 16 }}
          />

          <Text style={styles.sectionLabel}>Equipment</Text>
          <SelectField
            label="Equipment"
            value={selectedMachineId}
            onChange={setSelectedMachineId}
            placeholder="Select equipment"
            options={[
              { label: 'Select equipment', value: null },
              ...machines.map((m) => ({
                label: m.name,
                value: Number(m.id),
              })),
            ]}
          />

          {/* ── Vendor ── */}
          <Text style={styles.sectionLabel}>Vendor</Text>
          <SelectField
            label="Vendor"
            value={vendorId}
            onChange={setVendorId}
            placeholder="Select vendor"
            options={[
              { label: 'Select vendor', value: null },
              ...vendors.map((v) => ({
                label: v.name,
                value: Number(v.id),
              })),
            ]}
          />

          {/* ── Time ── */}
          <Text style={styles.sectionLabel}>Working Hours</Text>
          <Text style={styles.hint}>Use 12h or 24h — e.g. 9:00 AM or 17:30</Text>

          <View style={styles.timeRow}>
            <AppTextField
              label="Start time"
              value={startTime}
              onChangeText={setStartTime}
              style={styles.timeField}
              placeholder="9:00 AM"
            />
            <View style={styles.timeArrow}>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.mutedText} />
            </View>
            <AppTextField
              label="Close time"
              value={endTime}
              onChangeText={setEndTime}
              style={styles.timeField}
              placeholder="5:30 PM"
            />
          </View>

          {/* Total hours — auto display */}
          <View style={styles.totalCard}>
            <View style={styles.totalLeft}>
              <MaterialCommunityIcons name="clock-check-outline" size={22} color="#2563eb" />
              <View>
                <Text style={styles.totalLabel}>Total Hours</Text>
                <Text style={styles.totalSub}>Auto-calculated from times above</Text>
              </View>
            </View>
            <View style={[styles.totalBadge, hoursValid && styles.totalBadgeActive]}>
              <Text style={[styles.totalNum, hoursValid && styles.totalNumActive]}>
                {totalHrs || '—'}
              </Text>
              {hoursValid && <Text style={styles.totalUnit}>hrs</Text>}
            </View>
          </View>

          {/* Manual override */}
          <Pressable onPress={() => {
            const auto = diffHours(startTime, endTime);
            setTotalHrs(auto || totalHrs);
          }} style={styles.recalcBtn}>
            <MaterialCommunityIcons name="refresh" size={14} color="#2563eb" />
            <Text style={styles.recalcText}>Recalculate</Text>
          </Pressable>

          {/* ── Work done ── */}
          <Text style={styles.sectionLabel}>Work Details</Text>
          <AppTextField
            label="Work done / measurements"
            value={workDone}
            onChangeText={setWorkDone}
            multiline
            numberOfLines={4}
            placeholder="Enter work details..."
          />

          {entryId ? (
            <>
              <Text style={styles.sectionLabel}>Edit audit</Text>
              <AppTextField
                label="Reason for editing"
                value={editReason}
                onChangeText={setEditReason}
                multiline
                numberOfLines={3}
                placeholder="Required — why are you changing this row?"
              />
            </>
          ) : null}

          {/* ── Save ── */}
          <GradientButton
            title={entryId ? 'Update Row' : 'Save Row'}
            onPress={onSave}
            colors={['#2f86de', '#62b6ff']}
            left={<MaterialCommunityIcons name="content-save" size={18} color="#fff" />}
          />

          {entryId && (
            <Pressable onPress={onDelete} style={styles.delBtn}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
              <Text style={styles.delText}>Delete this entry</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },

  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(45,127,218,0.10)',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(45,127,218,0.22)',
  },
  projectPillText: { color: '#1d78d8', fontWeight: '900', fontSize: 12 },

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
  hint: { color: colors.mutedText, marginBottom: 12, fontSize: 13, lineHeight: 18 },

  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4, marginBottom: 10 },
  optionChip: {
    backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  optionText: { color: '#1e3a5f', fontWeight: '700', fontSize: 12 },

  /* Time row */
  timeRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 8, marginBottom: 14,
  },
  timeField: { flex: 1 },
  timeArrow: {
    paddingBottom: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Total hours card */
  totalCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8faff',
    borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 16, padding: 14, marginBottom: 8,
  },
  totalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalLabel: { fontSize: 14, fontWeight: '800', color: '#1a2f4e' },
  totalSub: { fontSize: 11, color: colors.mutedText, marginTop: 2 },
  totalBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  totalBadgeActive: { backgroundColor: '#2563eb' },
  totalNum: { fontSize: 22, fontWeight: '900', color: '#94a3b8' },
  totalNumActive: { color: '#fff' },
  totalUnit: { fontSize: 13, fontWeight: '700', color: '#bfdbfe' },

  recalcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#eff6ff', borderRadius: 10,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  recalcText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },

  delBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, justifyContent: 'center',
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: '#fecaca',
  },
  delText: { color: '#ef4444', fontWeight: '800', fontSize: 14 },
});