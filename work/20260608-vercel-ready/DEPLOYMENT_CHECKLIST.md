# Deployment Checklist: GitHub + Vercel

This checklist is for a non-technical user.

## Goal

Deploy the platform to a public Vercel URL.

For the first demo, you do not need a database.

The project uses mock/demo data, so you do not need PostgreSQL, SQLite, Docker, Prisma migrations, or database passwords.

## Part 1: Create A GitHub Repository

1. Go to [GitHub](https://github.com).
2. Sign in.
3. Click the `+` button in the top-right corner.
4. Click `New repository`.
5. Name it:

```text
arabic-legal-media-platform
```

6. Choose `Private` or `Public`.
7. Do not add a README from GitHub.
8. Click `Create repository`.

## Part 2: Upload The Project

Use GitHub Desktop if possible.

1. Open GitHub Desktop.
2. Click `File`.
3. Click `Add local repository`.
4. Select this project folder:

```text
i-want-to-develop-platform
```

5. Click `Publish repository`.

If you upload through the GitHub website, do not upload:

```text
node_modules
.next
.env
prisma/dev.db
work
outputs
```

## Part 3: Import In Vercel

1. Go to [Vercel](https://vercel.com).
2. Sign in with GitHub.
3. Click `Add New`.
4. Click `Project`.
5. Find:

```text
arabic-legal-media-platform
```

6. Click `Import`.

## Part 4: Confirm Build Settings

Vercel should detect Next.js automatically.

Make sure these values are shown:

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run vercel-build
```

These are already configured in `vercel.json`.

## Part 5: Add Environment Variables

In Vercel, add these environment variables:

```env
AI_PROVIDER=mock
NEXT_PUBLIC_DEMO_MODE=true
```

Do not add `DATABASE_URL` for the first demo.

## Part 6: Deploy

1. Click `Deploy`.
2. Wait for the build to finish.
3. Click `Visit`.
4. Copy the public URL.

It will look like:

```text
https://arabic-legal-media-platform.vercel.app
```

## If You See 502 BAD_GATEWAY

1. Open the Vercel project.
2. Go to `Settings`.
3. Go to `Build & Development Settings`.
4. Confirm:

```text
Build Command: npm run vercel-build
```

5. Go to `Environment Variables`.
6. Remove `DATABASE_URL` if you added it.
7. Keep only:

```env
AI_PROVIDER=mock
NEXT_PUBLIC_DEMO_MODE=true
```

8. Click `Deployments`.
9. Open the latest deployment.
10. Click `Redeploy`.

## Later: Real Production Database

After the demo is approved, add a real PostgreSQL database.

Good options:

- Vercel Postgres
- Neon
- Supabase
