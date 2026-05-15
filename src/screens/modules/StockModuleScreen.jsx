import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { DatePickerField } from '../../components/DatePickerField';
import { useApp } from '../../contexts/AppContext';
import { getStockReportList, deleteStockReport } from '../../api/stockApi';

function formatListDate(selectedDate, dateKey) {
  if (!selectedDate) return dateKey();
  if (typeof selectedDate === 'string') return selectedDate;
  return new Date(selectedDate).toISOString().split('T')[0];
}

export function StockModuleScreen({ route, navigation }) {
  const { projectId } = route.params || {};
  const { dateKey } = useApp();
  const today = dateKey();

  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const dateStr = formatListDate(selectedDate, dateKey);

  const fetchStockReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = { date: dateStr };
      if (projectId != null && projectId !== '') {
        params.project_id = projectId;
      }
      console.log('Fetching stock reports with params:', JSON.stringify(params));
      const res = await getStockReportList(params);
      console.log('Stock report raw response:', JSON.stringify(res?.data || res));
      const raw = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      console.log('Stock report parsed list length:', list.length);
      const mapped = list.map((s) => ({
        id: s.id,
        projectId: projectId,
        date: s.date ?? dateStr,
        itemId: s.item_id ?? s.itemId ?? null,
        itemName: s.item_name ?? s.itemName ?? s.item?.name ?? '',
        vendorId: s.vendor_id ?? s.vendorId ?? null,
        vendorName: s.vendor_name ?? s.vendorName ?? s.vendor?.name ?? '',
        openBal: s.open_bal ?? s.openBal ?? s.opening_balance ?? '',
        received: s.received ?? s.received_qty ?? '',
        cum: s.cum ?? s.cumulative ?? s.consumed ?? '',
        bal: s.bal ?? s.balance ?? s.closing_balance ?? '',
        editReason: s.edit_reason ?? s.editReason ?? '',
      }));
      console.log('Stock report mapped rows:', mapped.length);
      setRows(mapped);
    } catch (err) {
      console.log('Stock report fetch error:', err?.response?.data || err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, dateStr]);

  useEffect(() => {
    fetchStockReports();
  }, [fetchStockReports]);

  useFocusEffect(
    useCallback(() => {
      fetchStockReports();
    }, [fetchStockReports]),
  );

  const filteredRows = (rows || []).filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const v = String(item.vendorName || '').toLowerCase();
    const it = String(item.itemName || '').toLowerCase();
    return v.includes(q) || it.includes(q);
  });

  const handleEdit = (item) => {
    navigation.navigate('StockForm', { projectId, entryId: item.id });
  };

  const handleDelete = (item) => {
    setDeleteTarget(item);
    setDeleteReason('');
  };

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for deleting.');
      return;
    }
    setDeleting(true);
    try {
      const remarkVal = deleteReason.trim();
      console.log('Deleting stock id:', deleteTarget.id, 'remark:', remarkVal);
      await deleteStockReport(deleteTarget.id, remarkVal);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteReason('');
      Alert.alert('Deleted', 'Stock report removed.');
    } catch (err) {
  console.log(
    'DELETE ERROR FULL:',
    JSON.stringify(err?.response?.data, null, 2)
  );

  Alert.alert(
    'Error',
    JSON.stringify(err?.response?.data || {}, null, 2)
  );
} finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={styles.h1}>Stock</Text>
        <Text style={styles.sub}>
          Vendor, open balance, received, and remaining stock (saved on this device).
        </Text>

        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
          <TextInput
            placeholder="Search vendor or item..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.actions}>
          <View style={styles.actionsDate}>
            <DatePickerField
              label={null}
              value={selectedDate}
              onChange={setSelectedDate}
              style={styles.dateField}
            />
          </View>
          <View style={styles.actionsBtn}>
            <GradientButton
              title="Add Stock"
              onPress={() => navigation.navigate('StockForm', { projectId })}
              colors={['#2f86de', '#62b6ff']}
              left={<MaterialCommunityIcons name="plus-circle-outline" size={18} color="#fff" />}
            />
          </View>
        </View>

        <FlatList
          key={dateStr}
          data={filteredRows}
          keyExtractor={(item) => String(item.id)}
          extraData={dateStr}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="package-variant-closed" size={40} color="#ccc" />
              <Text style={styles.emptyTitle}>No stock entries</Text>
              <Text style={styles.emptyText}>Add stock using the button above.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="package-variant" size={24} color="#2563eb" />
                </View>

                <View style={styles.cardMain}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.vendorName || 'Vendor'}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    Item: {item.itemName || '—'}
                  </Text>
                  {!!item.editReason && (
                    <Text style={styles.editReasonLine} numberOfLines={2}>
                      Edit reason: {item.editReason}
                    </Text>
                  )}
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCell}>
                      <View style={styles.metricInner}>
                        <Text style={styles.metricLabel}>Open</Text>
                        <Text style={styles.metricValue}>{item.openBal ?? '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metricCell}>
                      <View style={styles.metricInner}>
                        <Text style={styles.metricLabel}>Received</Text>
                        <Text style={styles.metricValue}>{item.received ?? '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metricCell}>
                      <View style={styles.metricInner}>
                        <Text style={styles.metricLabel}>Cumulative</Text>
                        <Text style={styles.metricValue}>{item.cum ?? '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.metricCell}>
                      <View style={styles.metricInner}>
                        <Text style={styles.metricLabel}>Balance</Text>
                        <Text style={styles.metricValue}>{item.bal ?? '—'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.iconActions}>
                  <Pressable style={[styles.iconBtn, styles.iconBtnSp]} onPress={() => handleEdit(item)}>
                    <MaterialCommunityIcons name="pencil" size={20} color="#2563eb" />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => handleDelete(item)}>
                    <MaterialCommunityIcons name="delete" size={20} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />

        <Modal
          visible={!!deleteTarget}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <Pressable style={styles.sheetDim} onPress={() => setDeleteTarget(null)}>
            <Pressable style={styles.sheetCard}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Delete stock</Text>
              <Text style={styles.sheetSub}>
                Removing entry for {deleteTarget?.vendorName || 'vendor'}
              </Text>
              <TextInput
                style={styles.sheetInput}
                placeholder="Reason for deletion *"
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
              />
              <View style={styles.sheetActions}>
                <Pressable
                  style={styles.sheetCancelBtn}
                  onPress={() => setDeleteTarget(null)}
                >
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetDeleteBtn, deleting && { opacity: 0.6 }]}
                  onPress={confirmDelete}
                  disabled={deleting}
                >
                  <Text style={styles.sheetDeleteText}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  h1: { fontSize: 28, fontWeight: '900', color: '#1a2f4e' },
  sub: { fontSize: 14, color: '#7a8fa8', marginTop: 4, marginBottom: 16 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2eaf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  searchInput: { marginLeft: 8, flex: 1 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionsDate: { flex: 1, marginRight: 12, justifyContent: 'center' },
  actionsBtn: { flex: 1, justifyContent: 'center' },
  dateField: { marginBottom: 0 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2eaf4',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardMain: { flex: 1, minWidth: 0, marginRight: 8 },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  title: { fontSize: 16, fontWeight: '900', color: '#1a2f4e' },
  meta: { fontSize: 13, color: '#475569', marginTop: 4, fontWeight: '600' },
  editReasonLine: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -4,
  },
  metricCell: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  metricInner: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginTop: 2 },

  iconActions: { flexDirection: 'column', alignItems: 'center', paddingTop: 2 },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  iconBtnSp: { marginBottom: 8 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { marginTop: 10, fontWeight: '900', fontSize: 16, color: '#374151' },
  emptyText: { marginTop: 6, color: '#7a8fa8', fontSize: 13 },

  sheetDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1a2f4e' },
  sheetSub: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  sheetInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  sheetCancelText: { fontWeight: '800', color: '#475569' },
  sheetDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  sheetDeleteText: { fontWeight: '800', color: '#fff' },
});
