# ctrl agent bootstrap

Read lrnolivia/relay@main/LOEW_CHAT_BIBLE.md, contracts/manifest.json and projects/ctrl.json before work. Runner claims and exact-head preflight govern changes. Product code and product truth live here. Non-product notes, QA receipts and handoffs belong in Relay docs/ctrl.

Run npm ci, npm test, npm run typecheck and npm run build. Browser QA: node test/browser.mjs after build, using synthetic fixtures.

Do not deploy an unprotected control plane. The production Access/domain, service binding and build integration require their explicit security approval. No secrets belong in source. Preserve relay.loew.fi as the verified fallback during migration.
