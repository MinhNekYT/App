import { useRouter } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";
import type { Language } from "@/lib/frierencloud/types";

export default function LanguageScreen() {
  const router = useRouter();
  const { selectLanguage } = useFrierenCloud();

  async function choose(language: Language) {
    await selectLanguage(language);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>FRIERENCLOUD</Text>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.titleVi}>Chọn ngôn ngữ</Text>
        <Text style={styles.body}>
          You can change this at any time from Settings.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void choose("en")}
          style={styles.option}
        >
          <Text style={styles.optionTitle}>English</Text>
          <Text style={styles.optionBody}>Continue in English</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void choose("vi")}
          style={styles.option}
        >
          <Text style={styles.optionTitle}>Tiếng Việt</Text>
          <Text style={styles.optionBody}>Tiếp tục bằng tiếng Việt</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#12213C", flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  eyebrow: {
    color: "#43C6E8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginTop: 14,
  },
  titleVi: { color: "#B9B7E8", fontSize: 22, fontWeight: "600", marginTop: 4 },
  body: {
    color: "#A7B4CC",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    marginTop: 16,
  },
  option: {
    backgroundColor: "#1C2D4C",
    borderColor: "#2B4168",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 78,
    padding: 17,
  },
  optionTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "800" },
  optionBody: { color: "#A7B4CC", fontSize: 13, marginTop: 5 },
});
