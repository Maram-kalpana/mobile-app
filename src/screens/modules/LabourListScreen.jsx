import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  FlatList,
  Image,
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
} from 'react-native';

import { AppTextField } from '../../components/AppTextField';
import { DatePickerField } from '../../components/DatePickerField';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { getLabours, addLabour, deleteLabour, updateLabour } from '../../api/labourApi';
import { markAttendance } from '../../api/attendanceApi';
import {
  labourBelongsToProject,
  labourProjectIdFromRow,
} from '../../utils/labourProjectScope';

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

  // ── FIX 1: Always store selectedDate as a plain YYYY-MM-DD string ──
  const [selectedDate, setSelectedDate] = useState(toDateOnlyStr(routeDate) || today);

  const [search, setSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'present' | 'absent'
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(toDateOnlyStr(routeDate) || today);
  const [gender, setGender] = useState('male');
  const [vendorId, setVendorId] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLabour, setSelectedLabour] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionLabour, setActionLabour] = useState(null);
  const [formError, setFormError] = useState('');

  const projectTitle =
    (appProjects || []).find((p) => String(p.id) === String(projectId))?.name || 'Project';

  // ── FIX 2: Normalize date before storing — ensures useEffect always gets a plain string ──
  const handleDateChange = useCallback((val) => {
  const normalized = toDateOnlyStr(val);

  console.log("DATE CHANGED:", normalized);

  if (normalized) {
    setSelectedDate(normalized);
  }
}, []);

  const loadLaboursAndAttendance = useCallback(async () => {
    try {
      setLoading(true);
      // selectedDate is already a YYYY-MM-DD string — no extra conversion needed
      const dateStr = selectedDate;
      const baseParams = {
  ...(projectId != null && projectId !== '' ? { project_id: projectId } : {}),
  date: dateStr,
};

const labourRes = await getLabours(baseParams);

const presentRes = await getLabours({
  ...baseParams,
  attendance: 'present',
});

const absentRes = await getLabours({
  ...baseParams,
  attendance: 'absent',
});
   
      
      const raw = labourRes?.data?.data ?? labourRes?.data ?? [];
      const data = Array.isArray(raw) ? raw : [];
      const presentRaw =
  presentRes?.data?.data ?? presentRes?.data ?? [];

const absentRaw =
  absentRes?.data?.data ?? absentRes?.data ?? [];

const presentData = Array.isArray(presentRaw)
  ? presentRaw
  : [];

const absentData = Array.isArray(absentRaw)
  ? absentRaw
  : [];

console.log("PRESENT API:", presentData);
console.log("ABSENT API:", absentData);
      const formatted = data
  .map((item) => {

    console.log("RAW LABOUR ITEM:", item);

    // safer vendor extraction
    const { vendorId, vendorName } = labourVendorFromApi(item);

    // safer project id extraction
    const projectIdForRow =
      item.project_id ||
      item.projectId ||
      item.project?.id ||
      item.project?.project_id ||
      null;

    console.log("PROJECT ID FOUND:", projectIdForRow);

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

      effectiveFrom:
        item.effective_from ||
        item.effective_from_date ||
        null,

      // IMPORTANT
      projectId: projectIdForRow,
    };
  })
  

    
console.log("FINAL FORMATTED LABOURS:", formatted);

setLabours(formatted);

// CREATE ATTENDANCE MAP
const map = {};

presentData.forEach((item) => {
  map[String(item.id)] = true;
});

absentData.forEach((item) => {
  if (!(String(item.id) in map)) {
    map[String(item.id)] = false;
  }
});

console.log("ATTENDANCE MAP:", map);

setAttendanceMap(map);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, projectId]); // selectedDate is now always a string — stable comparison

  // Re-fetch when date changes while screen is focused
  useEffect(() => {
    loadLaboursAndAttendance();
  }, [loadLaboursAndAttendance]);

  // Re-fetch when screen regains focus
  useFocusEffect(
    useCallback(() => {
      loadLaboursAndAttendance();
    }, [loadLaboursAndAttendance])
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
      p.phone?.includes(q) ||
      (p.vendorName || '').toLowerCase().includes(q) ||
      ctxVendorName.toLowerCase().includes(q);

    return vendorIdMatch(p) && searchHit;
  });
}, [filterVendorId, labours, search, vendors]);
  const openCamera = async () => {
    setShowPhotoModal(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
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
    if (!perm.granted) return;
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

  const handleEdit = (item) => {
    setEditId(item.id);
    setName(item.name || '');
    setAge(String(item.age || ''));
    setPhone(item.phone || '');
    setDailyWage(item.dailyWage != null && item.dailyWage !== '' ? String(item.dailyWage) : '');
    setEffectiveFrom(
      toDateOnlyStr(item.effectiveFrom) || toDateOnlyStr(selectedDate) || today,
    );
    setGender(item.gender || 'male');
    setVendorId(Number(item.vendorId) || null);
    setPhotoUri(item.photoUri || null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Labour', 'Are you sure you want to delete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLabour(id);
            loadLaboursAndAttendance();
          } catch (err) {
            console.log('Delete error:', err.response?.data);
          }
        },
      },
    ]);
  };

  const resetModal = () => {
    setEditId(null);
    setName('');
    setAge('');
    setPhone('');
    setDailyWage('');
    setEffectiveFrom(today);
    setGender('male');
    setVendorId(null);
    setPhotoUri(null);
    setFormError('');
    setShowAddModal(false);
  };

  const presentCount = labours.filter((p) => attendanceMap[p.id]).length;

  // ── FIX 3: Attendance toggle with normalized date string + optimistic revert on error ──
  const handleAttendanceToggle = useCallback(async (item) => {
    const prevStatus = !!attendanceMap[item.id];
    const newStatus = !prevStatus;

    // Optimistic update
    setAttendanceMap((prev) => ({ ...prev, [item.id]: newStatus }));
console.log("MARKING ATTENDANCE:", {
  labour_id: item.id,
  date: selectedDate,
  is_present: newStatus ? 1 : 0,
});
    try {
      await markAttendance({
        labour_ids: [item.id],
        date: selectedDate, // already a YYYY-MM-DD string — safe to send directly
        is_present: newStatus ? 1 : 0,
        ...(projectId != null && projectId !== '' ? { project_id: projectId } : {}),
      });
      console.log("ATTENDANCE UPDATED SUCCESSFULLY");
      await loadLaboursAndAttendance();
    } catch (err) {
      // Revert on failure
      setAttendanceMap((prev) => ({ ...prev, [item.id]: prevStatus }));
      console.log('Attendance error:', err.response?.data || err.message);
      Alert.alert('Error', 'Failed to update attendance. Please try again.');
    }
  }, [attendanceMap, selectedDate, projectId]);

  const renderItem = useCallback(
    ({ item, index }) => {
      const isPresent = attendanceMap[item.id] === true;
      return (
        <View style={[styles.row, index % 2 === 0 && styles.rowEven]}>
          {/* Name */}
          <View style={[styles.cell, styles.colName]}>
            <Text style={styles.name}>{item.name || '—'}</Text>
          </View>

          {/* Vendor */}
          <View style={[styles.cell, styles.colVendor]}>
            <Text style={styles.cellText}>
              {item.vendorName ||
                vendors.find((v) => Number(v.id) === Number(item.vendorId))?.name ||
                '—'}
            </Text>
          </View>

          {/* Gender */}
          <View style={[styles.cell, styles.colGender]}>
            <View style={[styles.genderBadge, item.gender === 'female' ? styles.genderF : styles.genderM]}>
              <Text style={styles.genderText}>{item.gender?.[0]?.toUpperCase() ?? '—'}</Text>
            </View>
          </View>

          {/* Attendance */}
          <View style={[styles.cell, styles.colAttend]}>
            <Pressable onPress={() => handleAttendanceToggle(item)}>
              <View style={[styles.checkbox, isPresent && styles.checkboxActive]}>
                {isPresent && <MaterialCommunityIcons name="check" size={13} color="#fff" />}
              </View>
            </Pressable>
          </View>

          {/* Actions */}
          <View style={[styles.cell, styles.colAction]}>
            <View style={styles.actionCellRow}>
              <Pressable
                onPress={() => {
                  setSelectedLabour(item);
                  setShowViewModal(true);
                }}
              >
                <MaterialCommunityIcons name="eye" size={18} color="#2563eb" />
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [attendanceMap, vendors, handleAttendanceToggle]
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <FlatList
          key={selectedDate}
          style={styles.listFlex}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          extraData={`${JSON.stringify(attendanceMap)}-${filtered.length}-${selectedDate}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmptyGrow]}
          ListHeaderComponent={(
            <>
              {/* HEADER */}
              <View style={styles.header}>
                <Text style={styles.h1}>Labour Details</Text>
                <Text style={styles.sub}>Tap checkbox to mark attendance for selected date.</Text>
                {!!projectId && (
                  <View style={styles.listProjectPill}>
                    <MaterialCommunityIcons name="office-building-outline" size={14} color="#1d78d8" />
                    <Text style={styles.listProjectPillText}>{projectTitle}</Text>
                  </View>
                )}
              </View>

              {/* DATE + SEARCH */}
              <View style={styles.controlRow}>
                <View style={styles.dateWrap}>
                  {/* ── FIX: use handleDateChange instead of setSelectedDate ── */}
                  <DatePickerField label="Date" value={selectedDate} onChange={handleDateChange} />
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

              

              {/* PRESENT BADGE + ADD BUTTON */}
              <View style={styles.actionContainer}>
                <View style={styles.fakeLabel} />
                <View style={styles.actionRow}>
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="account-check" size={15} color="#137333" />
                    <Text style={styles.badgeText}>
                      Present: {presentCount} / {labours.length}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => {
                      setFormError('');
                      setEffectiveFrom(toDateOnlyStr(selectedDate) || today);
                      setShowAddModal(true);
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Add Labour</Text>
                  </Pressable>
                </View>
              </View>

              {/* TABLE HEADER */}
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colName]}>Name</Text>
                <Text style={[styles.th, styles.colVendor]}>Vendor</Text>
                <Text style={[styles.th, styles.colGender]}>G</Text>
                <Text style={[styles.th, styles.colAttend]}>✓</Text>
                <Text style={[styles.th, styles.colAction, { borderRightWidth: 0 }]}>Action</Text>
              </View>
            </>
          )}
          ListEmptyComponent={(
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={40} color="#ccc" />
              <Text style={styles.emptyTitle}>No workers found</Text>
              <Text style={styles.emptyText}>Add labour from the button above.</Text>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      {/* ══ ADD LABOUR MODAL ══ */}
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
            {/* Photo + Name */}
            <View style={styles.photoNameRow}>
              <Pressable style={styles.photoCircle} onPress={() => setShowPhotoModal(true)}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImg} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialCommunityIcons name="camera-plus" size={26} color="#4A90E2" />
                    <Text style={styles.photoHint}>Photo</Text>
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <AppTextField
                  label="Full Name"
                  value={name}
                  onChangeText={(t) => {
                    setFormError('');
                    setName(t);
                  }}
                  placeholder="Enter full name"
                />
              </View>
            </View>

            {/* Phone + Daily Wages */}
            <View style={styles.grid2}>
              <AppTextField
                style={styles.halfLeft}
                label="Phone Number"
                value={phone}
                onChangeText={(t) => {
                  setFormError('');
                  setPhone(t);
                }}
                keyboardType="phone-pad"
                placeholder="Phone number"
              />
              <AppTextField
                style={styles.halfRight}
                label="Daily Wages"
                value={dailyWage}
                onChangeText={(t) => {
                  setFormError('');
                  setDailyWage(t);
                }}
                keyboardType="numeric"
                placeholder="₹ Amount"
              />
            </View>

            {/* Age + Gender + Date */}
            <View style={styles.grid3}>
              <AppTextField
                style={styles.thirdLeft}
                label="Age"
                value={age}
                onChangeText={(t) => {
                  setFormError('');
                  setAge(t);
                }}
                keyboardType="numeric"
                placeholder="Age"
              />
              <SelectField
                style={styles.thirdMid}
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
                style={styles.thirdRight}
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

            </ScrollView>

            {/* Save */}
            <Pressable
              style={styles.saveBtn}
              onPress={async () => {
                setFormError('');
                if (!name.trim()) {
                  setFormError('Full name is required.');
                  return;
                }
                if (!phone.trim()) {
                  setFormError('Phone number is required.');
                  return;
                }
                const wageNum = Number(String(dailyWage).trim());
                if (!String(dailyWage).trim() || !Number.isFinite(wageNum) || wageNum < 0) {
                  setFormError('Enter a valid daily wage (0 or more).');
                  return;
                }
                const eff = toDateOnlyStr(effectiveFrom);
                if (!eff) {
                  setFormError('Select the wage effective from date.');
                  return;
                }
                try {
                  if (editId) {
                    await updateLabour(editId, {
                      full_name: name,
                      age: Number(age),
                      gender,
                      phone,
                      daily_wage: wageNum,
                      effective_from: eff,
                      vendor_id: vendorId,
                      profile_pic: photoUri,
                      edit_reason: editReason,
                      ...(projectId != null && projectId !== '' ? { project_id: projectId } : {}),
                    });
                  } else {
                    const payload = {
  full_name: name,
  age: Number(age),
  gender,
  phone,
  daily_wage: wageNum,
  effective_from: eff,
  vendor_id: vendorId,

  // IMPORTANT
  project_id: projectId,
};

console.log("ADDING LABOUR PAYLOAD:", payload);

const res = await addLabour(payload);

console.log("ADD LABOUR RESPONSE:", res?.data);
                  }
                  setEditId(null);
                  setFormError('');
                  await loadLaboursAndAttendance();
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

      {/* ══ VIEW MODAL ══ */}
      <Modal visible={showViewModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Labour Details</Text>

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              {!!selectedLabour?.photoUri ? (
                <Image source={{ uri: selectedLabour.photoUri }} style={{ width: 100, height: 100, borderRadius: 16 }} />
              ) : (
                <View style={styles.avatarLarge}>
                  <MaterialCommunityIcons name="account" size={40} color="#4A90E2" />
                </View>
              )}
            </View>

            {selectedLabour && (
              <View>
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>Name</Text>
                  <Text style={styles.viewValue}>{selectedLabour.name}</Text>
                </View>
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>Phone</Text>
                  <Text style={styles.viewValue}>{selectedLabour.phone}</Text>
                </View>
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>Age</Text>
                  <Text style={styles.viewValue}>{selectedLabour.age}</Text>
                </View>
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>Gender</Text>
                  <Text style={styles.viewValue}>{selectedLabour.gender}</Text>
                </View>
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>Vendor</Text>
                  <Text style={styles.viewValue}>
                    {selectedLabour.vendorName ||
                      vendors.find((v) => Number(v.id) === Number(selectedLabour.vendorId))?.name ||
                      '—'}
                  </Text>
                </View>
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>Daily Wages</Text>
                  <Text style={styles.viewValue}>{'₹ ' + (selectedLabour.dailyWage ?? 0)}</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.viewActionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                onPress={() => {
                  setActionLabour(selectedLabour);
                  setActionType('edit');
                  setShowViewModal(false);
                  setShowReasonModal(true);
                }}
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => {
                  setActionLabour(selectedLabour);
                  setActionType('delete');
                  setShowViewModal(false);
                  setShowReasonModal(true);
                }}
              >
                <MaterialCommunityIcons name="delete" size={16} color="#fff" />
                <Text style={styles.actionText}>Delete</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setShowViewModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ══ PHOTO SOURCE MODAL ══ */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <Pressable style={styles.photoBackdrop} onPress={() => setShowPhotoModal(false)}>
          <View style={styles.photoSheet}>
            <Text style={styles.photoSheetTitle}>Add Photo</Text>

            <Pressable style={styles.photoOption} onPress={openCamera}>
              <View style={[styles.photoOptionIcon, { backgroundColor: '#eff6ff' }]}>
                <MaterialCommunityIcons name="camera" size={26} color="#2563eb" />
              </View>
              <View style={styles.photoOptionMeta}>
                <Text style={styles.photoOptionTitle}>Take Photo</Text>
                <Text style={styles.photoOptionDesc}>Open camera and capture now</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#b0bec5" />
            </Pressable>

            <View style={styles.photoDivider} />

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

            {!!photoUri && (
              <>
                <View style={styles.photoDivider} />
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

            <Pressable style={styles.photoCancelBtn} onPress={() => setShowPhotoModal(false)}>
              <Text style={styles.photoCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
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
                if (actionType === 'edit') {
                  setTimeout(() => { handleEdit(actionLabour); }, 200);
                }
                if (actionType === 'delete') {
                  try {
                    await deleteLabour(actionLabour.id);
                    loadLaboursAndAttendance();
                  } catch (err) {
                    console.log('Delete error:', err.response?.data);
                  }
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
  sub: { marginTop: 3, color: colors.mutedText, fontSize: 12 },
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

  // control row: date + search
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  dateWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
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

  // attendance filter
  filterSection: { marginHorizontal: 16, marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  filterBtn: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterBtnTextActive: { color: '#1d4ed8', fontWeight: '800' },
  filterHint: { fontSize: 11, color: colors.mutedText, lineHeight: 15 },

  // action row: present badge + add button
  actionContainer: { marginHorizontal: 16, marginBottom: 12 },
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

  // table
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
  colName: { flex: 2, alignItems: 'flex-start', paddingLeft: 10 },
  colVendor: { width: 90 },
  colGender: { width: 40 },
  colAttend: { width: 50 },
  colAction: { width: 55 },
  name: { fontSize: 13, fontWeight: '700', color: '#1f2f4b' },
  genderBadge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  genderM: { backgroundColor: '#dbeafe' },
  genderF: { backgroundColor: '#fce7f3' },
  genderText: { fontSize: 11, fontWeight: '800', color: '#1e3a5f' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2563eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  actionCellRow: { flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center', padding: 36 },
  emptyTitle: { marginTop: 10, fontWeight: '900', fontSize: 16, color: colors.text },
  emptyText: { marginTop: 6, color: colors.mutedText, textAlign: 'center', fontSize: 13 },

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

  // photo + name row
  photoNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
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
    flexShrink: 0,
    marginRight: 12,
  },
  photoImg: { width: 86, height: 86 },
  photoPlaceholder: { alignItems: 'center' },
  photoHint: { color: '#4A90E2', fontSize: 11, fontWeight: '700', marginTop: 4 },

  // grids — no gap, use margin on children
  grid2: { flexDirection: 'row', marginBottom: 8 },
  halfLeft: { flex: 1, marginRight: 10 },
  halfRight: { flex: 1 },

  grid3: { flexDirection: 'row', marginBottom: 8 },
  thirdLeft: { flex: 1, marginRight: 10 },
  thirdMid: { flex: 1, marginRight: 10 },
  thirdRight: { flex: 1 },

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

  // View modal
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#eaf3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewField: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  viewValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  viewActionRow: { flexDirection: 'row', marginTop: 20 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 10,
  },
  actionText: { color: '#fff', fontWeight: '800', marginLeft: 6 },

  // Photo Source Modal
  photoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'flex-end' },
  photoSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  photoSheetTitle: { fontSize: 18, fontWeight: '900', color: '#1a2f4e', marginBottom: 16 },
  photoOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  photoOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  photoOptionMeta: { flex: 1 },
  photoOptionTitle: { fontSize: 15, fontWeight: '800', color: '#1a2f4e' },
  photoOptionDesc: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  photoDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },
  photoCancelBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
  },
  photoCancelText: { color: '#ef4444', fontWeight: '800', fontSize: 15 },
});