# Fresh setup

## Web (Laravel)

```bash
cd web
composer install
cp .env.example .env          # Windows: copy .env.example .env
php artisan key:generate
```

Configure `.env` (database, `APP_URL`, etc.). For Laragon MySQL, set `DB_CONNECTION=mysql` and your DB name/user/password.

```bash
npm install
php artisan migrate
php artisan passport:keys
php artisan passport:client --personal --name="Intern Mobile" --provider=users --no-interaction
npm run dev                   # or: npm run build
php artisan serve             # or use Laragon — mobile needs your LAN IP, not localhost
```

### Seeders

Either run all default seeders:

```bash
php artisan db:seed
```

Or individually (minimum for admin login):

```bash
php artisan db:seed --class=SuperAdminSeeder
```

Optional face-match strictness in `.env`:

```env
FACE_MATCH_THRESHOLD=0.45
```

Then: `php artisan config:clear`

---

## Mobile (React Native)

```bash
cd mobile
npm install
```

Set your PC’s LAN IP in `mobile/src/config/api.local.ts` (`baseUrl`, e.g. `http://10.x.x.x:8000`).

```bash
npx react-native run-android
```

---

## Passport — when to skip

If you already have the same database and `storage/oauth-*.key` files, you do **not** need to run `passport:keys` or `passport:client` again.

`composer install` alone does **not** set up Passport keys or the OAuth client — run the Passport commands on a **fresh machine** or **new empty database**.
