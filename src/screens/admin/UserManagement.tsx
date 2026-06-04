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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { User } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Dropdown } from "../../components/ui/Dropdown";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";
import { UserProfileModal } from "./UserProfileModal";

interface UserManagementProps {
  onBack?: () => void;
}

export default function UserManagementScreen({ onBack }: UserManagementProps = {}) {
  const [activeTab, setActiveTab] = useState<"student" | "worker">("student");
  const [students, setStudents] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Profile modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hostelName, setHostelName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [staffCategory, setStaffCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [isRegistering, setIsRegistering] = useState(false);
  const { user } = useAuth();
  // Ref to track the modal close animation timeout so it can be cancelled on unmount
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch workers from directory (workers are global, so we don't filter them by hostel)
      const workersData = await apiService.get<User[]>("/admin/workers");
      setWorkers(workersData);
      
      // Fetch students from directory and filter if needed
      const studentsData = await apiService.get<User[]>("/admin/students");
      const filteredStudents = user?.role === "hostel_admin" && user?.hostel_id 
        ? studentsData.filter(s => s.hostel_id === user.hostel_id)
        : studentsData;
      setStudents(filteredStudents);
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

  // Clean up debounce and modal close timeouts on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // ─── Android hardware back button ─────────────────────────────────────────
  // Priority: 1. Close profile modal, 2. Close create modal, 3. Call onBack
  useBackHandler(
    useCallback(() => {
      if (profileModalVisible) {
        setProfileModalVisible(false);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => setSelectedUser(null), 400);
        return true;
      }
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    }, [profileModalVisible, modalVisible, onBack])
  );

  // ─── Search helpers ────────────────────────────────────────────────────────
  const normalise = (s: string) => s.toLowerCase().trim();

  const getFilteredUsers = useCallback(() => {
    let users = activeTab === "student" ? students : workers;

    if (activeTab === "worker" && categoryFilter !== "All Categories") {
      users = users.filter((u) => u.staff_category === categoryFilter);
    }

    const q = normalise(searchQuery);
    if (!q) return users;

    return users.filter(
      (u) =>
        normalise(u.full_name).includes(q) ||
        normalise(u.email).includes(q) ||
        (u.phone_number ? normalise(u.phone_number).includes(q) : false)
    );
  }, [searchQuery, activeTab, students, workers, categoryFilter]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // Debounce a visual "searching" indicator for UX feedback
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (text.trim()) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(() => setIsSearching(false), 300);
    } else {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };
  // ───────────────────────────────────────────────────────────────────────────

  // ─── Profile modal callbacks ─────────────────────────────────────────────
  const handleOpenProfile = (item: User) => {
    console.log("[UserManagement] Selected User:", item);
    console.log("[UserManagement] User ID:", item.id, "| Name:", item.full_name, "| Role:", item.role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUser(item);
    setProfileModalVisible(true);
  };

  const handleUserUpdated = (updatedUser: User) => {
    if (updatedUser.role === "student") {
      setStudents((prev) => prev.map((s) => (s.id === updatedUser.id ? updatedUser : s)));
    } else {
      setWorkers((prev) => prev.map((w) => (w.id === updatedUser.id ? updatedUser : w)));
    }
  };

  const handleUserDeleted = (deletedId: number) => {
    setStudents((prev) => prev.filter((s) => s.id !== deletedId));
    setWorkers((prev) => prev.filter((w) => w.id !== deletedId));
  };

  const handleStatusToggled = (updatedUser: User) => {
    if (updatedUser.role === "student") {
      setStudents((prev) => prev.map((s) => (s.id === updatedUser.id ? updatedUser : s)));
    } else {
      setWorkers((prev) => prev.map((w) => (w.id === updatedUser.id ? updatedUser : w)));
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

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

    if (activeTab === "worker" && !staffCategory) {
      Alert.alert("Required Fields", "Please select a staff category.");
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
          staff_category: staffCategory,
          role: "worker",
          hostel_id: user?.hostel_id || null,
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
      if (Platform.OS === "web") {
        window.alert(`Account Created\n\nSuccessfully created ${activeTab} account for ${fullName.trim()}.`);
      } else {
        Alert.alert("Account Created", `Successfully created ${activeTab} account for ${fullName.trim()}.`);
      }
      
      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setHostelName("");
      setRoomNumber("");
      setStaffCategory("");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Failed to create user account.");
    } finally {
      setIsRegistering(false);
    }
  };
 
  const handleToggleStatus = (user: User) => {
    const newStatus: User["status"] = user.status === "active" ? "suspended" : "active";
    const doToggle = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const updatedUser = await apiService.put<User>(
          `/admin/users/${user.id}/status?status=${newStatus}`,
          {}
        );
        // Use functional updates to avoid stale closure over students/workers arrays
        if (user.role === "student") {
          setStudents((prev) => prev.map((s) => (s.id === updatedUser.id ? updatedUser : s)));
        } else {
          setWorkers((prev) => prev.map((w) => (w.id === updatedUser.id ? updatedUser : w)));
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        Alert.alert("Status Update Failed", err.message || "Could not update user status.");
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `${newStatus === "active" ? "Unblock" : "Block"} User\n\nAre you sure you want to ${newStatus === "active" ? "activate" : "block"} ${user.full_name}'s account?`
        )
      ) {
        doToggle();
      }
    } else {
      Alert.alert(
        `${newStatus === "active" ? "Unblock" : "Block"} User`,
        `Are you sure you want to ${newStatus === "active" ? "activate" : "block"} ${user.full_name}'s account?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: newStatus === "active" ? "Activate" : "Block",
            style: newStatus === "active" ? "default" : "destructive",
            onPress: doToggle,
          },
        ]
      );
    }
  };

  const renderUserCard = ({ item }: { item: User }) => {
    const isBlocked = item.status === "suspended";
    const userTypeLabel = item.role === "student" ? "Student" : "Staff";
    const userTypeBadgeColor = item.role === "student" ? "#1E88E5" : "#7C3AED";
    const registrationLabel = item.role === "student" ? "Reg. No." : "Employee ID";
    // Build registration ID as "USR-<id>" since no separate reg_number field exists
    const registrationValue = `USR-${String(item.id).padStart(4, "0")}`;

    return (
      <Card
        style={[styles.card, isBlocked && styles.cardBlocked, styles.cardClickable]}
        onPress={() => handleOpenProfile(item)}
        elevation="low"
      >
        <View style={styles.userRow}>
          <View style={[styles.avatar, isBlocked && styles.avatarBlocked, { backgroundColor: isBlocked ? "#FFCDD2" : (item.role === "student" ? "#E3F0FF" : "#EDE9FF") }]}>
            <Text style={[styles.avatarText, { color: isBlocked ? "#C62828" : (item.role === "student" ? Theme.colors.secondary : "#7C3AED") }]}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            {/* Name + Blocked badge */}
            <View style={styles.nameRow}>
              <Text style={[styles.userName, isBlocked && styles.textBlocked]} numberOfLines={1}>{item.full_name}</Text>
              {isBlocked && (
                <View style={styles.blockedBadge}>
                  <Text style={styles.blockedBadgeText}>BLOCKED</Text>
                </View>
              )}
            </View>

            {/* User Type + Status row */}
            <View style={styles.detailRow}>
              <View style={[styles.typeBadge, { backgroundColor: isBlocked ? "#FFCDD2" : `${userTypeBadgeColor}18` }]}>
                <Text style={[styles.typeBadgeText, { color: isBlocked ? "#C62828" : userTypeBadgeColor }]}>{userTypeLabel}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isBlocked ? "#FFEBEE" : "#E8F5E9" }]}>
                <View style={[styles.statusDot, { backgroundColor: isBlocked ? "#C62828" : "#4CAF50" }]} />
                <Text style={[styles.statusText, { color: isBlocked ? "#C62828" : "#2E7D32" }]}>
                  {isBlocked ? "Inactive" : "Active"}
                </Text>
              </View>
            </View>

            {item.role === "worker" && item.staff_category && (
              <Text style={[styles.userDetailText, { color: Theme.colors.primary, fontWeight: "600", marginTop: 4 }]}>
                {item.staff_category}
              </Text>
            )}

            {/* Registration ID */}
            <Text style={styles.userDetailText}>
              <Ionicons name="card-outline" size={12} /> {registrationLabel}: {registrationValue}
            </Text>

            {/* Email */}
            <Text style={styles.userDetailText}>
              <Ionicons name="mail-outline" size={12} /> {item.email}
            </Text>

            {/* Phone */}
            {item.phone_number ? (
              <Text style={styles.userDetailText}>
                <Ionicons name="call-outline" size={12} /> {item.phone_number}
              </Text>
            ) : null}

            {/* Hostel / Room (students) */}
            {item.hostel_id ? (
              <Text style={styles.userDetailText}>
                <Ionicons name="business-outline" size={12} /> Hostel ID: {item.hostel_id}
                {item.room_number ? `  ·  Room: ${item.room_number}` : ""}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, isBlocked ? styles.actionBtnUnblock : styles.actionBtnBlock]}
            onPress={(e) => {
              // Stop propagation so clicking the block button doesn't also open the profile
              e?.stopPropagation?.();
              handleToggleStatus(item);
            }}
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
            clearSearch();
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
            clearSearch();
          }}
          style={[styles.tab, activeTab === "worker" && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === "worker" && styles.activeTabText]}>
            Staff Directory
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={18} color={searchQuery ? Theme.colors.secondary : Theme.colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, email, or phone number..."
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Theme.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        {isSearching && (
          <ActivityIndicator size="small" color={Theme.colors.secondary} style={{ marginLeft: 8 }} />
        )}
      </View>

      {/* Category Filter for Workers */}
      {activeTab === "worker" && (
        <View style={{ paddingHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm }}>
          <Dropdown
            label=""
            value={categoryFilter}
            options={[
              "All Categories",
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
            onSelect={setCategoryFilter}
          />
        </View>
      )}

      {/* Search result count pill */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.resultCountRow}>
          <Ionicons name="filter-outline" size={13} color={Theme.colors.secondary} />
          <Text style={styles.resultCountText}>
            {getFilteredUsers().length === 0
              ? "No users found."
              : `${getFilteredUsers().length} result${getFilteredUsers().length !== 1 ? "s" : ""} for "${searchQuery}"`}
          </Text>
        </View>
      )}


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
          data={getFilteredUsers()}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery.trim().length > 0 ? (
                <>
                  <Ionicons name="search-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
                  <Text style={styles.emptyTitle}>No users found.</Text>
                  <Text style={styles.emptyDesc}>Try a different name, email, or phone number.</Text>
                </>
              ) : (
                <>
                  <Ionicons name="people-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
                  <Text style={styles.emptyTitle}>No Accounts Registered</Text>
                  <Text style={styles.emptyDesc}>Tap 'Add Staff' to create a new credentials account.</Text>
                </>
              )}
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
              ) : (
                <Dropdown
                  label="Staff Category *"
                  placeholder="Select Staff Category"
                  value={staffCategory}
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
                  onSelect={setStaffCategory}
                />
              )}

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

      {/* ── User Profile Detail Modal ── */}
      <UserProfileModal
        user={selectedUser}
        visible={profileModalVisible}
        onClose={() => {
          setProfileModalVisible(false);
          // Small delay before clearing user so the close animation completes
          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = setTimeout(() => setSelectedUser(null), 400);
        }}
        onUserUpdated={handleUserUpdated}
        onUserDeleted={handleUserDeleted}
        onStatusToggled={handleStatusToggled}
      />
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
  // ── New: Search bar styles ──────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FC",
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 12,
    minHeight: 48,
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
  resultCountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xs,
    gap: 4,
  },
  resultCountText: {
    fontSize: 12,
    color: Theme.colors.secondary,
    fontWeight: "600",
  },
  // ── New: Enhanced card styles ───────────────────────────────────────────
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  // ───────────────────────────────────────────────────────────────────────
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
  cardClickable: {
    // Web-only cursor hint — React Native ignores unknown style keys on native
    cursor: "pointer" as any,
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
