import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Complaint, User } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";

interface ComplaintManagementProps {
  onBack?: () => void;
}

// ─── Ticket Detail Modal ──────────────────────────────────────────────────────
interface TicketDetailModalProps {
  complaint: Complaint | null;
  visible: boolean;
  onClose: () => void;
  onAssign: (complaint: Complaint) => void;
}

function TicketDetailModal({ complaint, visible, onClose, onAssign }: TicketDetailModalProps) {
  const slideAnim = useRef(new Animated.Value(700)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 700,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (!complaint && !visible) return null;

  const c = complaint;
  const statusColor: Record<string, string> = {
    pending: Theme.colors.pending,
    in_progress: Theme.colors.in_progress ?? "#F59E0B",
    resolved: Theme.colors.resolved,
  };
  const severityColor: Record<string, string> = {
    low: Theme.colors.resolved,
    medium: "#F59E0B",
    high: Theme.colors.high,
  };

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[detailStyles.overlay, { opacity: fadeAnim }]}>
        {/* Tap backdrop to close */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[detailStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle */}
          <View style={detailStyles.dragHandle} />

          {/* Header */}
          <View style={detailStyles.sheetHeader}>
            <View>
              <Text style={detailStyles.ticketLabel}>TICKET #{c?.id}</Text>
              <Text style={detailStyles.sheetTitle} numberOfLines={2}>{c?.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={detailStyles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Status & Severity Row */}
            <View style={detailStyles.badgeRow}>
              <View style={[detailStyles.statusPill, { backgroundColor: statusColor[c?.status ?? "pending"] + "22", borderColor: statusColor[c?.status ?? "pending"] }]}>
                <View style={[detailStyles.statusDot, { backgroundColor: statusColor[c?.status ?? "pending"] }]} />
                <Text style={[detailStyles.statusPillText, { color: statusColor[c?.status ?? "pending"] }]}>
                  {String(c?.status ?? "").replace("_", " ").toUpperCase()}
                </Text>
              </View>
              <View style={[detailStyles.severityPill, { backgroundColor: severityColor[c?.severity ?? "low"] + "22", borderColor: severityColor[c?.severity ?? "low"] }]}>
                <Ionicons name="alert-circle-outline" size={12} color={severityColor[c?.severity ?? "low"]} />
                <Text style={[detailStyles.severityPillText, { color: severityColor[c?.severity ?? "low"] }]}>
                  {String(c?.severity ?? "").toUpperCase()} PRIORITY
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionLabel}>Description</Text>
              <Text style={detailStyles.descText}>{c?.description || "—"}</Text>
            </View>

            {/* Info Grid */}
            <View style={detailStyles.infoGrid}>
              <InfoTile icon="construct-outline" label="Category" value={c?.category ?? "—"} color="#7C3AED" />
              <InfoTile icon="business-outline" label="Hostel" value={c?.hostel_name ?? "—"} color={Theme.colors.primary} />
              <InfoTile icon="bed-outline" label="Room No." value={c?.room_number ?? "—"} color={Theme.colors.secondary} />
              <InfoTile icon="person-outline" label="Student" value={c?.student?.full_name ?? "—"} color="#059669" />
              <InfoTile
                icon="person-circle-outline"
                label="Assigned Staff"
                value={c?.worker?.full_name ?? "Awaiting Dispatch"}
                color={c?.worker ? Theme.colors.resolved : Theme.colors.pending}
              />
              <InfoTile icon="call-outline" label="Student Phone" value={c?.student?.phone_number ?? "—"} color={Theme.colors.accent} />
              <InfoTile icon="calendar-outline" label="Filed On" value={formatDate(c?.created_at)} color={Theme.colors.textLight} />
              <InfoTile icon="refresh-outline" label="Last Updated" value={formatDate(c?.updated_at)} color={Theme.colors.textLight} />
            </View>

            {/* Assign / Reassign button */}
            {c && c.status !== "resolved" && (
              <TouchableOpacity
                style={detailStyles.assignBtn}
                onPress={() => { onClose(); setTimeout(() => onAssign(c), 300); }}
                activeOpacity={0.85}
              >
                <Ionicons name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={detailStyles.assignBtnText}>
                  {c.worker ? "Reassign Staff" : "Dispatch Staff"}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Info Tile ────────────────────────────────────────────────────────────────
function InfoTile({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={detailStyles.infoTile}>
      <View style={[detailStyles.infoIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={detailStyles.infoLabel}>{label}</Text>
        <Text style={detailStyles.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ComplaintManagementScreen({ onBack }: ComplaintManagementProps = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Assignment modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Ticket detail modal state
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const detailCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();

  // ─── Android hardware back button ────────────────────────────────────────────
  useBackHandler(
    useCallback(() => {
      if (detailModalVisible) { handleCloseDetail(); return true; }
      if (modalVisible) { setModalVisible(false); return true; }
      if (onBack) { onBack(); return true; }
      return false;
    }, [detailModalVisible, modalVisible, onBack])
  );

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (detailCloseRef.current) clearTimeout(detailCloseRef.current);
    };
  }, []);

  // ─── Worker Sorting Logic ──────────────────────────────────────────────────────
  const getSortedWorkersForComplaint = useCallback((complaint: Complaint | null, allWorkers: User[]) => {
    if (!complaint) return allWorkers;

    const catMapping: Record<string, string> = {
      plumbing: "Plumber",
      electrical: "Electrician",
      carpentry: "Carpenter",
      housekeeping: "Housekeeping Staff",
      other: "General Maintenance Worker",
    };

    const targetStaffCategory = catMapping[complaint.category?.toLowerCase()] || "General Maintenance Worker";

    return [...allWorkers].sort((a, b) => {
      const aMatch = a.staff_category === targetStaffCategory ? 1 : 0;
      const bMatch = b.staff_category === targetStaffCategory ? 1 : 0;
      
      if (aMatch !== bMatch) {
        return bMatch - aMatch; // Recommended first
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, []);

  // ─── Initial data load ────────────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      const compData = await apiService.get<Complaint[]>("/complaints");
      const filteredComp = user?.role === "hostel_admin" && user?.hostel_id
        ? compData.filter(c => c.hostel_id === user.hostel_id || c.student?.hostel_id === user.hostel_id)
        : compData;
      setComplaints(filteredComp);

      const workerData = await apiService.get<User[]>("/admin/workers");
      setWorkers(workerData);
    } catch (err) {
      console.error("Failed to load dispatch board data:", err);
      Alert.alert("Error", "Could not load dispatch data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Search logic (debounced, client-side) ────────────────────────────────────
  // The search filters the already-loaded complaints array locally by ticket number.
  // For large datasets it also calls GET /complaints/search?q= on the backend.
  const filteredComplaints = useCallback((): Complaint[] => {
    const q = searchQuery.trim();
    if (!q) return complaints;
    // Match ticket number as prefix (e.g. "12" matches #12, #120, #125…)
    return complaints.filter(c =>
      String(c.id).startsWith(q)
    );
  }, [searchQuery, complaints])();

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setSearchError(null);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const q = text.trim();
    if (!q) { setIsSearching(false); return; }

    // Validate: ticket IDs are numbers only
    if (!/^\d+$/.test(q)) {
      setSearchError("Ticket numbers contain digits only.");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    setSearchError(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  // ─── Ticket detail modal ──────────────────────────────────────────────────────
  const handleOpenDetail = (complaint: Complaint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailComplaint(complaint);
    setDetailModalVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    if (detailCloseRef.current) clearTimeout(detailCloseRef.current);
    detailCloseRef.current = setTimeout(() => setDetailComplaint(null), 400);
  };

  // ─── Worker assignment ────────────────────────────────────────────────────────
  const handleOpenAssignModal = (complaint: Complaint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedComplaint(complaint);
    setModalVisible(true);
  };

  const handleAssignWorker = async (workerId: number, workerName: string) => {
    if (!selectedComplaint) return;
    setIsAssigning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiService.post(`/admin/complaints/${selectedComplaint.id}/assign`, {
        worker_id: workerId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Worker Dispatched", `Complaint has been successfully assigned to: ${workerName}`);
      setModalVisible(false);
      setSelectedComplaint(null);

      // Refresh the complaints list
      const compData = await apiService.get<Complaint[]>("/complaints");
      const filteredComp = user?.role === "hostel_admin" && user?.hostel_id
        ? compData.filter(c => c.hostel_id === user.hostel_id || c.student?.hostel_id === user.hostel_id)
        : compData;
      setComplaints(filteredComp);
    } catch (err: any) {
      Alert.alert("Dispatch Failed", err.message || "Failed to assign worker.");
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Card renderer ────────────────────────────────────────────────────────────
  const renderComplaintCard = ({ item }: { item: Complaint }) => (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => handleOpenDetail(item)}
      style={{ marginBottom: Theme.spacing.md }}
    >
      <Card style={styles.card} elevation="low">
        <View style={styles.cardHeader}>
          <View style={styles.ticketNumRow}>
            <View style={styles.ticketNumBadge}>
              <Text style={styles.ticketNumText}>#{item.id}</Text>
            </View>
            <Text style={styles.ticketHint}>Tap for details</Text>
          </View>
          <View style={styles.row}>
            <Badge type="status" value={item.status} label={String(item.status || "").replace("_", " ")} style={{ marginRight: 6 }} />
            <Badge type="severity" value={item.severity} label={item.severity} />
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="construct-outline" size={13} color={Theme.colors.textLight} />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={Theme.colors.textLight} />
            <Text style={styles.metaText}>{item.hostel_name}, Rm {item.room_number}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.workerAssignRow}>
            <Ionicons
              name={item.worker ? "person-circle" : "alert-circle"}
              size={16}
              color={item.worker ? Theme.colors.resolved : Theme.colors.pending}
            />
            <Text style={[styles.workerAssignText, { color: item.worker ? Theme.colors.text : Theme.colors.pending }]}>
              {item.worker ? `Technician: ${item.worker.full_name}` : "Awaiting Dispatch"}
            </Text>
          </View>

          {item.status !== "resolved" && (
            <TouchableOpacity
              style={styles.dispatchBtn}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleOpenAssignModal(item);
              }}
            >
              <Ionicons name="send-outline" size={12} color={Theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.dispatchBtnText}>
                {item.worker ? "Reassign" : "Assign Staff"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  // ─── Search result count / status bar ─────────────────────────────────────────
  const renderSearchStatus = () => {
    if (!searchQuery.trim()) return null;
    if (searchError) {
      return (
        <View style={styles.searchStatusRow}>
          <Ionicons name="warning-outline" size={13} color={Theme.colors.high} />
          <Text style={[styles.searchStatusText, { color: Theme.colors.high }]}>{searchError}</Text>
        </View>
      );
    }
    if (isSearching) {
      return (
        <View style={styles.searchStatusRow}>
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.searchStatusText}>Searching…</Text>
        </View>
      );
    }
    const count = filteredComplaints.length;
    return (
      <View style={styles.searchStatusRow}>
        <Ionicons name="filter-outline" size={13} color={Theme.colors.secondary} />
        <Text style={[styles.searchStatusText, { color: Theme.colors.secondary }]}>
          {count === 0
            ? "No tickets found."
            : `${count} ticket${count !== 1 ? "s" : ""} matching "#${searchQuery.trim()}"`}
        </Text>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Dispatch Control Board" showBackButton onBack={onBack} />

      <ResponsiveContainer>
        {/* Banner */}
        <View style={styles.subBanner}>
          <Text style={styles.title}>All Tickets</Text>
          <Text style={styles.subtitle}>
            {searchQuery.trim()
              ? `${filteredComplaints.length} of ${complaints.length} tickets`
              : `${complaints.length} maintenance tickets logged`}
          </Text>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, searchError ? styles.searchInputError : null]}>
            <Ionicons
              name="search-outline"
              size={18}
              color={searchQuery ? Theme.colors.primary : Theme.colors.textLight}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Ticket Number..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={handleSearchChange}
              keyboardType="number-pad"
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={Theme.colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search status pill */}
        {renderSearchStatus()}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loaderText}>Loading dispatch board…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredComplaints}
            renderItem={renderComplaintCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={searchQuery.trim() ? "search-outline" : "clipboard-outline"}
                  size={64}
                  color={Theme.colors.textLight}
                  style={{ opacity: 0.4 }}
                />
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() ? "No Tickets Found" : "Zero Tickets Logged"}
                </Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery.trim()
                    ? `No ticket with number matching "${searchQuery.trim()}" was found.`
                    : "Students haven't submitted any complaints yet."}
                </Text>
                {searchQuery.trim() ? (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearSearchBtn}>
                    <Text style={styles.clearSearchBtnText}>Clear Search</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        )}
      </ResponsiveContainer>

      {/* ── Ticket Detail Modal ── */}
      <TicketDetailModal
        complaint={detailComplaint}
        visible={detailModalVisible}
        onClose={handleCloseDetail}
        onAssign={handleOpenAssignModal}
      />

      {/* ── Dispatch Assignment Modal ── */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dispatch Technician</Text>
                <Text style={styles.modalSubtitle}>Ticket #{selectedComplaint?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSectionTitle}>
                Select a technician to assign to this ticket:
              </Text>

              {isAssigning ? (
                <ActivityIndicator size="small" color={Theme.colors.primary} style={{ padding: 20 }} />
              ) : workers.length === 0 ? (
                <Text style={styles.emptyWorkersText}>
                  No active workers registered in directory. Please create a worker account first!
                </Text>
              ) : (
                getSortedWorkersForComplaint(selectedComplaint, workers).map((worker, index) => {
                  const targetStaffCategory = selectedComplaint 
                    ? ({
                        plumbing: "Plumber",
                        electrical: "Electrician",
                        carpentry: "Carpenter",
                        housekeeping: "Housekeeping Staff",
                        other: "General Maintenance Worker",
                      }[selectedComplaint.category?.toLowerCase()] || "General Maintenance Worker")
                    : "";
                  const isRecommended = worker.staff_category === targetStaffCategory;

                  return (
                  <TouchableOpacity
                    key={worker.id}
                    onPress={() => handleAssignWorker(worker.id, worker.full_name)}
                    style={styles.workerSelectBtn}
                    activeOpacity={0.75}
                  >
                    <View style={styles.workerRow}>
                      <View style={styles.workerAvatar}>
                        <Text style={styles.workerAvatarText}>
                          {worker.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.workerInfo}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.workerSelectName}>{worker.full_name}</Text>
                          {isRecommended && (
                            <View style={{ backgroundColor: "#E8F5E9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, color: "#2E7D32", fontWeight: "800", textTransform: "uppercase" }}>Match</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.workerSelectEmail}>{worker.staff_category || "General Maintenance Worker"}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Theme.colors.textLight} />
                  </TouchableOpacity>
                )})
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Detail Modal Styles ──────────────────────────────────────────────────────
const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 42, 102, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4FC",
  },
  ticketLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Theme.colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.text,
    maxWidth: 260,
    lineHeight: 24,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F0F4FC",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 5,
  },
  severityPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  descText: {
    fontSize: 14,
    color: Theme.colors.text,
    lineHeight: 22,
  },
  infoGrid: {
    gap: 4,
    marginBottom: 24,
  },
  infoTile: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4FC",
    gap: 12,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.colors.text,
  },
  assignBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: Theme.roundness.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  assignBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});

// ─── Main Screen Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loaderText: {
    color: Theme.colors.textLight,
    marginTop: 12,
    fontWeight: "500",
    fontSize: 14,
  },
  subBanner: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "500",
    marginTop: 2,
  },
  // ── Search Bar ──
  searchContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FC",
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInputError: {
    borderColor: Theme.colors.high,
    backgroundColor: "#FFF5F5",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.text,
    paddingVertical: 0,
    outlineStyle: "none" as any,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
  },
  searchStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xs,
    gap: 5,
  },
  searchStatusText: {
    fontSize: 12,
    color: Theme.colors.secondary,
    fontWeight: "600",
  },
  // ── Cards ──
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ticketNumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketNumBadge: {
    backgroundColor: Theme.colors.primary + "18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketNumText: {
    fontSize: 12,
    fontWeight: "800",
    color: Theme.colors.primary,
    textTransform: "uppercase",
  },
  ticketHint: {
    fontSize: 11,
    color: Theme.colors.textLight,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Theme.colors.textLight,
    lineHeight: 19,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Theme.colors.textLight,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workerAssignRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  workerAssignText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  dispatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  dispatchBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  // ── Empty state ──
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Theme.colors.text,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: Theme.colors.textLight,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  clearSearchBtn: {
    marginTop: 20,
    backgroundColor: Theme.colors.primary + "18",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  clearSearchBtnText: {
    color: Theme.colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  // ── Dispatch modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 42, 102, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: Theme.roundness.xl,
    borderTopRightRadius: Theme.roundness.xl,
    paddingTop: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Theme.colors.textLight,
    fontWeight: "600",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalList: {
    padding: 24,
    paddingBottom: 40,
  },
  modalSectionTitle: {
    fontSize: 14,
    color: Theme.colors.textLight,
    fontWeight: "600",
    marginBottom: 16,
  },
  emptyWorkersText: {
    color: Theme.colors.high,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    padding: 20,
    lineHeight: 20,
  },
  workerSelectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  workerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.primary + "22",
    justifyContent: "center",
    alignItems: "center",
  },
  workerAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  workerInfo: {
    marginLeft: 12,
  },
  workerSelectName: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  workerSelectEmail: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 2,
  },
});
