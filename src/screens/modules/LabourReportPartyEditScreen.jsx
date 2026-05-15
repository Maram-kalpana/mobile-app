import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';

import { AppTextField } from '../../components/AppTextField';
import { DatePickerField } from '../../components/DatePickerField';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { getLabours, addWork, updateWork } from '../../api/labourApi';
import { getTodayAttendance } from '../../api/attendanceApi';
import {
  labourBelongsToProject,
  labourRowWithInferredProject,
  attendanceBelongsToProject,
  sameScopedProject,
} from '../../utils/labourProjectScope';

function labourVendorFromApi(item) {
  const nested = item?.vendor;
  const id =
    item?.vendor_id ??
    (nested && typeof nested === 'object' ? nested.id : null) ??
    null;
  const nameFromApi =
    (nested && typeof nested === 'object' && nested.name) ||
    item?.vendor_name ||
    '';
  return {
    vendorId: id != null && id !== '' ? id : null,
    vendorName: nameFromApi ? String(nameFromApi) : null,
  };
}

function attendanceMatchesDate(record, selectedDate) {
  const d =
    record?.date ||
    record?.attendance_date ||
    record?.day ||
    record?.marked_date;
  if (!d) return true;
  return String(d).slice(0, 10) === selectedDate;
}

/**
 * View: table + checkboxes + Add Work → bottom sheet (work / measurement).
 * Edit: Material-style form — date, search, reason, labour list, work done, measurement, Save.
 */
