# FrierenCloud

**FrierenCloud** là ứng dụng Expo dành cho **Android (APK)** và **iOS (IPA)** để tạo, theo dõi và mở các phiên Linux tạm thời thông qua GitHub Actions. Ứng dụng chỉ phát hành cho Android và iOS; không có phiên bản web, VPS API bridge, worker, Nginx hoặc systemd service riêng.

## Kiến trúc app-only

```text
Android / iOS
  ├── Discord OAuth qua Supabase Auth
  ├── AsyncStorage: ngôn ngữ, repository, danh sách phiên cục bộ
  └── GitHub REST API: dispatch workflow + đọc trạng thái/log
        └── GitHub Actions runner: hostname + SSHX
```

Discord OAuth do **Supabase Auth** xử lý. App không chứa Discord client secret và không chạy OAuth worker tùy chỉnh. App gửi token GitHub phụ trực tiếp đến GitHub API để tạo workflow, rồi dùng chính token đó để đọc trạng thái và log trong phiên mở hiện tại.[1] [2]

| Phần | Cách hoạt động |
| --- | --- |
| Splash | Chỉ hiện logo FrierenCloud và tên app khi khởi động. |
| Đăng nhập | Nút **Continue with Discord** mở Discord qua Supabase OAuth. |
| Ngôn ngữ | Người dùng chọn English hoặc Tiếng Việt sau lần đăng nhập đầu tiên. |
| VM Instances | Chỉ có hai tab: **VM Instances** và **Settings**. Danh sách phiên được lưu cục bộ trên từng thiết bị. |
| Tạo Linux VPS | Nhập hostname, token GitHub phụ và xác nhận token không thuộc tài khoản chính. |
| Log và SSHX | App đọc log trực tiếp từ GitHub Actions và hiện nút mở URL SSHX khi log có URL đó. |
| Bảo mật token | Token GitHub chỉ tồn tại trong bộ nhớ của app trong phiên đang mở; không ghi vào AsyncStorage, database, log hay API bridge. |
| Build/release | GitHub Actions chạy `apt-get`, build APK/IPA qua EAS và tạo GitHub Release tên `Version <version>`. |

> **Giới hạn có chủ đích:** để không lưu token GitHub, một phiên cũ vẫn hiện trong danh sách cục bộ nhưng không thể làm mới log sau khi app bị đóng. Hãy tạo phiên mới và nhập lại token GitHub phụ để đọc log trực tiếp.

## Thiết lập Discord với Supabase

1. Tạo project tại [Supabase](https://supabase.com/dashboard), vào **Authentication → Providers**, bật **Discord**.
2. Tạo application tại [Discord Developer Portal](https://discord.com/developers/applications), lấy **Client ID** và **Client Secret**, rồi nhập chúng vào provider Discord của Supabase.
3. Trong Discord Developer Portal, thêm callback URL do Supabase hiển thị trong cấu hình Discord provider, thường có dạng sau:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

4. Trong Supabase **Authentication → URL Configuration**, thêm deep link của app:

```text
frierencloud://auth/callback
```

Supabase OAuth provider giữ Discord client secret ở phía dịch vụ xác thực; chỉ **Project URL** và **publishable/anon key** được đưa vào mobile build.[1]

## GitHub repository setup

Workflow `.github/workflows/provision-linux.yml` dùng `workflow_dispatch` với hostname. Nó kiểm tra hostname, cài package cần thiết qua `apt-get`, đặt hostname runner, rồi chạy đúng lệnh sau:

```bash
curl -sSf https://sshx.io/get | sh && sshx
```

Token GitHub phụ cần quyền tối thiểu để dispatch workflow và xem Actions runs/jobs/logs của repository đã cấu hình.[2]

## GitHub Repository Secrets cho build

Trong **MinhNekYT/App → Settings → Secrets and variables → Actions**, thêm các giá trị sau:

| Secret | Mục đích |
| --- | --- |
| `EXPO_TOKEN` | Token EAS để workflow build APK/IPA. Tạo tại [Expo Access Tokens](https://expo.dev/settings/access-tokens). |
| `EXPO_PUBLIC_GITHUB_REPOSITORY` | Ví dụ `MinhNekYT/App`; đây là cấu hình công khai. |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL của Supabase dùng cho Discord login. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key của Supabase dùng trong app client. |
| `RELEASE_GITHUB_TOKEN` | Tùy chọn. Nếu để trống, workflow dùng `github.token` để tạo GitHub Release. |

Không thêm Discord client secret hoặc GitHub token phụ vào repository, EAS build config hay source code. Discord client secret chỉ thuộc Supabase provider; token GitHub phụ chỉ do người dùng nhập trực tiếp trong app.

## Build APK/IPA và Release

Mở **Actions → Build and Release FrierenCloud → Run workflow**, nhập semantic version như `1.0.0`, sau đó chọn `android`, `ios` hoặc `all`. Workflow sẽ cài `curl`, `jq`, `unzip`, `git` và CA certificates bằng `apt-get`; chạy TypeScript và test; build EAS; tải artifact; sau đó upload APK/IPA lên GitHub Release **Version 1.0.0**. IPA cần EAS/Apple signing credentials hợp lệ trước khi cài qua ESign hoặc TrollStore.

## Kiểm tra local

```bash
pnpm check
pnpm test
```

## Tài liệu tham khảo

[1]: https://supabase.com/docs/guides/auth/social-login/auth-discord "Supabase: Login with Discord"
[2]: https://docs.github.com/rest/actions/workflows "GitHub REST API: Workflows"
