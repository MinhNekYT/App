import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";

const logo = require("../assets/images/icon.png");

export default function SplashScreen() {
  const router = useRouter();
  const { booting, signedIn, hasLanguage } = useFrierenCloud();
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (booting || !minimumElapsed) return;
    if (!signedIn) router.replace("/sign-in" as never);
    else if (!hasLanguage) router.replace("/language" as never);
    else router.replace("/(tabs)");
  }, [booting, signedIn, hasLanguage, minimumElapsed, router]);

  return (
    <View style={styles.screen}>
      <Image
        source={logo}
        accessibilityLabel="FrierenCloud logo"
        style={styles.logo}
      />
      <Text style={styles.name}>FrierenCloud</Text>
      <Text style={styles.subtitle}>Secure Linux sessions</Text>
      <ActivityIndicator color="#43C6E8" style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: "#12213C",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  logo: { borderRadius: 28, height: 170, marginBottom: 22, width: 170 },
  name: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  subtitle: { color: "#A7B4CC", fontSize: 14, marginTop: 8 },
  indicator: { marginTop: 32 },
});
