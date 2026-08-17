import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithDiscord, supabaseConfigured, copy } = useFrierenCloud();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const isWide = width >= 860;

  async function signIn() {
    try {
      setLoading(true);
      const complete = await signInWithDiscord();
      if (complete) router.replace("/language" as never);
    } catch (error) {
      Alert.alert(
        "FrierenCloud",
        error instanceof Error && error.message === "SUPABASE_CONFIGURATION_REQUIRED"
          ? "Discord sign-in needs the Supabase URL and publishable key in this website build."
          : error instanceof Error
            ? error.message
            : "Unable to complete Discord sign-in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={[styles.canvas, isWide && styles.canvasWide]}>
        <View style={[styles.intro, isWide && styles.introWide]}>
          <View style={styles.brandRow}>
            <Image source={require("@/assets/images/icon.png")} style={styles.logo} />
            <Text style={styles.brand}>FrierenCloud</Text>
          </View>
          <Text style={[styles.title, isWide && styles.titleWide]}>Your cloud console, simply arranged.</Text>
          <Text style={styles.lead}>Create temporary Linux workspaces, read Actions logs, and open SSHX from one browser dashboard.</Text>
          {isWide ? (
            <View style={styles.featureList}>
              <Feature icon="server" text="Temporary GitHub Actions workspaces" />
              <Feature icon="terminal" text="SSHX link detection from setup logs" />
              <Feature icon="shield" text="Secondary GitHub tokens stay in tab memory" />
            </View>
          ) : null}
        </View>

        <View style={styles.authCard}>
          <Text style={styles.cardEyebrow}>SIGN IN</Text>
          <Text style={styles.cardTitle}>{copy.signInTitle}</Text>
          <Text style={styles.cardBody}>{copy.signInBody}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void signIn()}
            style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}
          >
            {loading ? <ActivityIndicator color="#101D35" /> : <View style={styles.discordContent}><FontAwesome5 color="#5865F2" name="discord" size={20} /><Text style={styles.buttonText}>{copy.discord}</Text></View>}
          </Pressable>
          {!supabaseConfigured ? <Text style={styles.hint}>Supabase Discord configuration has not been loaded into this website build yet.</Text> : null}
          <Text style={styles.footnote}>FrierenCloud does not use a custom API bridge or background worker.</Text>
        </View>
      </View>
    </View>
  );
}

function Feature({ icon, text }: { icon: "server" | "terminal" | "shield"; text: string }) {
  return (
    <View style={styles.feature}>
      <FontAwesome5 color="#7FE1F6" name={icon} size={13} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: "center", backgroundColor: "#101D35", flex: 1, justifyContent: "center", padding: 20 },
  canvas: { gap: 28, maxWidth: 1050, width: "100%" },
  canvasWide: { alignItems: "stretch", flexDirection: "row", gap: 74 },
  intro: { justifyContent: "center" },
  introWide: { flex: 1, maxWidth: 600 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  logo: { borderRadius: 10, height: 42, width: 42 },
  brand: { color: "#E9EEFA", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  title: { color: "#F5F8FF", fontSize: 33, fontWeight: "800", letterSpacing: -1.1, lineHeight: 41, marginTop: 25, maxWidth: 490 },
  titleWide: { fontSize: 52, letterSpacing: -2, lineHeight: 61 },
  lead: { color: "#A9B7D0", fontSize: 16, lineHeight: 25, marginTop: 14, maxWidth: 530 },
  featureList: { gap: 12, marginTop: 28 },
  feature: { alignItems: "center", flexDirection: "row", gap: 10 },
  featureText: { color: "#C2D0E8", fontSize: 13, fontWeight: "600" },
  authCard: { backgroundColor: "#172743", borderColor: "#2D456D", borderRadius: 20, borderWidth: 1, maxWidth: 410, padding: 24, width: "100%" },
  cardEyebrow: { color: "#7FE1F6", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  cardTitle: { color: "#F5F8FF", fontSize: 24, fontWeight: "800", lineHeight: 31, marginTop: 12 },
  cardBody: { color: "#A9B7D0", fontSize: 14, lineHeight: 21, marginTop: 10 },
  button: { alignItems: "center", backgroundColor: "#F5F8FF", borderRadius: 13, justifyContent: "center", marginTop: 28, minHeight: 52 },
  discordContent: { alignItems: "center", flexDirection: "row", gap: 10 },
  buttonText: { color: "#101D35", fontSize: 15, fontWeight: "900" },
  hint: { color: "#FFCE9B", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  footnote: { color: "#8293B0", fontSize: 11, lineHeight: 17, marginTop: 18, textAlign: "center" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.65 },
});
