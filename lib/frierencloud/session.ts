import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const key = "frierencloud.discord.session";

export const discordSession = {
  get: () =>
    Platform.OS === "web"
      ? AsyncStorage.getItem(key)
      : SecureStore.getItemAsync(key),
  set: (token: string) =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(key, token)
      : SecureStore.setItemAsync(key, token),
  clear: () =>
    Platform.OS === "web"
      ? AsyncStorage.removeItem(key)
      : SecureStore.deleteItemAsync(key),
};
