import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ResponsiveContainer } from "../components/ui/ResponsiveContainer";
import { Theme } from "../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { apiService } from "../services/api";

export default function LoginScreen() {
  const [activeAuthScreen, setActiveAuthScreen] = useState<"login" | "forgot_password">("login");
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(apiService.getApiBaseUrl());
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  
  const { login } = useAuth();

  const handleLogin = async () => {
    let hasError = false;
    
    if (!email.trim()) {
      setEmailError("Email address is required.");
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoginError("");
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setLoginError(err.message || "Failed to sign in. Please verify your credentials.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (Platform.OS === "web") {
      window.alert("Please contact your Hostel Administrator for a password change.");
    } else {
      Alert.alert("Password Reset", "Please contact your Hostel Administrator for a password change.");
    }
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotEmailError("Email address is required.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    } else if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotEmailError("Please enter a valid email address.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setForgotEmailError("");
    setIsForgotSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate password recovery submission logic
    setTimeout(() => {
      setIsForgotSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Request Submitted",
        "A password recovery ticket has been logged and sent to your Hostel Administrator. Please contact them to obtain your reset credentials.",
        [{ text: "OK", onPress: () => setActiveAuthScreen("login") }]
      );
    }, 1500);
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ResponsiveContainer style={{ maxWidth: 440 }}>
      {/* Logo & Brand identity */}
      <View style={styles.brandContainer}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.appName}>FixNest</Text>
        <Text style={styles.tagline}>Fix Faster. Live Better.</Text>
      </View>

      {showServerConfig ? (
        /* Server Configuration Card */
        <View style={styles.loginCard}>
          <Text style={styles.cardHeaderTitle}>Server Settings</Text>
          <Text style={styles.cardHeaderDesc}>Configure the FastAPI backend server URL for local network testing.</Text>

          <Input
            label="Backend Server URL"
            placeholder="http://192.168.x.x:8000/api"
            value={customServerUrl}
            onChangeText={(text) => setCustomServerUrl(text)}
            autoCapitalize="none"
            iconName="server-outline"
            style={styles.inputStyle}
          />

          <View style={styles.serverAlertBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#8DA2C4" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.serverAlertText}>
              Physical Device Testing: Use your host computer's Wi-Fi IP address. Your active computer IP is detected as <Text style={{fontWeight: "bold", color: "#FFFFFF"}}>172.20.10.2</Text>.
            </Text>
          </View>

          <Button
            title="Save Server Configuration"
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await apiService.setApiBaseUrl(customServerUrl);
              Alert.alert("Server Configured", `API URL successfully updated to:\n${customServerUrl}`);
              setShowServerConfig(false);
            }}
            variant="primary"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const defaultUrl = "http://172.20.10.2:8000/api";
              setCustomServerUrl(defaultUrl);
              await apiService.setApiBaseUrl(defaultUrl);
              Alert.alert("Reset Complete", `API URL successfully reset to default:\n${defaultUrl}`);
              setShowServerConfig(false);
            }}
            style={{ alignSelf: "center", marginTop: 20, padding: 8 }}
          >
            <Text style={[styles.forgotText, { color: "#FF8A80" }]}>Reset to Default IP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowServerConfig(false);
            }}
            style={{ alignSelf: "center", marginTop: 8, padding: 8 }}
          >
            <Text style={[styles.forgotText, { color: "#8DA2C4" }]}>Cancel and Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : activeAuthScreen === "login" ? (
        /* Login Card */
        <View style={styles.loginCard}>
          <Text style={styles.cardHeaderTitle}>Sign In</Text>
          <Text style={styles.cardHeaderDesc}>Enter credentials provided by your Administrator</Text>

          {loginError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{loginError}</Text>
            </View>
          ) : null}

          <Input
            label="Email Address"
            placeholder="e.g. name@hostel.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
              if (loginError) setLoginError("");
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            iconName="mail-outline"
            style={styles.inputStyle}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
              if (loginError) setLoginError("");
            }}
            error={passwordError}
            isPassword
            iconName="lock-closed-outline"
            style={styles.inputStyle}
          />

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Secure Sign In"
            onPress={handleLogin}
            loading={isSubmitting}
            variant="primary"
            style={styles.submitBtn}
          />
        </View>
      ) : (
        /* Forgot Password Card */
        <View style={styles.loginCard}>
          <Text style={styles.cardHeaderTitle}>Forgot Password</Text>
          <Text style={styles.cardHeaderDesc}>Enter your email below to request a password reset from your Administrator</Text>

          <Input
            label="Email Address"
            placeholder="e.g. name@hostel.com"
            value={forgotEmail}
            onChangeText={(text) => {
              setForgotEmail(text);
              if (forgotEmailError) setForgotEmailError("");
            }}
            error={forgotEmailError}
            keyboardType="email-address"
            autoCapitalize="none"
            iconName="mail-outline"
            style={styles.inputStyle}
          />

          <Button
            title="Request Password Reset"
            onPress={handleForgotSubmit}
            loading={isForgotSubmitting}
            variant="primary"
            style={[styles.submitBtn, { marginTop: 16 }]}
          />

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveAuthScreen("login");
            }}
            style={{ alignSelf: "center", marginTop: 24, padding: 8 }}
          >
            <Text style={[styles.forgotText, { color: "#8DA2C4" }]}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Business Policy Banner */}
      <View style={styles.policyBanner}>
        <Text style={styles.policyText}>
          FixNest is a secure internal operations system. Self-registration is restricted. Contact support for new accounts.
        </Text>
      </View>
      </ResponsiveContainer>
    </ScrollView>
  );

  return (
    <LinearGradient
      colors={["#030914", "#0A1D3A", "#0E2954"]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCustomServerUrl(apiService.getApiBaseUrl());
          setShowServerConfig(prev => !prev);
        }}
        style={styles.settingsBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="settings-outline" size={22} color="#8DA2C4" />
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardView}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardView}>
          {content}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: Theme.spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 64 : Theme.spacing.xxl,
    paddingBottom: Theme.spacing.xxl,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    width: 110,
    height: 110,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#8DA2C4",
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  loginCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    width: "100%",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardHeaderDesc: {
    fontSize: 13,
    color: "#8DA2C4",
    marginTop: 4,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 24,
  },
  inputStyle: {
    color: "#1A202C",
  },
  errorBanner: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.4)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    color: "#FF8A80",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    marginBottom: 24,
  },
  forgotText: {
    color: Theme.colors.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  submitBtn: {
    height: 52,
  },
  policyBanner: {
    marginTop: Theme.spacing.xxl,
    width: "100%",
  },
  policyText: {
    color: "#5C6F8E",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
  settingsBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    zIndex: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  serverAlertBanner: {
    backgroundColor: "rgba(141, 162, 196, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(141, 162, 196, 0.25)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  serverAlertText: {
    color: "#8DA2C4",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
