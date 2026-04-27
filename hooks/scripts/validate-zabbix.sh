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

        # MonZphere — getUserType direto em vez de CWebUser
        if grep -qE '\$this->getUserType\(\)' "$FILE_PATH"; then
            WARNINGS+=("MonZphere: prefira CWebUser::getType() em vez de \$this->getUserType()")
        fi

        # MonZphere — chave CProfile sem prefixo mnz.
        if grep -qE "CProfile::(get|update|delete)\(['\"][^m]" "$FILE_PATH" | grep -v "['\"]mnz\\." >/dev/null 2>&1; then
            WARNINGS+=("MonZphere: chaves CProfile devem prefixar com 'mnz.<modulo>.<campo>'")
        fi

        # MonZphere — addClass sem prefixo mnz- (e não é constante ZBX_*)
        if grep -qE "addClass\(['\"][a-z][^'\"]*['\"]" "$FILE_PATH" | grep -v "['\"]mnz-" >/dev/null 2>&1; then
            : # silencia — muito ruidoso. Validação completa via /zabbix-validate
        fi

        # MonZphere — view de module deve ter footer "Developed by MonZphere"
        if [[ "$FILE_PATH" == *"/views/"* ]] && [[ "$FILE_PATH" != *"widget.view.php"* ]]; then
            if grep -q "CHtmlPage" "$FILE_PATH" 2>/dev/null && ! grep -q "Developed by MonZphere" "$FILE_PATH"; then
                WARNINGS+=("MonZphere: view de module sem rodapé 'Developed by MonZphere' (.mnz-footer)")
            fi
        fi
        ;;

    *.css)
        # Cores hardcoded
        if grep -qE "#[0-9a-fA-F]{3,6}|rgba?\(" "$FILE_PATH"; then
            WARNINGS+=("Cores hardcoded — use var(--*) para suportar todos os temas Zabbix")
        fi

        # MonZphere — classes sem prefixo .mnz-
        if grep -qE "^\.[a-zA-Z]" "$FILE_PATH" 2>/dev/null; then
            invalid=$(grep -E "^\.[a-zA-Z]" "$FILE_PATH" | grep -v "^\.mnz-" | head -3)
            if [ -n "$invalid" ]; then
                WARNINGS+=("MonZphere: classes CSS devem prefixar com .mnz-")
            fi
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
