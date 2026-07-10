import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../lib/theme';
import { fitnessApi } from '../lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ClassesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [classes, setClasses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([
      fitnessApi.classes.list({ active: 'true' }),
      fitnessApi.bookings.list(),
    ]);
    setClasses(Array.isArray(c.data) ? c.data : c.data?.items ?? []);
    setBookings(Array.isArray(b.data) ? b.data : b.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) { router.replace('/(auth)/login'); return; }
    load();
  }, [token, load]);

  async function book(classId: string) {
    const me = await fitnessApi.members.me();
    if (!me.data) return Alert.alert('Error', 'Member profile not found');
    const res = await fitnessApi.bookings.book({ memberId: me.data.id, classId, bookingDate: new Date().toISOString() });
    if (res.error) return Alert.alert('Error', res.error);
    load();
  }

  async function cancel(id: string) {
    const res = await fitnessApi.bookings.cancel(id);
    if (res.error) return Alert.alert('Error', res.error);
    load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.h1}>Classes</Text>
        <View style={styles.segment}>
          {(['browse', 'mine'] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.segItem, tab === t && { backgroundColor: primary }]}>
              <Text style={[styles.segText, tab === t && { color: '#fff' }]}>{t === 'browse' ? 'Browse' : 'My bookings'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'browse' ? (
        <FlatList
          data={classes}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty icon="calendar-outline" title="No classes scheduled" msg="Your gym hasn’t published classes yet." />}
          renderItem={({ item }) => {
            const full = item.currentCount >= item.maxCapacity;
            const pct = item.maxCapacity ? Math.min(1, item.currentCount / item.maxCapacity) : 0;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.className}>{item.name}</Text>
                    {!!item.description && <Text style={styles.classDesc} numberOfLines={2}>{item.description}</Text>}
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: primary + '15' }]}>
                    <Text style={[styles.typeText, { color: primary }]}>{item.classType || 'Class'}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Meta icon="calendar-outline" text={item.dayOfWeek != null ? DAYS[item.dayOfWeek] : 'Weekly'} />
                  <Meta icon="time-outline" text={item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
                  {item.trainer?.name && <Meta icon="person-outline" text={item.trainer.name} />}
                </View>
                <View style={styles.capRow}>
                  <View style={styles.capTrack}><View style={[styles.capFill, { width: `${pct * 100}%`, backgroundColor: full ? Colors.error : primary }]} /></View>
                  <Text style={styles.capText}>{item.currentCount}/{item.maxCapacity}</Text>
                </View>
                <TouchableOpacity
                  disabled={full}
                  onPress={() => book(item.id)}
                  style={[styles.bookBtn, { backgroundColor: full ? Colors.surfaceAlt : primary }]}
                >
                  <Text style={[styles.bookText, full && { color: Colors.textSecondary }]}>{full ? 'Join waitlist' : 'Book slot'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty icon="bookmark-outline" title="No bookings yet" msg="Book a class from the Browse tab." />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{item.class?.name || 'Class'}</Text>
                  <Text style={styles.classDesc}>{item.bookingDate ? new Date(item.bookingDate).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''}{item.class?.trainer?.name ? ` · ${item.class.trainer.name}` : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'BOOKED' ? Colors.successBg : Colors.surfaceAlt }]}>
                  <Text style={[styles.statusText, { color: item.status === 'BOOKED' ? Colors.success : Colors.textSecondary }]}>{item.status}</Text>
                </View>
              </View>
              {item.status === 'BOOKED' && (
                <TouchableOpacity onPress={() => cancel(item.id)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel booking</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function Meta({ icon, text }: any) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function Empty({ icon, title, msg }: any) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.sm },
  h1: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  segment: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.full, padding: 4, marginTop: Spacing.md },
  segItem: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.full },
  segText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  list: { padding: Spacing.lg, paddingTop: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  className: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  classDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  typeText: { fontSize: FontSize.xs, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  capTrack: { flex: 1, height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  capFill: { height: 6, borderRadius: 3 },
  capText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '700' },
  bookBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  bookText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: '800' },
  cancelBtn: { marginTop: Spacing.md, alignItems: 'center' },
  cancelText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  emptyMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },
});
