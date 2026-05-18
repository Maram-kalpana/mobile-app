import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getProjects, getProjectDashboard } from '../../api/projectApi';

const tasks = [
  {
    id: '1',
    title: 'Projects',
    sub: 'Open assigned project list',
    icon: 'office-building-outline',
    screen: 'ProjectsList',
  },
  {
    id: '2',
    title: 'Vendors',
    sub: 'View supplier records',
    icon: 'truck-delivery-outline',
    screen: 'VendorsList',
  },
  {
    id: '3',
    title: 'Accounts',
    sub: 'Check allocated balances',
    icon: 'bank-outline',
    screen: 'AccountsProjectList',
  },
  // Daily Report commented out as requested
  // {
  //   id: '4',
  //   title: 'Daily Report',
  //   sub: 'View daily site reports',
  //   icon: 'clipboard-text-outline',
  //   screen: 'DailyReport',
  // },
];

// Format currency nicely
const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹ 0';
  if (num >= 100000) return `₹ ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹ ${(num / 1000).toFixed(1)}K`;
  return `₹ ${num.toFixed(0)}`;
};

export default function HomeDashboardScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

  useEffect(() => {
    fetchProjectsAndDashboard();
  }, []);

  const fetchProjectsAndDashboard = async () => {
    try {
      setLoadingDash(true);
      const pRes = await getProjects();
      const projectList = pRes?.data?.data || [];
      console.log(
  "PROJECT LIST FULL:",
  JSON.stringify(projectList, null, 2)
);
      setProjects(projectList);

      // Use first project for dashboard summary (or aggregate all)
      if (projectList.length > 0) {

  console.log("PROJECT LIST");
  console.log(JSON.stringify(projectList, null, 2));

  const firstId = projectList?.[0]?.id;

  console.log("FIRST PROJECT ID:", firstId);

  if (!firstId) {
    console.log("NO VALID PROJECT ID FOUND");
    return;
  }

  const dRes = await getProjectDashboard(firstId);

  console.log(
    "DASHBOARD RESPONSE:",
    JSON.stringify(dRes?.data, null, 2)
  );

  if (dRes?.data?.success) {
    setDashboardData(dRes.data.data);
  }
}
    } catch (err) {
      console.log('DASHBOARD FETCH ERROR:', err?.response?.data || err);
    } finally {
      setLoadingDash(false);
    }
  };

  const renderCard = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => navigation?.navigate?.(item.screen)}
    >
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={item.icon} size={32} color="#4A90E2" />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSub}>{item.sub}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* HERO HEADER */}
      <ImageBackground
        source={require('../../../assets/sruthika_final_logo.png')}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle}>My Dashboard</Text>
          <Text style={styles.heroSub}>Have a Good Day</Text>
        </View>
        <View style={styles.heroWave} />
      </ImageBackground>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <>
            {/* PROJECT SUMMARY CARDS */}
            {loadingDash ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading summary...</Text>
              </View>
            ) : dashboardData ? (
              <>
                <Text style={styles.sectionTitle}>Financial Summary</Text>
                <View style={styles.statsRow}>

                  {/* Total Received */}
                  <View style={[styles.statCard, styles.statReceived]}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons name="arrow-down-circle-outline" size={22} color="#16a34a" />
                    </View>
                    <Text style={styles.statLabel}>Total Received</Text>
                    <Text style={[styles.statValue, { color: '#16a34a' }]}>
                      {formatCurrency(dashboardData.total_received)}
                    </Text>
                  </View>

                  {/* Total Expenses */}
                  <View style={[styles.statCard, styles.statExpenses]}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons name="arrow-up-circle-outline" size={22} color="#dc2626" />
                    </View>
                    <Text style={styles.statLabel}>Total Expenses</Text>
                    <Text style={[styles.statValue, { color: '#dc2626' }]}>
                      {formatCurrency(dashboardData.total_expenses)}
                    </Text>
                  </View>

                  {/* Balance */}
                  <View style={[styles.statCard, styles.statBalance]}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons name="wallet-outline" size={22} color="#2563eb" />
                    </View>
                    <Text style={styles.statLabel}>Balance</Text>
                    <Text style={[styles.statValue, { color: '#2563eb' }]}>
                      {formatCurrency(dashboardData.balance)}
                    </Text>
                  </View>

                </View>

                {/* Project count badge */}
                <View style={styles.projectBadge}>
                  <MaterialCommunityIcons name="office-building-outline" size={15} color="#2563eb" />
                  <Text style={styles.projectBadgeText}>
                    {projects.length} Project{projects.length !== 1 ? 's' : ''} assigned
                  </Text>
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </>
        )}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f3f8' },

  // HERO
  hero: { width: '100%', height: 220, justifyContent: 'flex-end' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,35,75,0.50)',
  },
  heroBody: { paddingHorizontal: 22, paddingBottom: 52 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroWave: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
    height: 40,
    backgroundColor: '#f0f3f8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // LIST
  listContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 30 },
  row: { justifyContent: 'space-between', marginBottom: 14 },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8a99b5',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },

  // LOADING
  loadingWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  loadingText: { color: '#8a99b5', fontSize: 13, marginLeft: 8 },

  // STATS ROW — no gap, use marginRight on first two cards
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  statReceived: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statExpenses: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statBalance: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', marginRight: 0 },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textAlign: 'center' },
  statValue: { fontSize: 15, fontWeight: '900', marginTop: 2, textAlign: 'center' },

  // PROJECT BADGE
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  projectBadgeText: { color: '#2563eb', fontWeight: '700', fontSize: 12, marginLeft: 6 },

  // QUICK ACTION CARDS
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '48%',
    paddingVertical: 26,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 14px rgba(0,0,0,0.08)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }),
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#eaf3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1e2f4d', textAlign: 'center' },
  cardSub: { fontSize: 11, color: '#8a99b5', textAlign: 'center', lineHeight: 15, marginTop: 4 },
});