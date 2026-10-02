# ctrl

Your control center, connected by Relay.

ctrl owns the web interface. Relay remains the MCP engine and canonical state owner. Separate repositories communicate over an authenticated event stream and narrow same-origin API adapter.

## Development

Node22: npm ci, npm test, npm run typecheck, npm run build. The browser fixture uses synthetic state and never modifies production.

## Deployment

Production uses the approved existing Access policy at ctrl.loew.fi and GitHub-backed Workers Builds. A Relay service binding and valid user Access assertion are required for API/event forwarding. No standalone unauthenticated backend is provided. Keep the existing Relay deployment as rollback until ctrl has exact-source live evidence.

The ctrl icon is authored in the Terra Prime Icon Studies master, Final Icons page, component89:19. It shares the canonical Gen2 geometry, warm ivory and coral token.
