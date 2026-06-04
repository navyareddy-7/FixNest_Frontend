/**
 * EmergencyHotlineSettingsScreen.tsx
 *
 * Admin screen for configuring the Emergency Hotline.
 * Located at: Admin Dashboard → Settings → Emergency Hotline
 *
 * Features:
 *  - View current active hotline (name + number)
 *  - Create hotline (if none exists)
 *  - Edit hotline name and number
 *  - Activate / Deactivate the hotline
 *  - Save changes
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Header } from "../../components/ui/Header";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmergencyHotline {
  id: number;
  hotline_name: string;
  hotline_number: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmergencyHotlineSettingsProps {
  onBack: () => void;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EmergencyHotlineSettingsScreen({ onBack }: EmergencyHotlineSettingsProps) {
  const [hotline, setHotline]           = useState<EmergencyHotline | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Form state
  const [hotlineName,   setHotlineName]   = useState("Hostel Emergency Control Room");
  const [hotlineNumber, setHotlineNumber] = useState("");
  const [isActive,      setIsActive]      = useState(true);
  const [isDirty,       setIsDirty]       = useState(false);

  // Back handler
  useBackHandler(useCallback(() => { onBack(); return true; }, [onBack]));

  // ── Fetch existing hotline ─────────────────────────────────────────────────
  const fetchHotline = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.get<EmergencyHotline | null>(
        "/emergency-hotline/",
        true,
        true
      );
      if (data) {
        setHotline(data);
        setHotlineName(data.hotline_name);
        setHotlineNumber(data.hotline_number);
        setIsActive(data.active);
      }
    } catch (err: any) {
      // 404 means no hotline configured yet — that's fine
      if (!err.message?.includes("404")) {
        setError(err.message || "Failed to load emergency hotline settings.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHotline(); }, []);

  // ── Save / Create hotline ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!hotlineNumber.trim()) {
      Alert.alert("Validation Error", "Please enter a valid emergency hotline number.");
      return;
    }
    if (!hotlineName.trim()) {
      Alert.alert("Validation Error", "Please enter a name for the emergency hotline.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);
    try {
      let updated: EmergencyHotline;
      if (hotline) {
        // Update existing
        updated = await apiService.put<EmergencyHotline>("/emergency-hotline/", {
          hotline_name:   hotlineName.trim(),
          hotline_number: hotlineNumber.trim(),
          active:         isActive,
        });
      } else {
        // Create new
        updated = await apiService.post<EmergencyHotline>("/emergency-hotline/", {
          hotline_name:   hotlineName.trim(),
          hotline_number: hotlineNumber.trim(),
          active:         isActive,
        });
      }
      setHotline(updated);
      setIsDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "✅ Saved",
        `Emergency hotline has been ${hotline ? "updated" : "configured"} successfully.\n\n` +
        `Name: ${updated.hotline_name}\nNumber: ${updated.hotline_number}\nStatus: ${updated.active ? "Active" : "Inactive"}`,
        [{ text: "OK" }]
      );
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Save Failed", err.message || "Could not save emergency hotline.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Quick toggle active/inactive ───────────────────────────────────────────
  const handleToggleActive = async (value: boolean) => {
    setIsActive(value);
    setIsDirty(true);
    if (!hotline) return;

    try {
      const updated = await apiService.put<EmergencyHotline>("/emergency-hotline/", {
        active: value,
      });
      setHotline(updated);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      setIsActive(!value); // revert on error
      Alert.alert("Error", err.message || "Failed to update hotline status.");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />
      <Header
        title="Emergency Hotline"
        showBackButton
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>

          {/* ── Header card ── */}
          <View style={styles.headerCard}>
            <View style={styles.headerIconBox}>
              <Ionicons name="call" size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Emergency Hotline Settings</Text>
              <Text style={styles.headerSub}>
                Configure the direct emergency contact number displayed to students during SOS.
              </Text>
            </View>
          </View>

          {/* ── Loading ── */}
          {isLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <Text style={styles.loadingText}>Loading settings…</Text>
            </View>
          )}

          {/* ── Error ── */}
          {error && !isLoading && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Current status banner ── */}
          {!isLoading && hotline && (
            <View style={[
              styles.statusBanner,
              { backgroundColor: hotline.active ? "#DCFCE7" : "#FEF3C7" },
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: hotline.active ? "#16A34A" : "#D97706" },
              ]} />
              <Text style={[
                styles.statusBannerText,
                { color: hotline.active ? "#15803D" : "#92400E" },
              ]}>
                {hotline.active
                  ? `Hotline is ACTIVE — ${hotline.hotline_name} (${hotline.hotline_number})`
                  : `Hotline is INACTIVE — Students will see no hotline number`}
              </Text>
            </View>
          )}

          {!isLoading && !hotline && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <Text style={styles.warningText}>
                No emergency hotline has been configured yet. Students will not see a hotline number during emergencies until you set one up below.
              </Text>
            </View>
          )}

          {/* ── Form ── */}
          {!isLoading && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {hotline ? "Edit Hotline Details" : "Configure New Hotline"}
              </Text>

              {/* Hotline Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Hotline Name</Text>
                <Text style={styles.fieldHint}>
                  This name is shown to students on the SOS screen (e.g. "Hostel Emergency Control Room")
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={hotlineName}
                  onChangeText={v => { setHotlineName(v); setIsDirty(true); }}
                  placeholder="e.g. Hostel Emergency Control Room"
                  placeholderTextColor={Theme.colors.textLight}
                  returnKeyType="next"
                  maxLength={80}
                />
              </View>

              {/* Hotline Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Hotline Number *</Text>
                <Text style={styles.fieldHint}>
                  Enter with country code (e.g. +91XXXXXXXXXX). This number will be dialled directly.
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={hotlineNumber}
                  onChangeText={v => { setHotlineNumber(v); setIsDirty(true); }}
                  placeholder="+91XXXXXXXXXX"
                  placeholderTextColor={Theme.colors.textLight}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  maxLength={20}
                />
              </View>

              {/* Active toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Hotline Status</Text>
                  <Text style={styles.fieldHint}>
                    When inactive, the hotline button is hidden on the student SOS screen.
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={handleToggleActive}
                  trackColor={{ false: "#D1D5DB", true: "#16A34A" }}
                  thumbColor={isActive ? "#FFFFFF" : "#9CA3AF"}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>
                      {hotline ? "Update Hotline" : "Save Hotline"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Info section ── */}
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>How it works</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={18} color={Theme.colors.primary} style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Warden contact</Text> is automatically fetched from the Admin user profile. No extra setup needed.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="construct-outline" size={18} color={Theme.colors.secondary} style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Technician contact</Text> is automatically fetched from the Staff (Worker) profile assigned to the hostel.
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#DC2626" style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Emergency Hotline</Text> is this number you configure here. It is a dedicated line, separate from individual contacts.
              </Text>
            </View>
          </View>

        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    padding: Theme.spacing.lg,
    paddingBottom: 60,
  },
  center: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: Theme.colors.textLight,
    fontSize: 14,
  },

  // Header card
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#DC2626",
    borderRadius: Theme.roundness.lg,
    padding: 18,
    marginBottom: 16,
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 16,
  },

  // Banners
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Theme.roundness.md,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: Theme.roundness.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 14,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: Theme.roundness.md,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
    lineHeight: 18,
  },

  // Form
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Theme.colors.text,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginBottom: 8,
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.roundness.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.colors.text,
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    marginTop: 4,
    gap: 12,
  },

  // Save button
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: Theme.roundness.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  // Info section
  infoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.textLight,
    lineHeight: 18,
  },
  infoLabel: {
    fontWeight: "700",
    color: Theme.colors.text,
  },
});
