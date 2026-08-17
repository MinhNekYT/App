# FrierenCloud

**FrierenCloud** là ứng dụng Expo cho Android, iOS và Web dùng để tạo, theo dõi và mở phiên Linux tạm thời qua repository-owned GitHub Actions. Ứng dụng dùng logo FrierenCloud, đăng nhập Google thông qua Supabase, chọn English/Tiếng Việt, và màn hình log nhận diện liên kết SSHX sau khi workflow khởi tạo hoàn tất.

> **Giới hạn quan trọng:** Mỗi phiên Linux là GitHub Actions runner tạm thời, không phải VPS lâu dài. URL SSHX chỉ nên được coi là thông tin nhạy cảm và sẽ hết hiệu lực khi job kết thúc.

## Chức năng

| Thành phần          | Mô tả                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Splash và nhận diện | Hiện logo bạn cung cấp cùng tên **FrierenCloud** khi khởi động.                                                                                 |
| Đăng nhập           | Google OAuth qua Supabase; phiên đăng nhập được giữ trên thiết bị.                                                                              |
| Onboarding          | Chọn **English** hoặc **Tiếng Việt** sau lần đăng nhập đầu tiên.                                                                                |
| Điều hướng          | Chính xác hai tab: **VM Instances** và **Settings**.                                                                                            |
| Tạo phiên Linux     | Tên máy hợp lệ, token GitHub phụ được che, và checkbox xác nhận bắt buộc. Token được gửi một lần tới API bridge để dispatch, sau đó bị loại bỏ. |
| Workflow setup      | GitHub Actions kiểm tra hostname, thay hostname, cài SSHX, chạy `sshx`, rồi API bridge cập nhật log và URL SSHX dùng chung.                     |
| Build/release       | GitHub Actions cài package hệ thống qua `apt-get`, build APK/IPA qua EAS rồi upload release `Version <version>`.                                |
| Web                 | Expo static export có thể host trên Vercel hoặc Nginx VPS, dùng chung dữ liệu với Android/iOS.                                                  |

## Kiến trúc

```text
FrierenCloud (Expo: Android / iOS / Web/Vercel)
  ├── Supabase Auth: Google OAuth + session trên từng client
  ├── API bridge Node.js: http://localhost:8000 trên VPS
  │   ├── GET /health: công khai
  │   ├── /api/v1/instances: bắt buộc Supabase Bearer session
  │   └── GitHub REST + Supabase service key: chỉ phía server
  ├── Supabase vm_instances: dữ liệu VM chung, RLS theo user
  ├── provision-linux.yml: hostname → SSHX → log URL
  └── build-and-release.yml: apt-get → EAS APK/IPA → GitHub Release
```

Không đưa GitHub token do người dùng nhập vào Supabase, AsyncStorage, SecureStore, source code hoặc log. Client gửi token phụ một lần qua HTTPS tới API bridge để dispatch workflow, bridge không ghi token vào database và dùng server credential riêng chỉ để đọc trạng thái/log sau đó.

## Yêu cầu phát triển

| Công cụ           | Phiên bản khuyến nghị    | Mục đích                                 |
| ----------------- | ------------------------ | ---------------------------------------- |
| Node.js           | 22 LTS                   | Chạy Expo và công cụ build.              |
| pnpm              | Theo `packageManager`    | Cài phụ thuộc có lockfile.               |
| Tài khoản Expo    | Có quyền với EAS project | Build APK/IPA qua EAS.                   |
| Supabase project  | Google provider được bật | Đăng nhập và session.                    |
| GitHub repository | Bật Actions              | Provision phiên Linux, build và release. |

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm dev
```

## Repository Secrets

Trong GitHub, mở **repository → Settings → Secrets and variables → Actions → New repository secret** để thêm secret. GitHub chỉ đưa secret vào runtime workflow; không commit chúng vào `.env`, README hoặc source code.[3]

| Secret                                 | Nơi lấy                                                       | Dùng cho                                          | Có thể xuất hiện trong app?  |
| -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- | ---------------------------- |
| `EXPO_TOKEN`                           | [Expo Access Tokens](https://expo.dev/settings/access-tokens) | Xác thực EAS CLI trong workflow build.            | Không.                       |
| `EXPO_PUBLIC_SUPABASE_URL`             | Supabase project → **Connect**                                | URL API của Supabase.                             | Có, đây là định danh public. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project → **Connect**                                | Khóa publishable/anon cho Expo client.            | Có, dùng cùng RLS.           |
| `EXPO_PUBLIC_GITHUB_REPOSITORY`        | Bạn tự nhập, ví dụ `MinhNekYT/App`                            | Route `owner/repository` chứa workflow provision. | Có.                          |
| `EXPO_PUBLIC_BRIDGE_URL`               | URL HTTPS bridge, ví dụ `https://api.example.com`             | Cấu hình public client gọi API bridge.            | Có.                          |
| `RELEASE_GITHUB_TOKEN`                 | Tùy chọn                                                      | PAT riêng nếu cần quyền release đặc biệt.         | Không.                       |

