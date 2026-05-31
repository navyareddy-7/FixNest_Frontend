import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";
import { Header } from "../../components/ui/Header";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

const CATEGORIES = ["Plumbing", "Electrical", "Carpentry", "Housekeeping", "Other"];
const SEVERITIES = ["low", "medium", "high"];

interface CreateComplaintProps {
  onBack?: () => void;
  onSubmitSuccess?: () => void;
}

export default function CreateComplaintScreen({ onBack, onSubmitSuccess }: CreateComplaintProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState("medium");
  const [simulatedImage, setSimulatedImage] = useState<string | null>(null);
  
  const { user } = useAuth();
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSimulateImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Attach Image",
      "Choose a photo source",
      [
        {
          text: "Camera",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert("Permission Required", "You need to allow camera access to take a photo.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              base64: true,
              allowsEditing: true,
              quality: 0.5,
            });
            if (!result.canceled && result.assets[0].base64) {
              setSimulatedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert("Permission Required", "You need to allow gallery access to select a photo.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              base64: true,
              allowsEditing: true,
              quality: 0.5,
            });
            if (!result.canceled && result.assets[0].base64) {
              setSimulatedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Issue title is required.";
    if (!description.trim()) newErrors.description = "Please describe the problem.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!user?.room_id || !user?.hostel_id) {
      Alert.alert("Profile Error", "We could not find your room or hostel data. Please contact admin.");
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await apiService.post("/complaints", {
        title: title.trim(),
        description: description.trim(),
        category,
        room_id: user.room_id,
        hostel_id: user.hostel_id,
        severity,
        image_url: simulatedImage,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Complaint Filed",
        "Your maintenance request has been submitted successfully and is now pending review.",
        [
          {
            text: "Go to Dashboard",
            onPress: () => {
              if (onSubmitSuccess) {
                onSubmitSuccess();
              } else {
                router.replace("/dashboard" as any);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.error("Submission failed:", err);
      Alert.alert("Submission Failed", err.message || "Failed to submit complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Header title="File Complaint" showBackButton onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Request Details</Text>
          
          <Input
            label="Issue Title *"
            placeholder="e.g. Clogged washbasin leak"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors({ ...errors, title: "" });
            }}
            error={errors.title}
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat);
                  }}
                  style={[
                    styles.categoryBtn,
                    isSelected && styles.categoryBtnSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBtnText,
                      isSelected && styles.categoryBtnTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Problem Description *"
            placeholder="Describe the issue in detail so workers can bring the right tools..."
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) setErrors({ ...errors, description: "" });
            }}
            multiline
            numberOfLines={4}
            error={errors.description}
            style={styles.textArea}
          />

          <Text style={styles.label}>Severity Level</Text>
          <View style={styles.row}>
            {SEVERITIES.map((sev) => {
              const isSelected = severity === sev;
              const activeColor =
                sev === "low"
                  ? Theme.colors.low
                  : sev === "medium"
                  ? Theme.colors.medium
                  : Theme.colors.high;

              return (
                <TouchableOpacity
                  key={sev}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSeverity(sev);
                  }}
                  style={[
                    styles.severityBtn,
                    isSelected && { borderColor: activeColor, backgroundColor: activeColor + "15" },
                  ]}
                >
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: activeColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.severityBtnText,
                      isSelected && { color: activeColor, fontWeight: "700" },
                    ]}
                  >
                    {sev.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Attach Image</Text>
          <TouchableOpacity
            onPress={handleSimulateImage}
            style={[
              styles.imagePicker,
              simulatedImage ? styles.imagePickerActive : {},
            ]}
          >
            {simulatedImage ? (
              <View style={styles.imagePickerContent}>
                <Ionicons name="checkmark-circle" size={32} color={Theme.colors.resolved} />
                <Text style={styles.imagePickerTextActive}>Photo Attached Successfully</Text>
                <Text style={styles.imagePickerSubtext}>Tap to replace photo</Text>
              </View>
            ) : (
              <View style={styles.imagePickerContent}>
                <Ionicons name="camera-outline" size={32} color={Theme.colors.textLight} />
                <Text style={styles.imagePickerText}>Upload a photo of the damage</Text>
                <Text style={styles.imagePickerSubtext}>Tap to open camera or gallery</Text>
              </View>
            )}
          </TouchableOpacity>

          <Button
            title="Submit Complaint"
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="primary"
            style={styles.submitBtn}
          />
        </View>
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
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: Theme.spacing.md,
    shadowColor: "#0A2A66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    width: "100%",
  },
  sectionTitle: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.caption.fontSize,
    fontWeight: "600",
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Theme.spacing.md,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.roundness.md,
    backgroundColor: "#F0F4FC",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryBtnSelected: {
    backgroundColor: Theme.colors.primary + "15",
    borderColor: Theme.colors.primary,
  },
  categoryBtnText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  categoryBtnTextSelected: {
    color: Theme.colors.primary,
    fontWeight: "700",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  severityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.roundness.md,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: "#FFFFFF",
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  severityBtnText: {
    fontSize: 11,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: "dashed",
    borderRadius: Theme.roundness.md,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#F8FAFC",
  },
  imagePickerActive: {
    borderColor: Theme.colors.resolved,
    backgroundColor: "#E8F5E9",
  },
  imagePickerContent: {
    alignItems: "center",
  },
  imagePickerText: {
    fontSize: 14,
    color: Theme.colors.text,
    fontWeight: "600",
    marginTop: 8,
  },
  imagePickerTextActive: {
    fontSize: 14,
    color: Theme.colors.resolved,
    fontWeight: "700",
    marginTop: 8,
  },
  imagePickerSubtext: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 8,
  },
});
