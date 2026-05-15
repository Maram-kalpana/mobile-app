import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';

import { AppTextField } from '../../components/AppTextField';
import { DatePickerField } from '../../components/DatePickerField';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { getLabours, getWorkList } from '../../api/labourApi';
import { getTodayAttendance } from '../../api/attendanceApi';
import {
  labourBelongsToProject,
  labourRowWithInferredProject,
  attendanceBelongsToProject,
  sameScopedProject,
} from '../../utils/labourProjectScope';

function labourNamesForWorkLine(line, laboursList) {
  if (line?.labourNames && String(line.labourNames).trim()) return String(line.labourNames).trim();
  const ids = line?.labourIds;
  if (!ids?.length) return '';
  const map = new Map(
    (laboursList || []).map((l) => [Number(l.id), l.full_name || l.name || ''])
  );
  return ids
    .map((id) => map.get(Number(id)))
    .filter(Boolean)
    .join(', ');
}

export function LabourReportFormScreen({ route, navigation }) {
  const { projectId } = route.params || {};
  const { vendors, projects, dateKey } =
    useApp();
  const projectTitle =
    (projects || []).find((p) => String(p.id) === String(projectId))?.name || 'Project';
  const today = dateKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const [labours, setLabours] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [workEntries, setWorkEntries] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);

  const [deleteReasonModal, setDeleteReasonModal] = useState(false);
  const [deleteTargetVendor, setDeleteTargetVendor] = useState(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setFetchLoading(true);
      const dateStr =
        typeof selectedDate === 'string'
          ? selectedDate
          : new Date(selectedDate).toISOString().split('T')[0];
      const q = projectId != null && projectId !== '' ? { project_id: projectId } : {};
      const [labourRes, attRes, workRes] = await Promise.all([
    
        getLabours({ ...q, date: dateStr }),
        getTodayAttendance({ date: dateStr, ...q }),
        getWorkList({ date: dateStr, ...q }).catch(() => null),
      ]);
      console.log("FETCHING REPORT DATA:", {
  project_id: projectId,
  date: dateStr,
});
      const rawList = labourRes?.data?.data ?? labourRes?.data ?? [];
      const rawLabours = Array.isArray(rawList) ? rawList : [];
      const laboursData = rawLabours
        .map((item) => labourRowWithInferredProject(item, projectId))
        .filter((item) => labourBelongsToProject(item, projectId));
      const attList = attRes?.data?.data ?? attRes?.data ?? [];
      const attendanceData = Array.isArray(attList) ? attList : [];
      const allowedIds = new Set(laboursData.map((l) => Number(l.id)));
      const attendanceScoped = attendanceData.filter(
        (a) =>
          attendanceBelongsToProject(a, projectId) && allowedIds.has(Number(a?.labour_id)),
      );
      setLabours(laboursData);
      setAttendance(attendanceScoped);

      // Parse work entries from API response
      const workRaw = workRes?.data?.data ?? workRes?.data ?? [];
      const workList = Array.isArray(workRaw) ? workRaw : [];
      console.log("WORK API RESPONSE:");
console.log(JSON.stringify(workList, null, 2));
   const mapped = [];

workList.forEach((group) => {

  const vendorId =
    group?.vendor_id != null
      ? String(group.vendor_id)
      : 'no_vendor';

  const vendorName =
    group?.vendor_name || '';

  const works = Array.isArray(group?.works)
    ? group.works
    : [];

  const latestWork = works[works.length - 1];

if (latestWork) {

  const labourIds = Array.isArray(latestWork?.labours)
    ? latestWork.labours.map((l) => Number(l.labour_id))
    : [];

  const labourNames =
    latestWork?.labour_names ||
    (Array.isArray(latestWork?.labours)
      ? latestWork.labours
          .map((l) => l.labour_name)
          .filter(Boolean)
          .join(', ')
      : '');

  mapped.push({

    id:
      latestWork?.group_id ||
      latestWork?.id ||
      Date.now() + Math.random(),

    projectId: projectId,

    date:
      latestWork?.date ||
      dateStr,

    vendorId,

    vendorName,

    workDone:
      latestWork?.work_done ||
      '',

    measurement:
      latestWork?.measurement ||
      '',

    labourIds,

    labourNames,

    editReason:
      latestWork?.edit_reason ||
      '',
  });
}
});

console.log("FINAL MAPPED WORK ENTRIES:");
console.log(JSON.stringify(mapped, null, 2));

setWorkEntries(mapped);
      setWorkEntries(mapped);
    } catch (err) {
      console.log('Report fetch error:', err.response?.data || err.message);
      setLabours([]);
      setAttendance([]);
      setWorkEntries([]);
    } finally {
      setFetchLoading(false);
    }
  }, [selectedDate, projectId]);

  useFocusEffect(
  useCallback(() => {
    console.log("REPORT SCREEN FOCUSED");
    fetchData();
  }, [fetchData])
);

