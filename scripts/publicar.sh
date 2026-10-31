#!/bin/bash
# Publica o app na Cloudflare (https://producao-ltg.adsvazz.workers.dev).
#
#   npm run publicar
#
# Os dados vivem so no D1 (nascem no app publicado), entao aqui nao tem
# copia de banco. O .env.local sai da pasta durante o build porque o OpenNext
# embute arquivos .env no Worker; os segredos de verdade estao nos secrets
# da Cloudflare (npx wrangler secret put ADMIN_PASSWORD / SESSION_SECRET).
set -e
cd "$(dirname "$0")/.."
[ -f .env.local ] && mv .env.local .env.local.fora
trap '[ -f .env.local.fora ] && mv .env.local.fora .env.local' EXIT
npx opennextjs-cloudflare build
mv .env.local.fora .env.local
npx opennextjs-cloudflare deploy
