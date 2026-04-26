#!/usr/bin/env bash
#
# Hook PostToolUse — valida arquivos Zabbix recém-modificados.
# Roda apenas se o usuário tem `auto_validate: true` na config.
#
# Recebe via stdin JSON:
# { "tool_name": "Edit", "tool_input": {"file_path": "..."}, ... }

set -u

# Ler stdin (JSON do hook)
INPUT=$(cat)

# Extrair file_path com python (pré-instalado)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)

# Se não há arquivo, sair silenciosamente
[ -z "$FILE_PATH" ] && exit 0

# Detectar se é arquivo Zabbix (heurística: dentro de pasta com manifest.json próximo)
DIR=$(dirname "$FILE_PATH")
MANIFEST=""
while [ "$DIR" != "/" ] && [ "$DIR" != "." ]; do
    if [ -f "$DIR/manifest.json" ]; then
        MANIFEST="$DIR/manifest.json"
        break
    fi
    DIR=$(dirname "$DIR")
done

[ -z "$MANIFEST" ] && exit 0

# Honrar config auto_validate
AUTO="${CLAUDE_USER_CONFIG_auto_validate:-true}"
[ "$AUTO" != "true" ] && exit 0

# Validações rápidas (não bloqueiam — apenas avisam)
WARNINGS=()

case "$FILE_PATH" in
    *.php)
        # Sintaxe PHP
        if ! php -l "$FILE_PATH" >/dev/null 2>&1; then
            WARNINGS+=("Erro de sintaxe PHP")
        fi

        # CSRF + mutações na mesma action
        if grep -q "disableCsrfValidation" "$FILE_PATH" 2>/dev/null; then
            if grep -qE "API::[A-Z][a-zA-Z]+\(\)->(create|update|delete|massUpdate|massDelete)" "$FILE_PATH"; then
                WARNINGS+=("disableCsrfValidation() em action que muta dados — risco CSRF")
            fi
        fi

        # SQL bruto
        if grep -qE "(DBselect|DBexecute|DBfetch|DB::select|DB::insert|DB::update|DB::delete)" "$FILE_PATH"; then
            WARNINGS+=("Acesso direto a DB — use API::*->get() em vez de SQL bruto")
        fi

        # Superglobals
        if grep -qE "\\\$_(GET|POST|REQUEST)" "$FILE_PATH"; then
            WARNINGS+=("Acesso direto a \$_GET/\$_POST — use \$this->getInput()")
        fi
        ;;

    *.css)
        # Cores hardcoded
        if grep -qE "#[0-9a-fA-F]{3,6}|rgba?\(" "$FILE_PATH"; then
            WARNINGS+=("Cores hardcoded — use var(--*) para suportar todos os temas Zabbix")
        fi
        ;;

    *.js)
        # Sintaxe JS (se node disponível)
        if command -v node >/dev/null 2>&1; then
            if ! node --check "$FILE_PATH" >/dev/null 2>&1; then
                WARNINGS+=("Erro de sintaxe JavaScript")
            fi
        fi
        ;;

    */manifest.json)
        # JSON válido
        if ! python3 -c "import json; json.load(open('$FILE_PATH'))" >/dev/null 2>&1; then
            WARNINGS+=("manifest.json inválido (JSON malformado)")
        fi
        ;;
esac

# Reportar (saída em stdout vai para Claude)
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "[zabbix-validate] $(basename "$FILE_PATH"):"
    for w in "${WARNINGS[@]}"; do
        echo "  ⚠  $w"
    done
fi

# Sempre sair 0 (warning, não falha bloqueante)
exit 0
