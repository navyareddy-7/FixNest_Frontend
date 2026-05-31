import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { User } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

interface UserManagementProps {
  onBack?: () => void;
}

export default function UserManagementScreen({ onBack }: UserManagementProps = {}) {
  const [activeTab, setActiveTab] = useState<"student" | "worker">("student");
  const [students, setStudents] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hostelName, setHostelName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch workers from directory
      const workersData = await apiService.get<User[]>("/admin/workers");
      setWorkers(workersData);
      
      // Fetch students from directory
      const studentsData = await apiService.get<User[]>("/admin/students");
      setStudents(studentsData);
    } catch (err) {
      console.error("Failed to fetch user directories:", err);
      Alert.alert("Error", "Could not load user directories.");
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    fetchUsers();
  }, []);
 
  const handleRegisterUser = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Required Fields", "Full name, email, and password are required.");
      return;
    }
 
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
 
    if (activeTab === "student" && (!hostelName.trim() || !roomNumber.trim())) {
      Alert.alert("Required Fields", "Hostel name and room number are required for students.");
      return;
    }
 
    setIsRegistering(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
 
    try {
      if (activeTab === "worker") {
        const newWorker = await apiService.post<User>("/admin/workers", {
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          phone_number: phone.trim() || null,
          role: "worker",
        });
        setWorkers([...workers, newWorker]);
      } else {
        const newStudent = await apiService.post<User>("/admin/students", {
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          phone_number: phone.trim() || null,
          role: "student",
          hostel_id: parseInt(hostelName.trim(), 10) || null,
          room_number: roomNumber.trim(),
        });
        setStudents([...students, newStudent]);
      }
 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Account Created", `Successfully created ${activeTab} account for ${fullName.trim()}.`);
      
      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setHostelName("");
      setRoomNumber("");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Failed to create user account.");
    } finally {
      setIsRegistering(false);
    }
  };
 
  const handleToggleStatus = (user: User) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const newStatus = user.status === "active" ? "suspended" : "active";
    
    Alert.alert(
      `${newStatus === "active" ? "Unblock" : "Block"} User`,
      `Are you sure you want to ${newStatus === "active" ? "activate" : "block"} ${user.full_name}'s account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newStatus === "active" ? "Activate" : "Block",
          style: newStatus === "active" ? "default" : "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              const updatedUser = await apiService.put<User>(
                `/admin/users/${user.id}/status?status=${newStatus}`,
                {}
              );
              if (user.role === "student") {
                setStudents(
                  students.map((s) => (s.id === user.id ? updatedUser : s))
                );
              } else {
                setWorkers(
                  workers.map((w) => (w.id === user.id ? updatedUser : w))
                );
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert("Status Update Failed", err.message || "Could not update user status.");
            }
          },
        },
      ]
    );
  };

  const renderUserCard = ({ item }: { item: User }) => {
    const isBlocked = item.status === "suspended";
    return (
      <Card style={[styles.card, isBlocked && styles.cardBlocked]}>
        <View style={styles.userRow}>
          <View style={[styles.avatar, isBlocked && styles.avatarBlocked]}>
            <Text style={styles.avatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, isBlocked && styles.textBlocked]}>{item.full_name}</Text>
              {isBlocked && (
                <View style={styles.blockedBadge}>
                  <Text style={styles.blockedBadgeText}>BLOCKED</Text>
                </View>
              )}
            </View>
            <Text style={styles.userDetailText}>
              <Ionicons name="mail-outline" size={12} /> {item.email}
            </Text>
            {item.phone_number ? (
              <Text style={styles.userDetailText}>
                <Ionicons name="call-outline" size={12} /> {item.phone_number}
              </Text>
            ) : null}
          </View>
          
          <TouchableOpacity
            style={[styles.actionBtn, isBlocked ? styles.actionBtnUnblock : styles.actionBtnBlock]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons
              name={isBlocked ? "lock-open-outline" : "ban-outline"}
              size={18}
              color={isBlocked ? Theme.colors.resolved : Theme.colors.high}
            />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="User Management" showBackButton onBack={onBack} />

      <ResponsiveContainer>
      {/* Role Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("student");
          }}
          style={[styles.tab, activeTab === "student" && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === "student" && styles.activeTabText]}>
            Students Directory
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("worker");
          }}
          style={[styles.tab, activeTab === "worker" && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === "worker" && styles.activeTabText]}>
            Staff Directory
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bannerRow}>
        <View>
          <Text style={styles.title}>
            {activeTab === "student" ? "Students" : "Maintenance Workers"}
          </Text>
          <Text style={styles.subtitle}>
            {activeTab === "student" ? `${students.length} registered students` : `${workers.length} registered technicians`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: activeTab === "student" ? Theme.colors.primary : Theme.colors.secondary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add {activeTab === "student" ? "Student" : "Staff"}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTab === "student" ? students : workers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>No Accounts Registered</Text>
              <Text style={styles.emptyDesc}>Tap 'Add Staff' to create a new credentials account.</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>

      {/* Account Creation Modal */}
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
              <Text style={styles.modalTitle}>Create {activeTab === "student" ? "Student" : "Staff"} Account</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Input
                label="Full Name *"
                placeholder="e.g. John Miller"
                value={fullName}
                onChangeText={setFullName}
                iconName="person-outline"
              />

              <Input
                label="Email Address *"
                placeholder="e.g. john.m@hostel.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                iconName="mail-outline"
              />

              <Input
                label="Phone Number"
                placeholder="e.g. +91 9876543200"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                iconName="call-outline"
              />

              {activeTab === "student" ? (
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Input
                      label="Hostel ID *"
                      placeholder="e.g. 1"
                      keyboardType="numeric"
                      value={hostelName}
                      onChangeText={setHostelName}
                    />
                  </View>
                  <View style={[styles.flex1, { marginLeft: 12 }]}>
                    <Input
                      label="Room Number *"
                      placeholder="204"
                      value={roomNumber}
                      onChangeText={setRoomNumber}
                    />
                  </View>
                </View>
              ) : null}

              <Input
                label="Temporary Password *"
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                isPassword
                iconName="lock-closed-outline"
              />

              <Button
                title={`Create ${activeTab === "student" ? "Student" : "Staff"} Account`}
                onPress={handleRegisterUser}
                loading={isRegistering}
                variant="primary"
                style={[styles.modalSubmitBtn, { backgroundColor: activeTab === "student" ? Theme.colors.primary : Theme.colors.secondary }]}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F4FC",
    padding: 4,
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    borderRadius: Theme.roundness.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Theme.roundness.sm,
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  activeTabText: {
    color: Theme.colors.text,
    fontWeight: "700",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  cardBlocked: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F4FC",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBlocked: {
    backgroundColor: "#FFCDD2",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  textBlocked: {
    color: "#C62828",
  },
  blockedBadge: {
    backgroundColor: "#C62828",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  blockedBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  userDetailText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    marginTop: 2,
    fontWeight: "500",
  },
  actionBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 10,
  },
  actionBtnBlock: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
  },
  actionBtnUnblock: {
    backgroundColor: "#E8F5E9",
    borderColor: "#C8E6C9",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
  },
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
  closeBtn: {
    padding: 4,
  },
  modalForm: {
    padding: 24,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  modalSubmitBtn: {
    marginTop: 12,
  },
});
