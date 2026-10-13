# ctrl

Your control center, connected by Relay.

ctrl is the web interface for working with Relay. It presents Relay's state through an authenticated event stream and a small same-origin API adapter. Relay owns the underlying engine and state.

## Work on the interface

Use Node.js 22, then run:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

The browser fixture uses synthetic state and does not modify production. The shared interface package has its own [README](packages/shared-ui/README.md).

## Connect to Relay

The deployed interface requires Cloudflare Access, a Relay service binding, and a valid user Access assertion for API and event forwarding. This repository does not provide a standalone unauthenticated backend.

## Design and notices

The ctrl icon comes from the Terra Prime Icon Studies master, Final Icons page, component `89:19`, using the Gen2 geometry and warm ivory/coral colors. See [NOTICE](NOTICE) for attribution that must stay with the project.
