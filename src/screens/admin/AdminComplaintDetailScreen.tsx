/**
 * AdminComplaintDetailScreen.tsx
 *
 * Full-detail view for a single complaint, opened when an admin taps a row
 * in AdminComplaintListScreen.
 *
 * Displays:
 *  - Ticket number, title, description
 *  - Status + severity badges
 *  - Student info (name, ID, room, hostel, phone)
 *  - Assigned worker info
 *  - Category, priority
 *  - Timeline (comments / activity log)
 *  - Resolution notes (if resolved)
 *  - Admin message input
 *  - Created / updated dates
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Complaint, Comment } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { StatusTimeline } from "../../components/ui/StatusTimeline";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";

interface AdminComplaintDetailScreenProps {
  /** Pass either a full Complaint object (already fetched) or just the ID */
  complaint: Complaint;
  onBack: () => void;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────
const STATUS_META: Record<string, { color: string; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }> = {
  pending:     { color: Theme.colors.pending,     icon: "time-outline",              label: "Pending"     },
  in_progress: { color: Theme.colors.in_progress, icon: "construct-outline",         label: "In Progress" },
  resolved:    { color: Theme.colors.resolved,    icon: "checkmark-circle-outline",  label: "Resolved"    },
};
const SEV_COLORS: Record<string, string> = {
  low:    Theme.colors.resolved,
  medium: "#F59E0B",
  high:   Theme.colors.high,
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Info tile ────────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  color = Theme.colors.primary,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={tile.row}>
      <View style={[tile.iconBox, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tile.label}>{label}</Text>
        <Text style={tile.value}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const tile = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4FC",
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.colors.text,
  },
});

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ title }: { title: string }) {
  return (
    <View style={sh.container}>
      <Text style={sh.text}>{title}</Text>
      <View style={sh.line} />
    </View>
  );
}
const sh = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 4 },
  text: { fontSize: 11, fontWeight: "800", color: Theme.colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginRight: 8 },
  line: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminComplaintDetailScreen({
  complaint: initialComplaint,
  onBack,
}: AdminComplaintDetailScreenProps) {
  const [complaint, setComplaint] = useState<Complaint>(initialComplaint);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // Android back button
  useBackHandler(useCallback(() => { onBack(); return true; }, [onBack]));

  // ─── Load comments + refresh complaint ──────────────────────────────────────
  const loadDetail = useCallback(async () => {
    setCommentsError(null);
    try {
      // Refresh complaint in background (to get updated_at, worker, etc.)
      const fresh = await apiService.get<Complaint>(`/complaints/${complaint.id}`);
      setComplaint(fresh);
    } catch {
      // Silently fall back to the passed-in object — detail is still shown
    }
    try {
      const comms = await apiService.get<Comment[]>(`/complaints/${complaint.id}/comments`);
      setComments(comms);
    } catch (err: any) {
      setCommentsError(err.message || "Could not load activity timeline.");
    } finally {
      setIsLoadingComments(false);
      setIsRefreshing(false);
    }
  }, [complaint.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // ─── Post comment / admin message ────────────────────────────────────────────
  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const added = await apiService.post<Comment>(`/complaints/${complaint.id}/comments`, {
        text: newComment.trim(),
      });
      setComments(prev => [...prev, added]);
      setNewComment("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Failed", err.message || "Could not post message.");
    } finally {
      setIsPosting(false);
    }
  };

  // ─── Derived values ───────────────────────────────────────────────────────────
  const statusMeta = STATUS_META[complaint.status] ?? {
    color: Theme.colors.textLight,
    icon: "ellipse-outline" as const,
    label: complaint.status,
  };
  const sevColor = SEV_COLORS[complaint.severity] ?? Theme.colors.textLight;
  const registrationId = `TKT-${String(complaint.id).padStart(5, "0")}`;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Header
        title={`Ticket #${complaint.id}`}
        showBackButton
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>

          {/* ── Hero Card ── */}
          <Card style={styles.card}>
            {/* Ticket ID row */}
            <View style={styles.heroTopRow}>
              <View style={[styles.tktBadge, { backgroundColor: statusMeta.color + "18" }]}>
                <Ionicons name={statusMeta.icon} size={14} color={statusMeta.color} />
                <Text style={[styles.tktBadgeText, { color: statusMeta.color }]}>
                  {registrationId}
                </Text>
              </View>
              <Badge
                type="status"
                value={complaint.status}
                label={statusMeta.label}
              />
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>{complaint.title}</Text>

            {/* Severity pill */}
            <View style={[styles.sevPill, { backgroundColor: sevColor + "18", borderColor: sevColor }]}>
              <Ionicons name="alert-circle-outline" size={13} color={sevColor} />
              <Text style={[styles.sevText, { color: sevColor }]}>
                {complaint.severity.toUpperCase()} PRIORITY
              </Text>
            </View>

            {/* Description */}
            <SectionHeading title="Description" />
            <Text style={styles.descText}>{complaint.description}</Text>

            {/* Attached image */}
            {complaint.image_url ? (
              <>
                <SectionHeading title="Attached Photo" />
                <Image
                  source={{ uri: complaint.image_url }}
                  style={styles.attachedImage}
                  resizeMode="cover"
                />
              </>
            ) : null}
          </Card>

          {/* ── Complaint Info ── */}
          <Card style={styles.card}>
            <SectionHeading title="Complaint Details" />
            <InfoRow icon="construct-outline"    label="Category"    value={complaint.category}    color="#7C3AED" />
            <InfoRow icon="business-outline"     label="Hostel"      value={complaint.hostel_name} color={Theme.colors.primary} />
            <InfoRow icon="bed-outline"          label="Room No."    value={complaint.room_number} color={Theme.colors.secondary} />
            <InfoRow icon="calendar-outline"     label="Filed On"    value={formatDate(complaint.created_at)} color={Theme.colors.textLight} />
            <InfoRow icon="refresh-outline"      label="Last Updated" value={formatDate(complaint.updated_at)} color={Theme.colors.textLight} />
          </Card>

          {/* ── Student Info ── */}
          <Card style={styles.card}>
            <SectionHeading title="Student Information" />
            <InfoRow
              icon="person-outline"
              label="Full Name"
              value={complaint.student?.full_name ?? "—"}
              color={Theme.colors.secondary}
            />
            <InfoRow
              icon="card-outline"
              label="Student ID"
              value={complaint.student ? `USR-${String(complaint.student.id).padStart(4, "0")}` : "—"}
              color={Theme.colors.secondary}
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={complaint.student?.email ?? "—"}
              color={Theme.colors.secondary}
            />
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={complaint.student?.phone_number ?? "Not provided"}
              color={Theme.colors.secondary}
            />
          </Card>

          {/* ── Assigned Worker ── */}
          <Card style={styles.card}>
            <SectionHeading title="Assigned Technician" />
            {complaint.worker ? (
              <>
                <View style={styles.workerHero}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerAvatarText}>
                      {complaint.worker.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.workerName}>{complaint.worker.full_name}</Text>
                    <Text style={styles.workerSub}>{complaint.worker.email}</Text>
                  </View>
                  <View style={styles.workerActiveBadge}>
                    <Text style={styles.workerActiveBadgeText}>ACTIVE</Text>
                  </View>
                </View>
                <InfoRow
                  icon="call-outline"
                  label="Contact"
                  value={complaint.worker.phone_number ?? "No contact info"}
                  color={Theme.colors.resolved}
                />
              </>
            ) : (
              <View style={styles.unassignedBox}>
                <Ionicons name="time-outline" size={28} color={Theme.colors.pending} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.unassignedTitle}>Awaiting Dispatch</Text>
                  <Text style={styles.unassignedSub}>
                    No technician assigned yet. Use the Dispatch Board to assign staff.
                  </Text>
                </View>
              </View>
            )}
          </Card>

          {/* ── Resolution Notes (resolved only) ── */}
          {complaint.status === "resolved" && (
            <Card style={styles.card}>
              <SectionHeading title="Resolution" />
              {complaint.resolved_image_url ? (
                <Image
                  source={{ uri: complaint.resolved_image_url }}
                  style={styles.resolvedImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.resolvedBanner}>
                <Ionicons name="checkmark-circle" size={20} color={Theme.colors.resolved} />
                <Text style={styles.resolvedText}>
                  This ticket was marked as resolved on {formatDate(complaint.updated_at)}.
                </Text>
              </View>
            </Card>
          )}

          {/* ── Timeline ── */}
          <Card style={styles.card}>
            <SectionHeading title="Activity Timeline" />
            {isLoadingComments ? (
              <ActivityIndicator
                size="small"
                color={Theme.colors.primary}
                style={{ paddingVertical: 20 }}
              />
            ) : commentsError ? (
              <View style={styles.timelineError}>
                <Ionicons name="warning-outline" size={18} color={Theme.colors.pending} />
                <Text style={styles.timelineErrorText}>{commentsError}</Text>
                <TouchableOpacity onPress={loadDetail}>
                  <Text style={styles.timelineRetry}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <StatusTimeline comments={comments} />
            )}
          </Card>

          {/* ── Admin message input ── */}
          <Card style={styles.card}>
            <SectionHeading title="Post Internal Note" />
            <Input
              placeholder="Type an instruction, note or update…"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              numberOfLines={3}
              style={styles.commentInput}
            />
            <Button
              title="Send Note"
              onPress={handlePostComment}
              loading={isPosting}
              disabled={!newComment.trim()}
              variant="secondary"
            />
          </Card>

        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scroll: { padding: Theme.spacing.md, paddingBottom: Theme.spacing.xxl },
  card: { marginBottom: Theme.spacing.md, width: "100%" },

  // Hero
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tktBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  tktBadgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
    marginBottom: 10,
    lineHeight: 26,
  },
  sevPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 5,
    marginBottom: 4,
  },
  sevText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  descText: {
    fontSize: 14,
    color: Theme.colors.text,
    lineHeight: 22,
    marginTop: 8,
  },
  attachedImage: {
    width: "100%",
    height: 180,
    borderRadius: Theme.roundness.md,
    marginTop: 10,
  },

  // Worker
  workerHero: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  workerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Theme.colors.primary + "22",
    justifyContent: "center",
    alignItems: "center",
  },
  workerAvatarText: { fontSize: 18, fontWeight: "700", color: Theme.colors.primary },
  workerName: { fontSize: 15, fontWeight: "700", color: Theme.colors.text },
  workerSub: { fontSize: 12, color: Theme.colors.textLight, marginTop: 2 },
  workerActiveBadge: {
    backgroundColor: Theme.colors.resolved + "22",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  workerActiveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Theme.colors.resolved,
    letterSpacing: 0.5,
  },
  unassignedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF9F2",
    borderRadius: Theme.roundness.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFEEDD",
    marginTop: 8,
  },
  unassignedTitle: { fontSize: 14, fontWeight: "700", color: Theme.colors.pending },
  unassignedSub: {
    fontSize: 12,
    color: Theme.colors.textLight,
    lineHeight: 18,
    marginTop: 3,
    fontWeight: "500",
  },

  // Resolution
  resolvedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Theme.colors.resolved + "12",
    borderRadius: Theme.roundness.md,
    padding: 12,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Theme.colors.resolved + "40",
  },
  resolvedText: {
    fontSize: 13,
    color: Theme.colors.resolved,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  resolvedImage: {
    width: "100%",
    height: 160,
    borderRadius: Theme.roundness.md,
    marginBottom: 10,
  },

  // Timeline error
  timelineError: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    backgroundColor: "#FFF9F2",
    borderRadius: Theme.roundness.md,
  },
  timelineErrorText: { flex: 1, fontSize: 13, color: Theme.colors.textLight },
  timelineRetry: { color: Theme.colors.primary, fontWeight: "700", fontSize: 13 },

  // Comment input
  commentInput: {
    height: 70,
    textAlignVertical: "top",
    paddingTop: 8,
    marginBottom: 12,
  },
});