Không bao giờ thêm **Supabase `service_role` key**, private key Apple, GitHub token chính hoặc token EAS vào app bundle. `EXPO_PUBLIC_*` là biến công khai sau khi build, vì vậy chỉ dùng chúng cho URL/project ID/publishable key.[1]

## API bridge dùng chung

API bridge chạy Node.js trên VPS và lắng nghe riêng tại `http://localhost:8000`. Endpoint `GET /health` công khai để kiểm tra tiến trình bằng `curl`, còn mọi endpoint VM đòi hỏi access token Supabase. Vì vậy, bất kỳ người nào có thể kiểm tra service còn chạy, nhưng không thể đọc/tạo/làm mới VM của người khác.

Trước khi chạy bridge, mở **Supabase SQL Editor**, chạy nội dung `supabase/vm_instances.sql`, rồi cấu hình Google OAuth như phần dưới. Bảng này bật RLS và chỉ cho phép người dùng đọc các VM của chính họ; bridge dùng service-role credential chỉ trong process server để tạo/cập nhật record sau khi đã xác thực access token người dùng.

| Route                                | Xác thực                | Mục đích                                  |
| ------------------------------------ | ----------------------- | ----------------------------------------- |
| `GET /health`                        | Không cần               | Trả JSON trạng thái API bridge.           |
| `GET /api/v1/instances`              | Supabase Bearer session | Danh sách VM của user đăng nhập.          |
| `POST /api/v1/instances`             | Supabase Bearer session | Dispatch workflow dùng token phụ một lần. |
| `POST /api/v1/instances/:id/refresh` | Supabase Bearer session | Đồng bộ trạng thái, log và URL SSHX.      |

Không có file `.env` trong repository. Các credential server chỉ được systemd đọc từ `/etc/frierencloud/credentials/`; đây là file quyền `600` trên VPS, không được Vercel/client bundle đọc và không được commit. Base64 không phải cơ chế bảo vệ secret.

### Lấy `EXPO_TOKEN`

