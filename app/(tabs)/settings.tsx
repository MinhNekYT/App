import { useState } from "react";
import {
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

import { useFrierenCloud } from "@/lib/frierencloud/provider";

export default function SettingsScreen() {
  const { accountName, language, repository, updateRepository, signOut, copy } =
    useFrierenCloud();
  const [draftRepository, setDraftRepository] = useState(repository);

  async function saveRepository() {
    await updateRepository(draftRepository);
    Alert.alert(
      "FrierenCloud",
      language === "vi" ? "Đã lưu kho GitHub." : "GitHub repository saved.",
    );
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
          <Text style={styles.eyebrow}>FRIERENCLOUD</Text>
          <Text style={styles.title}>{copy.settings}</Text>
          <View style={styles.card}>
            <Text style={styles.label}>{copy.profile}</Text>
            <Text style={styles.value}>{accountName ?? "Discord account"}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{copy.language}</Text>
            <Text style={styles.value}>
              {language === "en" ? "English" : "Tiếng Việt"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>{copy.repository}</Text>
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
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveRepository()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>{copy.saveRepository}</Text>
            </Pressable>
          </View>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              GitHub tokens used for VM setup are sent one time to the API
              bridge and are never saved on the device or in shared data.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>{copy.signOut}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#12213C", flex: 1 },
  content: { gap: 12, padding: 20, paddingBottom: 34 },
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
    marginBottom: 4,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#1C2D4C",
    borderColor: "#2B4168",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    color: "#A7B4CC",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  value: { color: "#F8FAFC", fontSize: 16, fontWeight: "600", marginTop: 8 },
  caption: { color: "#A7B4CC", fontSize: 13, lineHeight: 19, marginTop: 8 },
  input: {
    backgroundColor: "#132541",
    borderColor: "#365077",
    borderRadius: 12,
    borderWidth: 1,
    color: "#F8FAFC",
    fontSize: 15,
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#4E6490",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 42,
  },
  secondaryText: { color: "#B9B7E8", fontSize: 14, fontWeight: "800" },
  notice: {
    backgroundColor: "#153948",
    borderColor: "#287189",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  noticeText: { color: "#D7EFF7", fontSize: 13, lineHeight: 19 },
  signOutButton: {
    alignItems: "center",
    borderColor: "#64475C",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    marginTop: 4,
  },
  signOutText: { color: "#FF9E9E", fontSize: 15, fontWeight: "800" },
});
