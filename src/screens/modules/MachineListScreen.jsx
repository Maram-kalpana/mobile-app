import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, Modal, Alert } from 'react-native';

import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { DatePickerField } from '../../components/DatePickerField';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { deleteMachine, getEquipmentEntries, getMachines } from '../../api/machineApi';

function listDateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return new Date(d).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function MachineListScreen({ route, navigation }) {
  const { projectId } = route.params;


  const { dateKey } = useApp(); // ✅ inside component
  const today = dateKey();

  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const [machines, setMachines] = useState([]);
  
  const [machineryList, setMachineryList] = useState([]);
  const [showReasonModal, setShowReasonModal] = useState(false);
const [reason, setReason] = useState('');
const [actionType, setActionType] = useState(null); // 'edit' | 'delete'
const [selectedItem, setSelectedItem] = useState(null);
  const formatTime = (t) => t?.slice(0, 5);

  const fetchMachinery = async () => {
    try {
      const res = await getMachines();
      setMachineryList(res.data.data || []);
    } catch (err) {
      console.log('Machinery fetch error', err);
    }
  };

  useEffect(() => {
    fetchMachinery();
  }, []);

  /** Extract array of entries from an unknown API response shape. */
  function extractEntries(resp) {
    if (!resp) return null;
    // Walk the most common Laravel / API response shapes
    const body = resp?.data; // Axios strips one layer
    if (!body) return null;
    // 1) Direct array: res.data = [...]
    if (Array.isArray(body)) return body;
    // 2) { data: [...] }
    if (Array.isArray(body.data)) return body.data;
    // 3) { data: { data: [...] } }  (paginated wrapper)
    if (body.data && Array.isArray(body.data.data)) return body.data.data;
    // 4) { entries: [...] }  or  { results: [...] }  or  { records: [...] }
    for (const key of ['entries', 'results', 'records', 'items', 'list', 'machines']) {
      if (Array.isArray(body[key])) return body[key];
      if (body.data && Array.isArray(body.data[key])) return body.data[key];
    }
    // 5) First array-valued property found in the response body
    for (const val of Object.values(body)) {
      if (Array.isArray(val)) return val;
    }
    if (body.data) {
      for (const val of Object.values(body.data)) {
        if (Array.isArray(val)) return val;
      }
    }
    return null; // nothing found
  }

  const loadMachines = useCallback(async () => {
    try {
      const dateStr = listDateStr(selectedDate);
      console.log('MACHINE FETCH: projectId=%s date=%s', projectId, dateStr);
      // Try both `date` and `entry_date` param names in case API uses a different field
      const res = await getEquipmentEntries({
        project_id: projectId,
        date: dateStr,
        entry_date: dateStr,
      });

      // Log response structure for debugging
      const body = res?.data;
      console.log('MACHINE RESPONSE TYPE:', typeof body, Array.isArray(body) ? 'array' : typeof body);
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        console.log('MACHINE RESPONSE KEYS:', Object.keys(body));
        if (body.data && typeof body.data === 'object') {
          console.log('MACHINE RESPONSE data TYPE:', Array.isArray(body.data) ? 'array' : typeof body.data);
          if (!Array.isArray(body.data)) console.log('MACHINE RESPONSE data KEYS:', Object.keys(body.data));
        }
      }

      const entries = extractEntries(res);
      const raw = Array.isArray(entries) ? entries : [];

      if (raw.length === 0) {
        console.log('MACHINE: 0 entries from API – trying fallback fetch without date filter');
        // Fallback: try fetching without date to see if API supports date param
        try {
          const resFallback = await getEquipmentEntries({ project_id: projectId });
          const fbBody = resFallback?.data;
          console.log('MACHINE FALLBACK TYPE:', typeof fbBody, Array.isArray(fbBody) ? 'array' : typeof fbBody);
          if (fbBody && typeof fbBody === 'object' && !Array.isArray(fbBody)) {
            console.log('MACHINE FALLBACK KEYS:', Object.keys(fbBody));
          }
          const fbEntries = extractEntries(resFallback);
          if (Array.isArray(fbEntries) && fbEntries.length > 0) {
            console.log('MACHINE: fallback returned %d entries (date filter may be wrong)', fbEntries.length);
            console.log('MACHINE FB[0]:', JSON.stringify(fbEntries[0]));
            raw.push(...fbEntries);
          }
        } catch (_) {
          // ignore fallback errors
        }
      }

      // Log the first 2 rows to inspect response shape
      if (raw.length > 0) {
        console.log("MACHINE RAW[0]:", JSON.stringify(raw[0]));
        console.log("MACHINE RAW[1]:", JSON.stringify(raw[1]));
      }

      console.log("CURRENT PROJECT ID:", projectId);

raw.forEach((m) => {
  console.log("MACHINE ROW:", {
    id: m.id,
    project_id: m.project_id,
    project: m.project,
    equipment: m.equipment?.name,
  });
});

const scoped = raw.filter((m) => {
  const pid = m.project_id ?? m.project?.id;

  console.log("FILTER CHECK:", {
    rowProjectId: pid,
    currentProjectId: projectId,
  });

  // if backend doesn't send project_id,
  // assume backend already filtered
  if (pid == null || pid === '') {
    return true;
  }

  return String(pid) === String(projectId);
});
      console.log("Machines:", scoped.length, "/", raw.length);
      setMachines(scoped);
    } catch (err) {
      console.log('Machine fetch error', err?.response?.data || err.message);
      setMachines([]);
    }
  }, [selectedDate, projectId]);

  useEffect(() => {
    loadMachines();
    const sub = navigation.addListener('focus', () => {
      loadMachines();
    });
    return sub;
  }, [navigation, loadMachines]);

  const getMachineName = useCallback((id) => {
    const machine = machineryList.find((m) => Number(m.id) === Number(id));
    return machine?.name || `Equipment #${id}`;
  }, [machineryList]);

  const rows = useMemo(() => {
    if (!search.trim()) return machines;

    const q = search.toLowerCase();
    return machines.filter(
      (m) =>
        String(m.equipment_id || '').includes(q) ||
        (m.work_done || '').toLowerCase().includes(q) ||
        (getMachineName(m.equipment_id) || '').toLowerCase().includes(q)
    );
  }, [machines, search, getMachineName]);

  const handleDeleteReasonSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please enter reason');
      return;
    }
    setShowReasonModal(false);
    if (actionType !== 'delete' || !selectedItem?.id) return;
    try {
      await deleteMachine(selectedItem.id, { reason: reason.trim() });
      loadMachines();
    } catch (err) {
      console.log('Delete error:', err);
      Alert.alert('Error', 'Could not delete this entry.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.wrap}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.h1}>Machinery</Text>
          <Text style={styles.sub}>
            Party / equipment, start / close time, total hours.
          </Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search party / equipment..."
            placeholderTextColor={colors.mutedText}
          />
        </View>

        {/* DATE + ADD */}
        <View style={styles.dateRow}>
          <View style={styles.dateBtnWrap}>
            <DatePickerField
              label={null}
              value={selectedDate}
              onChange={setSelectedDate}
              style={styles.dateFieldInner}
            />
          </View>
          <View style={styles.addBtnWrap}>
            <GradientButton
              title="Add Machine"
              onPress={() =>
                navigation.navigate('MachineForm', {
                  projectId,
                  workDate: listDateStr(selectedDate),
                })
              }
              colors={['#2f86de', '#62b6ff']}
              left={<MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />}
            />
          </View>
        </View>

        {/* LIST */}
        <FlatList
          data={rows}
          keyExtractor={(item, index) =>
            item?.id != null ? String(item.id) : `m-${index}`
          }
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              
              style={styles.card}
            >
              <View style={styles.row}>
  <View style={styles.icon}>
    <MaterialCommunityIcons name="excavator" size={22} color="#2f86de" />
  </View>

  <View style={styles.meta}>
    <Text style={styles.name}>
      {item.equipment?.name || getMachineName(item.equipment_id)}
    </Text>

    <Text style={styles.sub2}>
  {formatTime(item.start_time || item.start)} → {formatTime(item.end_time || item.close_time)} • {item.total_hours} hrs
</Text>

<Text style={styles.sub2}>
  Vendor: {item.vendor?.name || item.vendor || '-'}
</Text>

{!!(item.work_done || item.work_details) && (
  <Text style={styles.work}>
    {item.work_done || item.work_details}
  </Text>
)}
  </View>
  

  <View style={{ flexDirection: 'row', gap: 10 }}>

  {/* EDIT */}
  <Pressable
    onPress={() =>
      navigation.navigate('MachineForm', {
        projectId,
        entryId: item.id,
        workDate: listDateStr(selectedDate),
      })
    }
  >
    <MaterialCommunityIcons name="pencil" size={20} color="#2563eb" />
  </Pressable>

  {/* DELETE */}
  <Pressable
    onPress={() => {
      setSelectedItem(item);
      setActionType('delete');
      setReason('');
      setShowReasonModal(true);
    }}
  >
    <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
  </Pressable>

</View>
</View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="bulldozer" size={36} color="rgba(233,242,242,0.5)" />
              <Text style={styles.emptyTitle}>No machinery logged</Text>
              <Text style={styles.emptyText}>
                Record excavators, mixers, or hired plant for the day.
              </Text>
            </View>
          }
        />
        <Modal visible={showReasonModal} transparent animationType="slide">
  <View style={styles.modalBackdrop}>
    <Pressable style={{ flex: 1 }} onPress={() => setShowReasonModal(false)} />

    <View style={styles.bottomSheet}>
      <Text style={styles.modalTitle}>Reason for delete</Text>

      <TextInput
        style={styles.reasonInput}
        placeholder="Enter reason..."
        value={reason}
        onChangeText={setReason}
        multiline
      />

      <Pressable style={styles.saveBtn} onPress={handleDeleteReasonSubmit}>
        <Text style={styles.saveText}>Continue</Text>
      </Pressable>

      <Pressable onPress={() => setShowReasonModal(false)} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  </View>
</Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  h1: { color: colors.text, fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, color: colors.mutedText, lineHeight: 18 },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateBtnWrap: { flex: 1, marginRight: 12, justifyContent: 'center' },
  dateFieldInner: { marginBottom: 0 },
  addBtnWrap: { flex: 1, justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 120, gap: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(98,182,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '900' },
  sub2: { marginTop: 4, color: colors.mutedText, fontSize: 12 },
  work: { marginTop: 6, color: colors.text, fontSize: 13, lineHeight: 18 },
  empty: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  emptyTitle: { marginTop: 10, color: colors.text, fontWeight: '900', fontSize: 16 },
  emptyText: { marginTop: 6, color: colors.mutedText, textAlign: 'center' },
  reasonInput: {
  width: '100%',
  minHeight: 80,
  borderWidth: 1,
  borderColor: '#d1d5db',
  borderRadius: 12,
  padding: 12,
  fontSize: 14,
  marginBottom: 16,
  textAlignVertical: 'top'
},
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.3)',
  justifyContent: 'flex-end'
},

bottomSheet: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 16,
},

modalTitle: {
  fontSize: 18,
  fontWeight: '900',
  marginBottom: 12
},

saveBtn: {
  backgroundColor: '#2563eb',
  padding: 12,
  borderRadius: 10,
  alignItems: 'center'
},

saveText: {
  color: '#fff',
  fontWeight: '800'
},

cancelBtn: {
  marginTop: 10,
  alignItems: 'center'
},

cancelText: {
  color: '#ef4444',
  fontWeight: '700'
},
});
