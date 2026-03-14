# @better-openclaw/web

The primary front-end platform for the Better OpenClaw ecosystem. Built entirely with Next.js (App Router), React, and Tailwind CSS. It serves as both the documentation hub and the interactive Visual Stack Builder GUI.

## Platform Features

- **Interactive Visual Stack Builder (`/new`):** The graphical equivalent of the CLI wizard. Users choose from 8 agent frameworks via the FrameworkSelector component, interactively pick Docker services and AI skills, select architecture targets, and generate entire deployments to standard Zip or JSON configurations instantly.
- **Showcase Gallery (`/showcase`):** Features community examples, verified combinations, and high-impact AI tool chaining templates for deployment.
- **Core Documentation (`/docs`):** Statically generated and easily updatable guides on deploying, tuning, and contributing to OpenClaw architectures.
- **MCP Server Documentation (`/docs/mcp`):** Comprehensive guides on using better-openclaw as an MCP server — setup for Claude, Cursor, and VS Code, plus a full tools reference.
- **Dynamic API References (`/api-docs`):** Swagger-compatible REST API documentation exposing all possible endpoints for programmatic stack generation payloads and schemas.
- **Adaptive Theming:** Supports seamless Light / Premium Dark mode matching the Better-OpenClaw Glassmorphism aesthetic. A user preference switch is integrated throughout.

## Local Configuration

The Web App communicates heavily with the `@better-openclaw/api` backend to fetch dynamic service registries and process generation payloads. 

Ensure the `.env.local` accurately targets the backing execution tier:

```env
# URL pointer to the api package process
NEXT_PUBLIC_API_URL=http://localhost:3456/api/v1

# Destination webhook for parsing and pushing JSON complete generation payloads
NEXT_PUBLIC_CLAWEXA_DEPLOY_URL=https://clawexa.net/deploy
```

## Running Web Execution

Ensure standard Node 20 environments are active:

```bash
# Launch hot-reload watcher spanning port 3654
pnpm dev

# Construct and minify Next app bundles (Triggers route compilation)
pnpm build

# Boot local production replica on port 3654
pnpm start
```

## Workspace Development

```bash
pnpm lint      # Execute Biome style formatting and logical verifications
pnpm typecheck # TSC strict no-emit transpilation validation
```
