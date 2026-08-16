export type SupportedLanguage = "en" | "vi";

const copy = {
  en: {
    tagline: "Secure Linux sessions",
    signInTitle: "Your cloud console, simply arranged.",
    signInBody: "Sign in with Google to continue to your private session dashboard.",
    google: "Continue with Google",
    chooseLanguage: "Choose your language",
    languageBody: "You can change this at any time from Settings.",
    vmInstances: "VM Instances",
    settings: "Settings",
    noInstances: "No sessions yet",
    noInstancesBody: "Create a temporary Linux session and follow the setup in real time.",
    create: "Create a Linux VPS",
    profile: "Profile",
    language: "Language",
    repository: "GitHub repository",
    repositoryHint: "Workflow route used to provision a temporary session.",
    signOut: "Sign out",
    temporary: "Temporary GitHub Actions session",
    notConfigured: "Google sign-in needs Supabase configuration before it can be used.",
    close: "Close",
  },
  vi: {
    tagline: "Phiên Linux an toàn",
    signInTitle: "Bảng điều khiển cloud của bạn, được sắp xếp đơn giản.",
    signInBody: "Đăng nhập bằng Google để tiếp tục tới bảng điều khiển phiên riêng của bạn.",
    google: "Tiếp tục với Google",
    chooseLanguage: "Chọn ngôn ngữ",
    languageBody: "Bạn có thể thay đổi lựa chọn này bất cứ lúc nào trong Cài đặt.",
    vmInstances: "Máy ảo",
    settings: "Cài đặt",
    noInstances: "Chưa có phiên nào",
    noInstancesBody: "Tạo một phiên Linux tạm thời và theo dõi quá trình thiết lập theo thời gian thực.",
    create: "Tạo một Linux VPS",
    profile: "Hồ sơ",
    language: "Ngôn ngữ",
    repository: "Kho GitHub",
    repositoryHint: "Đường dẫn workflow dùng để tạo phiên tạm thời.",
    signOut: "Đăng xuất",
    temporary: "Phiên GitHub Actions tạm thời",
    notConfigured: "Đăng nhập Google cần cấu hình Supabase trước khi có thể sử dụng.",
    close: "Đóng",
  },
} as const;

export function t(language: SupportedLanguage) {
  return copy[language];
}
