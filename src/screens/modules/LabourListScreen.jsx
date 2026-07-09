import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';

import { AppTextField } from '../../components/AppTextField';
import { DatePickerField } from '../../components/DatePickerField';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { getLabours, addLabour, deleteLabour, updateWork,getWorkDetails } from '../../api/labourApi';

/** Normalize any date value to a YYYY-MM-DD string. */
function toDateOnlyStr(d) {
  if (d == null || d === '') return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/** Vendor id/name from labour list API (flat vendor_id vs nested vendor object). */
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

/** Laravel-style validation payload → single message for inline display. */
function formatLabourApiErrors(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.errors === 'string') return payload.errors;
  if (typeof payload.message === 'string' && !payload.errors) return payload.message;
  if (payload.errors && typeof payload.errors === 'object' && !Array.isArray(payload.errors)) {
    const parts = [];
    for (const [key, val] of Object.entries(payload.errors)) {
      const msgs = Array.isArray(val) ? val : [val];
      msgs.forEach((m) => {
        if (m != null && String(m).trim()) parts.push(`${key}: ${String(m).trim()}`);
      });
    }
    return parts.length ? parts.join('\n') : '';
  }
  return '';
}

export function LabourListScreen({ route }) {
  const { projectId, vendorId: filterVendorId, date: routeDate } = route.params || {};
  const { vendors, dateKey, projects: appProjects } = useApp();

  const today = dateKey();

  const [selectedDate, setSelectedDate] = useState(toDateOnlyStr(routeDate) || today);

  const [search, setSearch] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(toDateOnlyStr(routeDate) || today);
  const [gender, setGender] = useState('male');
  const [vendorId, setVendorId] = useState(null);
  const [workDone, setWorkDone] = useState('');
  const [measurements, setMeasurements] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [actionLabour, setActionLabour] = useState(null);
  const [formError, setFormError] = useState('');
  const [workGroupId, setWorkGroupId] = useState(null);

  const projectTitle =
    (appProjects || []).find((p) => String(p.id) === String(projectId))?.name || 'Project';

  const handleDateChange = useCallback((val) => {
    const normalized = toDateOnlyStr(val);
    if (normalized) {
      setSelectedDate(normalized);
    }
  }, []);

  const loadLabours = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate;
      const baseParams = {
        ...(projectId != null && projectId !== '' ? { project_id: projectId } : {}),
        date: dateStr,
      };

      const labourRes = await getLabours(baseParams);
     

      const raw = labourRes?.data?.data ?? labourRes?.data ?? [];
      const data = Array.isArray(raw) ? raw : [];

      const formatted = data.map((item) => {
        const { vendorId, vendorName } = labourVendorFromApi(item);
      
        return {
          id: item.id,
          name: item.full_name,
          gender: item.gender,
      
          vendorId,
          vendorName,
      
          workDone: item.work_done || '',
          measurements: item.measurements || '',
      
          workGroupId: item.work_group_id,
          effectiveFrom: item.effective_from,
          projectId: item.project_id,
      
          labourIds: [item.id],
        };
      });
      setLabours(formatted);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, projectId]);

  useEffect(() => {
    loadLabours();
  }, [loadLabours]);

  useFocusEffect(
    useCallback(() => {
      loadLabours();
    }, [loadLabours])
  );

  const filtered = useMemo(() => {
    const vendorIdMatch = (p) =>
      !filterVendorId || Number(p.vendorId) === Number(filterVendorId);

    if (!search.trim()) {
      return labours.filter((p) => vendorIdMatch(p));
    }

    const q = search.toLowerCase();

    return labours.filter((p) => {
      const ctxVendorName =
        vendors.find((v) => Number(v.id) === Number(p.vendorId))?.name || '';

      const searchHit =
        p.name?.toLowerCase().includes(q) ||
        (p.workDone || '').toLowerCase().includes(q) ||
        (p.measurements || '').toLowerCase().includes(q) ||
        (p.vendorName || '').toLowerCase().includes(q) ||
        ctxVendorName.toLowerCase().includes(q);

      return vendorIdMatch(p) && searchHit;
    });
  }, [filterVendorId, labours, search, vendors]);

  /** Open edit modal directly with prefilled data + reason field inside the form. */
  const handleEditPress = async (item) => {
  try {
    const res = await getWorkDetails(item.workGroupId);

    const data = res.data.data;

    setWorkGroupId(data.work_group_id);

    setEditId(item.id);

    setGender(item.gender);

    setVendorId(data.vendor?.id);

    setEffectiveFrom(data.date);

    setWorkDone(data.work_done);

    setMeasurements(data.measurement);

    setEditReason('');

    setFormError('');

    setShowAddModal(true);
  } catch (err) {
    console.log(err.response?.data);
  }
};
  /** Open reason modal before delete. */
  const handleDeletePress = (item) => {
    setActionLabour(item);
    setEditReason('');
    setShowReasonModal(true);
  };

  const resetModal = () => {
    setEditId(null);
    setEffectiveFrom(today);
    setGender('male');
    setVendorId(null);
    setWorkDone('');
    setMeasurements('');
    setFormError('');
    setShowAddModal(false);
  };

  const renderItem = useCallback(
    ({ item }) => {
      const vendorName =
        item.vendorName ||
        vendors.find((v) => Number(v.id) === Number(item.vendorId))?.name ||
        '—';
      return (
        <Pressable style={styles.card} onPress={() => handleEditPress(item)}>
          {/* Card Header Row: Name + Gender Badge + Edit/Delete Icons */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardName}>{item.name || '—'}</Text>
              <View style={[styles.genderBadge, item.gender === 'female' ? styles.genderF : styles.genderM]}>
                <Text style={styles.genderText}>{item.gender?.[0]?.toUpperCase() ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.cardHeaderIcons}>
              <Pressable onPress={() => handleEditPress(item)} hitSlop={8}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#2563eb" />
              </Pressable>
              <Pressable onPress={() => handleDeletePress(item)} hitSlop={8}>
                <MaterialCommunityIcons name="delete-outline" size={18} color="#dc2626" />
              </Pressable>
            </View>
          </View>

          {/* Work Done */}
          <View style={styles.cardField}>
            <MaterialCommunityIcons name="briefcase-outline" size={15} color="#64748b" />
            <Text style={styles.cardFieldLabel}>Work Done:</Text>
            <Text style={styles.cardFieldValue}>{item.workDone || '—'}</Text>
          </View>

          {/* Measurements */}
          <View style={styles.cardField}>
            <MaterialCommunityIcons name="tape-measure" size={15} color="#64748b" />
            <Text style={styles.cardFieldLabel}>Measurements:</Text>
            <Text style={styles.cardFieldValue}>{item.measurements || '—'}</Text>
          </View>

          {/* Vendor */}
          <View style={styles.cardField}>
            <MaterialCommunityIcons name="account-tie" size={15} color="#64748b" />
            <Text style={styles.cardFieldLabel}>Vendor:</Text>
            <Text style={styles.cardFieldValue}>{vendorName}</Text>
          </View>
        </Pressable>
      );
    },
    [vendors]
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.wrap}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.h1}>Labour Details</Text>
          <View style={styles.listProjectPill}>
            <MaterialCommunityIcons name="office-building-outline" size={14} color="#1d78d8" />
            <Text style={styles.listProjectPillText}>{projectTitle}</Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.mutedText} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workers..."
            placeholderTextColor={colors.mutedText}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.mutedText} />
            </Pressable>
          )}
        </View>

        {/* DATE + ADD */}
        <View style={styles.dateRow}>
          <View style={styles.dateBtnWrap}>
            <DatePickerField
              label={null}
              value={selectedDate}
              onChange={handleDateChange}
              style={styles.dateFieldInner}
            />
          </View>
          <View style={styles.addBtnWrap}>
            <GradientButton
              title="Add Labour"
              onPress={() => {
                resetModal();
                setShowAddModal(true);
              }}
              colors={['#2f86de', '#62b6ff']}
              left={<MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />}
            />
          </View>
        </View>

        {/* LIST */}
        <FlatList
          key={selectedDate}
          style={styles.listFlex}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          extraData={`${filtered.length}-${selectedDate}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmptyGrow]}
          ListHeaderComponent={null}
          ListHeaderComponentStyle={{ height: 0 }}
          ListEmptyComponent={(
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={40} color="#ccc" />
              <Text style={styles.emptyTitle}>No workers found</Text>
              <Text style={styles.emptyText}>Add labour from the button above.</Text>
            </View>
          )}
        />

        {/* ══ ADD / EDIT LABOUR MODAL ══ */}
        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={resetModal}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editId ? 'Edit labour' : 'Add labour'}</Text>
              <View style={styles.modalProjectPill}>
                <MaterialCommunityIcons name="office-building-outline" size={14} color="#1d78d8" />
                <Text style={styles.modalProjectPillText}>{projectTitle}</Text>
              </View>

              {!!formError && (
                <View style={styles.formErrorBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b91c1c" />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
              >
                {/* Gender + Date */}
                <View style={styles.grid2}>
                  <SelectField
                    style={styles.halfLeft}
                    label="Gender"
                    value={gender}
                    onChange={(v) => {
                      setFormError('');
                      setGender(v);
                    }}
                    options={[
                      { label: 'Male', value: 'male' },
                      { label: 'Female', value: 'female' },
                      { label: 'Other', value: 'other' },
                    ]}
                  />
                  <DatePickerField
                    style={styles.halfRight}
                    label="Effective from"
                    value={effectiveFrom}
                    onChange={(v) => {
                      setFormError('');
                      setEffectiveFrom(toDateOnlyStr(v));
                    }}
                  />
                </View>

                <SelectField
                  label="Vendor"
                  value={vendorId}
                  onChange={(v) => {
                    setFormError('');
                    setVendorId(v);
                  }}
                  placeholder="Select vendor"
                  options={[
                    { label: 'Select vendor', value: null },
                    ...(Array.isArray(vendors)
                      ? vendors.map((v) => ({
                          label: v.name,
                          value: v.id,
                        }))
                      : []),
                  ]}
                />

                {/* Work Done */}
                <AppTextField
                  label="Work Done"
                  value={workDone}
                  onChangeText={(t) => {
                    setFormError('');
                    setWorkDone(t);
                  }}
                  placeholder="e.g. Plastering, Tiling"
                />

                {/* Measurements */}
                <AppTextField
                  label="Measurements"
                  value={measurements}
                  onChangeText={(t) => {
                    setFormError('');
                    setMeasurements(t);
                  }}
                  placeholder="e.g. 15 sq.m, 10 ft"
                />

                {/* Reason for edit — only shown when editing */}
                {editId !== null && (
                  <AppTextField
                    label="Reason for edit"
                    value={editReason}
                    onChangeText={(t) => {
                      setFormError('');
                      setEditReason(t);
                    }}
                    placeholder="Enter reason for changes..."
                    multiline
                  />
                )}
              </ScrollView>

              {/* Save */}
              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  setFormError('');
                  if (editId && !editReason.trim()) {
                    setFormError('Please enter a reason for editing.');
                    return;
                  }
                  const eff = toDateOnlyStr(effectiveFrom);
                  if (!eff) {
                    setFormError('Select the effective from date.');
                    return;
                  }
                  try {
                    if (editId) {
                      await updateWork(workGroupId,{
                        labour_id: editId,
                        gender,
                        vendor_id: vendorId,
                        date: eff,
                        work_done: workDone,
                        measurement: measurements,
                        reason_for_editing: editReason,
                        project_id: projectId,
                    });
                    } else {
                      const payload = {
                        gender,
                        effective_from: eff,
                        vendor_id: vendorId,
                        work_done: workDone,
                        measurements: measurements,
                        project_id: projectId,
                      };

                      await addLabour(payload);
                    }
                    setEditId(null);
                    setFormError('');
                    await loadLabours();
                    resetModal();
                  } catch (err) {
                    const body = err?.response?.data;
                    const msg = formatLabourApiErrors(body) || err?.message || 'Could not save. Please try again.';
                    setFormError(msg);
                    console.log('Save error:', body || err.message);
                  }
                }}
              >
                <MaterialCommunityIcons name="content-save" size={17} color="#fff" />
                <Text style={styles.saveText}>Save Labour</Text>
              </Pressable>
              <Pressable onPress={resetModal} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ══ REASON MODAL ══ */}
        <Modal visible={showReasonModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Enter Reason</Text>
              <AppTextField
                label="Reason"
                value={editReason}
                onChangeText={setEditReason}
                placeholder="Enter reason..."
                multiline
              />
              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  if (!editReason.trim()) {
                    Alert.alert('Required', 'Please enter reason');
                    return;
                  }
                  if (!actionLabour) return;
                  setShowReasonModal(false);
                  try {
                    await deleteLabour(actionLabour.id);
                    loadLabours();
                  } catch (err) {
                    console.log('Delete error:', err.response?.data);
                  }
                }}
              >
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
  listFlex: { flex: 1 },
  listEmptyGrow: { flexGrow: 1 },

  // page header
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  h1: { fontSize: 22, fontWeight: '900', color: '#1a2f4e' },
  listProjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(45,127,218,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(45,127,218,0.22)',
  },
  listProjectPillText: { color: '#1d78d8', fontWeight: '800', fontSize: 12 },

  // search bar (fixed)
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
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
  },

  // date + add row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateBtnWrap: { flex: 1, marginRight: 12, justifyContent: 'center' },
  dateFieldInner: { marginBottom: 0 },
  addBtnWrap: { flex: 1, justifyContent: 'center' },

  // card list
  list: { paddingBottom: 30, paddingHorizontal: 12 },

  // empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 4,
    textAlign: 'center',
  },

  // card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a2f4e',
  },
  genderBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderM: { backgroundColor: '#dbeafe' },
  genderF: { backgroundColor: '#fce7f3' },
  genderText: { fontSize: 11, fontWeight: '800', color: '#1e3a5f' },
  cardField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardFieldLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  cardFieldValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '700',
    flex: 1,
  },
  cardHeaderIcons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  // Add Labour Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  modalProjectPill: {
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
  modalProjectPillText: { color: '#1d78d8', fontWeight: '800', fontSize: 12 },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  formErrorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  modalScroll: { maxHeight: Platform.OS === 'web' ? 520 : 440 },

  // grids — no gap, use margin on children
  grid2: { flexDirection: 'row', marginBottom: 8 },
  halfLeft: { flex: 1, marginRight: 10 },
  halfRight: { flex: 1 },

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