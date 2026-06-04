/**
 * UserProfileModal.tsx
 *
 * Displays a full-screen slide-up profile modal for a selected student or staff member.
 *
 * FIX NOTES (2026-06-02):
 *  - Root cause of "Not Found": the modal was calling GET /admin/users/{id} against the
 *    PRODUCTION Render backend which doesn't have the new endpoint yet. This caused a
 *    FastAPI default 404 {"detail":"Not Found"} response.
 *
 *  - Fix strategy:
 *    1. Accept the full `User` object as a prop (already fetched from /admin/students or
 *       /admin/workers when the list loaded). Display immediately — no initial API call.
 *    2. Try to enrich the data from GET /admin/users/{id} in the background. If that
 *       fails (404, network error, etc.) we silently fall back to the pre-fetched data.
 *    3. Edit / Delete still call the new endpoints. Those errors are surfaced normally.
 *
 * Debug logging:
 *  - Every significant step logs to console.log so issues can be traced.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Dropdown } from "../../components/ui/Dropdown";
import { Theme } from "../../constants/theme";
import { User } from "../../types";

// ─── Props ────────────────────────────────────────────────────────────────────
interface UserProfileModalProps {
  /** The full user object already fetched from the list — displayed immediately */
  user: User | null;
  visible: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
  onUserDeleted: (deletedUserId: number) => void;
  onStatusToggled: (updatedUser: User) => void;
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
const DetailRow = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  accent?: string;
}) => (
  <View style={dr.row}>
    <View style={[dr.iconBox, { backgroundColor: accent ? `${accent}18` : "#F0F4FC" }]}>
      <Ionicons name={icon} size={16} color={accent || Theme.colors.secondary} />
    </View>
    <View style={dr.textBox}>
      <Text style={dr.label}>{label}</Text>
      <Text style={[dr.value, !value && dr.valueEmpty]}>{value || "—"}</Text>
    </View>
  </View>
);

const dr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4FC",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textBox: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.colors.text,
  },
  valueEmpty: { color: Theme.colors.textLight, fontStyle: "italic" },
});

// ─── Section Heading ──────────────────────────────────────────────────────────
const SectionHeading = ({ title }: { title: string }) => (
  <View style={sh.container}>
    <Text style={sh.text}>{title}</Text>
    <View style={sh.line} />
  </View>
);

