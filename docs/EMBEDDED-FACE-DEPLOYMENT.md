# Embedded facial recognition (deployment)

## Architecture

- **Mobile**: `@vladmandic/face-api` (128-D) inside a WebView; native front camera via `react-native-vision-camera`.
- **Server**: Laravel only — stores embeddings and compares with `FaceMatcher` (no Node `face-service` in production).

## API (Passport)

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/intern/time/status` | — |
| POST | `/api/intern/face/enroll` | `{ "embedding": number[128] }` |
| POST | `/api/intern/time/punch` | `{ "action": "time_in"\|"time_out", "embedding": number[128], "device_info"?: string }` |

Env: `FACE_MATCH_THRESHOLD=0.6` (lower = stricter).

## Production checklist

1. Deploy Laravel + MySQL as usual (no separate face microservice).
2. Build mobile with production API URL in `api.production.ts`.
3. Ensure HTTPS for the API (face models load from jsDelivr CDN on first use).
4. Intern grants **camera** permission on first Time tab use.

## Local development

```bash
cd mobile
npm install
npm run android   # or ios
```

Rebuild after native dependency changes (`vision-camera`, `webview`).
