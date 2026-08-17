import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { WebShell } from "@/components/frierencloud/web-shell";
import { isValidHostname } from "@/lib/frierencloud/github";
import { useFrierenCloud } from "@/lib/frierencloud/provider";

export default function CreateInstanceScreen() {
  const router = useRouter();
  const { language, createInstance } = useFrierenCloud();
  const { width } = useWindowDimensions();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const vietnamese = language === "vi";
  const isWide = width >= 900;
  const enabled = isValidHostname(name) && token.trim().length >= 20 && agreed && !submitting;

  async function submit() {
    if (!enabled) return;
    try {
      setSubmitting(true);
      const id = await createInstance(name.trim(), token.trim());
      setToken("");
      router.replace(`/logs/${id}` as never);
    } catch (error) {
      Alert.alert("FrierenCloud", error instanceof Error ? error.message : "Unable to create this session.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WebShell active="instances">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Feather color="#C9C6F4" name="arrow-left" size={18} />
          <Text style={styles.backText}>{vietnamese ? "Quay lại" : "Back to sessions"}</Text>
        </Pressable>

        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={styles.formColumn}>
            <Text style={styles.eyebrow}>NEW TEMPORARY SESSION</Text>
            <Text style={styles.title}>{vietnamese ? "Tạo một Linux VPS" : "Create a Linux VPS"}</Text>
            <Text style={styles.lead}>
              {vietnamese ? "Phiên chạy trên GitHub Actions, có thời hạn và không phải VPS lâu dài." : "Sessions run on GitHub Actions, are time-limited, and are not permanent VPS servers."}
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.label}>{vietnamese ? "Tên máy" : "Machine name"}</Text>
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
              <Text style={styles.hint}>{vietnamese ? "Chỉ dùng chữ thường, số và dấu gạch ngang; tối đa 63 ký tự." : "Use lowercase letters, numbers, and hyphens; up to 63 characters."}</Text>

              <Text style={styles.label}>{vietnamese ? "Mã token GitHub" : "GitHub token"}</Text>
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
              <Text style={styles.hint}>{vietnamese ? "Token chỉ giữ trong bộ nhớ tạm của tab để gọi GitHub; không được lưu trong trình duyệt." : "The token remains in this tab's memory for GitHub requests only; it is never saved in your browser."}</Text>

              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((current) => !current)} style={styles.consent}>
                <View style={[styles.checkbox, agreed && styles.checked]}>{agreed ? <Feather color="#101D35" name="check" size={15} /> : null}</View>
                <Text style={styles.consentText}>{vietnamese ? "Tôi xác nhận rằng mã token Github tôi đã nhập không thuộc về tài khoản chính của tôi" : "I agree that the Github token I entered does not belong to my main account."}</Text>
              </Pressable>

              <Pressable accessibilityRole="button" disabled={!enabled} onPress={() => void submit()} style={[styles.confirm, !enabled && styles.confirmDisabled]}>
                {submitting ? <ActivityIndicator color="#101D35" /> : <Text style={styles.confirmText}>{vietnamese ? "Xác nhận" : "Confirm and start session"}</Text>}
              </Pressable>
            </View>
          </View>

          <View style={styles.guideCard}>
            <Text style={styles.guideEyebrow}>BEFORE YOU START</Text>
            <Text style={styles.guideTitle}>Use a dedicated secondary GitHub account.</Text>
            <Text style={styles.guideText}>The runner is temporary. When the Actions job finishes, the SSHX workspace ends too.</Text>
            <View style={styles.guideRule}>
              <Feather color="#7FE1F6" name="shield" size={17} />
              <Text style={styles.guideRuleText}>Never use a primary GitHub token.</Text>
            </View>
            <View style={styles.guideRule}>
              <Feather color="#7FE1F6" name="clock" size={17} />
              <Text style={styles.guideRuleText}>Refresh the setup log to retrieve the SSHX URL.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 34 },
  backButton: { alignItems: "center", flexDirection: "row", gap: 7, marginBottom: 22, minHeight: 32 },
  backText: { color: "#C9C6F4", fontSize: 14, fontWeight: "900" },
  layout: { gap: 24 },
  layoutWide: { alignItems: "flex-start", flexDirection: "row" },
  formColumn: { flex: 1, maxWidth: 760, minWidth: 0 },
  eyebrow: { color: "#7FE1F6", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F5F8FF", fontSize: 38, fontWeight: "800", letterSpacing: -1.3, marginTop: 8 },
  lead: { color: "#A9B7D0", fontSize: 15, lineHeight: 23, marginTop: 10 },
  formCard: { backgroundColor: "#172743", borderColor: "#2D456D", borderRadius: 20, borderWidth: 1, marginTop: 24, padding: 20 },
  label: { color: "#F5F8FF", fontSize: 14, fontWeight: "800", marginTop: 19 },
  input: { backgroundColor: "#0E1A30", borderColor: "#365077", borderRadius: 11, borderWidth: 1, color: "#F5F8FF", fontSize: 15, marginTop: 9, minHeight: 49, paddingHorizontal: 13 },
  hint: { color: "#8EA0BF", fontSize: 12, lineHeight: 18, marginTop: 7 },
  consent: { alignItems: "flex-start", flexDirection: "row", gap: 12, marginTop: 28 },
  checkbox: { alignItems: "center", borderColor: "#6A7EA2", borderRadius: 6, borderWidth: 1.5, height: 22, justifyContent: "center", marginTop: 1, width: 22 },
  checked: { backgroundColor: "#B9B7E8", borderColor: "#B9B7E8" },
  consentText: { color: "#E8EEFA", flex: 1, fontSize: 14, lineHeight: 20 },
  confirm: { alignItems: "center", backgroundColor: "#B9B7E8", borderRadius: 13, justifyContent: "center", marginTop: 22, minHeight: 52 },
  confirmDisabled: { opacity: 0.36 },
  confirmText: { color: "#101D35", fontSize: 15, fontWeight: "900" },
  guideCard: { backgroundColor: "#0E1A30", borderColor: "#263A5B", borderRadius: 20, borderWidth: 1, maxWidth: 360, padding: 21, width: "100%" },
  guideEyebrow: { color: "#C9C6F4", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  guideTitle: { color: "#F5F8FF", fontSize: 19, fontWeight: "800", lineHeight: 26, marginTop: 10 },
  guideText: { color: "#A9B7D0", fontSize: 13, lineHeight: 20, marginTop: 10 },
  guideRule: { alignItems: "flex-start", borderTopColor: "#263A5B", borderTopWidth: 1, flexDirection: "row", gap: 10, marginTop: 18, paddingTop: 16 },
  guideRuleText: { color: "#D6E2F5", flex: 1, fontSize: 13, lineHeight: 19 },
});
