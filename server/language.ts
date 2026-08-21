export const supportedLocales = ["en", "vi"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export function normalizeLocale(value: unknown): SupportedLocale {
  return value === "vi" ? "vi" : "en";
}

export const copy = {
  en: {
    banned: "ERROR: You have been banned by an admin. If you think this is a misunderstanding, please contact any admin via DMS.",
    notAdmin: "ERROR: You cannot use this command because you are not an administrator.",
    tokenStored: "GitHub token stored securely.",
    contributionStored: "Your contribution token was stored securely. An administrator can credit contribution coins after review.",
    languageSaved: "Language saved. FrierenCloud bot and web now use English for your account.",
    noContribution: "Confirm a contribution token first with `/token contribute`.",
  },
  vi: {
    banned: "LỖI: Bạn đã bị admin cấm. Nếu cho rằng đây là nhầm lẫn, hãy liên hệ admin qua DM.",
    notAdmin: "LỖI: Bạn không thể dùng lệnh này vì không phải quản trị viên.",
    tokenStored: "GitHub token đã được lưu an toàn.",
    contributionStored: "Contribution token của bạn đã được lưu an toàn. Admin có thể cộng xu đóng góp sau khi xét duyệt.",
    languageSaved: "Đã lưu ngôn ngữ. Bot và web FrierenCloud hiện dùng tiếng Việt cho tài khoản của bạn.",
    noContribution: "Hãy xác nhận contribution token trước bằng `/token contribute`.",
  },
} as const;
