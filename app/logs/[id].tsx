import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { WebShell } from "@/components/frierencloud/web-shell";
import { useFrierenCloud } from "@/lib/frierencloud/provider";

function statusLabel(status: string) {
  return status.replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export default function SetupLogScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getInstance, refreshInstance, language } = useFrierenCloud();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const instance = typeof id === "string" ? getInstance(id) : undefined;
  const isWide = width >= 940;

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
      <WebShell active="instances">
        <View style={styles.empty}>
          <Text style={styles.title}>{language === "vi" ? "Không tìm thấy phiên" : "Session not found"}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/" as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{language === "vi" ? "Về danh sách phiên" : "Return to sessions"}</Text>
          </Pressable>
        </View>
      </WebShell>
    );
  }

  return (
    <WebShell active="instances">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Feather color="#C9C6F4" name="arrow-left" size={18} />
          <Text style={styles.backText}>{language === "vi" ? "Quay lại" : "Back to sessions"}</Text>
        </Pressable>

        <View style={[styles.header, isWide && styles.headerWide]}>
          <View>
            <Text style={styles.eyebrow}>{language === "vi" ? "NHẬT KÝ THIẾT LẬP" : "SETUP LOG"}</Text>
            <Text style={styles.title}>{instance.name}</Text>
            <View style={styles.statusRow}>
              <Text style={styles.status}>{statusLabel(instance.status)}</Text>
              {instance.runId ? <Text style={styles.run}>GitHub Actions run #{instance.runId}</Text> : null}
            </View>
          </View>
          <Pressable accessibilityRole="button" disabled={refreshing} onPress={() => void refresh()} style={[styles.primaryButton, refreshing && styles.disabled]}>
            {refreshing ? <ActivityIndicator color="#101D35" /> : <><Feather color="#101D35" name="refresh-cw" size={17} /><Text style={styles.primaryButtonText}>{language === "vi" ? "Làm mới" : "Refresh log"}</Text></>}
          </Pressable>
        </View>

        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={styles.logPanel}>
            <View style={styles.logBar}>
              <View style={styles.terminalDots}><View style={styles.dotRed} /><View style={styles.dotYellow} /><View style={styles.dotGreen} /></View>
              <Text style={styles.logTitle}>github-actions.log</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.logCard}>
              <Text selectable style={styles.logText}>{instance.logText}</Text>
            </ScrollView>
          </View>

          <View style={styles.sideColumn}>
            {instance.sshxUrl ? (
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(instance.sshxUrl!)} style={styles.sshxCard}>
                <Text style={styles.sshxLabel}>SSHX IS READY</Text>
                <Text numberOfLines={3} style={styles.sshxUrl}>{instance.sshxUrl}</Text>
                <View style={styles.sshxAction}><Feather color="#101D35" name="external-link" size={16} /><Text style={styles.sshxActionText}>{language === "vi" ? "Mở SSHX" : "Open SSHX"}</Text></View>
              </Pressable>
            ) : (
              <View style={styles.waitingCard}>
                <Feather color="#B9B7E8" name="radio" size={21} />
                <Text style={styles.waitingTitle}>{language === "vi" ? "Đang chờ SSHX" : "Waiting for SSHX"}</Text>
                <Text style={styles.waitingText}>{language === "vi" ? "Bấm làm mới khi GitHub Actions đã chạy để tìm liên kết SSHX trong log." : "Refresh once GitHub Actions begins running to locate the SSHX link in the setup log."}</Text>
              </View>
            )}
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>SESSION NOTICE</Text>
              <Text style={styles.note}>{language === "vi" ? "Nhật ký được đọc trực tiếp từ GitHub Actions. Token phụ chỉ tồn tại khi tab này đang mở." : "Logs are read directly from GitHub Actions. The secondary token exists only while this browser tab remains open."}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 34 },
  empty: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  backButton: { alignItems: "center", flexDirection: "row", gap: 7, marginBottom: 22, minHeight: 32 },
  backText: { color: "#C9C6F4", fontSize: 14, fontWeight: "900" },
  header: { gap: 16 },
  headerWide: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: "#7FE1F6", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F5F8FF", fontSize: 38, fontWeight: "800", letterSpacing: -1.3, marginTop: 8 },
  statusRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  status: { backgroundColor: "#183D4A", borderRadius: 999, color: "#7FE1F6", fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7 },
  run: { color: "#8EA0BF", fontSize: 13 },
  primaryButton: { alignItems: "center", backgroundColor: "#B9B7E8", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  primaryButtonText: { color: "#101D35", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  layout: { gap: 18, marginTop: 26 },
  layoutWide: { alignItems: "stretch", flexDirection: "row" },
  logPanel: { backgroundColor: "#0D182D", borderColor: "#2B4267", borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 420, overflow: "hidden" },
  logBar: { alignItems: "center", backgroundColor: "#172743", borderBottomColor: "#2B4267", borderBottomWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 15 },
  terminalDots: { flexDirection: "row", gap: 6 },
  dotRed: { backgroundColor: "#F18A8A", borderRadius: 5, height: 10, width: 10 },
  dotYellow: { backgroundColor: "#F5C36A", borderRadius: 5, height: 10, width: 10 },
  dotGreen: { backgroundColor: "#7FE1B1", borderRadius: 5, height: 10, width: 10 },
  logTitle: { color: "#A9B7D0", flex: 1, fontFamily: "monospace", fontSize: 12, marginLeft: 12, textAlign: "center" },
  logCard: { flex: 1, padding: 16 },
  logText: { color: "#D7E1F0", fontFamily: "monospace", fontSize: 12, lineHeight: 19, minWidth: "100%" },
  sideColumn: { gap: 18, maxWidth: 360, width: "100%" },
  sshxCard: { backgroundColor: "#173E51", borderColor: "#43C6E8", borderRadius: 18, borderWidth: 1, gap: 10, padding: 20 },
  sshxLabel: { color: "#84E5FF", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  sshxUrl: { color: "#F5F8FF", fontSize: 15, fontWeight: "800", lineHeight: 22 },
  sshxAction: { alignItems: "center", backgroundColor: "#B9B7E8", borderRadius: 10, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 5, minHeight: 42 },
  sshxActionText: { color: "#101D35", fontSize: 13, fontWeight: "900" },
  waitingCard: { backgroundColor: "#172743", borderColor: "#2D456D", borderRadius: 18, borderWidth: 1, padding: 20 },
  waitingTitle: { color: "#F5F8FF", fontSize: 17, fontWeight: "800", marginTop: 12 },
  waitingText: { color: "#A9B7D0", fontSize: 13, lineHeight: 20, marginTop: 8 },
  noteCard: { backgroundColor: "#0E1A30", borderColor: "#263A5B", borderRadius: 18, borderWidth: 1, padding: 18 },
  noteLabel: { color: "#C9C6F4", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  note: { color: "#A9B7D0", fontSize: 13, lineHeight: 20, marginTop: 9 },
});
