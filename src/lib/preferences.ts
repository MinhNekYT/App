import AsyncStorage from "@react-native-async-storage/async-storage";

const REPOSITORY_KEY = "frierencloud.repository";

export async function getRepositoryPreference() {
  return (await AsyncStorage.getItem(REPOSITORY_KEY)) ?? "MinhNekYT/App";
}

export async function setRepositoryPreference(value: string) {
  await AsyncStorage.setItem(REPOSITORY_KEY, value.trim());
}
