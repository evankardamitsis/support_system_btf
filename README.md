This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Performance Retainers

The admin Performance area combines Shopify, Meta Ads, Google Ads, and Klaviyo metrics into one dashboard. To enable live data:

1. Apply `supabase/migrations/053_performance_retainers.sql` to the project database.
2. Add a long random `PERFORMANCE_CREDENTIALS_KEY` to `.env.local` and the deployment environment. Generate one with `openssl rand -base64 48` and keep it stable; changing it makes stored connection credentials unreadable.
3. Configure guided provider authorization:
   - Shopify: set `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, and callback `${NEXT_PUBLIC_APP_URL}/api/performance/shopify/callback`. The default scopes are `read_orders,read_customers,read_products`.
   - Klaviyo: create a private key with `metrics:read`, `campaigns:read`, and `flows:read`. Metric aggregates power account totals; Klaviyo Reporting API powers newsletter and automated-flow reporting.
   - Meta Ads: set `META_APP_ID`, `META_APP_SECRET`, and callback `${NEXT_PUBLIC_APP_URL}/api/performance/meta/callback`. The default permission is the read-only `ads_read` scope; `META_GRAPH_VERSION` defaults to `v26.0`.
   - Google Ads: set `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, and callback `${NEXT_PUBLIC_APP_URL}/api/performance/google/callback`. The flow requests the Google Ads scope with offline access. `GOOGLE_ADS_API_VERSION` defaults to `v25`; `GOOGLE_ADS_DEVELOPER_TOKEN` remains optional for legacy projects.
4. Klaviyo uses a private API key restricted to `metrics:read`, `campaigns:read`, and `flows:read`. Create one per client and paste it into the Klaviyo integration card; it is encrypted immediately after verification.
5. Set `CRON_SECRET` in the deployment environment for the scheduled `/api/cron/performance-sync` request.
6. Open `/admin/performance/integrations` as an admin and connect the providers needed for that client. Google Ads can remain disconnected without affecting Shopify, Meta, or Klaviyo syncs.

In development, `/admin/performance?preview=1` renders the full Sasha Elage dashboard with clearly labelled sample data before the database migration is applied.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
