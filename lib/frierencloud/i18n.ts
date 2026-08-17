import type { Language } from "./types";

const messages = {
  en: {
    vmInstances: "VM Instances",
    settings: "Settings",
    createLinuxVps: "Create a Linux VPS",
    noInstances: "No sessions yet",
    noInstancesBody:
      "Create a temporary Linux session and follow the setup in real time.",
    signInTitle: "Your cloud console, simply arranged.",
    signInBody:
      "Sign in with Discord to continue to your private session dashboard.",
    discord: "Continue with Discord",
    chooseLanguage: "Choose your language",
    languageBody: "You can change this at any time from Settings.",
    profile: "Profile",
    language: "Language",
    repository: "GitHub repository",
    repositoryHint: "Workflow route used to provision a temporary session.",
    saveRepository: "Save repository",
    signOut: "Sign out",
    temporary: "Temporary GitHub Actions session",
  },
  vi: {
    vmInstances: "VM Instances",
    settings: "Cài đặt",
    createLinuxVps: "Tạo một Linux VPS",
    noInstances: "Chưa có phiên nào",
    noInstancesBody:
      "Tạo một phiên Linux tạm thời và theo dõi quá trình thiết lập theo thời gian thực.",
    signInTitle: "Bảng điều khiển cloud của bạn, được sắp xếp đơn giản.",
    signInBody:
      "Đăng nhập bằng Discord để tiếp tục tới bảng điều khiển phiên riêng của bạn.",
    discord: "Tiếp tục với Discord",
    chooseLanguage: "Chọn ngôn ngữ",
    languageBody:
      "Bạn có thể thay đổi lựa chọn này bất cứ lúc nào trong Cài đặt.",
    profile: "Hồ sơ",
    language: "Ngôn ngữ",
    repository: "Kho GitHub",
    repositoryHint: "Đường dẫn workflow dùng để tạo phiên tạm thời.",
    saveRepository: "Lưu kho GitHub",
    signOut: "Đăng xuất",
    temporary: "Phiên GitHub Actions tạm thời",
  },
} as const;

export function copyFor(language: Language) {
  return messages[language];
}
