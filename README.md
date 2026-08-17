# FrierenCloud

**FrierenCloud** là ứng dụng Expo dành cho **Android (APK)** và **iOS (IPA)** để tạo, theo dõi và mở các phiên Linux tạm thời qua GitHub Actions. Ứng dụng khởi động với logo FrierenCloud, sau đó đăng nhập qua **Discord OAuth** trực tiếp qua API bridge trên VPS, chọn English/Tiếng Việt, quản lý VM Instances và xem log chứa đường dẫn SSHX khi workflow hoàn tất.

## Chức năng

| Phần          | Nội dung                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Splash        | Chỉ hiện logo do người dùng cung cấp và tên **FrierenCloud** khi khởi động.                                                                                                      |
| Đăng nhập     | Nút **Continue with Discord** mở Discord OAuth. Sau callback, app lưu session bridge mã hóa bằng SecureStore.                                                                    |
| Ngôn ngữ      | Người dùng chọn English hoặc Tiếng Việt sau lần đăng nhập đầu tiên.                                                                                                              |
| VM Instances  | Chỉ có hai tab: **VM Instances** và **Settings**. Dữ liệu VM được bridge đọc/ghi trong Supabase.                                                                                 |
| Tạo Linux VPS | Nhập hostname, token GitHub phụ và bắt buộc xác nhận token không thuộc tài khoản chính. Token chỉ được gửi một lần để dispatch workflow và không được ghi vào database hoặc log. |
| SSHX & log    | Workflow đặt hostname, cài/runs `sshx`, rồi bridge đồng bộ log/URL SSHX về app.                                                                                                  |
| Audit log     | Bridge ghi sự kiện không nhạy cảm vào `api/logs/activity.ndjson`: thời điểm, loại sự kiện, API route, HTTP status và hash rút gọn của Discord user ID.                           |
| Build/release | GitHub Actions cài package hệ thống qua `apt-get`, build APK/IPA qua EAS và upload Release `Version <version>`.                                                                  |

## Kiến trúc

```text
Android / iOS
  └── HTTPS API bridge trên VPS
        ├── Discord OAuth Authorization Code flow
        ├── Session JWT 7 ngày lưu SecureStore trên thiết bị
        ├── Supabase: bảng vm_instances, chỉ bridge có quyền service role
        ├── GitHub REST: dispatch workflow và đọc job log
        └── api/logs/activity.ndjson: audit log đã loại bỏ credential
```

`GET /` và `GET /health` trên bridge là công khai để kiểm tra bằng `curl`. Mọi route VM và profile yêu cầu `Authorization: Bearer <bridge-session>`. Discord OAuth dùng Authorization Code flow, yêu cầu `state` được kiểm tra, đổi code tại Discord token endpoint bằng form encoding, rồi đọc profile qua `/users/@me` với scope `identify`.[1] [2]

## Thiết lập Discord OAuth

Tạo một application trong [Discord Developer Portal](https://discord.com/developers/applications). Trong **OAuth2 → General**, thêm redirect URL sau, thay domain bằng domain HTTPS của API VPS:

```text
https://api.example.com/auth/discord/callback
```

Tại VPS, tạo các credential files chỉ cho root/process service. Không dùng `.env`, không commit chúng và không đưa chúng vào app bundle.

| File trong `/etc/frierencloud/credentials/` | Nguồn                                       | Công dụng                                    |
| ------------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| `discord_client_id`                         | Discord Developer Portal                    | Tạo authorization URL.                       |
| `discord_client_secret`                     | Discord Developer Portal                    | Đổi authorization code lấy Discord token.    |
| `discord_redirect_uri`                      | Redirect URL đã đăng ký                     | Phải giống chính xác URL Discord đã đăng ký. |
| `session_secret`                            | Chuỗi ngẫu nhiên dài do chủ VPS tạo         | Ký session JWT của bridge.                   |
| `supabase_url`                              | Supabase Connect                            | Kết nối dữ liệu VM phía server.              |
| `supabase_service_role_key`                 | Supabase server-only key                    | Chỉ bridge truy cập bảng VM.                 |
| `github_bridge_token`                       | GitHub token/service credential chỉ đọc log | Cập nhật workflow state và log.              |

Ví dụ tạo thư mục credentials (nhập giá trị thật trực tiếp trong terminal VPS, không dán vào repository):

```bash
sudo useradd --system --home /opt/frierencloud --shell /usr/sbin/nologin frierencloud || true
sudo install -d -m 700 /etc/frierencloud/credentials
sudo sh -c 'printf %s "PASTE_VALUE_ON_VPS" > /etc/frierencloud/credentials/discord_client_id'
sudo chmod 600 /etc/frierencloud/credentials/*
```

## API bridge VPS

Clone code vào VPS, cài dependencies, chạy schema Supabase và bật systemd service.

```bash
sudo git clone https://github.com/MinhNekYT/App.git /opt/frierencloud
cd /opt/frierencloud
pnpm install --frozen-lockfile
# Chạy nội dung supabase/vm_instances.sql trong Supabase SQL Editor.
sudo cp deploy/systemd/frierencloud-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now frierencloud-bridge
curl http://localhost:8000/health
```

Nginx nhận HTTPS ở domain API và proxy toàn bộ request tới `127.0.0.1:8000`; tham khảo `deploy/nginx/frierencloud.conf`. Không expose trực tiếp port 8000 ra Internet. Kiến trúc này chỉ phát hành Android và iOS.

## GitHub Repository Secrets cho build

Trong **MinhNekYT/App → Settings → Secrets and variables → Actions**, thêm:

| Secret                          | Mục đích                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                    | Token EAS để workflow build APK/IPA. Tạo tại [Expo Access Tokens](https://expo.dev/settings/access-tokens). |
| `EXPO_PUBLIC_GITHUB_REPOSITORY` | Ví dụ `MinhNekYT/App`; đây là giá trị cấu hình công khai.                                                   |
| `EXPO_PUBLIC_BRIDGE_URL`        | Ví dụ `https://api.example.com`; app Android/iOS gọi bridge qua HTTPS.                                      |
| `RELEASE_GITHUB_TOKEN`          | Tùy chọn. Nếu bỏ trống, workflow dùng `github.token` để tạo GitHub Release.                                 |

Không thêm Discord client secret, Supabase service role key, GitHub bridge token hay `SESSION_SECRET` vào Repository Secrets dùng để build app; các giá trị này chỉ được đọc bởi service trên VPS.

## Build APK/IPA và Release

Mở **Actions → Build and Release FrierenCloud → Run workflow**, nhập semantic version như `1.0.0`, chọn `android`, `ios` hoặc `all`. Workflow sẽ cài `curl`, `jq`, `unzip`, `git` và CA certificates bằng `apt-get`; chạy kiểm tra; build EAS; tải artifact; sau đó upload APK/IPA lên GitHub Release **Version 1.0.0**. IPA cần EAS/Apple signing credentials hợp lệ trước khi cài qua ESign hoặc TrollStore.

## Kiểm tra local

```bash
pnpm check
pnpm test
node --check server/bridge/index.mjs
```

## Tài liệu tham khảo

[1]: https://docs.discord.com/developers/topics/oauth2 "Discord OAuth2 documentation"
[2]: https://docs.discord.com/developers/resources/user "Discord User resource"