Đăng nhập Expo bằng tài khoản sở hữu EAS project, mở [Expo Access Tokens](https://expo.dev/settings/access-tokens), chọn **Create token**, đặt tên dễ nhận biết như `frierencloud-github-actions`, rồi sao chép token ngay. Thêm nó vào Repository Secret tên `EXPO_TOKEN`. Khi `EXPO_TOKEN` được đặt trong môi trường, EAS CLI có thể chạy không cần `eas login`; nếu token lộ, hãy xóa nó tại cùng trang Access Tokens để thu hồi quyền.[1]

### Cấu hình Supabase và Google OAuth

Tạo project tại [Supabase Dashboard](https://supabase.com/dashboard), sau đó lấy Project URL và **publishable key** từ hộp thoại **Connect**. Bật provider **Google** trong **Authentication → Providers**, cấu hình Google OAuth Web Client ID/secret theo hướng dẫn Supabase, và thêm URL callback sau vào **Authentication → URL Configuration**:

| Nền tảng               | Redirect URL cần thêm                 |
| ---------------------- | ------------------------------------- |
| Android/iOS production | `frierencloud://auth/callback`        |
| Web VPS                | `https://YOUR_DOMAIN/auth/callback`   |
| Web local              | `http://localhost:8081/auth/callback` |

Supabase hỗ trợ `signInWithOAuth` cho Google trên iOS, Android và web; application URL và key publishable lấy từ Connect dialog, còn security cho dữ liệu phải được kiểm soát bằng Row Level Security.[2]

### `GITHUB_TOKEN` và Release

Không cần tạo thủ công secret repository tên `GITHUB_TOKEN`. GitHub tự tạo một `GITHUB_TOKEN` riêng cho mỗi job và workflow dùng `permissions: contents: write` để tạo release và đính kèm APK/IPA.[4] Nếu policy repository yêu cầu PAT riêng, tạo fine-grained token với quyền tối thiểu cho repository đó rồi lưu dưới tên `RELEASE_GITHUB_TOKEN`; không dùng token của tài khoản chính cho flow tạo VPS trong app.

## GitHub Actions

| Workflow                                  | Trigger                    | Nhiệm vụ                                                                                                                                               |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/provision-linux.yml`   | `workflow_dispatch` từ app | Validate hostname, `apt-get install curl ca-certificates`, `hostnamectl set-hostname`, chạy `curl -sSf https://sshx.io/get \| sh && sshx`.             |
| `.github/workflows/build-and-release.yml` | Chạy thủ công từ Actions   | Validate version/secrets, `apt-get install` package cần thiết, cài pnpm dependencies, chạy check/test, EAS build và tạo **Version <version>** release. |

Để build, vào **Actions → Build and Release FrierenCloud → Run workflow**, nhập version semantic như `1.0.0` và chọn `android`, `ios` hoặc `all`. IPA cần signing credentials Apple hợp lệ trong EAS; ESign/TrollStore không bỏ qua yêu cầu ký hợp lệ của iOS.

## Host phiên bản Web trên VPS

Phiên bản web là static export. `pnpm web:build` tạo thư mục `dist/`, sau đó Nginx chỉ phục vụ file tĩnh; không cần chạy Expo dev server liên tục. Expo hướng dẫn export web tĩnh bằng `pnpm expo export --platform web` và cần chạy lại export sau mỗi lần thay đổi.[5]

### Chuẩn bị Ubuntu VPS

Trên VPS Ubuntu có quyền `sudo`, cài package cần thiết:

```bash
sudo apt-get update
sudo apt-get install --yes --no-install-recommends nginx git curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install --yes nodejs
sudo corepack enable
sudo corepack prepare pnpm@9.12.0 --activate
```

Clone repository vào `/opt/frierencloud`, tạo credential files quyền chỉ-root cho process bridge, rồi build static site. Thay từng giá trị mẫu trực tiếp trên VPS; không tạo `.env` và không commit các file credential:

```bash
sudo git clone https://github.com/MinhNekYT/App.git /opt/frierencloud
cd /opt/frierencloud
sudo useradd --system --home /opt/frierencloud --shell /usr/sbin/nologin frierencloud || true
sudo install -d -m 700 /etc/frierencloud/credentials
sudo sh -c 'printf %s "https://YOUR_PROJECT.supabase.co" > /etc/frierencloud/credentials/supabase_url'
sudo sh -c 'printf %s "YOUR_SERVER_ONLY_SERVICE_ROLE_KEY" > /etc/frierencloud/credentials/supabase_service_role_key'
sudo sh -c 'printf %s "YOUR_SERVER_ONLY_GITHUB_READ_TOKEN" > /etc/frierencloud/credentials/github_bridge_token'
sudo chmod 600 /etc/frierencloud/credentials/*
pnpm install --frozen-lockfile
sudo mkdir -p /var/www/frierencloud
```

Copy `deploy/systemd/frierencloud-bridge.service` to `/etc/systemd/system/`, replace the allowed HTTPS origins, then enable the service. Caddy/Nginx forwards public `/api/` requests to its local port 8000; `curl http://localhost:8000/health` remains available directly on the VPS.

```bash
sudo cp deploy/systemd/frierencloud-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now frierencloud-bridge
curl http://localhost:8000/health
```

### Vercel web

Import `MinhNekYT/App` into Vercel. `vercel.json` runs `pnpm web:build` and serves `dist/`. In **Project Settings → Environment Variables**, add the non-secret public build values `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_GITHUB_REPOSITORY`, and `EXPO_PUBLIC_BRIDGE_URL=https://YOUR_API_DOMAIN`. Do not add `SUPABASE_SERVICE_ROLE_KEY` or GitHub bridge credential to Vercel. Add the Vercel HTTPS domain to `ALLOWED_ORIGINS`, Supabase Redirect URLs, and Google Authorized JavaScript origins.

Copy `deploy/nginx/frierencloud.conf` to `/etc/nginx/sites-available/frierencloud`, replace `YOUR_DOMAIN`, enable it, validate Nginx and request an HTTPS certificate:

```bash
sudo ln -s /etc/nginx/sites-available/frierencloud /etc/nginx/sites-enabled/frierencloud
sudo nginx -t
sudo systemctl reload nginx
```

Use a reverse proxy/certificate setup appropriate to your domain before exposing the site publicly. Update Supabase and Google OAuth redirect/origin lists after the HTTPS domain is live.

## Verification

```bash
pnpm check
pnpm test
pnpm web:build
```

## References

[1] [Expo — Programmatic access](https://docs.expo.dev/accounts/programmatic-access/)

[2] [Supabase — Social Auth with Expo React Native](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth)

[3] [GitHub Docs — Using secrets in GitHub Actions](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)

[4] [GitHub Docs — GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)

[5] [Expo — Publish your web app](https://docs.expo.dev/deploy/web/)
