# 100 words

A minimal browser-based AI chat interface powered by [WebLLM](https://github.com/mlc-ai/web-llm). Models run locally through WebGPU; no inference API key or application backend is required.

## Requirements

- Node.js 20 or newer
- A browser with WebGPU support
- A compatible GPU and enough available memory for the selected model

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The app downloads the selected model the first time it is used; subsequent loads can use the browser cache.

## Production build

The GitHub Actions workflow builds the static site into `app/` and uploads it as the `100-words-static-site` workflow artifact on pushes to `main`, pull requests, and manual runs.

To create the same output locally:

```bash
npm install
npm run build -- --outDir app --base=./ --emptyOutDir
```

The contents of `app/` are static files and can be hosted by any static web host. Download the artifact from the completed workflow run in the repository's **Actions** tab.

## Notes

- The model is selected from WebLLM's bundled model list.
- Chat history is kept in memory for the current page session and is not uploaded to a server.
- Model downloads can be large. Start with a smaller model if your device runs out of memory.
- WebGPU generally requires a secure context (localhost is supported).
