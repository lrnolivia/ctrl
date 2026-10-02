# ctrl

Your control center, connected by Relay.

ctrl owns the web interface. Relay remains the MCP engine and canonical state owner. Separate repositories communicate over an authenticated event stream and narrow same-origin API adapter.

## Development

Node22: npm ci, npm test, npm run typecheck, npm run build. The browser fixture uses synthetic state and never modifies production.

## Deployment

Production is intentionally disabled until protected ctrl.loew.fi Access and Workers Builds integration are approved and verified. A Relay service binding and valid user Access assertion are required for API/event forwarding. No standalone unauthenticated backend is provided. Keep the existing Relay deployment as rollback until ctrl has exact-source live evidence.

The current ctrl icon is a provisional matching-family vector pending the Terra Icon Figma master.
