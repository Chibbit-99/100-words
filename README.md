# 100 Words

A collaborative story game where you and Mistral take turns adding exactly one word until the story reaches 100 words.

- `index.html` is the standalone browser frontend. Host it on any static web host, then enter your deployed Worker URL under **API settings**.
- `worker.js` is the Cloudflare Worker backend. It calls the Mistral API and keeps the Mistral API key server-side.
- `wrangler.jsonc` points Wrangler directly at `worker.js`. It intentionally has no static-assets configuration, so `wrangler deploy` deploys the Worker and does not serve `index.html`.

The Worker sends the story so far to the Mistral API and returns the next word. The Mistral API key stays on the server as a Cloudflare Worker secret.

## API

### `POST /next-word`

Request:

```json
{
  "sentence": "The old lighthouse stood above the"
}
```

Success response (plain text, exactly one word):

```text
restless
```

The request must contain between 1 and 99 whitespace-separated words. The Worker refuses to add a word once the story already has 100. The generated `word` is validated as a single word before it is returned.

### Health check

`GET /` or `GET /health` returns the service name and configured model.

## Model

The Worker is pinned to `mistral-small-2603` (Mistral Small 4). It sends `reasoning_effort: "none"` to keep one-word turns focused and avoid a separate reasoning trace.

## Deploy to Cloudflare Workers

This repository is configured as a **Worker-only project**. Wrangler's `main` entry is `worker.js`; there is no `assets` directory configured, so Wrangler deploys the Worker script, not the static frontend.

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Authenticate Wrangler:

   ```bash
   npx wrangler login
   ```

3. Deploy the Worker:

   ```bash
   npm run deploy
   ```

4. Add your Mistral API key as an encrypted Cloudflare secret:

   ```bash
   npx wrangler secret put MISTRAL_API_KEY
   ```

   Paste your key when prompted. Never put the key in `worker.js`, `wrangler.jsonc`, or a committed `.env` file. Adding the secret updates the deployed Worker.

Wrangler prints the deployed `workers.dev` URL. Your endpoint will be:

```text
https://100-words-api.<your-workers-dev-subdomain>.workers.dev/next-word
```

## Local development

Create a local `.dev.vars` file (it is ignored by Git):

```dotenv
MISTRAL_API_KEY="your-mistral-api-key"
```

Then run:

```bash
npm run dev
```

## Test with curl

Replace the URL with your deployed Worker URL:

```bash
curl -X POST "https://100-words-api.<your-workers-dev-subdomain>.workers.dev/next-word" \
  -H "Content-Type: application/json" \
  -d '{"sentence":"The old lighthouse stood above the"}'
```

## Configuration notes

- `MISTRAL_API_KEY` is a Cloudflare secret and is never exposed in responses.
- `MISTRAL_MODEL` defaults to `mistral-small-2603`.
- `ALLOWED_ORIGINS` defaults to `*` for easy integration. For production, replace it with your frontend origin(s), comma-separated.
- The Worker validates story length and the generated one-word response.
- The endpoint is public when deployed on `workers.dev`. Set up a Cloudflare rate-limit rule before sharing it widely, as calls can incur Mistral API usage.
