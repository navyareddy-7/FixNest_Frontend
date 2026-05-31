import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/AuthContext";
import { Header } from "../components/ui/Header";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ResponsiveContainer } from "../components/ui/ResponsiveContainer";
import { Theme } from "../constants/theme";

interface ProfileScreenProps {
  onBack?: () => void;
}

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { user, updateProfile, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [newPassword, setNewPassword] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pushTokenRegistered, setPushTokenRegistered] = useState(!!user?.push_token);

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Full name is required.");
      return;
    }

    setIsUpdating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const updates: any = {
        full_name: fullName.trim(),
        phone_number: phone.trim() || null,
      };

      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          Alert.alert("Weak Password", "Password must be at least 6 characters.");
          setIsUpdating(false);
          return;
        }
        updates.password = newPassword.trim();
      }

      await updateProfile(updates);
      setNewPassword("");
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };



  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of FixNest?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Header title={isEditing ? "Edit Profile" : "My Profile"} showBackButton onBack={isEditing ? () => setIsEditing(false) : onBack} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
        {/* User Card */}
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName}>{user?.full_name}</Text>
              <Text style={styles.userRole}>
                Role: {user?.role ? user.role.replace("_", " ").toUpperCase() : "STUDENT"}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </Card>



        {/* Update Form / Profile details Card */}
        <Card style={styles.card}>
          {isEditing ? (
            <View>
              <Text style={styles.sectionTitle}>Account Details</Text>
              <Input
                label="Full Name"
                placeholder="Edit name"
                value={fullName}
                onChangeText={setFullName}
                iconName="person-outline"
              />

              <Input
                label="Phone Number"
                placeholder="Edit contact number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                iconName="call-outline"
              />

              <Input
                label="Change Password"
                placeholder="Enter new password (optional)"
                value={newPassword}
                onChangeText={setNewPassword}
                isPassword
                iconName="lock-closed-outline"
              />

              <Button
                title="Save Profile Updates"
                onPress={handleUpdateProfile}
                loading={isUpdating}
                variant="primary"
                style={{ marginTop: 12 }}
              />

              <Button
                title="Cancel"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFullName(user?.full_name || "");
                  setPhone(user?.phone_number || "");
                  setNewPassword("");
                  setIsEditing(false);
                }}
                variant="ghost"
                textStyle={{ color: Theme.colors.textLight }}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>Account Profile Info</Text>
              
              <View style={{ marginVertical: 12 }}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={18} color={Theme.colors.textLight} />
                  <Text style={styles.infoLabel}>Full Name:</Text>
                  <Text style={styles.infoValue}>{user?.full_name}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color={Theme.colors.textLight} />
                  <Text style={styles.infoLabel}>Phone Number:</Text>
                  <Text style={styles.infoValue}>{user?.phone_number || "Not set"}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={18} color={Theme.colors.textLight} />
                  <Text style={styles.infoLabel}>Email Address:</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>

                {user?.role === "student" && user?.room_number && (
                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={18} color={Theme.colors.textLight} />
                    <Text style={styles.infoLabel}>Room Number:</Text>
                    <Text style={styles.infoValue}>{user?.room_number}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={Theme.colors.textLight} />
                  <Text style={styles.infoLabel}>Account Status:</Text>
                  <Text style={[styles.infoValue, { color: Theme.colors.resolved, fontWeight: "700" }]}>
                    {user?.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Button
                title="Edit Profile Details"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditing(true);
                }}
                variant="secondary"
              />
            </View>
          )}
        </Card>

        {/* Action buttons */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="ghost"
          textStyle={{ color: Theme.colors.high, fontWeight: "700" }}
          style={styles.logoutBtn}
        />
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Theme.spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  userMeta: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  userRole: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.accent,
    textTransform: "uppercase",
    marginTop: 2,
  },
  userEmail: {
    fontSize: 14,
    color: Theme.colors.textLight,
    marginTop: 4,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: Theme.colors.textLight,
    lineHeight: 18,
    marginBottom: 12,
  },
  registeredBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: Theme.roundness.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    justifyContent: "center",
  },
  registeredText: {
    fontSize: 14,
    fontWeight: "700",
    color: Theme.colors.resolved,
    marginLeft: 8,
  },
  logoutBtn: {
    marginTop: Theme.spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderColor: Theme.colors.high + "25",
    width: "100%",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Theme.colors.textLight,
    fontWeight: "600",
    marginLeft: 10,
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: Theme.colors.text,
    fontWeight: "500",
    flex: 1,
  },
});
