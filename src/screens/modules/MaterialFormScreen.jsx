import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SelectField } from '../../components/SelectField';
import { DatePickerField } from '../../components/DatePickerField';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMaterialEntries,
  addMaterialEntryApi,
  updateMaterialEntryApi,
  deleteMaterialEntryApi,
} from '../../api/materialApi';
import { getItems } from '../../api/itemApi';

export function MaterialFormScreen({ route, navigation }) {
  const { projectId, entryId, direction: dirParam } = route.params || {};
  const direction = dirParam === 'out' ? 'out' : 'in';

  const app = useApp();
  const vendors = app?.vendors || [];
  const fetchVendors = app?.fetchVendors;
  const projects = app?.projects || [];
  const dateKey = app?.dateKey || (() => new Date().toISOString().slice(0, 10));

  const projectTitle =
    projects.find((p) => String(p.id) === String(projectId))?.name || 'Project';

  // ── Form state ──
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [itemId, setItemId] = useState(null);
  const [qty, setQty] = useState('');
  const [vendorId, setVendorId] = useState(null);
  const selectedProject = projectId || null;
  const [supplier, setSupplier] = useState('');
  const [remarks, setRemarks] = useState('');

  // ── Dropdown data ──
  const [itemsList, setItemsList] = useState([]);

  // ── Edit mode — true when entryId passed ──
  const isEditMode = !!entryId;
  const [loadingEntry, setLoadingEntry] = useState(isEditMode);

  useEffect(() => {
    fetchDropdowns();
    if (isEditMode) fetchEntry();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      fetchVendors?.();
    }, [])
  );
  // Fetch dropdowns (projects + items)
  const fetchDropdowns = async () => {
    try {
      const iRes = await getItems();
      if (iRes?.data?.success && iRes.data.data.length > 0) {
        setItemsList(iRes.data.data);
      } else {
        setItemsList([
          { id: 1, name: 'Cement' },
          { id: 2, name: 'Steel' },
          { id: 3, name: 'Sand' },
        ]);
      }
    } catch (err) {
      console.log('DROPDOWN ERROR:', err?.response?.data || err);
    }
  };

  // Fetch the specific entry from API and pre-fill form
  const fetchEntry = async () => {
    try {
      // Fetch all entries and find the one matching entryId
      const res = await getMaterialEntries({ project_id: projectId });
      console.log('FETCH ENTRY RESPONSE:', JSON.stringify(res?.data, null, 2));

      const raw = res?.data?.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      const entry = list.find((e) => String(e.id) === String(entryId));

      if (entry) {
        setItemId(Number(entry.item_id) || null);
        setQty(String(entry.qty || ''));
        setVendorId(Number(entry.vendor_id) || null);
        setSupplier(entry.supplier || '');
        setRemarks(entry.remarks || '');
        setSelectedDate(entry.entry_date || dateKey());
        console.log('PRE-FILLED entry:', entry);
      } else {
        console.log('Entry not found for id:', entryId);
      }
    } catch (err) {
      console.log('FETCH ENTRY ERROR:', err?.response?.data || err);
    } finally {
      setLoadingEntry(false);
    }
  };

  // ── Save (add or update) ──
  const onSave = async () => {
    if (!itemId || !vendorId || !selectedProject) {
      Alert.alert('Missing', 'Please select item and vendor');
      return;
    }
    if (!qty.trim()) {
      Alert.alert('Missing', 'Please enter quantity');
      return;
    }

    try {
      const formattedDate =
        typeof selectedDate === 'string'
          ? selectedDate
          : new Date(selectedDate).toISOString().split('T')[0];

      const payload = {
        project_id: Number(selectedProject),
        vendor_id: Number(vendorId),
        item_id: Number(itemId),
        qty: String(qty),
        supplier: supplier || '',
        remarks: remarks || '',
        entry_date: formattedDate,
      };

      console.log('SAVE PAYLOAD:', payload);

      if (isEditMode) {
        await updateMaterialEntryApi(entryId, payload);
        Alert.alert('Success', 'Entry updated');
      } else {
        await addMaterialEntryApi(payload);
        Alert.alert('Success', 'Entry saved');
      }

      navigation.goBack();
    } catch (err) {
      console.log('SAVE ERROR:', err?.response?.data || err);
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  // ── Delete ──
  const onDelete = () => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMaterialEntryApi(entryId);
            console.log('DELETED entry:', entryId);
            navigation.goBack();
          } catch (err) {
            console.log('DELETE ERROR:', err?.response?.data || err);
            Alert.alert('Error', 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  if (loadingEntry) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading entry...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <MaterialCommunityIcons name="office-building-outline" size={15} color="#1d78d8" />
              <Text style={styles.pillText}>{projectTitle}</Text>
            </View>
            <View style={[styles.pill, styles.pillMuted]}>
              <Text style={[styles.pillText, styles.pillTextMuted]}>
                {direction === 'out' ? 'Outgoing / used' : 'Incoming delivery'}
              </Text>
            </View>
          </View>

          {/* Date */}
          <Text style={styles.sectionLabel}>Date</Text>
          <DatePickerField
            label={null}
            value={selectedDate}
            onChange={setSelectedDate}
            style={{ marginBottom: 10 }}
          />

          {/* Item */}
          <SelectField
            label="Item"
            value={itemId}
            onChange={setItemId}
            options={[
              { label: 'Select item', value: null },
              ...(itemsList || []).map((i) => ({ label: i.name, value: i.id })),
            ]}
          />

          {/* Vendor */}
          <SelectField
            label="Vendor"
            value={vendorId}
            onChange={setVendorId}
            placeholder="Select vendor"
            options={[
              { label: 'Select vendor', value: null },
              ...vendors.map((v) => ({ label: v.name, value: v.id })),
            ]}
          />

          {/* Qty */}
          <AppTextField
            label="Qty / nos."
            value={qty}
            onChangeText={setQty}
            placeholder="0"
            keyboardType="default"
          />

          {/* Supplier */}
          <AppTextField
            label="Supplier"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="Supplier name (optional)"
          />

          {/* Remarks */}
          <AppTextField
            label="Remarks"
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Enter remarks"
            multiline
          />

          {/* Save / Update */}
          <GradientButton
            title={isEditMode ? 'Update Entry' : 'Save Entry'}
            onPress={onSave}
            colors={['#2f86de', '#62b6ff']}
            left={<MaterialCommunityIcons name="content-save" size={18} color="#fff" />}
          />

          {/* Delete — only in edit mode */}
          {isEditMode && (
            <Pressable onPress={onDelete} style={styles.del}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#fca5a5" />
              <Text style={styles.delText}>Delete Entry</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.mutedText, fontSize: 15 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(45,127,218,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(45,127,218,0.22)',
  },
  pillMuted: { backgroundColor: 'rgba(15,23,42,0.06)', borderColor: 'rgba(15,23,42,0.1)' },
  pillText: { color: '#1d78d8', fontWeight: '900', fontSize: 12 },
  pillTextMuted: { color: '#334155' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
    marginBottom: 6,
  },
  del: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    justifyContent: 'center',
  },
  delText: { color: '#fca5a5', fontWeight: '800', marginLeft: 8 },
});