import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";
import type { Language } from "@/lib/frierencloud/types";

export default function LanguageScreen() {
  const router = useRouter();
  const { selectLanguage } = useFrierenCloud();
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  async function choose(language: Language) {
    await selectLanguage(language);
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <Image source={require("@/assets/images/icon.png")} style={styles.logo} />
          <Text style={styles.brand}>FrierenCloud</Text>
        </View>
        <Text style={styles.eyebrow}>PREFERENCES</Text>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.titleVi}>Chọn ngôn ngữ</Text>
        <Text style={styles.body}>Your selection is stored locally in this browser and can be changed later from Settings.</Text>

        <View style={[styles.options, isWide && styles.optionsWide]}>
          <LanguageOption icon="globe" label="English" detail="Continue in English" onPress={() => void choose("en")} />
          <LanguageOption icon="type" label="Tiếng Việt" detail="Tiếp tục bằng tiếng Việt" onPress={() => void choose("vi")} />
        </View>
      </View>
    </View>
  );
}

function LanguageOption({ detail, icon, label, onPress }: { detail: string; icon: "globe" | "type"; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
      <View style={styles.optionIcon}><Feather color="#7FE1F6" name={icon} size={20} /></View>
      <View style={styles.optionCopy}><Text style={styles.optionTitle}>{label}</Text><Text style={styles.optionBody}>{detail}</Text></View>
      <Feather color="#B9B7E8" name="arrow-right" size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: "center", backgroundColor: "#101D35", flex: 1, justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#172743", borderColor: "#2D456D", borderRadius: 22, borderWidth: 1, maxWidth: 760, padding: 28, width: "100%" },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  logo: { borderRadius: 9, height: 36, width: 36 },
  brand: { color: "#E9EEFA", fontSize: 16, fontWeight: "900" },
  eyebrow: { color: "#7FE1F6", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 32 },
  title: { color: "#F5F8FF", fontSize: 31, fontWeight: "800", letterSpacing: -1, marginTop: 10 },
  titleVi: { color: "#C9C6F4", fontSize: 21, fontWeight: "700", marginTop: 4 },
  body: { color: "#A9B7D0", fontSize: 14, lineHeight: 21, marginTop: 16, maxWidth: 500 },
  options: { gap: 12, marginTop: 26 },
  optionsWide: { flexDirection: "row" },
  option: { alignItems: "center", backgroundColor: "#0E1A30", borderColor: "#2B4267", borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: "row", minHeight: 82, padding: 14 },
  optionPressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  optionIcon: { alignItems: "center", backgroundColor: "#183D4A", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  optionCopy: { flex: 1, marginLeft: 12 },
  optionTitle: { color: "#F5F8FF", fontSize: 16, fontWeight: "900" },
  optionBody: { color: "#A9B7D0", fontSize: 12, marginTop: 4 },
});