const sh = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    color: Theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginRight: 8,
  },
  line: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  visible,
  onClose,
  onUserUpdated,
  onUserDeleted,
  onStatusToggled,
}) => {
  /**
   * `profile` starts as the pre-fetched `user` from the list.
   * If background enrichment succeeds it gets replaced with richer data.
   */
  const [profile, setProfile] = useState<User | null>(null);
  const [isEnriching, setIsEnriching] = useState(false); // background enrich indicator
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editStaffCategory, setEditStaffCategory] = useState("");

  // Slide-in animation
  const slideAnim = useState(new Animated.Value(600))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  // ─── Sync pre-fetched user into local state when modal opens ─────────────
  useEffect(() => {
    if (visible && user) {
      console.log("[UserProfileModal] Opening for user:", user.id, user.full_name, "role:", user.role);
      setProfile(user);
      setEditName(user.full_name);
      setEditEmail(user.email);
      setEditPhone(user.phone_number || "");
      setEditStaffCategory(user.staff_category || "");
      setEditPassword("");
      setIsEditing(false);
    }
    if (!visible) {
      // Reset edit state when closed
      setIsEditing(false);
      setEditPassword("");
    }
  }, [visible, user]);

  // ─── Background data enrichment (hostel name, etc.) ─────────────────────
  const enrichProfile = useCallback(async (userId: number) => {
    try {
      console.log(`[UserProfileModal] Enriching profile for user ID: ${userId}`);
      setIsEnriching(true);
      const enriched = await apiService.get<User>(`/admin/users/${userId}`, true, true);
      console.log("[UserProfileModal] Enrichment successful:", enriched.id, "hostel_name:", enriched.hostel_name);
      setProfile(enriched);
      setEditName(enriched.full_name);
      setEditEmail(enriched.email);
      setEditPhone(enriched.phone_number || "");
      setEditStaffCategory(enriched.staff_category || "");
    } catch (err: any) {
      // Silently fall back — the pre-fetched data is already displayed
      console.warn(
        `[UserProfileModal] Background enrichment failed for user ${userId}:`,
        err.message,
        "— displaying pre-fetched data instead"
      );
    } finally {
      setIsEnriching(false);
    }
  }, []);

  useEffect(() => {
    if (visible && user?.id) {
      enrichProfile(user.id);
    }
  }, [visible, user?.id]);

  // ─── Open / close animation ───────────────────────────────────────────────
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
          toValue: 600,
          duration: 240,
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

  // ─── Helpers ──────────────────────────────────────────────────────────────
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

  const registrationId = profile
    ? `USR-${String(profile.id).padStart(4, "0")}`
    : "—";

  const userTypeLabel = profile?.role === "student" ? "Student" : "Staff";
  const userTypeBadgeColor =
    profile?.role === "student" ? Theme.colors.secondary : "#7C3AED";
  const isBlocked = profile?.status === "suspended";

  // Hostel display: prefer resolved name, fall back to "Hostel #N"
  const hostelDisplay =
    profile?.hostel_name && profile.hostel_name.trim()
      ? profile.hostel_name
      : profile?.hostel_id
      ? `Hostel #${profile.hostel_id}`
      : null;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!profile) return;
    if (!editName.trim()) {
      Alert.alert("Validation", "Full name cannot be empty.");
      return;
    }
    if (editEmail && !/\S+@\S+\.\S+/.test(editEmail)) {
      Alert.alert("Validation", "Please enter a valid email address.");
      return;
    }
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const payload: any = { full_name: editName.trim() };
      if (editEmail.trim()) payload.email = editEmail.trim();
      if (editPhone.trim()) payload.phone_number = editPhone.trim();
      if (profile.role === "worker" && editStaffCategory.trim()) payload.staff_category = editStaffCategory.trim();
      if (editPassword.trim()) payload.password = editPassword.trim();

      console.log(`[UserProfileModal] Saving edit for user ${profile.id}:`, payload);
      const updated = await apiService.put<User>(`/admin/users/${profile.id}`, payload);
      console.log("[UserProfileModal] Edit saved successfully:", updated.id);
      setProfile(updated);
      setEditPassword("");
      setIsEditing(false);
      onUserUpdated(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert("Profile updated successfully.");
      } else {
        Alert.alert("Success", "Profile updated successfully.");
      }
    } catch (err: any) {
      console.error("[UserProfileModal] Edit failed:", err.message);
      Alert.alert("Update Failed", err.message || "Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!profile) return;
    const newStatus = isBlocked ? "active" : "suspended";
    const label = isBlocked ? "Unblock" : "Block";

    const proceed = async () => {
      setIsTogglingStatus(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        console.log(`[UserProfileModal] Toggling status for user ${profile.id} → ${newStatus}`);
        const updated = await apiService.put<User>(
          `/admin/users/${profile.id}/status?status=${newStatus}`,
          {}
        );
        setProfile(updated);
        onStatusToggled(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("[UserProfileModal] Status toggled to:", updated.status);
      } catch (err: any) {
        console.error("[UserProfileModal] Status toggle failed:", err.message);
        Alert.alert("Error", err.message || "Could not update status.");
      } finally {
        setIsTogglingStatus(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `${label} User\n\nAre you sure you want to ${label.toLowerCase()} ${profile.full_name}'s account?`
        )
      ) {
        proceed();
      }
    } else {
      Alert.alert(
        `${label} User`,
        `Are you sure you want to ${label.toLowerCase()} ${profile.full_name}'s account?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: label,
            style: isBlocked ? "default" : "destructive",
            onPress: proceed,
          },
        ]
      );
    }
  };

  const handleDelete = async () => {
    if (!profile) return;

    const proceed = async () => {
      setIsDeleting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      try {
        console.log(`[UserProfileModal] Deleting user ${profile.id}`);
        await apiService.delete(`/admin/users/${profile.id}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("[UserProfileModal] User deleted successfully");
        onUserDeleted(profile.id);
        onClose();
      } catch (err: any) {
        console.error("[UserProfileModal] Delete failed:", err.message);
        Alert.alert("Delete Failed", err.message || "Could not delete user.");
        setIsDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `Delete User\n\nAre you sure you want to permanently delete ${profile.full_name}'s account? This action cannot be undone.`
        )
      ) {
        proceed();
      }
    } else {
      Alert.alert(
        "Delete User",
        `Are you sure you want to permanently delete ${profile.full_name}'s account? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: proceed },
        ]
      );
    }
  };

  /**
   * Smart close handler — used by both the X button AND onRequestClose (Android back).
   *
   * Priority:
   *  1. If in edit mode → cancel edit (stay on profile view). Android back = cancel edit.
   *  2. Otherwise → close the modal entirely.
   */
  const handleClose = () => {
    if (isEditing) {
      // Cancel edit: reset form fields back to current profile values, stay open
      setIsEditing(false);
      setEditName(profile?.full_name || "");
      setEditEmail(profile?.email || "");
      setEditPhone(profile?.phone_number || "");
      setEditStaffCategory(profile?.staff_category || "");
      setEditPassword("");
      return;
    }
    // Fully close
    setEditPassword("");
    onClose();
  };

  // ─── No user guard ────────────────────────────────────────────────────────
  if (!profile && !visible) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Tap backdrop to close */}
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* ── Header ── */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.headerBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={Theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>
              {isEditing ? "Edit Profile" : "User Profile"}
            </Text>
            {/* Enrichment indicator */}
            {isEnriching ? (
              <ActivityIndicator
                size="small"
                color={Theme.colors.secondary}
                style={{ width: 36 }}
              />
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── No data yet (only if user prop was null — shouldn't happen) ── */}
              {!profile ? (
                <View style={styles.centeredState}>
                  <ActivityIndicator size="large" color={Theme.colors.primary} />
                  <Text style={styles.stateText}>Loading profile…</Text>
                </View>
              ) : (
                <>
                  {/* ── Hero section ── */}
                  <LinearGradient
                    colors={
                      isBlocked
                        ? (["#FFCDD2", "#FFEBEE"] as const)
                        : profile.role === "student"
                        ? (["#E3F0FF", "#F0F4FC"] as const)
                        : (["#EDE9FF", "#F5F0FF"] as const)
                    }
                    style={styles.heroGradient}
                  >
                    <View
                      style={[
                        styles.heroBubble,
                        {
                          borderColor: isBlocked
                            ? "#FFCDD2"
                            : `${userTypeBadgeColor}40`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroInitial,
                          {
                            color: isBlocked
                              ? "#C62828"
                              : userTypeBadgeColor,
                          },
                        ]}
                      >
                        {profile.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.heroName}>{profile.full_name}</Text>

                    <View style={styles.heroBadgeRow}>
                      {/* User type badge */}
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isBlocked
                              ? "#FFCDD2"
                              : `${userTypeBadgeColor}20`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            profile.role === "student"
                              ? "school-outline"
                              : "construct-outline"
                          }
                          size={11}
                          color={isBlocked ? "#C62828" : userTypeBadgeColor}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: isBlocked
                                ? "#C62828"
                                : userTypeBadgeColor,
                            },
                          ]}
                        >
                          {userTypeLabel}
                        </Text>
                      </View>

                      {/* Status badge */}
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isBlocked
                              ? "#FFEBEE"
                              : "#E8F5E9",
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: isBlocked
                                ? "#C62828"
                                : "#4CAF50",
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: isBlocked ? "#C62828" : "#2E7D32",
                            },
                          ]}
                        >
                          {isBlocked ? "Inactive" : "Active"}
                        </Text>
                      </View>

                      {/* Registration ID badge */}
                      <View style={[styles.badge, { backgroundColor: "#F0F4FC" }]}>
                        <Ionicons
                          name="card-outline"
                          size={11}
                          color={Theme.colors.textLight}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            { color: Theme.colors.textLight },
                          ]}
                        >
                          {registrationId}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>

                  {/* ── Edit form mode ── */}
                  {isEditing ? (
                    <View style={styles.editForm}>
                      <SectionHeading title="Edit Details" />
                      <Input
                        label="Full Name *"
                        placeholder="Full Name"
                        value={editName}
                        onChangeText={setEditName}
                        iconName="person-outline"
                      />
                      <Input
                        label="Email Address"
                        placeholder="Email"
                        value={editEmail}
                        onChangeText={setEditEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        iconName="mail-outline"
                      />
                      <Input
                        label="Phone Number"
                        placeholder="Phone"
                        value={editPhone}
                        onChangeText={setEditPhone}
                        keyboardType="phone-pad"
                        iconName="call-outline"
                      />
                      {profile.role === "worker" && (
                        <Dropdown
                          label="Staff Category"
                          value={editStaffCategory}
                          options={[
                            "Electrician",
                            "Plumber",
                            "Carpenter",
                            "Technician",
                            "AC Technician",
                            "Lift Technician",
                            "Painter",
                            "Welder",
                            "Housekeeping Staff",
                            "Security Staff",
                            "Gardener",
                            "General Maintenance Worker",
                            "Other"
                          ]}
                          onSelect={setEditStaffCategory}
                        />
                      )}
                      <Input
                        label="New Password (leave blank to keep)"
                        placeholder="New password (min. 6 chars)"
                        value={editPassword}
                        onChangeText={setEditPassword}
                        isPassword
                        iconName="lock-closed-outline"
                      />
                      <View style={styles.editBtnRow}>
                        <TouchableOpacity
                          style={[styles.actionChip, styles.chipCancel]}
                          onPress={() => {
                            setIsEditing(false);
                            setEditPassword("");
                          }}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={Theme.colors.textLight}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              { color: Theme.colors.textLight },
                            ]}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Button
                            title="Save Changes"
                            onPress={handleSaveEdit}
                            loading={isSaving}
                            variant="primary"
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    /* ── View mode ── */
                    <>
                      {/* Contact */}
                      <View style={styles.section}>
                        <SectionHeading title="Contact Information" />
                        <DetailRow
                          icon="mail-outline"
                          label="Email Address"
                          value={profile.email}
                          accent={Theme.colors.secondary}
                        />
                        <DetailRow
                          icon="call-outline"
                          label="Phone Number"
                          value={profile.phone_number}
                          accent="#4CAF50"
                        />
                      </View>

                      {/* Hostel & Room (students) */}
                      {profile.role === "student" && (
                        <View style={styles.section}>
                          <SectionHeading title="Hostel & Room" />
                          <DetailRow
                            icon="business-outline"
                            label="Hostel"
                            value={hostelDisplay}
                            accent="#FF6B00"
                          />
                          <DetailRow
                            icon="bed-outline"
                            label="Room Number"
                            value={profile.room_number || null}
                            accent="#7C3AED"
                          />
                        </View>
                      )}

                      {/* Hostel assignment (staff) */}
                      {profile.role !== "student" && profile.hostel_id && (
                        <View style={styles.section}>
                          <SectionHeading title="Assignment" />
                          <DetailRow
                            icon="business-outline"
                            label="Hostel Assigned"
                            value={hostelDisplay}
                            accent="#FF6B00"
                          />
                          <DetailRow
                            icon="construct-outline"
                            label="Staff Category"
                            value={profile.staff_category}
                            accent="#7C3AED"
                          />
                        </View>
                      )}

                      {/* Account details */}
                      <View style={styles.section}>
                        <SectionHeading title="Account Details" />
                        <DetailRow
                          icon="shield-checkmark-outline"
                          label="Account Status"
                          value={
                            isBlocked ? "Inactive / Suspended" : "Active"
                          }
                          accent={isBlocked ? "#F44336" : "#4CAF50"}
                        />
                        <DetailRow
                          icon="calendar-outline"
                          label="Registered On"
                          value={formatDate(profile.created_at)}
                          accent={Theme.colors.secondary}
                        />
                        <DetailRow
                          icon="finger-print-outline"
                          label="User ID"
                          value={registrationId}
                          accent={Theme.colors.textLight}
                        />
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* ── Action Bar ── */}
          {profile && !isEditing && (
            <View style={styles.actionBar}>
              {/* Edit */}
              <TouchableOpacity
                style={[
                  styles.actionChip,
                  { backgroundColor: "#E3F0FF", borderColor: "#BBDEFB" },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditing(true);
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={Theme.colors.secondary}
                />
                <Text
                  style={[styles.chipText, { color: Theme.colors.secondary }]}
                >
                  Edit
                </Text>
              </TouchableOpacity>

              {/* Block / Unblock */}
              <TouchableOpacity
                style={[
                  styles.actionChip,
                  isBlocked
                    ? { backgroundColor: "#E8F5E9", borderColor: "#C8E6C9" }
                    : { backgroundColor: "#FFF8E1", borderColor: "#FFECB3" },
                ]}
                onPress={handleToggleStatus}
                disabled={isTogglingStatus}
              >
                {isTogglingStatus ? (
                  <ActivityIndicator
                    size="small"
                    color={isBlocked ? "#2E7D32" : "#E65100"}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={isBlocked ? "lock-open-outline" : "ban-outline"}
                      size={16}
                      color={isBlocked ? "#2E7D32" : "#E65100"}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isBlocked ? "#2E7D32" : "#E65100" },
                      ]}
                    >
                      {isBlocked ? "Unblock" : "Block"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={[
                  styles.actionChip,
                  { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
                ]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={Theme.colors.high} />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={Theme.colors.high}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: Theme.colors.high },
                      ]}
                    >
                      Delete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 42, 102, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    minHeight: "60%",
    shadowColor: "#0C1A30",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E1E8F5",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0F4FC",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Theme.colors.text,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 14,
    color: Theme.colors.textLight,
    textAlign: "center",
    marginTop: 16,
  },
  heroGradient: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  heroBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowColor: "#0C1A30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 12,
  },
  heroInitial: {
    fontSize: 34,
    fontWeight: "800",
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  section: {
    paddingHorizontal: 20,
  },
  editForm: {
    paddingHorizontal: 20,
  },
  editBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chipCancel: {
    backgroundColor: "#F0F4FC",
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
