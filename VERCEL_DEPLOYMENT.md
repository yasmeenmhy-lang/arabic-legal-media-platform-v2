# Vercel Deployment Guide

This project is configured for a database-free first demo on Vercel.

The Arabic RTL interface and platform scope stay the same. The first public deployment uses mock/demo data, so it does not need SQLite, PostgreSQL, Prisma migrations, or database credentials.

## Why This Fixes The 502 Error

The previous deployment tried to carry SQLite/Prisma assumptions into Vercel. SQLite is not a good fit for Vercel serverless production runtime because the filesystem is not persistent for application data.

For the first demo, the app now deploys as a normal Next.js project:

- No database connection during build.
- No Prisma generation during build.
- No SQLite file required in production.
- API routes return mock/demo data.
- Pages render the Arabic RTL interface normally.

## Vercel Build Settings

These are configured in `vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run vercel-build"
}
```

`package.json` uses:

```json
{
  "vercel-build": "next build"
}
```

## Required Environment Variables

For the first demo, add only these in Vercel:

```env
AI_PROVIDER=mock
NEXT_PUBLIC_DEMO_MODE=true
```

Do not add `DATABASE_URL` for the first Vercel demo.

## Deploy From The Vercel Website

1. Push the project to GitHub.
2. Open [Vercel](https://vercel.com).
3. Click `Add New`.
4. Click `Project`.
5. Import the GitHub repository.
6. Confirm:
   - Framework Preset: `Next.js`
   - Install Command: `npm install`
   - Build Command: `npm run vercel-build`
7. Add the environment variables listed above.
8. Click `Deploy`.
9. When Vercel finishes, click `Visit`.

## Future Production Database

When the demo is approved and you need real persistent data, use PostgreSQL through:

- Vercel Postgres
- Neon
- Supabase

At that point, Prisma can be re-enabled for production migrations and real database access.
