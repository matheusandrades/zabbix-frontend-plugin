#!/usr/bin/env bash
#
# Hook SessionStart — verifica status da licença e mostra plano ativo.
# Não bloqueia a sessão; apenas informa.
#
# Variáveis disponíveis:
#   CLAUDE_PLUGIN_ROOT — raiz do plugin instalado
#   CLAUDE_USER_CONFIG_license_key — chave registrada (se houver)

set -u

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$0")/../..}"
LICENSE_KEY="${CLAUDE_USER_CONFIG_license_key:-}"
API_URL="${ZABBIX_PLUGIN_API_URL:-https://api.zabbix-frontend.dev}"

if [ -z "$LICENSE_KEY" ]; then
    cat <<EOF
[zabbix-frontend] Plano: Free
Você tem acesso a: zabbix-module-new, zabbix-widget-new, zabbix-action-new, zabbix-view-new, zabbix-validate.
Para liberar Best Practices, Refactor e Optimizer, registre uma licença Pro:
  /zabbix-license SUA-CHAVE
  Adquira em: https://zabbix-frontend.dev/pricing
EOF
    exit 0
fi

# Tentar validar licença online (timeout curto, falha graciosa)
RESPONSE=$(curl -s -m 3 -X POST "$API_URL/validate" \
    -H "Content-Type: application/json" \
    -d "{\"license_key\":\"$LICENSE_KEY\"}" 2>/dev/null || echo '{"valid":false,"reason":"offline"}')

VALID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('valid',False))" 2>/dev/null || echo "False")
TIER=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tier','free'))" 2>/dev/null || echo "free")
EXPIRES=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('expires_at',''))" 2>/dev/null || echo "")

if [ "$VALID" = "True" ]; then
    echo "[zabbix-frontend] Plano: $TIER (expira: $EXPIRES)"
else
    echo "[zabbix-frontend] Licença não validada. Plano corrente: Free."
    echo "Verifique conexão ou renove em: https://zabbix-frontend.dev/pricing"
fi

exit 0
