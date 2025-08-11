## Slack Slash Command + OpenAI

Clean up and clarify text right inside Slack using a slash command.

### How it works

1. Slack sends a POST request to `POST /slack/clean` with form-encoded data.
2. The service verifies Slack’s signature using your Slack Signing Secret.
3. The text is processed by OpenAI.
4. The service responds asynchronously to Slack via the `response_url` with an ephemeral message.

Code entrypoint: `main.ts`

## Prerequisites

- Slack workspace admin access (to create and install an app)
- OpenAI API key
- Deno 1.43+ locally (or deploy via Deno Deploy)
- Deno Deploy account (for hosting): see `Deno Deploy` dashboard at [`https://app.deno.com/`](https://app.deno.com/)

## Environment variables

Create a `.env` file at the project root for local development. These variables are loaded by `jsr:@std/dotenv/load` in `config.ts`.

```bash
OPENAI_API_KEY=sk-...

# Required for request signature verification
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Optional (only needed if you use sendMessage/`chat.postMessage`)
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0123456789
```

Notes:

- For returning ephemeral responses via `response_url`, a bot token is not required. The signing secret is required for verification.
- `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are only needed if you call `sendMessage` to post to a channel.

## Run locally

1. Install dependencies (Deno manages them automatically).
2. Create `.env` (see above).
3. Start the server:

   ```bash
   deno task dev
   ```

   By default, the server listens on `http://localhost:8787`.

4. Expose your local server to the internet for Slack to reach it (pick one):

   - ngrok: `ngrok http 8787`
   - cloudflared: `cloudflared tunnel --url http://localhost:8787`

5. Use the public URL from your tunnel for the Slack slash command Request URL, ending with `/slack/clean`.

## Create and configure the Slack app

1. Create a new Slack app (From Scratch) in your workspace.
2. Basic Information → copy the Signing Secret. Put it into `.env` as `SLACK_SIGNING_SECRET`.
3. Features → Slash Commands → Create New Command
   - Command: `/clean` (or any name you prefer)
   - Request URL: `https://<your-domain>/slack/clean`
   - Short description: “Clean up and clarify text with AI”
   - Usage hint: `[text]`
4. OAuth & Permissions:
   - Add the `commands` scope.
   - If you plan to post messages to channels using `sendMessage`, also add `chat:write`.
   - Install the app to your workspace and copy the Bot User OAuth Token to `.env` as `SLACK_BOT_TOKEN` (optional unless posting to channels).
5. In Slack, type `/clean your text here` to test.

Security verification:

- The service verifies Slack requests via HMAC using your Signing Secret and `X-Slack-Request-Timestamp` + `X-Slack-Signature` headers.
- Replay protection is enforced (5-minute window).

## Deploy to Deno Deploy

You can deploy directly from GitHub or from the dashboard at [`https://app.deno.com/`](https://app.deno.com/).

Option A — Link GitHub repo

1. Push this repository to GitHub.
2. In Deno Deploy dashboard → New Project → Link GitHub repository.
3. Select your repo and use `main.ts` as the entrypoint.
4. After initial deploy, go to Project → Settings → Environment Variables and add:
   - `OPENAI_API_KEY`
   - `SLACK_SIGNING_SECRET`
   - Optionally: `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`
5. Save and redeploy if needed.
6. Copy your production URL (e.g., `https://<project>.deno.dev`).
7. In the Slack app Slash Command settings, set Request URL to `https://<project>.deno.dev/slack/clean`.

Option B — Deploy from dashboard

1. In Deno Deploy, create a new project and upload/import the code.
2. Set `main.ts` as the entrypoint when prompted.
3. Configure the same environment variables as above.
4. Update the Slack Slash Command Request URL accordingly.

## Endpoint

- `POST /slack/clean`
  - Expects `application/x-www-form-urlencoded` Slack payload with `text` and `response_url`.
  - Returns `200 OK` immediately; posts the result asynchronously to `response_url` as an ephemeral message.

## Usage example

- In any Slack channel or DM where the app is installed:
  - `/clean Please rewrite this long message into a short, clean note.`
  - You will receive an ephemeral response with the cleaned-up text.

## Troubleshooting

- 401 “invalid signature”
  - Verify `SLACK_SIGNING_SECRET` is correct and set in the environment.
  - Ensure your Request URL ends with `/slack/clean` and you’re using the public URL from your deployment/tunnel.
- 404 “Not Found”
  - Ensure you’re calling `POST /slack/clean` exactly.
- Slash command times out
  - Slack expects a quick acknowledgment; this service immediately returns 200 and responds via `response_url`. Make sure your deployment is reachable and not blocked.
- OpenAI errors
  - Ensure `OPENAI_API_KEY` is valid and not rate-limited.