useEffect(() => {
  console.log("REPORT DATE CHANGED:", selectedDate);
  fetchData();
}, [selectedDate]);

  const vendorsWithRows = useMemo(() => {
    const presentLabourIds = (attendance || [])
      .filter((a) => {
        if (a?.is_present != 1) return false;
        const d = a?.date || a?.attendance_date || a?.day || a?.marked_date;
        if (!d) return true;
        return String(d).slice(0, 10) === selectedDate;
      })
      .map((a) => Number(a?.labour_id));

    const presentLabours = (labours || []).filter((l) =>
      presentLabourIds.includes(Number(l.id))
    );

    const map = {};
    presentLabours.forEach((p) => {
      const vid = p.vendor_id ?? p.vendor?.id;
      const key = vid != null && vid !== '' ? vid : 'no_vendor';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });

    return Object.entries(map).map(([vendorId, persons], idx) => ({
      id: vendorId,
      slNo: idx + 1,
      vendorName:
        vendorId === 'no_vendor'
          ? 'No Vendor'
          : vendors.find((v) => v.id == vendorId)?.name ||
            persons[0]?.vendor?.name ||
            'Vendor',
      persons,
    }));
  }, [labours, attendance, vendors, selectedDate]);

  const totalPresent = vendorsWithRows.reduce((sum, v) => sum + v.persons.length, 0);

  const workLinesForVendor = (vendorId) =>
    (workEntries || []).filter(
      (e) =>
        sameScopedProject(e.projectId, projectId) &&
        e.date === selectedDate &&
        String(e.vendorId) === String(vendorId),
    );

  const goPartyEdit = (vendorRow, entryId) => {
    navigation.navigate('LabourReportPartyEdit', {
      projectId,
      vendorId: vendorRow.id,
      vendorName: vendorRow.vendorName,
      date: selectedDate,
      mode: 'edit',
      entryId: entryId || undefined,
    });
  };

  const onCardEditPress = (vendorRow) => {
    const lines = workLinesForVendor(vendorRow.id);
    if (!lines.length) {
      Alert.alert('No work saved', 'Add work from View first, then you can edit a work entry.');
      return;
    }
    const last = lines[lines.length - 1];
    goPartyEdit(vendorRow, last.id);
  };

  const openDeleteReasonModal = (vendorRow) => {
    setDeleteTargetVendor(vendorRow);
    setDeleteReasonInput('');
    setDeleteReasonModal(true);
  };

  const confirmDeleteWithReason = () => {
    if (!deleteReasonInput.trim()) {
      Alert.alert('Required', 'Please enter a reason for deletion.');
      return;
    }
    if (!deleteTargetVendor) return;
    // Remove work entries from local state for this vendor + date
    setWorkEntries((prev) =>
      prev.filter(
        (e) =>
          !(e.date === selectedDate && String(e.vendorId) === String(deleteTargetVendor.id)),
      ),
    );
    setDeleteReasonModal(false);
    setDeleteTargetVendor(null);
    setDeleteReasonInput('');
    Alert.alert('Deleted', 'Work log entries for this party on this date were removed.');
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TITLE */}
          <Text style={styles.h1}>Daily Labour Report</Text>
          <Text style={styles.sub}>Date-wise entries and attended labour list</Text>
          {!!projectId && (
            <View style={styles.projectPill}>
              <MaterialCommunityIcons name="office-building-outline" size={14} color="#1d78d8" />
              <Text style={styles.projectPillText}>{projectTitle}</Text>
            </View>
          )}

          {/* Search + Date */}
          <View style={styles.controlRow}>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedText} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search party"
                placeholderTextColor={colors.mutedText}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.mutedText} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.dateWrap}>
              <DatePickerField
                label="Date"
                value={selectedDate}
                onChange={setSelectedDate}
                style={styles.flex1}
              />
            </View>
          </View>

          {/* Summary badges */}
          {totalPresent > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryBadgeLeft}>
                <MaterialCommunityIcons name="account-check" size={15} color="#137333" />
                <Text style={styles.summaryText}>Total Present: {totalPresent}</Text>
              </View>
              <View style={styles.summaryBadgeRight}>
                <MaterialCommunityIcons name="office-building-outline" size={15} color="#1d4ed8" />
                <Text style={[styles.summaryText, { color: '#1d4ed8' }]}>
                  Parties: {vendorsWithRows.length}
                </Text>
              </View>
            </View>
          )}

          {/* Vendor cards */}
          {vendorsWithRows.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No attendance marked</Text>
              <Text style={styles.emptyText}>
                No attendance records found for the selected date.
              </Text>
            </View>
          ) : (
            vendorsWithRows.map((v) => {
              const male = v.persons.filter((p) => p.gender === 'male').length;
              const female = v.persons.filter((p) => p.gender !== 'male').length;
              const total = v.persons.length;
              const workLines = workLinesForVendor(v.id);
              return (
                <View key={v.id} style={styles.vendorCard}>
                  {/* Card header */}
                  <View style={styles.vendorHeader}>
                    <View style={styles.vendorIndex}>
                      <Text style={styles.vendorIndexText}>{v.slNo}</Text>
                    </View>
                    <Text style={styles.vendorName} numberOfLines={1}>
                      {v.vendorName}
                    </Text>
                    <View style={styles.cardActionsRow}>
                      <Pressable
                        style={styles.iconChip}
                        onPress={() =>
                          navigation.navigate('LabourReportPartyEdit', {
                            projectId,
                            vendorId: v.id,
                            vendorName: v.vendorName,
                            date: selectedDate,
                            mode: 'view',
                          })
                        }
                      >
                        <MaterialCommunityIcons name="eye-outline" size={18} color="#2563eb" />
                      </Pressable>
                      <Pressable style={styles.iconChip} onPress={() => onCardEditPress(v)}>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color="#2563eb" />
                      </Pressable>
                      <Pressable
                        style={[styles.iconChip, styles.iconChipDanger]}
                        onPress={() => openDeleteReasonModal(v)}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={18} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, styles.statMale]}>
                      <Text style={styles.statNum}>{male}</Text>
                      <Text style={styles.statLabel}>Male</Text>
                    </View>
                    <View style={[styles.statBox, styles.statFemale]}>
                      <Text style={[styles.statNum, { color: '#9d174d' }]}>{female}</Text>
                      <Text style={[styles.statLabel, { color: '#be185d' }]}>Female</Text>
                    </View>
                    <View style={[styles.statBox, styles.statTotal]}>
                      <Text style={[styles.statNum, { color: '#fff', fontSize: 22 }]}>{total}</Text>
                      <Text style={[styles.statLabel, { color: '#bfdbfe' }]}>Total</Text>
                    </View>
                  </View>

                  {/* Names preview */}
                  {v.persons.length > 0 && (
                    <View style={styles.namesRow}>
                      <MaterialCommunityIcons
                        name="account-multiple-outline"
                        size={13}
                        color={colors.mutedText}
                      />
                      <Text style={styles.namesText} numberOfLines={1}>
                        {(v.persons || [])
                          .map((p) => String(p.full_name || ''))
                          .slice(0, 4)
                          .join(', ')}
                        {v.persons.length > 4 ? ` +${v.persons.length - 4} more` : ''}
                      </Text>
                    </View>
                  )}

                  {workLines.length > 0 && (
                    <View style={styles.workBlockWrap}>
                      {workLines.map((line) => {
                        const labourLine = labourNamesForWorkLine(line, labours);
                        return (
                          <View key={line.id} style={styles.workBlock}>
                            <View style={styles.workBlockTopRow}>
                              <View style={styles.workBlockLabourBlock}>
                                <Text style={styles.labourForWorkLabel}>Labour</Text>
                                <View style={styles.workBlockNamesRow}>
                                  <MaterialCommunityIcons
                                    name="account-multiple-outline"
                                    size={14}
                                    color={colors.mutedText}
                                  />
                                  <Text style={styles.labourForWorkValue} numberOfLines={3}>
                                    {labourLine || '—'}
                                  </Text>
                                </View>
                              </View>
                              <Pressable
                                style={styles.workBlockEditChip}
                                onPress={() => goPartyEdit(v, line.id)}
                                hitSlop={6}
                              >
                                <MaterialCommunityIcons name="pencil-outline" size={16} color="#2563eb" />
                              </Pressable>
                            </View>
                            {!!line.editReason && (
                              <>
                                <Text style={styles.editReasonLabel}>Reason for editing</Text>
                                <Text style={styles.editReasonValue}>{line.editReason}</Text>
                              </>
                            )}
                            <Text style={styles.workDoneLabel}>Work done</Text>
                            <Text style={styles.workDoneValue}>{line.workDone || '—'}</Text>
                            <Text style={styles.measureLabel}>Measurement</Text>
                            <Text style={styles.measureValue}>{line.measurement || '—'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={deleteReasonModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDeleteReasonModal(false);
          setDeleteTargetVendor(null);
          setDeleteReasonInput('');
        }}
      >
        <View style={styles.delSheetRoot}>
          <TouchableWithoutFeedback
            onPress={() => {
              setDeleteReasonModal(false);
              setDeleteTargetVendor(null);
              setDeleteReasonInput('');
            }}
          >
            <View style={styles.delSheetDim} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.delSheetKb}
          >
            <View style={styles.delSheetCard}>
              <View style={styles.delSheetHandle} />
              <Text style={styles.delSheetTitle}>Reason for deletion</Text>
              <Text style={styles.delSheetSub}>
                Removes saved work / measurement for{' '}
                <Text style={styles.delSheetBold}>{deleteTargetVendor?.vendorName}</Text> on{' '}
                {selectedDate}.
              </Text>
              <AppTextField
                label="Reason"
                value={deleteReasonInput}
                onChangeText={setDeleteReasonInput}
                placeholder="Enter reason for deletion"
                multiline
              />
              <Pressable style={styles.delSheetDeleteBtn} onPress={confirmDeleteWithReason}>
                <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" />
                <Text style={styles.delSheetDeleteText}>Delete</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDeleteReasonModal(false);
                  setDeleteTargetVendor(null);
                  setDeleteReasonInput('');
                }}
                style={styles.delSheetCancelBtn}
              >
                <Text style={styles.delSheetCancelText}>Cancel</Text>
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
  scroll: { padding: 16, paddingBottom: 40 },

  h1: { color: '#1a2f4e', fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 3, color: colors.mutedText, marginBottom: 8, fontSize: 12 },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(45,127,218,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(45,127,218,0.22)',
    marginBottom: 14,
  },
  projectPillText: { color: '#1d78d8', fontWeight: '800', fontSize: 12 },

  // control row: search + date
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 10,
    height: 48,
    marginRight: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text, marginLeft: 6 },
  dateWrap: { flex: 1 },
  flex1: { flex: 1 },

  // summary badges
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  summaryBadgeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginRight: 10,
  },
  summaryBadgeRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryText: { color: '#137333', fontWeight: '700', fontSize: 13, marginLeft: 5 },

  // vendor card
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2eaf4',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vendorIndexText: { color: '#1e3a5f', fontWeight: '900', fontSize: 13 },
  vendorName: { flex: 1, color: '#1a2f4e', fontSize: 18, fontWeight: '900' },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginLeft: 6,
  },
  iconChipDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },

  delSheetRoot: { flex: 1, justifyContent: 'flex-end' },
  delSheetDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  delSheetKb: { width: '100%' },
  delSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  delSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 14,
  },
  delSheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  delSheetSub: { fontSize: 13, color: colors.mutedText, marginTop: 6, marginBottom: 14, lineHeight: 18 },
  delSheetBold: { fontWeight: '800', color: '#1e293b' },
  delSheetDeleteBtn: {
    marginTop: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delSheetDeleteText: { color: '#fff', fontWeight: '900', fontSize: 15, marginLeft: 8 },
  delSheetCancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  delSheetCancelText: { color: '#64748b', fontWeight: '800', fontSize: 15 },

  // stats row
  statsRow: { flexDirection: 'row', marginBottom: 10 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statMale: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  statFemale: { backgroundColor: '#fdf2f8', borderWidth: 1, borderColor: '#fbcfe8' },
  statTotal: { backgroundColor: '#2563eb', flex: 1.2, marginRight: 0 },
  statNum: { color: '#1e3a5f', fontWeight: '900', fontSize: 20, lineHeight: 24 },
  statLabel: { color: '#6b8fb5', fontSize: 11, fontWeight: '700', marginTop: 2 },

  // names row
  namesRow: { flexDirection: 'row', alignItems: 'center' },
  namesText: { flex: 1, color: colors.mutedText, fontSize: 12, marginLeft: 6 },

  workBlockWrap: { marginTop: 10, gap: 8 },
  workBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  workBlockTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workBlockLabourBlock: { flex: 1, marginRight: 8 },
  labourForWorkLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  workBlockNamesRow: { flexDirection: 'row', alignItems: 'flex-start' },
  labourForWorkValue: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  workBlockEditChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  editReasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  editReasonValue: {
    fontSize: 12,
    color: '#78350f',
    marginTop: 2,
    fontWeight: '600',
    marginBottom: 6,
  },
  workDoneLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  workDoneValue: { fontSize: 13, color: '#1e293b', marginTop: 2, fontWeight: '600' },
  measureLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: 8 },
  measureValue: { fontSize: 13, color: '#1e293b', marginTop: 2, fontWeight: '600' },

  // empty
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { marginTop: 12, fontWeight: '900', fontSize: 16, color: '#374151' },
  emptyText: { marginTop: 6, color: colors.mutedText, fontSize: 13, textAlign: 'center' },
});