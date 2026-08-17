import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";

type ActiveRoute = "instances" | "settings";

type WebShellProps = {
  active: ActiveRoute;
  children: ReactNode;
  action?: ReactNode;
};

const navItems: Array<{
  key: ActiveRoute;
  label: string;
  icon: "server" | "settings";
  href: "/" | "/settings";
}> = [
  { key: "instances", label: "VM Instances", icon: "server", href: "/" },
  { key: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

export function WebShell({ active, children, action }: WebShellProps) {
  const router = useRouter();
  const { accountName } = useFrierenCloud();
  const { width } = useWindowDimensions();
  const isPhone = width < 720;
  const isDesktop = width >= 1100;

  const navigate = (href: "/" | "/settings") => router.replace(href as never);

  return (
    <View style={styles.app}>
      {isDesktop ? (
        <View style={styles.sidebar}>
          <Brand compact={false} />
          <View style={styles.sidebarNav}>
            {navItems.map((item) => (
              <NavItem
                active={active === item.key}
                icon={item.icon}
                key={item.key}
                label={item.label}
                onPress={() => navigate(item.href)}
              />
            ))}
          </View>
          <View style={styles.sidebarFooter}>
            <Text numberOfLines={1} style={styles.accountName}>
              {accountName ?? "Discord account"}
            </Text>
            <Text style={styles.accountCaption}>Signed in with Discord</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.mainArea}>
        {!isDesktop ? (
          <View style={styles.topbar}>
            <Brand compact={isPhone} />
            <View style={styles.topActions}>{action}</View>
          </View>
        ) : null}

        {!isPhone && !isDesktop ? (
          <View style={styles.tabletNav}>
            {navItems.map((item) => (
              <NavItem
                active={active === item.key}
                icon={item.icon}
                key={item.key}
                label={item.label}
                onPress={() => navigate(item.href)}
              />
            ))}
            <View style={styles.tabletSpacer} />
            <Text numberOfLines={1} style={styles.tabletAccount}>
              {accountName ?? "Discord account"}
            </Text>
          </View>
        ) : null}

        <View style={[styles.page, isPhone && styles.pagePhone]}>{children}</View>
      </View>

      {isPhone ? (
        <View style={styles.bottomNav}>
          {navItems.map((item) => (
            <NavItem
              active={active === item.key}
              icon={item.icon}
              key={item.key}
              label={item.label}
              onPress={() => navigate(item.href)}
              vertical
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Brand({ compact }: { compact: boolean }) {
  return (
    <View style={styles.brand}>
      <Image source={require("@/assets/images/icon.png")} style={styles.brandIcon} />
      <View>
        <Text style={styles.brandName}>FrierenCloud</Text>
        {!compact ? <Text style={styles.brandCaption}>Temporary Linux workspace</Text> : null}
      </View>
    </View>
  );
}

function NavItem({
  active,
  icon,
  label,
  onPress,
  vertical = false,
}: {
  active: boolean;
  icon: "server" | "settings";
  label: string;
  onPress: () => void;
  vertical?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navItem,
        vertical && styles.navItemVertical,
        active && styles.navItemActive,
        pressed && styles.navItemPressed,
      ]}
    >
      <Feather color={active ? "#7FE1F6" : "#8EA0BF"} name={icon} size={18} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { backgroundColor: "#101D35", flex: 1, minHeight: "100%" as unknown as number },
  sidebar: { backgroundColor: "#0B1529", borderRightColor: "#263A5B", borderRightWidth: 1, padding: 24, width: 258 },
  sidebarNav: { gap: 8, marginTop: 42 },
  sidebarFooter: { borderTopColor: "#263A5B", borderTopWidth: 1, marginTop: "auto", paddingTop: 18 },
  accountName: { color: "#E8EEFA", fontSize: 14, fontWeight: "700" },
  accountCaption: { color: "#8293B0", fontSize: 12, marginTop: 5 },
  mainArea: { flex: 1, minWidth: 0 },
  topbar: { alignItems: "center", borderBottomColor: "#263A5B", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 68, paddingHorizontal: 18 },
  topActions: { alignItems: "center", flexDirection: "row", gap: 10 },
  tabletNav: { alignItems: "center", borderBottomColor: "#263A5B", borderBottomWidth: 1, flexDirection: "row", gap: 8, minHeight: 70, paddingHorizontal: 28 },
  tabletSpacer: { flex: 1 },
  tabletAccount: { color: "#AFC0DD", fontSize: 13, maxWidth: 180 },
  page: { alignSelf: "center", flex: 1, maxWidth: 1440, padding: 32, width: "100%" },
  pagePhone: { padding: 18, paddingBottom: 92 },
  bottomNav: { alignItems: "center", backgroundColor: "#0B1529", borderTopColor: "#263A5B", borderTopWidth: 1, bottom: 0, flexDirection: "row", justifyContent: "space-around", left: 0, minHeight: 70, paddingHorizontal: 12, position: "absolute", right: 0 },
  brand: { alignItems: "center", flexDirection: "row", gap: 10 },
  brandIcon: { borderRadius: 8, height: 32, width: 32 },
  brandName: { color: "#E8EEFA", fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  brandCaption: { color: "#8293B0", fontSize: 11, marginTop: 3 },
  navItem: { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 10, minHeight: 42, paddingHorizontal: 12 },
  navItemVertical: { flex: 1, flexDirection: "column", gap: 4, minHeight: 52, justifyContent: "center", paddingHorizontal: 5, paddingVertical: 5 },
  navItemActive: { backgroundColor: "#18364E" },
  navItemPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  navLabel: { color: "#8EA0BF", fontSize: 14, fontWeight: "700" },
  navLabelActive: { color: "#7FE1F6" },
});
