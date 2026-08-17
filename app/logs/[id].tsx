import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";

function statusLabel(status: string) {
  return status.replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export default function SetupLogScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getInstance, refreshInstance, language } = useFrierenCloud();
  const [refreshing, setRefreshing] = useState(false);
  const instance = typeof id === "string" ? getInstance(id) : undefined;

  async function refresh() {
    if (!instance) return;
    try {
      setRefreshing(true);
      await refreshInstance(instance.id);
    } catch (error) {
      Alert.alert("FrierenCloud", error instanceof Error ? error.message : "Unable to refresh setup logs.");
    } finally {
      setRefreshing(false);
    }
  }

  if (!instance) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.title}>{language === "vi" ? "Không tìm thấy phiên" : "Session not found"}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
            <Text style={styles.buttonText}>{language === "vi" ? "Quay lại" : "Go back"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{language === "vi" ? "NHẬT KÝ THIẾT LẬP" : "SETUP LOG"}</Text>
        <Text style={styles.title}>{instance.name}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{statusLabel(instance.status)}</Text>
          {instance.runId ? <Text style={styles.run}>Run #{instance.runId}</Text> : null}
        </View>
        {instance.sshxUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(instance.sshxUrl!)}
            style={styles.sshxCard}
          >
            <Text style={styles.sshxLabel}>SSHX</Text>
            <Text numberOfLines={2} style={styles.sshxUrl}>{instance.sshxUrl}</Text>
            <Text style={styles.sshxAction}>{language === "vi" ? "Mở liên kết SSHX" : "Open SSHX link"}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" disabled={refreshing} onPress={() => void refresh()} style={[styles.button, refreshing && styles.disabled]}>
          {refreshing ? <ActivityIndicator color="#12213C" /> : <Text style={styles.buttonText}>{language === "vi" ? "Làm mới nhật ký" : "Refresh logs"}</Text>}
        </Pressable>
        <Text style={styles.note}>
          {language === "vi"
            ? "Nhật ký được đọc trực tiếp từ GitHub Actions. Token phụ chỉ tồn tại trong bộ nhớ khi app đang mở."
            : "Logs are read directly from GitHub Actions. The secondary token remains in memory only while the app is open."}
        </Text>
        <View style={styles.logCard}>
          <Text selectable style={styles.logText}>{instance.logText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#12213C", flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 34 },
  empty: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  eyebrow: { color: "#43C6E8", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#F8FAFC", fontSize: 28, fontWeight: "700", letterSpacing: -0.7 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  status: { backgroundColor: "#1C5D70", borderRadius: 999, color: "#CFF5FF", fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  run: { color: "#A7B4CC", fontSize: 13 },
  sshxCard: { backgroundColor: "#173E51", borderColor: "#43C6E8", borderRadius: 16, borderWidth: 1, gap: 7, padding: 16 },
  sshxLabel: { color: "#84E5FF", fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  sshxUrl: { color: "#F8FAFC", fontSize: 15, fontWeight: "700", lineHeight: 22 },
  sshxAction: { color: "#B9B7E8", fontSize: 13, fontWeight: "800", marginTop: 2 },
  button: { alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 14, justifyContent: "center", minHeight: 50 },
  buttonText: { color: "#12213C", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.65 },
  note: { color: "#A7B4CC", fontSize: 12, lineHeight: 18 },
  logCard: { backgroundColor: "#0C172C", borderColor: "#2B4168", borderRadius: 14, borderWidth: 1, minHeight: 260, padding: 14 },
  logText: { color: "#D7E1F0", fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
});
