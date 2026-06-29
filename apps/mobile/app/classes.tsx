import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';
import { fitnessApi } from '../lib/api';

export default function ClassesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    const [c, b] = await Promise.all([
      fitnessApi.classes.list({ active: 'true' }),
      fitnessApi.bookings.list(),
    ]);
    if (c.data) setClasses(Array.isArray(c.data) ? c.data : c.data?.items ?? []);
    if (b.data) setBookings(Array.isArray(b.data) ? b.data : b.data?.items ?? []);
    setLoading(false);
  };

  const handleBook = async (classId: string) => {
    const memberRes = await fitnessApi.members.me();
    if (!memberRes.data) return Alert.alert('Error', 'Member profile not found');
    const res = await fitnessApi.bookings.book({
      memberId: memberRes.data.id,
      classId,
      bookingDate: new Date().toISOString(),
    });
    if (res.error) return Alert.alert('Error', res.error);
    Alert.alert('Success', 'Class booked!');
    loadData();
  };

  const handleCancel = async (bookingId: string) => {
    const res = await fitnessApi.bookings.cancel(bookingId);
    if (res.error) return Alert.alert('Error', res.error);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Group Classes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab('browse')} style={[styles.tab, tab === 'browse' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'browse' && styles.tabTextActive]}>Browse</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('mine')} style={[styles.tab, tab === 'mine' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      {tab === 'browse' ? (
        <FlatList
          data={classes}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: Spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>No classes available</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{item.classType}</Text></View>
              </View>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <View style={styles.meta}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.metaText}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][item.dayOfWeek]}</Text>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} style={{ marginLeft: 12 }} />
                <Text style={styles.metaText}>{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.metaText, { marginLeft: 12 }]}>👥 {item.currentCount}/{item.maxCapacity}</Text>
              </View>
              <TouchableOpacity
                style={[styles.bookBtn, item.currentCount >= item.maxCapacity && { backgroundColor: '#9ca3af' }]}
                disabled={item.currentCount >= item.maxCapacity}
                onPress={() => handleBook(item.id)}
              >
                <Text style={styles.bookBtnText}>{item.currentCount >= item.maxCapacity ? 'Full' : 'Book Class'}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: Spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>No bookings yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.class?.name}</Text>
              <Text style={styles.metaText}>{new Date(item.bookingDate).toLocaleString()}</Text>
              <Text style={styles.metaText}>Trainer: {item.class?.trainer?.name ?? 'TBA'}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                <View style={[styles.typeBadge, { backgroundColor: item.status === 'BOOKED' ? '#dbeafe' : '#f3f4f6' }]}>
                  <Text style={styles.typeBadgeText}>{item.status}</Text>
                </View>
                {item.status === 'BOOKED' && (
                  <TouchableOpacity onPress={() => handleCancel(item.id)}>
                    <Text style={{ color: '#ef4444', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  card: { backgroundColor: '#fff', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, flex: 1 },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textMuted, marginVertical: Spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: Spacing.sm, flexWrap: 'wrap' },
  metaText: { fontSize: FontSize.sm, color: Colors.textMuted, marginLeft: 4 },
  typeBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: FontSize.xs, color: '#3730a3', fontWeight: '600' },
  bookBtn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm },
  bookBtnText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl },
});