export function LabourReportPartyEditScreen({ route, navigation }) {
  const {
    projectId: routeProjectId,
    vendorId: routeVendorId,
    vendorName: routeVendorName,
    date: routeDate,
    mode: routeMode,
    entryId: routeEntryId,
  } = route.params || {};
  const { vendors, dateKey } =
    useApp();

  const isEditMode = routeMode === 'edit';
  const vendorKeyStr =
    routeVendorId === 'no_vendor' || routeVendorId == null
      ? 'no_vendor'
      : String(routeVendorId);

  const today = dateKey();
  const [selectedDate, setSelectedDate] = useState(routeDate || today);
  const [search, setSearch] = useState('');
  const [editReasonInput, setEditReasonInput] = useState('');
  const [rawLabours, setRawLabours] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [pickedForWork, setPickedForWork] = useState({});
  const [showWorkSheet, setShowWorkSheet] = useState(false);
  const [workDoneInput, setWorkDoneInput] = useState('');
  const [measurementInput, setMeasurementInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr =
        typeof selectedDate === 'string'
          ? selectedDate
          : new Date(selectedDate).toISOString().split('T')[0];
      const q =
        routeProjectId != null && routeProjectId !== '' ? { project_id: routeProjectId } : {};
      const [labourRes, attendanceRes] = await Promise.all([
        getLabours({ ...q, date: dateStr }),
        getTodayAttendance({ date: dateStr, ...q }),
      ]);
      const rawList = labourRes?.data?.data ?? labourRes?.data ?? [];
      const raw = Array.isArray(rawList) ? rawList : [];
      const scoped = raw
        .map((item) => labourRowWithInferredProject(item, routeProjectId))
        .filter((item) => labourBelongsToProject(item, routeProjectId));
      setRawLabours(scoped);
      const attList = attendanceRes?.data?.data ?? attendanceRes?.data ?? [];
      const att = Array.isArray(attList) ? attList : [];
      const allowedIds = new Set(scoped.map((l) => Number(l.id)));
      setAttendance(
        att.filter(
          (a) =>
            attendanceBelongsToProject(a, routeProjectId) &&
            allowedIds.has(Number(a?.labour_id)),
        ),
      );
    } catch (err) {
      console.log('Party screen fetch error:', err.response?.data || err.message);
      setRawLabours([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, routeProjectId]);

  // Re-fetch when date changes OR screen regains focus (e.g. after attendance changes)
  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [fetchData, navigation]);

  const formattedLabours = useMemo(() => {
    return (rawLabours || []).map((item) => {
      const { vendorId, vendorName } = labourVendorFromApi(item);
      return {
        id: item.id,
        name: item.full_name,
        age: item.age,
        gender: item.gender,
        phone: item.phone,
        vendorId,
        vendorName,
        photoUri: item.profile_pic,
        dailyWage: item.daily_wage || 0,
      };
    });
  }, [rawLabours]);

  const presentLabourIds = useMemo(() => {
    return (attendance || [])
      .filter((a) => a?.is_present == 1 && attendanceMatchesDate(a, selectedDate))
      .map((a) => Number(a?.labour_id));
  }, [attendance, selectedDate]);

  const partyLabours = useMemo(() => {
    return formattedLabours.filter((l) => {
      if (!presentLabourIds.includes(Number(l.id))) return false;
      if (routeVendorId === 'no_vendor' || routeVendorId == null) {
        return l.vendorId == null || l.vendorId === '';
      }
      return String(l.vendorId) === String(routeVendorId);
    });
  }, [formattedLabours, presentLabourIds, routeVendorId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return partyLabours;
    const q = search.toLowerCase();
    return partyLabours.filter((p) => {
      const ctxVendorName =
        vendors.find((v) => Number(v.id) === Number(p.vendorId))?.name || '';
      return (
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        (p.vendorName || '').toLowerCase().includes(q) ||
        ctxVendorName.toLowerCase().includes(q)
      );
    });
  }, [partyLabours, search, vendors]);

  const displayVendorTitle =
    routeVendorName ||
    vendors.find((v) => String(v.id) === String(routeVendorId))?.name ||
    'Party';

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit labour' : displayVendorTitle,
    });
  }, [navigation, displayVendorTitle, isEditMode]);

  /* Pre-fill edit form from API work-details */
  useEffect(() => {
    if (!isEditMode || !routeEntryId) return;
    (async () => {
      try {
        const { getWorkDetails } = await import('../../api/labourApi');
        const res = await getWorkDetails(routeEntryId);
        const data = res?.data?.data ?? res?.data ?? {};
        setWorkDoneInput(data.work_done ?? data.workDone ?? '');
        setMeasurementInput(data.measurement ?? data.measure ?? '');
        setEditReasonInput(data.edit_reason ?? data.editReason ?? '');
        const ids = data.labour_ids ?? data.labourIds ?? [];
        const p = {};
        (Array.isArray(ids) ? ids : []).forEach((id) => {
          p[String(id)] = true;
        });
        setPickedForWork(p);
      } catch (err) {
        console.log('Work details fetch error:', err?.response?.data || err.message);
        setWorkDoneInput('');
        setMeasurementInput('');
        setEditReasonInput('');
        setPickedForWork({});
      }
    })();
  }, [isEditMode, routeEntryId]);

  const togglePickForWork = (labourId) => {
    const key = String(labourId);
    setPickedForWork((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openAddWorkSheet = () => {
    const count = partyLabours.filter((l) => pickedForWork[String(l.id)]).length;
    if (!count) {
      Alert.alert('Select labour', 'Tick the checkbox for one or more workers, then tap Add Work.');
      return;
    }
    setWorkDoneInput('');
    setMeasurementInput('');
    setShowWorkSheet(true);
  };

  const saveWorkEntries = async () => {
  const selected = partyLabours.filter((l) => pickedForWork[String(l.id)]);

  console.log("SELECTED LABOURS:", selected);

  if (!selected.length) {
    Alert.alert("Error", "No labour selected");
    return;
  }

  const workDone = workDoneInput.trim();
  const measurement = measurementInput.trim();

  const labourIds = selected.map((l) => Number(l.id));
  const names = selected.map((l) => l.name).filter(Boolean);

  const payload = {
    project_id: routeProjectId,
    date:
      typeof selectedDate === 'string'
        ? selectedDate
        : new Date(selectedDate).toISOString().split('T')[0],
    vendor_id:
  vendorKeyStr === 'no_vendor'
    ? null
    : Number(vendorKeyStr),
    work_done: workDone,
    measurement,
    labour_ids: labourIds,
    labour_names: names.join(', '),
  };

  console.log("=================================");
  console.log("ADD WORK PAYLOAD");
  console.log(JSON.stringify(payload, null, 2));
  console.log("=================================");
if (!workDone) {
  Alert.alert("Required", "Please enter work done");
  return;
}

if (!measurement) {
  Alert.alert("Required", "Please enter measurement");
  return;
}
  setSaving(true);

  try {

    const response = await addWork(payload);

    console.log("=================================");
    console.log("ADD WORK SUCCESS");
    console.log(JSON.stringify(response?.data, null, 2));
    console.log("=================================");

    Alert.alert("Success", "Work entry saved.");

    setPickedForWork({});
    setShowWorkSheet(false);
    setWorkDoneInput('');
    setMeasurementInput('');

    navigation.goBack();

  } catch (err) {

    console.log("=================================");
    console.log("ADD WORK ERROR");
    console.log("FULL ERROR:", err);
    console.log("ERROR RESPONSE:", err?.response);
    console.log("ERROR DATA:", err?.response?.data);
    console.log("ERROR MESSAGE:", err?.message);
    console.log("=================================");

    Alert.alert(
      "Error",
      JSON.stringify(
        err?.response?.data || err?.message || "Failed to save work",
        null,
        2
      )
    );

  } finally {
    setSaving(false);
  }
};
  const renderItem = useCallback(
    ({ item, index }) => {
      const isPicked = !!pickedForWork[String(item.id)];
      const g = (item.gender || '').toLowerCase();
      const isFemale = g === 'female';
      return (
        <View style={[styles.row, index % 2 === 0 && styles.rowEven]}>
          <View style={[styles.cell, styles.colSelect]}>
            <Pressable onPress={() => togglePickForWork(item.id)} hitSlop={6}>
              <View style={[styles.pickBox, isPicked && styles.pickBoxOn]}>
                {isPicked && <MaterialCommunityIcons name="check" size={13} color="#fff" />}
              </View>
            </Pressable>
          </View>

          <View style={[styles.cell, styles.colName]}>
            <Text style={styles.name}>{item.name || '—'}</Text>
          </View>

          <View style={[styles.cell, styles.colVendor]}>
            <Text style={styles.cellText}>
              {item.vendorName ||
                vendors.find((v) => Number(v.id) === Number(item.vendorId))?.name ||
                '—'}
            </Text>
          </View>

          <View style={[styles.cell, styles.colGender]}>
            <View style={[styles.genderBadge, isFemale ? styles.genderF : styles.genderM]}>
              <Text style={styles.genderText}>{item.gender?.[0]?.toUpperCase() ?? '—'}</Text>
            </View>
          </View>

          <View style={[styles.cell, styles.colAction, { borderRightWidth: 0 }]}>
            <MaterialCommunityIcons name="account-check" size={16} color="#16a34a" />
          </View>
        </View>
      );
    },
    [pickedForWork, vendors, togglePickForWork]
  );

  /* ─── Edit: Material entry–style form (same pattern as MaterialFormScreen) ─── */
  if (isEditMode) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.pill}>
              <Text style={styles.pillText}>{displayVendorTitle}</Text>
            </View>

            <Text style={styles.formSectionLabel}>Date</Text>
            <DatePickerField
              label={null}
              value={selectedDate}
              onChange={setSelectedDate}
              style={styles.formFieldGap}
            />

            <Text style={styles.formSectionLabel}>Search labour</Text>
            <View style={styles.formSearchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedText} />
              <TextInput
                style={styles.formSearchInput}
                placeholder="Search by name or phone"
                placeholderTextColor={colors.mutedText}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.mutedText} />
                </Pressable>
              )}
            </View>

            <Text style={styles.formSectionLabel}>Reason for editing</Text>
            <AppTextField
              label={null}
              value={editReasonInput}
              onChangeText={setEditReasonInput}
              placeholder="Enter reason for editing"
              multiline
              style={styles.formFieldGap}
            />

            <Text style={styles.formSectionLabel}>Select labour</Text>
            <ScrollView
              style={styles.formLabourCard}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <Text style={styles.formLabourHint}>Loading…</Text>
              ) : filtered.length === 0 ? (
                <Text style={styles.formLabourHint}>No present workers for this date.</Text>
              ) : (
                filtered.map((p) => {
                  const picked = !!pickedForWork[String(p.id)];
                  return (
                    <Pressable
                      key={String(p.id)}
                      style={[styles.formLabourRow, picked && styles.formLabourRowOn]}
                      onPress={() => togglePickForWork(p.id)}
                    >
                      <View style={[styles.formPick, picked && styles.formPickOn]}>
                        {picked && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                      </View>
                      <View style={styles.formLabourMeta}>
                        <Text style={styles.formLabourName}>{p.name || '—'}</Text>
                        {!!p.phone && <Text style={styles.formLabourPhone}>{p.phone}</Text>}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <AppTextField
              label="Work done"
              value={workDoneInput}
              onChangeText={setWorkDoneInput}
              placeholder="Describe work completed"
              multiline
            />
            <AppTextField
              label="Measurement"
              value={measurementInput}
              onChangeText={setMeasurementInput}
              placeholder="e.g. sq.ft, running ft"
            />

          <GradientButton
  title="Save"
  onPress={saveWorkEntries}
              colors={['#2f86de', '#62b6ff']}
              left={<MaterialCommunityIcons name="content-save" size={18} color="#fff" />}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  /* ─── View: table + bottom sheet ─── */
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <FlatList
          key={selectedDate}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          extraData={`${JSON.stringify(pickedForWork)}-${filtered.length}-${selectedDate}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <>
              <View style={styles.header}>
                <Text style={styles.h1}>{displayVendorTitle}</Text>
                <Text style={styles.sub}>
                  Select workers with the checkbox, tap Add Work, then enter work done and measurement.
                  Data appears on the daily report card.
                </Text>
              </View>

              <View style={styles.controlRow}>
                <View style={styles.dateWrap}>
                  <DatePickerField label="Date" value={selectedDate} onChange={setSelectedDate} />
                </View>
                <View style={styles.searchContainer}>
                  <Text style={styles.label}>Search</Text>
                  <View style={styles.searchWrap}>
                    <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedText} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search..."
                      placeholderTextColor={colors.mutedText}
                      value={search}
                      onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                      <Pressable onPress={() => setSearch('')} hitSlop={8}>
                        <MaterialCommunityIcons name="close-circle" size={16} color={colors.mutedText} />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.actionContainer}>
                <View style={styles.fakeLabel} />
                <View style={styles.actionRow}>
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="account-check" size={15} color="#137333" />
                    <Text style={styles.badgeText}>
                      Present: {partyLabours.length} / {partyLabours.length}
                    </Text>
                  </View>
                  <Pressable style={styles.addBtn} onPress={openAddWorkSheet}>
                    <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Add Work</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Details</Text>

              <View style={styles.tableHeader}>
                <View style={[styles.th, styles.colSelect]} />
                <Text style={[styles.th, styles.colName]}>Name</Text>
                <Text style={[styles.th, styles.colVendor]}>Vendor</Text>
                <Text style={[styles.th, styles.colGender]}>G</Text>
                <View style={[styles.th, styles.colAction, { borderRightWidth: 0 }]} />
              </View>
            </>
          )}
          ListEmptyComponent={(
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={40} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {loading ? 'Loading…' : 'No present workers'}
              </Text>
              <Text style={styles.emptyText}>
                {loading
                  ? 'Fetching attendance for this date.'
                  : 'No one from this party is marked present for the selected date.'}
              </Text>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showWorkSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkSheet(false)}
      >
        <View style={styles.sheetRoot}>
          <TouchableWithoutFeedback onPress={() => setShowWorkSheet(false)}>
            <View style={styles.sheetDim} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetKb}
          >
            <View style={styles.sheetCard}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Add work</Text>
              <Text style={styles.sheetHint}>
                {partyLabours.filter((l) => pickedForWork[String(l.id)]).length} worker(s) selected
              </Text>
              <AppTextField
                label="Work done"
                value={workDoneInput}
                onChangeText={setWorkDoneInput}
                placeholder="Describe work completed"
                multiline
              />
              <AppTextField
                label="Measurement"
                value={measurementInput}
                onChangeText={setMeasurementInput}
                placeholder="e.g. sq.ft, running ft"
              />
              <Pressable style={styles.saveBtn} onPress={saveWorkEntries}>
                <MaterialCommunityIcons name="content-save" size={17} color="#fff" />
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
              <Pressable onPress={() => setShowWorkSheet(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  formScroll: { padding: 16, paddingBottom: 36 },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(45,127,218,0.10)',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(45,127,218,0.22)',
  },
  pillText: { color: '#1d78d8', fontWeight: '900', fontSize: 12 },
  formSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
    marginBottom: 6,
  },
  formFieldGap: { marginBottom: 10 },
  formSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 14,
  },
  formSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    paddingVertical: 0,
  },
  formLabourCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    overflow: 'hidden',
    maxHeight: 280,
  },
  formLabourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  formLabourRowOn: { backgroundColor: '#eff6ff' },
  formPick: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  formPickOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  formLabourMeta: { flex: 1 },
  formLabourName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  formLabourPhone: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  formLabourHint: { padding: 16, color: colors.mutedText, fontSize: 13 },

  wrap: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  h1: { fontSize: 22, fontWeight: '900', color: '#1a2f4e' },
  sub: { marginTop: 3, color: colors.mutedText, fontSize: 12 },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  dateWrap: { flex: 1, justifyContent: 'center', marginRight: 10 },
  searchContainer: { flex: 1 },
  label: { fontSize: 12, color: colors.mutedText, marginBottom: 6 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    height: '100%',
    paddingVertical: 0,
    marginLeft: 6,
  },
  actionContainer: { marginHorizontal: 16, marginBottom: 8 },
  fakeLabel: { height: 20 },
  actionRow: { flexDirection: 'row' },
  badge: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f4ec',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b7dfca',
    marginRight: 10,
  },
  badgeText: { color: '#137333', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  addBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, marginLeft: 6 },
  sectionLabel: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a5f',
  },
  list: { paddingBottom: 30, marginHorizontal: 12 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingVertical: 9,
    overflow: 'hidden',
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e3a5f',
    textAlign: 'center',
    paddingHorizontal: 3,
    borderRightWidth: 1,
    borderRightColor: '#93c5fd',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#e2eaf4',
    borderLeftWidth: 1,
    borderLeftColor: '#e2eaf4',
    borderRightWidth: 1,
    borderRightColor: '#e2eaf4',
    backgroundColor: '#fff',
  },
  rowEven: { backgroundColor: '#f8fbff' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#e2eaf4',
  },
  cellText: { fontSize: 12, color: '#374151', textAlign: 'center', fontWeight: '500' },
  colSelect: { width: 40 },
  colName: { flex: 1.65, alignItems: 'flex-start', paddingLeft: 6 },
  colVendor: { width: 82 },
  colGender: { width: 36 },
  colAction: { width: 44 },
  pickBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBoxOn: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  name: { fontSize: 13, fontWeight: '700', color: '#1f2f4b' },
  genderBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  genderM: { backgroundColor: '#dbeafe' },
  genderF: { backgroundColor: '#fce7f3' },
  genderText: { fontSize: 11, fontWeight: '800', color: '#1e3a5f' },
  empty: { alignItems: 'center', padding: 36 },
  emptyTitle: { marginTop: 10, fontWeight: '900', fontSize: 16, color: colors.text },
  emptyText: { marginTop: 6, color: colors.mutedText, textAlign: 'center', fontSize: 13 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  sheetKb: { width: '100%' },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  sheetHint: { fontSize: 12, color: colors.mutedText, marginBottom: 14, marginTop: 4 },
  saveBtn: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 8 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: '#ef4444', fontWeight: '800', fontSize: 14 },
});
