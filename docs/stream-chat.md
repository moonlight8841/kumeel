# Majlis live chat (Stream)

Members-only chat on `/salon`, under the dialogue charter.

## How it works

1. A signed-in member with a confirmed email chooses a display name and presses join.
2. The browser calls `POST /api/stream-chat` with the Supabase access token.
3. The Worker (`api/stream-chat.mjs`) verifies the session with Supabase, upserts the member in Stream
   (role `user`; the owner email gets `admin`), makes sure the `messaging:kumeel-majlis` channel exists,
   adds the member to it, and returns a Stream user token valid for one hour.
4. Only then does the browser download the chat bundle (`MajlisRoom`, lazy) and connect.
   Reconnects request a fresh token from the same endpoint.

The channel type is `messaging`, so only members of the channel can read it. Emails are never sent to Stream.

## Configuration

| Name | Where | Value |
|---|---|---|
| `STREAM_API_KEY` | `wrangler.jsonc` → `vars` | Public key from the Stream dashboard |
| `STREAM_API_SECRET` | Worker secret | `npx wrangler secret put STREAM_API_SECRET` |

For local development add `STREAM_API_SECRET=...` to `.dev.vars` (never commit it).
Without the secret the endpoint answers 503 and the page shows "chat is not enabled".

The CSP `connect-src` (in `vercel.json`, applied by the Worker, and `public/_headers`) allows
`https://chat.stream-io-api.com` and `wss://chat.stream-io-api.com`.

## Moderation

The owner account is a Stream `admin` and can delete messages and ban users from the chat UI or the
Stream dashboard. Members can flag messages; flags appear in the dashboard under Moderation.

## Tests

`node scripts/test-stream-chat.mjs` (part of `npm test`) covers auth, name rules, token signing, roles,
rate limiting and error redaction with a mocked network.
