import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Modal, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../lib/theme';
import { fitnessApi } from '../../lib/api';

interface Trainer {
  id: string; firstName: string; lastName: string; email?: string; phone?: string;
  avatar?: string; bio?: string; specialties?: string[]; rating?: number; experience?: number;
  certifications?: string[]; hourlyRate?: number;
}

export default function TrainersScreen() {
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Trainer | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fitnessApi.trainers.list().catch(() => ({ data: [] } as any));
    const raw = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    const mapped: Trainer[] = raw.map((t: any) => {
      const parts = (t.name || '').trim().split(/\s+/);
      return {
        id: t.id,
        firstName: parts[0] || t.name || 'Trainer',
        lastName: parts.slice(1).join(' '),
        email: t.email, phone: t.phone, avatar: t.user?.avatarUrl, bio: t.bio,
        rating: t.rating ? Number(t.rating) : undefined,
        experience: t.experienceYears ? Number(t.experienceYears) : undefined,
        specialties: t.specialization ? String(t.specialization).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        certifications: t.certifications ? String(t.certifications).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        hourlyRate: t.hourlyRate ? Number(t.hourlyRate) : undefined,
      };
    });
    setTrainers(mapped);
    setLoading(false);
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trainers}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={primary} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.h1}>Trainers</Text>
            <Text style={styles.sub}>{trainers.length} coaches ready to help you progress</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => setSelected(item)}>
            <View style={[styles.avatar, { backgroundColor: primary }]}>
              {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{item.firstName.charAt(0)}{item.lastName.charAt(0)}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                {item.rating != null && (
                  <View style={styles.rating}><Ionicons name="star" size={12} color={Colors.warning} /><Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text></View>
                )}
              </View>
              {item.experience != null && <Text style={styles.exp}>{item.experience} yrs experience</Text>}
              {!!item.specialties?.length && (
                <View style={styles.chips}>
                  {item.specialties.slice(0, 3).map((s, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: primary + '12' }]}><Text style={[styles.chipText, { color: primary }]}>{s}</Text></View>
                  ))}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={loading
          ? <ActivityIndicator size="large" color={primary} style={{ marginTop: Spacing.xxl }} />
          : <View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.textLight} /><Text style={styles.emptyTitle}>No trainers yet</Text><Text style={styles.emptyMsg}>Your gym will add coaches soon.</Text></View>}
      />

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={[styles.sheetHeader, { backgroundColor: primary }]}>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.close}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                <View style={styles.sheetAvatar}>
                  {selected.avatar ? <Image source={{ uri: selected.avatar }} style={styles.sheetAvatarImg} /> : <Text style={styles.sheetAvatarText}>{selected.firstName.charAt(0)}{selected.lastName.charAt(0)}</Text>}
                </View>
                <Text style={styles.sheetName}>{selected.firstName} {selected.lastName}</Text>
                <View style={styles.sheetMeta}>
                  {selected.rating != null && <Text style={styles.sheetMetaText}>★ {selected.rating.toFixed(1)}</Text>}
                  {selected.experience != null && <Text style={styles.sheetMetaText}> · {selected.experience} yrs</Text>}
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
                {!!selected.bio && <><Text style={styles.secTitle}>About</Text><Text style={styles.bio}>{selected.bio}</Text></>}
                {!!selected.specialties?.length && (
                  <>
                    <Text style={styles.secTitle}>Specialties</Text>
                    <View style={styles.chips}>
                      {selected.specialties.map((s, i) => (
                        <View key={i} style={[styles.pill, { backgroundColor: primary + '12' }]}><Ionicons name="checkmark-circle" size={14} color={primary} /><Text style={[styles.pillText, { color: primary }]}>{s}</Text></View>
                      ))}
                    </View>
                  </>
                )}
                {!!selected.certifications?.length && (
                  <>
                    <Text style={styles.secTitle}>Certifications</Text>
                    {selected.certifications.map((c, i) => (
                      <View key={i} style={styles.certRow}><Ionicons name="ribbon-outline" size={18} color={primary} /><Text style={styles.certText}>{c}</Text></View>
                    ))}
                  </>
                )}
                {selected.hourlyRate != null && (
                  <View style={[styles.priceCard, { backgroundColor: primary + '10' }]}>
                    <Text style={styles.priceLabel}>PERSONAL TRAINING</Text>
                    <Text style={[styles.priceValue, { color: primary }]}>NPR {selected.hourlyRate}<Text style={styles.priceUnit}> /session</Text></Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.outlineBtn, { borderColor: primary }]} onPress={() => Alert.alert('Message sent', 'Your coach will reply in chat shortly.')}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={primary} />
                    <Text style={[styles.outlineText, { color: primary }]}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => { setSelected(null); Alert.alert('Request sent', 'Your PT session request has been sent.'); }}>
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                    <Text style={styles.primaryText}>Book session</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  headerWrap: { paddingTop: 44, marginBottom: Spacing.md },
  h1: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.warningBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  ratingText: { fontSize: FontSize.xs, fontWeight: '800', color: '#92400e' },
  exp: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  chipText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  emptyMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 6 },

  overlay: { flex: 1, backgroundColor: Colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.hero, borderTopRightRadius: BorderRadius.hero, maxHeight: '88%', overflow: 'hidden' },
  sheetHeader: { alignItems: 'center', paddingVertical: Spacing.xl, borderTopLeftRadius: BorderRadius.hero, borderTopRightRadius: BorderRadius.hero },
  close: { position: 'absolute', top: Spacing.md, right: Spacing.md, zIndex: 2 },
  sheetAvatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  sheetAvatarImg: { width: 84, height: 84, borderRadius: 42 },
  sheetAvatarText: { color: '#fff', fontSize: FontSize.title, fontWeight: '800' },
  sheetName: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.sm },
  sheetMeta: { flexDirection: 'row', marginTop: 4 },
  sheetMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, fontWeight: '600' },

  secTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  bio: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  pillText: { fontSize: FontSize.sm, fontWeight: '700' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  certText: { fontSize: FontSize.sm, color: Colors.text },
  priceCard: { borderRadius: BorderRadius.xl2, padding: Spacing.lg, marginTop: Spacing.lg },
  priceLabel: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1 },
  priceValue: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
  priceUnit: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: BorderRadius.full, paddingVertical: Spacing.md },
  outlineText: { fontWeight: '800', fontSize: FontSize.md },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: BorderRadius.full, paddingVertical: Spacing.md },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});
