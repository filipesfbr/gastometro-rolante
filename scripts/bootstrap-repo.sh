#!/usr/bin/env bash
# Configura o repo no GitHub (padrão do workflow-test + branch `data` e Pages).
# Uso: scripts/bootstrap-repo.sh owner/repo
#
# Pré-requisito: a branch `main` já precisa existir no remoto (empurrada antes
# de qualquer outra — ver README, "Configuração do repositório"). O script
# não cria conteúdo, só configura branches/settings/rulesets via `gh api`.
set -euo pipefail

REPO="${1:?uso: scripts/bootstrap-repo.sh owner/repo}"

command -v gh >/dev/null || { echo "gh CLI não encontrado" >&2; exit 1; }

echo "== $REPO =="

if ! gh api "repos/$REPO/branches/main" >/dev/null 2>&1; then
  echo "ERRO: branch 'main' não existe em $REPO ainda. Empurre-a primeiro." >&2
  exit 1
fi

echo "-- default branch = main"
gh api -X PATCH "repos/$REPO" -f default_branch=main >/dev/null

echo "-- develop"
if gh api "repos/$REPO/branches/develop" >/dev/null 2>&1; then
  echo "   já existe"
else
  SHA=$(gh api "repos/$REPO/git/refs/heads/main" --jq .object.sha)
  gh api "repos/$REPO/git/refs" -f ref=refs/heads/develop -f sha="$SHA" >/dev/null
  echo "   criada a partir de main"
fi

echo "-- merge settings (delete_branch_on_merge=false, squash+merge commit, sem rebase)"
gh api -X PATCH "repos/$REPO" \
  -F delete_branch_on_merge=false \
  -F allow_squash_merge=true \
  -F allow_merge_commit=true \
  -F allow_rebase_merge=false >/dev/null

# Rulesets exigem repo público (Free) ou plano pago quando privado. Em repo
# privado no Free a API responde 403 — não é falha do script, é o plano.
echo "-- rulesets"
create_ruleset() {
  local body="$1" out name
  name=$(jq -r .name <<<"$body")
  if gh api "repos/$REPO/rulesets" --jq '.[].name' | grep -qx "$name"; then
    echo "   $name: já existe"
    return 0
  fi
  if out=$(gh api -X POST "repos/$REPO/rulesets" --input - <<<"$body" 2>&1); then
    echo "   $name: criado"
    return 0
  fi
  if grep -q "Upgrade to GitHub" <<<"$out"; then
    echo "   pulado: repo privado no plano Free não suporta rulesets (crie manualmente se virar público/pago)"
    return 0
  fi
  echo "   erro inesperado: $out" >&2
  return 1
}

create_ruleset '{
  "name": "protege-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "pull_request", "parameters": {
        "allowed_merge_methods": ["merge"],
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
    } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "ci" }]
    } },
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ],
  "bypass_actors": [{ "actor_type": "RepositoryRole", "actor_id": 5, "bypass_mode": "always" }]
}'

create_ruleset '{
  "name": "protege-develop",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/develop"], "exclude": [] } },
  "rules": [
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ],
  "bypass_actors": []
}'

# A branch `data` guarda os snapshots diários (R3): ninguém reescreve nem apaga.
# A coleta só faz push normal nela, que as regras abaixo não barram.
create_ruleset '{
  "name": "protege-data",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/data"], "exclude": [] } },
  "rules": [
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ],
  "bypass_actors": []
}'

echo "-- GitHub Pages (publicado pelo deploy.yml)"
if gh api "repos/$REPO/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null
else
  gh api -X POST "repos/$REPO/pages" -f build_type=workflow >/dev/null
fi

echo "== ok =="
