// Booting AppModule requires these to be present: `database.provider.ts` throws
// without DATABASE_URL, and `auth.module.ts` / `mail.module.ts` read the rest with
// getOrThrow. `.env` is gitignored, so a clean checkout has none of them.
//
// `@nestjs/config` does not override keys already on `process.env`, so a real
// `.env` still wins locally. No live service is contacted - `new Pool()` and
// `drizzle(pool)` are both lazy, so unreachable placeholders are fine.
const DEFAULTS: Record<string, string> = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/inventory_test',
  JWT_ACCESS_SECRET: 'test-access-secret',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '465',
  SMTP_USER: 'test@example.com',
  SMTP_PASSWORD: 'test-password',
};

for (const [key, value] of Object.entries(DEFAULTS)) {
  process.env[key] ??= value;
}
