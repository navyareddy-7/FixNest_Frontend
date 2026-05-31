import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Hostel, User } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import ProfileScreen from "../ProfileScreen";

export default function SuperAdminDashboardScreen() {
  const [activeView, setActiveView] = useState<"dashboard" | "hostels" | "admins" | "analytics" | "profile">("dashboard");
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  
  // Create Hostel Form State
  const [hostelModalVisible, setHostelModalVisible] = useState(false);
  const [newHostelName, setNewHostelName] = useState("");
  const [hostelLocation, setHostelLocation] = useState("");
  const [totalRooms, setTotalRooms] = useState("100");
  const [isCreatingHostel, setIsCreatingHostel] = useState(false);

  // Manage Admins State
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [selectedHostelId, setSelectedHostelId] = useState("");
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeView === "hostels" || activeView === "dashboard") {
        const hostelsData = await apiService.get<Hostel[]>("/hostels");
        setHostels(hostelsData);
      }
      if (activeView === "admins" || activeView === "dashboard") {
        const adminsData = await apiService.get<User[]>("/admin/admins");
        setAdmins(adminsData);
      }
      if (activeView === "analytics") {
        setIsAnalyticsLoading(true);
        const data = await apiService.get<any>("/admin/analytics");
        setAnalyticsData(data);
        setIsAnalyticsLoading(false);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not fetch data from server.");
      setIsAnalyticsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeView]);

  const handleCreateHostel = async () => {
    if (!newHostelName.trim() || !hostelLocation.trim()) {
      Alert.alert("Required Fields", "Hostel name and campus location are required.");
      return;
    }

    setIsCreatingHostel(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newHostel = await apiService.post<Hostel>("/hostels", {
        name: newHostelName.trim(),
        location: hostelLocation.trim(),
        total_rooms: Number(totalRooms) || 100,
      });

      setHostels([...hostels, newHostel]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert(`Hostel Created\n\n${newHostelName} has been successfully registered under global operations.`);
      } else {
        Alert.alert("Hostel Created", `${newHostelName} has been successfully registered under global operations.`);
      }
      
      setNewHostelName("");
      setHostelLocation("");
      setTotalRooms("100");
      setHostelModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not register hostel block.");
    } finally {
      setIsCreatingHostel(false);
    }
  };

  const openAddAdminModal = () => {
    setEditingAdminId(null);
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminPhone("");
    setSelectedHostelId("");
    setAdminModalVisible(true);
  };

  const openUpdateAdminModal = (admin: User) => {
    setEditingAdminId(admin.id);
    setAdminName(admin.full_name);
    setAdminEmail(admin.email);
    setAdminPassword(""); // blank so it doesn't update unless typed
    setAdminPhone(admin.phone_number || "");
    setSelectedHostelId(admin.hostel_id ? String(admin.hostel_id) : "");
    setAdminModalVisible(true);
  };

  const handleSaveAdmin = async () => {
    if (!adminName.trim() || !adminEmail.trim() || !selectedHostelId.trim()) {
      Alert.alert("Required Fields", "Name, Email, and Hostel ID are required.");
      return;
    }

    if (!editingAdminId && !adminPassword.trim()) {
      Alert.alert("Required Fields", "Password is required for new admins.");
      return;
    }

    setIsSavingAdmin(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (editingAdminId) {
        // Update Admin
        await apiService.put(`/admin/admins/${editingAdminId}`, {
          full_name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          password: adminPassword.trim() || undefined,
          phone_number: adminPhone.trim() || null,
          hostel_id: Number(selectedHostelId),
          role: "hostel_admin"
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (Platform.OS === "web") {
          window.alert(`Admin Updated\n\n${adminName} has been updated.`);
        } else {
          Alert.alert("Admin Updated", `${adminName} has been updated.`);
        }
      } else {
        // Create Admin
        await apiService.post("/admin/admins", {
          full_name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          password: adminPassword.trim(),
          phone_number: adminPhone.trim() || null,
          hostel_id: Number(selectedHostelId),
          role: "hostel_admin"
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (Platform.OS === "web") {
          window.alert(`Admin Created\n\n${adminName} has been registered.`);
        } else {
          Alert.alert("Admin Created", `${adminName} has been registered.`);
        }
      }
      
      setAdminModalVisible(false);
      fetchData(); // refresh list
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save hostel admin.");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = (admin: User) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Confirm Deletion\n\nAre you sure you want to permanently delete the admin "${admin.full_name}"? This action cannot be undone.`)) {
        setIsDeletingAdmin(admin.id);
        apiService.delete(`/admin/admins/${admin.id}`).then(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          window.alert("Deleted: Admin has been successfully removed.");
          fetchData();
        }).catch((e: any) => {
          window.alert("Error: " + (e.message || "Failed to delete admin."));
        }).finally(() => {
          setIsDeletingAdmin(null);
        });
      }
    } else {
      Alert.alert(
        "Confirm Deletion",
        `Are you sure you want to permanently delete the admin "${admin.full_name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
              setIsDeletingAdmin(admin.id);
              try {
                await apiService.delete(`/admin/admins/${admin.id}`);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Deleted", "Admin has been successfully removed.");
                fetchData();
              } catch (e: any) {
                console.error(e);
                Alert.alert("Error", e.message || "Failed to delete admin.");
              } finally {
                setIsDeletingAdmin(null);
              }
            } 
          }
        ]
      );
    }
  };

  if (activeView === "profile") {
    return <ProfileScreen onBack={() => setActiveView("dashboard")} />;
  }

  if (activeView === "hostels") {
    return (
      <View style={styles.container}>
        <Header title="Hostel Management" showBackButton onBack={() => setActiveView("dashboard")} />
        
        <ResponsiveContainer>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.title}>All Campus blocks</Text>
            <Text style={styles.subtitle}>{hostels.length} hostels registered</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setHostelModalVisible(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Hostel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {hostels.map((h) => (
            <Card key={h.id} style={styles.card}>
              <View style={styles.hostelRow}>
                <Ionicons name="business" size={24} color={Theme.colors.primary} style={styles.hostelIcon} />
                <View style={styles.hostelMeta}>
                  <Text style={styles.hostelName}>{h.name}</Text>
                  <Text style={styles.hostelLocation}>
                    <Ionicons name="location-outline" size={12} /> ID: <Text style={{fontWeight: 'bold', color: Theme.colors.text}}>{h.id}</Text> • {h.location}
                  </Text>
                  <Text style={styles.hostelAdmin}>
                    <Ionicons name="person-outline" size={12} /> Admin:{" "}
                    <Text style={{ fontWeight: "700", color: h.admin_name ? Theme.colors.text : Theme.colors.pending }}>
                      {h.admin_name || "Awaiting Allocation"}
                    </Text>
                  </Text>
                </View>
                <View style={styles.hostelStats}>
                  <Text style={styles.hostelStatsVal}>{h.total_rooms}</Text>
                  <Text style={styles.hostelStatsLabel}>Rooms</Text>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
        </ResponsiveContainer>

        <Modal animationType="slide" transparent={true} visible={hostelModalVisible} onRequestClose={() => setHostelModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Register Hostel Block</Text>
                <TouchableOpacity onPress={() => setHostelModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
                <Input label="Hostel Name *" placeholder="e.g. Block D (Emerald)" value={newHostelName} onChangeText={setNewHostelName} />
                <Input label="Campus Location *" placeholder="e.g. East Campus Area" value={hostelLocation} onChangeText={setHostelLocation} />
                <Input label="Total Rooms *" placeholder="100" value={totalRooms} onChangeText={setTotalRooms} keyboardType="numeric" />
                <Button title="Create Hostel Block" onPress={handleCreateHostel} loading={isCreatingHostel} variant="primary" style={{ marginTop: 12 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (activeView === "admins") {
    return (
      <View style={styles.container}>
        <Header title="Manage Admins" showBackButton onBack={() => setActiveView("dashboard")} />
        
        <ResponsiveContainer>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.title}>Hostel Admins</Text>
            <Text style={styles.subtitle}>{admins.length} active administrators</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAddAdminModal}>
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Admin</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          ) : (
            admins.map(admin => (
              <Card key={admin.id} style={styles.card}>
                <View style={styles.adminRow}>
                  <View style={styles.adminIconWrapper}>
                    <Text style={styles.adminIconText}>{admin.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.adminMeta}>
                    <Text style={styles.adminName}>{admin.full_name}</Text>
                    <Text style={styles.adminEmail}>{admin.email}</Text>
                    <Text style={styles.adminHostel}>
                      Hostel ID: <Text style={{fontWeight: '700'}}>{admin.hostel_id || "Unassigned"}</Text>
                    </Text>
                  </View>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.updateBtn} onPress={() => openUpdateAdminModal(admin)}>
                      <Text style={styles.updateBtnText}>Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteBtn} 
                      onPress={() => handleDeleteAdmin(admin)}
                      disabled={isDeletingAdmin === admin.id}
                    >
                      {isDeletingAdmin === admin.id ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
        </ResponsiveContainer>

        <Modal animationType="slide" transparent={true} visible={adminModalVisible} onRequestClose={() => setAdminModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingAdminId ? "Update Admin Details" : "Register Hostel Admin"}</Text>
                <TouchableOpacity onPress={() => setAdminModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
                <Input label="Full Name *" placeholder="e.g. Jane Doe" value={adminName} onChangeText={setAdminName} iconName="person-outline" />
                <Input label="Email Address *" placeholder="e.g. admin@fixnest.com" value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" iconName="mail-outline" autoCapitalize="none" />
                <Input label={editingAdminId ? "New Password (Optional)" : "Password *"} placeholder="Set a secure password" value={adminPassword} onChangeText={setAdminPassword} iconName="lock-closed-outline" secureTextEntry />
                <Input label="Phone Number" placeholder="e.g. +1 234 567 8900" value={adminPhone} onChangeText={setAdminPhone} iconName="call-outline" keyboardType="phone-pad" />
                <Input label="Assign Hostel ID *" placeholder="See Hostel blocks page for IDs (e.g. 1)" value={selectedHostelId} onChangeText={setSelectedHostelId} iconName="business-outline" keyboardType="numeric" />
                
                <Button title={editingAdminId ? "Save Changes" : "Register Admin"} onPress={handleSaveAdmin} loading={isSavingAdmin} variant="primary" style={{ marginTop: 16 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (activeView === "analytics") {
    const hostelMetrics = analyticsData?.hostel_metrics || [];
    
    return (
      <View style={styles.container}>
        <Header title="Hostel Analytics" showBackButton onBack={() => setActiveView("dashboard")} />
        <ResponsiveContainer>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.sectionTitle}>Problems vs Solved per Hostel</Text>
          <Text style={styles.cardDesc}>
            This graph tracks how many pending tickets (problems) exist vs how many have been resolved (solved) across all campuses.
          </Text>

          {isAnalyticsLoading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            hostelMetrics.length === 0 ? (
              <Card style={styles.card}>
                <Text style={{ textAlign: "center", color: Theme.colors.textLight }}>No data available yet.</Text>
              </Card>
            ) : (
              hostelMetrics.map((h: any, index: number) => {
                const total = h.problems + h.solved;
                const problemPct = total > 0 ? (h.problems / total) * 100 : 0;
                const solvedPct = total > 0 ? (h.solved / total) * 100 : 0;

                return (
                  <Card key={index} style={[styles.card, { marginBottom: 16 }]}>
                    <Text style={styles.hostelName}>{h.name}</Text>
                    
                    <View style={styles.graphStatsRow}>
                      <Text style={[styles.graphStatText, { color: Theme.colors.pending }]}>{h.problems} Problems</Text>
                      <Text style={[styles.graphStatText, { color: Theme.colors.resolved }]}>{h.solved} Solved</Text>
                    </View>

                    {/* Bar Graph UI */}
                    <View style={styles.barContainer}>
                      {total === 0 ? (
                        <View style={[styles.barSegment, { width: '100%', backgroundColor: Theme.colors.border }]} />
                      ) : (
                        <>
                          <View style={[styles.barSegment, { width: `${problemPct}%`, backgroundColor: Theme.colors.pending }]} />
                          <View style={[styles.barSegment, { width: `${solvedPct}%`, backgroundColor: Theme.colors.resolved }]} />
                        </>
                      )}
                    </View>
                  </Card>
                );
              })
            )
          )}
        </ScrollView>
        </ResponsiveContainer>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header
        title="Super Operations"
        rightComponent={
          <TouchableOpacity onPress={() => setActiveView("profile")} style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ResponsiveContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.welcomeSubtitle}>Global Administration</Text>
        <Text style={styles.welcomeTitle}>FixNest Control Center</Text>

        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: Theme.colors.primary }]} onPress={() => setActiveView("hostels")}>
              <Ionicons name="business" size={24} color="#FFFFFF" />
              <Text style={styles.gridCardTitle}>Hostel blocks</Text>
              <Text style={styles.gridCardDesc}>View IDs & create campuses</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, { backgroundColor: Theme.colors.secondary }]} onPress={() => setActiveView("admins")}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={styles.gridCardTitle}>Manage Admins</Text>
              <Text style={styles.gridCardDesc}>Update or register admins</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.gridRow, { marginTop: 8 }]}>
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: Theme.colors.accent }]} onPress={() => setActiveView("analytics")}>
              <Ionicons name="bar-chart" size={24} color="#FFFFFF" />
              <Text style={styles.gridCardTitle}>Hostel Analytics</Text>
              <Text style={styles.gridCardDesc}>Problems vs Solved graphs</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: 4 }} /> 
          </View>
        </View>
      </ScrollView>
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContainer: { padding: Theme.spacing.lg, paddingBottom: Theme.spacing.xxl },
  welcomeSubtitle: { fontSize: 13, color: Theme.colors.textLight, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  welcomeTitle: { fontSize: Theme.typography.h2.fontSize, fontWeight: "800", color: Theme.colors.text, marginTop: 2, marginBottom: Theme.spacing.lg },
  gridContainer: { width: "100%" },
  gridRow: { flexDirection: "row" },
  gridCard: { flex: 1, borderRadius: Theme.roundness.lg, padding: 16, marginHorizontal: 4, shadowColor: "#0A2A66", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  gridCardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginTop: 12 },
  gridCardDesc: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2, fontWeight: "500" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Theme.colors.text, marginBottom: 8 },
  card: { marginBottom: Theme.spacing.md, width: "100%" },
  profileBtn: { padding: 4 },
  bannerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.md, paddingBottom: Theme.spacing.sm, width: "100%" },
  title: { fontSize: 20, fontWeight: "800", color: Theme.colors.text },
  subtitle: { fontSize: 13, color: Theme.colors.textLight, fontWeight: "500", marginTop: 2 },
  addBtn: { backgroundColor: Theme.colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: Theme.roundness.md, shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 6 },
  hostelRow: { flexDirection: "row", alignItems: "center" },
  hostelIcon: { padding: 8, backgroundColor: "#F0F4FC", borderRadius: Theme.roundness.md },
  hostelMeta: { marginLeft: 16, flex: 1 },
  hostelName: { fontSize: 15, fontWeight: "800", color: Theme.colors.text },
  hostelLocation: { fontSize: 12, color: Theme.colors.textLight, marginTop: 2, fontWeight: "500" },
  hostelAdmin: { fontSize: 12, color: Theme.colors.textLight, marginTop: 2, fontWeight: "500" },
  hostelStats: { alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  hostelStatsVal: { fontSize: 18, fontWeight: "800", color: Theme.colors.primary },
  hostelStatsLabel: { fontSize: 10, color: Theme.colors.textLight, fontWeight: "600", marginTop: 2 },
  adminRow: { flexDirection: "row", alignItems: "center" },
  adminIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  adminIconText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  adminMeta: { marginLeft: 16, flex: 1 },
  adminName: { fontSize: 15, fontWeight: "800", color: Theme.colors.text },
  adminEmail: { fontSize: 13, color: Theme.colors.textLight, marginTop: 2 },
  adminHostel: { fontSize: 12, color: Theme.colors.primary, marginTop: 2 },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  updateBtn: { backgroundColor: "#F0F4FC", paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.roundness.sm },
  updateBtnText: { color: Theme.colors.primary, fontWeight: '700', fontSize: 12 },
  deleteBtn: { backgroundColor: "#FFF0F0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.roundness.sm },
  deleteBtnText: { color: "#FF3B30", fontWeight: '700', fontSize: 12 },
  cardDesc: { fontSize: 14, color: Theme.colors.textLight, lineHeight: 20, marginBottom: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10, 42, 102, 0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: Theme.roundness.xl, borderTopRightRadius: Theme.roundness.xl, paddingTop: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Theme.colors.text },
  closeBtn: { padding: 4 },
  modalForm: { padding: 24, paddingBottom: 40 },
  graphStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  graphStatText: { fontSize: 13, fontWeight: '700' },
  barContainer: { height: 16, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: Theme.colors.border },
  barSegment: { height: '100%' }
});
