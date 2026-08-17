import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useState } from "react";

import { WebShell } from "@/components/frierencloud/web-shell";
import { useFrierenCloud } from "@/lib/frierencloud/provider";

export default function SettingsScreen() {
  const { accountName, language, repository, updateRepository, signOut, copy } = useFrierenCloud();
  const [draftRepository, setDraftRepository] = useState(repository);
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  async function saveRepository() {
    await updateRepository(draftRepository);
    Alert.alert("FrierenCloud", language === "vi" ? "Đã lưu kho GitHub." : "GitHub repository saved.");
  }

  return (
    <WebShell active="settings">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.eyebrow}>PREFERENCES</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.lead}>Manage the local preferences used by this browser.</Text>
        </View>

        <View style={[styles.grid, isWide && styles.gridWide]}>
          <View style={styles.primaryColumn}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{copy.profile}</Text>
              <Text style={styles.profileName}>{accountName ?? "Discord account"}</Text>
              <Text style={styles.caption}>Your Discord session is managed by Supabase in this browser.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>{copy.repository}</Text>
              <Text style={styles.caption}>{copy.repositoryHint}</Text>
              <TextInput
                accessibilityLabel={copy.repository}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setDraftRepository}
                placeholder="owner/repository"
                placeholderTextColor="#71809C"
                style={styles.input}
                value={draftRepository}
              />
              <Pressable accessibilityRole="button" onPress={() => void saveRepository()} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>{copy.saveRepository}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sideColumn}>
            <View style={styles.notice}>
              <Text style={styles.noticeLabel}>TOKEN SAFETY</Text>
              <Text style={styles.noticeTitle}>Direct browser requests only.</Text>
              <Text style={styles.noticeText}>
                A secondary GitHub token is retained in memory only while this tab is open. It is not sent to a custom API and is not stored in browser storage.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{copy.language}</Text>
              <Text style={styles.profileName}>{language === "en" ? "English" : "Tiếng Việt"}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOutButton}>
              <Text style={styles.signOutText}>{copy.signOut}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, gap: 25, paddingBottom: 34 },
  eyebrow: { color: "#7FE1F6", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F5F8FF", fontSize: 38, fontWeight: "800", letterSpacing: -1.3, marginTop: 8 },
  lead: { color: "#A9B7D0", fontSize: 15, lineHeight: 23, marginTop: 10 },
  grid: { gap: 18 },
  gridWide: { alignItems: "flex-start", flexDirection: "row" },
  primaryColumn: { flex: 1, gap: 18, minWidth: 0 },
  sideColumn: { gap: 18, maxWidth: 370, width: "100%" },
  card: { backgroundColor: "#172743", borderColor: "#2D456D", borderRadius: 18, borderWidth: 1, padding: 20 },
  cardLabel: { color: "#8EA0BF", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  profileName: { color: "#F5F8FF", fontSize: 18, fontWeight: "800", marginTop: 10 },
  caption: { color: "#A9B7D0", fontSize: 13, lineHeight: 20, marginTop: 9 },
  input: { backgroundColor: "#0E1A30", borderColor: "#365077", borderRadius: 11, borderWidth: 1, color: "#F5F8FF", fontSize: 15, marginTop: 16, minHeight: 48, paddingHorizontal: 13 },
  secondaryButton: { alignItems: "center", borderColor: "#647AAB", borderRadius: 11, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 44 },
  secondaryText: { color: "#C9C6F4", fontSize: 14, fontWeight: "900" },
  notice: { backgroundColor: "#153948", borderColor: "#287189", borderRadius: 18, borderWidth: 1, padding: 20 },
  noticeLabel: { color: "#84E5FF", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  noticeTitle: { color: "#F5F8FF", fontSize: 18, fontWeight: "800", lineHeight: 25, marginTop: 10 },
  noticeText: { color: "#D7EFF7", fontSize: 13, lineHeight: 20, marginTop: 9 },
  signOutButton: { alignItems: "center", borderColor: "#715066", borderRadius: 13, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  signOutText: { color: "#FFB1B1", fontSize: 14, fontWeight: "900" },
});
