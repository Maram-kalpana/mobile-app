import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { getManagerExpenseList } from '../../api/expenseApi';
import { colors } from '../../theme/theme';

function formatINR(value) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  } catch {
    return `₹ ${Math.round(value).toLocaleString('en-IN')}`;
  }
}

export function ExpenseListScreen({ route, navigation }) {
  const { projectId } = route.params;

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          const res = await getManagerExpenseList(projectId);
          if (cancelled) return;
          const list = res?.data?.data ?? res?.data ?? [];
          setExpenses(Array.isArray(list) ? list : []);
        } catch (err) {
          console.log('Expense list fetch error:', err?.message);
          if (!cancelled) setExpenses([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [projectId]),
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const toExpenseCard = (item) => ({
    id: item.id,
    name: item.expense_type
      ? `${item.expense_type.charAt(0).toUpperCase() + item.expense_type.slice(1)} expense`
      : 'Expense',
    partyName: item.party?.name || item.party_name || '',
    type: item.expense_type || '—',
    amount: Number(item.amount || 0),
    dateIso: item.date || item.created_at || '',
    remarks: item.remarks || '',
    project_id: item.project_id,
    party_id: item.party_id,
    _raw: item,
  });

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.h1}>Expenses</Text>
          <Text style={styles.sub}>
            {loading ? 'Loading...' : `${expenses.length} entries • ${formatINR(totalExpenses)}`}
          </Text>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={colors.buttonStart} />
          </View>
        ) : (
          <FlatList
            style={styles.listFlex}
            data={expenses}
            keyExtractor={(e) => String(e.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const card = toExpenseCard(item);
              return (
                <Pressable
                  onPress={() =>
                    navigation.navigate('ExpenseDetails', {
                      projectId,
                      expense: card,
                    })
                  }
                  style={styles.card}
                >
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <MaterialCommunityIcons name="receipt" size={20} color="#fff" />
                    </View>

                    <View style={styles.meta}>
                      <Text style={styles.name}>{card.partyName || card.name}</Text>
                      <Text style={styles.sub2}>
                        {card.type} • {card.dateIso ? new Date(card.dateIso).toLocaleDateString() : 'No date'}
                      </Text>
                    </View>

                    <Text style={styles.amount}>{formatINR(card.amount)}</Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="cash-remove" size={32} color="rgba(233,242,242,0.7)" />
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptyText}>Tap "Add expense" from Accounts to create the first entry.</Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listFlex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.25)',
  },
  h1: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sub: { marginTop: 6, color: colors.mutedText, fontSize: 13 },
  list: { padding: 16, paddingBottom: 28, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meta: { flex: 1 },
  name: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  sub2: {
    marginTop: 3,
    color: '#6b7280',
    fontSize: 12,
  },
  amount: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '900',
  },
  empty: {
    marginTop: 24,
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: 'rgba(11,18,19,0.62)',
  },
  emptyTitle: { marginTop: 10, color: colors.text, fontWeight: '900', fontSize: 16 },
  emptyText: { marginTop: 6, color: colors.mutedText, textAlign: 'center' },
});
