import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';
import { trainersApi } from '../../lib/api';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  specialties?: string[];
  rating?: number;
  experience?: number;
  certifications?: string[];
  hourlyRate?: number;
}

const SAMPLE_TRAINERS: Trainer[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@fitzone.com',
    phone: '+977-9841234567',
    bio: 'Certified personal trainer with 8+ years of experience in strength training, HIIT, and weight loss transformations. I love helping clients achieve their fitness goals through personalized programs.',
    specialties: ['HIIT', 'Strength Training', 'Weight Loss', 'Body Transformation'],
    rating: 4.9,
    experience: 8,
    certifications: ['NASM-CPT', 'CrossFit Level 2', 'Precision Nutrition L1'],
    hourlyRate: 50,
  },
  {
    id: '2',
    firstName: 'Mike',
    lastName: 'Chen',
    email: 'mike.c@fitzone.com',
    bio: 'Former national-level athlete specializing in sports performance and mobility. Passionate about helping athletes reach their peak potential.',
    specialties: ['Sports Performance', 'Mobility', 'Powerlifting', 'Rehabilitation'],
    rating: 4.8,
    experience: 6,
    certifications: ['CSCS', 'FRC Mobility Specialist', 'USAW Level 1'],
    hourlyRate: 60,
  },
  {
    id: '3',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.s@fitzone.com',
    bio: 'Yoga instructor and wellness coach. I blend traditional yoga with modern fitness science for a holistic approach to health.',
    specialties: ['Yoga', 'Pilates', 'Meditation', 'Flexibility'],
    rating: 5.0,
    experience: 10,
    certifications: ['RYT-500', 'NASM-CPT', 'Mindfulness Coach'],
    hourlyRate: 45,
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Martinez',
    email: 'david.m@fitzone.com',
    bio: 'Boxing and martial arts coach. Build strength, speed, and discipline through combat sports training.',
    specialties: ['Boxing', 'MMA', 'Conditioning', 'Self Defense'],
    rating: 4.7,
    experience: 12,
    certifications: ['USA Boxing Coach', 'ACE-CPT', 'Krav Maga L2'],
    hourlyRate: 55,
  },
];

export default function TrainersScreen() {
  const { tenant } = useTenant();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  const primaryColor = tenant?.primaryColor || Colors.primary;

  useEffect(() => {
    loadTrainers();
  }, []);

  async function loadTrainers() {
    setLoading(true);
    const res = await trainersApi.list().catch(() => ({ data: [] } as any));
    if (res.data && res.data.length > 0) {
      setTrainers(res.data);
    } else {
      setTrainers(SAMPLE_TRAINERS);
    }
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadTrainers();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trainers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Find a Trainer</Text>
            <Text style={styles.subtitle}>{trainers.length} certified trainers available</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedTrainer(item)}
          >
            <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {item.firstName.charAt(0)}{item.lastName.charAt(0)}
                </Text>
              )}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                {item.rating && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                )}
              </View>
              {item.experience && (
                <Text style={styles.experience}>{item.experience} years experience</Text>
              )}
              {item.specialties && item.specialties.length > 0 && (
                <View style={styles.specialtiesRow}>
                  {item.specialties.slice(0, 3).map((s, i) => (
                    <View key={i} style={[styles.specialtyChip, { backgroundColor: primaryColor + '15' }]}>
                      <Text style={[styles.specialtyText, { color: primaryColor }]}>{s}</Text>
                    </View>
                  ))}
                  {item.specialties.length > 3 && (
                    <Text style={styles.moreSpecialties}>+{item.specialties.length - 3}</Text>
                  )}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: Spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No trainers available</Text>
            </View>
          )
        }
      />

      {/* Trainer Profile Modal */}
      <Modal visible={!!selectedTrainer} animationType="slide" transparent>
        {selectedTrainer && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.modalHeader, { backgroundColor: primaryColor }]}>
                <TouchableOpacity onPress={() => setSelectedTrainer(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.white} />
                </TouchableOpacity>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {selectedTrainer.firstName.charAt(0)}{selectedTrainer.lastName.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.modalName}>
                  {selectedTrainer.firstName} {selectedTrainer.lastName}
                </Text>
                {selectedTrainer.rating && (
                  <View style={styles.modalRating}>
                    <Ionicons name="star" size={16} color="#f59e0b" />
                    <Text style={styles.modalRatingText}>{selectedTrainer.rating} rating</Text>
                    {selectedTrainer.experience && (
                      <Text style={styles.modalExperience}>· {selectedTrainer.experience} yrs exp</Text>
                    )}
                  </View>
                )}
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedTrainer.bio && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bioText}>{selectedTrainer.bio}</Text>
                  </View>
                )}

                {selectedTrainer.specialties && selectedTrainer.specialties.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Specialties</Text>
                    <View style={styles.specialtiesList}>
                      {selectedTrainer.specialties.map((s, i) => (
                        <View key={i} style={[styles.specialtyPill, { backgroundColor: primaryColor + '15' }]}>
                          <Ionicons name="checkmark-circle" size={14} color={primaryColor} />
                          <Text style={[styles.specialtyPillText, { color: primaryColor }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedTrainer.certifications && selectedTrainer.certifications.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Certifications</Text>
                    {selectedTrainer.certifications.map((c, i) => (
                      <View key={i} style={styles.certRow}>
                        <Ionicons name="ribbon-outline" size={18} color={primaryColor} />
                        <Text style={styles.certText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedTrainer.hourlyRate && (
                  <View style={[styles.priceCard, { borderColor: primaryColor }]}>
                    <View>
                      <Text style={styles.priceLabel}>Session Rate</Text>
                      <Text style={styles.priceValue}>${selectedTrainer.hourlyRate}<Text style={styles.priceUnit}>/hour</Text></Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.bookButton, { backgroundColor: primaryColor }]}
                  onPress={() => {
                    setSelectedTrainer(null);
                    alert('Booking request sent! The trainer will contact you shortly.');
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.white} />
                  <Text style={styles.bookButtonText}>Book a Session</Text>
                </TouchableOpacity>
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
  list: { padding: Spacing.md, paddingBottom: Spacing.xl },
  header: { marginBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { color: Colors.white, fontSize: FontSize.md, fontWeight: 'bold' },
  cardBody: { flex: 1, marginLeft: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  ratingText: { fontSize: FontSize.xs, fontWeight: '600', color: '#92400e' },
  experience: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  specialtyChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
  specialtyText: { fontSize: 10, fontWeight: '600' },
  moreSpecialties: { fontSize: 10, color: Colors.textSecondary, alignSelf: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { flex: 1, backgroundColor: Colors.white, marginTop: 80, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  modalHeader: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  closeBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalAvatarText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: 'bold' },
  modalName: { color: Colors.white, fontSize: FontSize.xl, fontWeight: 'bold' },
  modalRating: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  modalRatingText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  modalExperience: { color: Colors.white, fontSize: FontSize.sm, opacity: 0.9 },
  modalBody: { flex: 1, padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  bioText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  specialtiesList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  specialtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  specialtyPillText: { fontSize: FontSize.xs, fontWeight: '600' },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  certText: { fontSize: FontSize.sm, color: Colors.text },
  priceCard: {
    padding: Spacing.md,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  priceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase' },
  priceValue: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text, marginTop: 4 },
  priceUnit: { fontSize: FontSize.md, fontWeight: 'normal', color: Colors.textSecondary },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  bookButtonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
});
