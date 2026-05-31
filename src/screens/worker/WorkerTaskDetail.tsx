import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { apiService } from "../../services/api";
import { Complaint, Comment, ComplaintStatus } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { StatusTimeline } from "../../components/ui/StatusTimeline";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

interface WorkerTaskDetailProps {
  taskId?: number;
  onBack?: () => void;
}

export default function WorkerTaskDetailScreen({ taskId, onBack }: WorkerTaskDetailProps = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = taskId || (params.id ? Number(params.id) : undefined);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  
  const router = useRouter();

  const loadData = async () => {
    if (!id) return;
    try {
      const compData = await apiService.get<Complaint>(`/complaints/${id}`);
      setComplaint(compData);
      
      const commData = await apiService.get<Comment[]>(`/complaints/${id}/comments`);
      setComments(commData);
    } catch (err) {
      console.error("Failed to load task details:", err);
      Alert.alert("Error", "Could not load task details.");
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleUpdateStatus = async (newStatus: ComplaintStatus, base64Image?: string) => {
    if (!id) return;
    setIsUpdatingStatus(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const payload: any = { status: newStatus };
      if (base64Image) {
        payload.resolved_image_url = `data:image/jpeg;base64,${base64Image}`;
      }

      const updated = await apiService.put<Complaint>(`/complaints/${id}/status`, payload);
      setComplaint(updated);
      
      // Reload comments/timeline
      const commData = await apiService.get<Comment[]>(`/complaints/${id}/comments`);
      setComments(commData);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Status Updated", `Task status successfully updated to: ${String(newStatus || "").replace("_", " ").toUpperCase()}`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResolveWithPhoto = async () => {
    Alert.alert(
      "Attach Resolution Photo",
      "Please upload a photo of the completed work.",
      [
        {
          text: "Camera",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
              Alert.alert("Permission Required", "Camera access is needed to take photos.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const base64 = result.assets[0].base64;
              if (base64) handleUpdateStatus("resolved", base64);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
              Alert.alert("Permission Required", "Gallery access is needed to upload photos.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const base64 = result.assets[0].base64;
              if (base64) handleUpdateStatus("resolved", base64);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const addedComment = await apiService.post<Comment>(`/complaints/${id}/comments`, {
        text: newComment.trim(),
      });
      
      setComments([...comments, addedComment]);
      setNewComment("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Post Failed", err.message || "Failed to add timeline note.");
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.secondary} />
        <Text style={styles.loadingText}>Fetching task details...</Text>
      </View>
    );
  }

  if (!complaint) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Header title="Assigned Job Details" showBackButton onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
        {/* Task Details Header */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.ticketId}>Job #{complaint.id}</Text>
            <Badge type="status" value={complaint.status} label={String(complaint.status || "").replace("_", " ")} />
          </View>

          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.desc}>{complaint.description}</Text>

          {complaint.image_url ? (
            <View>
              <Text style={{fontWeight: '700', marginBottom: 4}}>Original Issue:</Text>
              <Image source={{ uri: complaint.image_url }} style={styles.attachedImage} />
            </View>
          ) : null}

          {complaint.resolved_image_url ? (
            <View>
              <Text style={{fontWeight: '700', marginBottom: 4}}>Resolution Photo:</Text>
              <Image source={{ uri: complaint.resolved_image_url }} style={styles.attachedImage} />
            </View>
          ) : null}

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Theme.colors.textLight} />
              <Text style={styles.infoText}>
                {complaint.hostel_name}, Room {complaint.room_number}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={18} color={Theme.colors.textLight} />
              <Text style={styles.infoText}>{complaint.category}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle-outline" size={18} color={Theme.colors.textLight} />
              <Text style={styles.infoText}>
                Priority:{" "}
                <Text style={{ fontWeight: "700", color: Theme.colors[complaint.severity] }}>
                  {complaint.severity.toUpperCase()}
                </Text>
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Panel */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Task Control Board</Text>
          
          {isUpdatingStatus ? (
            <ActivityIndicator size="small" color={Theme.colors.secondary} style={{ padding: 12 }} />
          ) : (
            <View style={styles.actionPanel}>
              {complaint.status === "pending" && (
                <Button
                  title="Accept & Start Work"
                  onPress={() => handleUpdateStatus("in_progress")}
                  variant="primary"
                />
              )}
              {complaint.status === "in_progress" && (
                <Button
                  title="Mark as Resolved & Upload Photo"
                  onPress={handleResolveWithPhoto}
                  variant="accent"
                />
              )}
              {complaint.status === "resolved" && (
                <View style={styles.resolvedBox}>
                  <Ionicons name="checkmark-done-circle" size={24} color={Theme.colors.resolved} />
                  <Text style={styles.resolvedText}>Job Resolved Successfully</Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Student Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Student Contact Info</Text>
          <View style={styles.studentRow}>
            <View style={[styles.avatar, { backgroundColor: Theme.colors.secondary }]}>
              <Text style={styles.avatarText}>
                {complaint.student?.full_name.charAt(0).toUpperCase() || "S"}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>
                {complaint.student?.full_name || "Awaiting detail"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Activity Timeline */}
        <Card style={styles.card}>
          <StatusTimeline comments={comments} />
        </Card>

        {/* Add Timeline Comment */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Post Timeline Comment</Text>
          <Input
            placeholder="Type a log update or message to coordinate with the student..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            numberOfLines={2}
            style={styles.commentInput}
          />
          <Button
            title="Log Timeline Update"
            onPress={handlePostComment}
            loading={isPosting}
            disabled={!newComment.trim()}
            variant="secondary"
            style={{ borderColor: Theme.colors.secondary }}
            textStyle={{ color: Theme.colors.secondary }}
          />
        </Card>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    color: Theme.colors.textLight,
    marginTop: 10,
    fontWeight: "500",
  },
  scrollContainer: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    color: Theme.colors.textLight,
    lineHeight: 22,
    marginBottom: 16,
  },
  attachedImage: {
    width: "100%",
    height: 180,
    borderRadius: Theme.roundness.md,
    marginBottom: 16,
    resizeMode: "cover",
  },
  infoGrid: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: Theme.colors.text,
    marginLeft: 10,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 12,
  },
  actionPanel: {
    paddingVertical: 4,
  },
  resolvedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    padding: 14,
    borderRadius: Theme.roundness.md,
    justifyContent: "center",
  },
  resolvedText: {
    color: Theme.colors.resolved,
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  studentInfo: {
    marginLeft: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  studentPhone: {
    fontSize: 13,
    color: Theme.colors.textLight,
    marginTop: 2,
    fontWeight: "500",
  },
  commentInput: {
    height: 60,
    textAlignVertical: "top",
    paddingTop: 8,
    marginBottom: 12,
  },
});
