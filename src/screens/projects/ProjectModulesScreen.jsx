import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo,useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableCard } from '../../components/PressableCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/theme';
import { getProjectById } from "../../api/projectApi";

const modules = [
  // LabourModule commented out — navigates directly to LabourList
  { key: 'LabourList', title: 'Labour', subtitle: 'Add labour and view daily labour report', icon: 'account-hard-hat' },
  { key: 'MachineList', title: 'Machinery', subtitle: 'Hours, party & output', icon: 'excavator' },
  { key: 'MaterialList', title: 'Material', subtitle: 'Inward / outward items', icon: 'cube-outline' },
  { key: 'StockModule', title: 'Stock', subtitle: 'Balances and receipts for this project', icon: 'warehouse' },
];

export function ProjectModulesScreen({ route, navigation }) {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
const [loading, setLoading] = useState(false);useEffect(() => {
  fetchProject();
}, []);

const fetchProject = async () => {
  try {
    setLoading(true);

    const res = await getProjectById(projectId);

    console.log("API RESPONSE:", res.data);

    const data = res?.data?.data;

    setProject(data);

  } catch (err) {
    console.log("Project API error:", err.response?.data || err.message);
  } finally {
    setLoading(false);
  }
};
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>{project?.name ?? 'Project'}</Text>
        <Text style={styles.sub}>{project?.location ?? ''}</Text>

        <View style={styles.headerCard}>
          <Text style={styles.sectionLabel}>Project details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Project ID</Text>
            <Text style={styles.detailValue}>{projectId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{project?.location ?? '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Manager access</Text>
            <Text style={styles.detailValue}>Labour, material, machinery, stock</Text>
          </View>
        </View>

        <Text style={styles.modulesTitle}>Modules</Text>
        {modules.map((m) => (
          <PressableCard key={m.key} onPress={() => navigation.navigate(m.key, { projectId })} style={styles.modPress} gradientColors={['#2f86de', '#62b6ff']}>
            <View style={styles.modRow}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={m.icon} size={22} color="#1d78d8" />
              </View>
              <View style={styles.modText}>
                <Text style={styles.modTitle}>{m.title}</Text>
                <Text style={styles.modSub}>{m.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={26} color="rgba(24,49,79,0.55)" />
            </View>
          </PressableCard>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  h1: { fontSize: 24, fontWeight: '900', color: colors.text },
  sub: { marginTop: 4, color: colors.mutedText, marginBottom: 14 },
  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 16,
    marginBottom: 18,
  },
  sectionLabel: { color: colors.text, fontWeight: '900', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  detailLabel: { color: colors.mutedText, fontWeight: '800' },
  detailValue: { color: colors.text, fontWeight: '900', textAlign: 'right', flexShrink: 1 },
  modulesTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  modPress: { marginBottom: 12 },
  modRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(45,127,218,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modText: { flex: 1 },
  modTitle: { color: '#17324f', fontSize: 17, fontWeight: '900' },
  modSub: { marginTop: 4, color: colors.mutedText, fontSize: 13 },
});
