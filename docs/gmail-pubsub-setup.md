# Gmail instant sync — Google Cloud Pub/Sub setup

Gmail can notify OrzuAI within seconds when a new email arrives. This uses **Gmail Push** → **Cloud Pub/Sub** → **OrzuAI webhook**.

Use the **same Google Cloud project** as your OAuth client (`GOOGLE_CLIENT_ID`).

## 1. Enable APIs

In [Google Cloud Console → APIs & Services → Library](https://console.cloud.google.com/apis/library):

- **Gmail API** — required
- **Cloud Pub/Sub API** — required for push

## 2. Create a Pub/Sub topic

```bash
# Replace PROJECT_ID with your GCP project id (e.g. 977870799114 or my-project-name)
export PROJECT_ID=your-gcp-project-id
export TOPIC=gmail-inbox

gcloud pubsub topics create $TOPIC --project=$PROJECT_ID
```

## 3. Allow Gmail to publish to the topic

Gmail uses a fixed service account:

```bash
gcloud pubsub topics add-iam-policy-binding $TOPIC \
  --project=$PROJECT_ID \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

## 4. Generate a webhook secret

Use a long random string (32+ chars). Example:

```bash
openssl rand -hex 32
```

## 5. Create a push subscription

Push URL must be **HTTPS** (production `https://www.orzux.com` or your app URL):

```
https://www.orzux.com/api/webhooks/gmail-push?token=YOUR_GMAIL_PUBSUB_PUSH_SECRET
```

```bash
export PUSH_SECRET=your-long-random-secret
export APP_URL=https://www.orzux.com

gcloud pubsub subscriptions create gmail-inbox-push \
  --project=$PROJECT_ID \
  --topic=$TOPIC \
  --push-endpoint="${APP_URL}/api/webhooks/gmail-push?token=${PUSH_SECRET}" \
  --ack-deadline=30
```

## 6. Set environment variables

On Vercel (or `.env.local` for production URL testing):

```env
GMAIL_PUBSUB_TOPIC=projects/your-gcp-project-id/topics/gmail-inbox
GMAIL_PUBSUB_PUSH_SECRET=your-long-random-secret
```

Redeploy the app after saving env vars.

## 7. Apply database migration

Run in Supabase SQL Editor:

`supabase/migrations/20250717205000_gmail_push_watch.sql`

## 8. Activate Gmail watch

Either:

- **Reconnect Gmail** in Integrations → Email, or
- Click **Enable instant sync** in the Gmail integration panel, or
- Wait for the daily cron `/api/cron/gmail-watch-renew`

Gmail watch expires after ~7 days; OrzuAI renews it automatically when push is configured.

## Verify

1. Send a test email **to** your connected Gmail from another mailbox.
2. Within a few seconds it should appear in **Inbox → Email** (no manual Sync now).
3. Cron polling (`/api/cron/gmail-sync` every 3 min) remains as fallback.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 403 Gmail API disabled | Enable Gmail API in Cloud Console |
| 403 Pub/Sub permission | Re-run step 3 (Publisher binding on topic) |
| Webhook 401 | `GMAIL_PUBSUB_PUSH_SECRET` must match `?token=` in subscription URL |
| No instant delivery | Reconnect Gmail; check Vercel logs for `/api/webhooks/gmail-push` |
| Local dev | Pub/Sub push needs a public HTTPS URL (use ngrok or test on production) |

## Architecture

```
New email in Gmail INBOX
  → Gmail API watch
  → Pub/Sub topic
  → Push subscription
  → POST /api/webhooks/gmail-push
  → syncGmailInboxForBusiness()
  → Inbox updated + AI reply pipeline
```
