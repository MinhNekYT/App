import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { isValidHostname } from "@/lib/frierencloud/github";
import { useFrierenCloud } from "@/lib/frierencloud/provider";

export default function CreateInstanceScreen() {
  const router = useRouter();
  const { language, createInstance } = useFrierenCloud();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const vietnamese = language === "vi";
  const enabled =
    isValidHostname(name) && token.trim().length >= 20 && agreed && !submitting;

  async function submit() {
    if (!enabled) return;
    try {
      setSubmitting(true);
      const id = await createInstance(name.trim(), token.trim());
      setToken("");
      router.replace(`/logs/${id}` as never);
    } catch (error) {
      Alert.alert(
        "FrierenCloud",
        error instanceof Error
          ? error.message
          : "Unable to create this session.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather color="#B9B7E8" name="chevron-left" size={20} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>NEW TEMPORARY SESSION</Text>
          <Text style={styles.title}>
            {vietnamese ? "Tạo một Linux VPS" : "Create a Linux VPS"}
          </Text>
          <Text style={styles.lead}>
            {vietnamese
              ? "Phiên chạy trên GitHub Actions, có thời hạn và không phải VPS lâu dài."
              : "Sessions run on GitHub Actions, are time-limited, and are not permanent VPS servers."}
          </Text>

          <Text style={styles.label}>
            {vietnamese ? "Tên máy" : "Machine name"}
          </Text>
          <TextInput
            accessibilityLabel={vietnamese ? "Tên máy" : "Machine name"}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => setName(value.toLowerCase())}
            placeholder="frieren-dev-01"
            placeholderTextColor="#71809C"
            style={styles.input}
            value={name}
          />
          <Text style={styles.hint}>
            {vietnamese
              ? "Chỉ dùng chữ thường, số và dấu gạch ngang; tối đa 63 ký tự."
              : "Use lowercase letters, numbers, and hyphens; up to 63 characters."}
          </Text>

          <Text style={styles.label}>
            {vietnamese ? "Mã token GitHub" : "GitHub token"}
          </Text>
          <TextInput
            accessibilityLabel={vietnamese ? "Mã token GitHub" : "GitHub token"}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setToken}
            placeholder="github_pat_..."
            placeholderTextColor="#71809C"
            secureTextEntry
            style={styles.input}
            value={token}
          />
          <Text style={styles.hint}>
            {vietnamese
              ? "Token chỉ giữ trong bộ nhớ tạm để gọi GitHub; không được lưu trong máy hoặc cơ sở dữ liệu."
              : "The token is held only in temporary memory for GitHub requests; it is never saved on device or in a database."}
          </Text>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            onPress={() => setAgreed((current) => !current)}
            style={styles.consent}
          >
            <View style={[styles.checkbox, agreed && styles.checked]}>
              {agreed ? (
                <Feather color="#12213C" name="check" size={16} />
              ) : null}
            </View>
            <Text style={styles.consentText}>
              {vietnamese
                ? "Tôi xác nhận rằng mã token Github tôi đã nhập không thuộc về tài khoản chính của tôi"
                : "I agree that the Github token I entered does not belong to my main account."}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!enabled}
            onPress={() => void submit()}
            style={[styles.confirm, !enabled && styles.confirmDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#12213C" />
            ) : (
              <Text style={styles.confirmText}>
                {vietnamese ? "Xác nhận" : "Confirm"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#12213C", flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginBottom: 18,
    minHeight: 44,
  },
  backText: { color: "#B9B7E8", fontSize: 15, fontWeight: "800" },
  eyebrow: {
    color: "#43C6E8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 29,
    fontWeight: "700",
    letterSpacing: -0.7,
    marginTop: 6,
  },
  lead: { color: "#A7B4CC", fontSize: 15, lineHeight: 22, marginTop: 11 },
  label: { color: "#F8FAFC", fontSize: 14, fontWeight: "700", marginTop: 24 },
  input: {
    backgroundColor: "#132541",
    borderColor: "#365077",
    borderRadius: 12,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 15,
    marginTop: 9,
    minHeight: 47,
    paddingHorizontal: 12,
  },
  hint: { color: "#A7B4CC", fontSize: 12, lineHeight: 18, marginTop: 7 },
  consent: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
    minHeight: 54,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#6A7EA2",
    borderRadius: 6,
    borderWidth: 1.5,
    height: 23,
    justifyContent: "center",
    marginTop: 1,
    width: 23,
  },
  checked: { backgroundColor: "#B9B7E8", borderColor: "#B9B7E8" },
  consentText: { color: "#F8FAFC", flex: 1, fontSize: 14, lineHeight: 20 },
  confirm: {
    alignItems: "center",
    backgroundColor: "#B9B7E8",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 54,
  },
  confirmDisabled: { opacity: 0.38 },
  confirmText: { color: "#12213C", fontSize: 16, fontWeight: "800" },
});
