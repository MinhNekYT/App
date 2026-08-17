import * as SecureStore from "expo-secure-store";

const key = "frierencloud.discord.session";

export const discordSession = {
  get: () => SecureStore.getItemAsync(key),
  set: (token: string) => SecureStore.setItemAsync(key, token),
  clear: () => SecureStore.deleteItemAsync(key),
};
