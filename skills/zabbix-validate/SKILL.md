---
name: zabbix-validate
description: Valida módulo/widget Zabbix contra padrões oficiais — manifest.json v2.0, escapamento HTML, CSRF, prefixos CSS, namespaces, uso de API vs SQL bruto. Use após criar/editar arquivos Zabbix, ou quando o usuário pedir "validar módulo", "verificar conformidade", "checar Zabbix", "code review Zabbix".
allowed-tools: Read, Bash, Glob, Grep
---

# Validar Módulo/Widget Zabbix

Execute esta sequência de checks. Reporte resultados em formato `[PASS|FAIL|WARN] <regra>` no fim.

## 1. Estrutura de arquivos

Verifique presença de arquivos obrigatórios:

```bash
# manifest.json existe?
test -f manifest.json && echo "OK: manifest.json" || echo "FAIL: manifest.json ausente"

# Se type=widget, exigir Widget.php
type=$(python3 -c "import json; print(json.load(open('manifest.json')).get('type', 'module'))")
if [ "$type" = "widget" ]; then
    test -f Widget.php && echo "OK: Widget.php (widget)" || echo "FAIL: Widget.php obrigatório para type=widget"
    test -f includes/WidgetForm.php && echo "OK: WidgetForm.php" || echo "WARN: WidgetForm.php ausente (widget sem config)"
fi
```

## 2. manifest.json — schema

Valide:

```python
import json, re, sys

m = json.load(open('manifest.json'))

required = ['manifest_version', 'id', 'name', 'namespace', 'version']
for r in required:
    if r not in m:
        print(f'FAIL: manifest.json missing "{r}"')
    else:
        print(f'OK: manifest.json has "{r}"')

# manifest_version >= 2.0
if m.get('manifest_version') != 2.0:
    print(f'WARN: manifest_version is {m.get("manifest_version")}, recommend 2.0')

# id em snake_case com vendor prefix
if not re.match(r'^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$', m.get('id', '')):
    print(f'WARN: id "{m.get("id")}" should be vendor.module_name (snake_case)')

# namespace consistente com diretório
import os
dirname = os.path.basename(os.getcwd())
expected_ns_tail = ''.join(p.capitalize() for p in dirname.split('_'))
ns_parts = m.get('namespace', '').replace('\\\\', '\\').split('\\')
if ns_parts[-1] != expected_ns_tail:
    print(f'WARN: namespace tail "{ns_parts[-1]}" should match dir as PascalCase ("{expected_ns_tail}")')

# Para widgets
if m.get('type') == 'widget':
    if 'widget' not in m:
        print('FAIL: type=widget requires "widget" config block')
    else:
        w = m['widget']
        if 'js_class' not in w:
            print('FAIL: widget.js_class required')
        if 'size' not in w:
            print('WARN: widget.size missing (default applied)')
        if w.get('refresh_rate', 60) > 3600:
            print('WARN: refresh_rate > 1h is unusual')
```

## 3. PHP — sintaxe

```bash
find . -name "*.php" -exec php -l {} \; 2>&1 | grep -v "No syntax errors" || echo "FAIL: PHP syntax errors"
```

## 4. PHP — declare(strict_types)

```bash
# Padrão Zabbix usa strict_types = 0
grep -L "declare(strict_types = 0)" $(find . -name "*.php" -path "*/actions/*" -o -name "Module.php" -o -name "Widget.php") 2>/dev/null | while read f; do
    echo "WARN: $f missing 'declare(strict_types = 0)' (Zabbix convention)"
done
```

## 5. PHP — extends corretos

```bash
# Module.php deve estender CModule
if [ -f Module.php ]; then
    grep -q "extends CModule" Module.php || echo "FAIL: Module.php must 'extends CModule'"
fi

# Widget.php deve estender CWidget
if [ -f Widget.php ]; then
    grep -q "extends CWidget" Widget.php || echo "FAIL: Widget.php must 'extends CWidget'"
fi

# Actions devem estender CController (ou alias CAction, ou CControllerDashboardWidgetView)
for f in actions/*.php; do
    [ -f "$f" ] || continue
    if ! grep -qE "extends (CController|CAction|CControllerDashboardWidgetView)" "$f"; then
        echo "FAIL: $f must extend CController, CAction, or CControllerDashboardWidgetView"
    fi
done

# WidgetForm deve estender CWidgetForm
if [ -f includes/WidgetForm.php ]; then
    grep -q "extends CWidgetForm" includes/WidgetForm.php || echo "FAIL: WidgetForm must 'extends CWidgetForm'"
fi
```

## 6. Segurança — CSRF

```bash
# Buscar uso de disableCsrfValidation()
grep -l "disableCsrfValidation" actions/*.php 2>/dev/null | while read f; do
    # Verificar se action é GET puro (sem mutações)
    if grep -qE "(API::[A-Z][a-zA-Z]+)\(\)->(create|update|delete|massUpdate|massDelete|massAdd|massRemove)" "$f"; then
        echo "FAIL: $f desabilita CSRF mas chama API mutation — risco de CSRF"
    else
        echo "WARN: $f desabilita CSRF — confirme que é GET idempotente"
    fi
done
```

## 7. Segurança — SQL bruto

```bash
# Detectar acesso direto ao DB (proibido em módulos)
grep -rn "DBselect\|DBexecute\|DBfetch\|DB::select\|DB::insert\|DB::update\|DB::delete" --include="*.php" | while read line; do
    echo "FAIL: $line — use API::*->get() em vez de SQL bruto"
done
```

## 8. Segurança — escaping HTML

```bash
# Detectar concatenação HTML (anti-pattern)
grep -rn "echo ['\"].*<\|<\?= .*\\." --include="*.php" actions/ views/ 2>/dev/null | grep -v "//" | while read line; do
    echo "WARN: $line — possível concatenação HTML, use helpers (CDiv, CSpan, etc.)"
done
```

## 9. Segurança — $_GET / $_POST

```bash
# Nunca acessar superglobals diretamente
grep -rn "\$_GET\|\$_POST\|\$_REQUEST" --include="*.php" actions/ 2>/dev/null | while read line; do
    echo "FAIL: $line — use \$this->getInput() / \$this->hasInput()"
done
```

## 10. checkInput() / checkPermissions() implementados

```bash
for f in actions/*.php; do
    [ -f "$f" ] || continue

    # Pular CControllerDashboardWidgetView (já implementa)
    if grep -q "extends CControllerDashboardWidgetView" "$f"; then
        echo "OK: $f (CControllerDashboardWidgetView, herda checkInput/Permissions)"
        continue
    fi

    grep -q "function checkInput" "$f" || echo "FAIL: $f missing checkInput()"
    grep -q "function checkPermissions" "$f" || echo "FAIL: $f missing checkPermissions()"
    grep -q "function doAction" "$f" || echo "FAIL: $f missing doAction()"
done
```

## 11. Strings traduzíveis — i18n

```bash
# Strings em aspas em Module.php/Widget.php devem usar _()
# Heurística: detectar setTitle('...'), addItem('...'), etc. com strings literais
grep -rn "setTitle(['\"][A-Z]" --include="*.php" | grep -v "_(" | while read line; do
    echo "WARN: $line — strings devem usar _() para i18n"
done

grep -rn "_('.*[A-Z]" --include="*.php" | wc -l | xargs -I {} echo "OK: {} strings traduzidas via _()"
```

## 12. CSS — naming convention

```bash
# CSS de widgets: prefixo .dashboard-widget-<id>
if [ -f manifest.json ]; then
    id=$(python3 -c "import json; print(json.load(open('manifest.json')).get('id','').replace('.','-').replace('_','-'))")

    if [ -d assets/css ]; then
        for css in assets/css/*.css; do
            [ -f "$css" ] || continue

            # Cada classe deve começar com dashboard-widget-<id> ou ser variável
            grep -E "^\.[a-zA-Z]" "$css" | grep -v "dashboard-widget-${id}" | while read line; do
                echo "WARN: $css: '$line' não tem prefixo .dashboard-widget-${id}"
            done

            # Cores hardcoded
            grep -E "#[0-9a-fA-F]{3,6}|rgb\(|rgba\(" "$css" | while read line; do
                echo "WARN: $css: '$line' usa cor hardcoded — use var(--*) para suportar temas"
            done
        done
    fi
fi
```

## 13. JavaScript — class extends CWidget

```bash
if [ -f assets/js/class.widget.js ]; then
    expected_class=$(python3 -c "import json; print(json.load(open('manifest.json')).get('widget',{}).get('js_class',''))")

    if [ -n "$expected_class" ]; then
        if grep -q "class $expected_class extends CWidget" assets/js/class.widget.js; then
            echo "OK: JS class $expected_class extends CWidget"
        else
            echo "FAIL: assets/js/class.widget.js: deve declarar 'class $expected_class extends CWidget'"
        fi
    fi

    # Sintaxe JS
    node --check assets/js/class.widget.js 2>&1 | grep -q "^$" && echo "OK: JS syntax" || echo "FAIL: JS syntax error"
fi
```

## 14. Permissões corretas

```bash
# checkPermissions deve retornar bool baseado em getUserType ou checkAccess
for f in actions/*.php; do
    [ -f "$f" ] || continue
    if grep -A 5 "function checkPermissions" "$f" | grep -qE "return true;"; then
        if ! grep -A 5 "function checkPermissions" "$f" | grep -qE "(USER_TYPE|checkAccess)"; then
            echo "WARN: $f checkPermissions retorna sempre true — sem controle de acesso real"
        fi
    fi
done
```

## 15. Relatório final

Após executar todos os checks, gere relatório no formato:

```
============================================
RELATÓRIO DE VALIDAÇÃO ZABBIX
============================================
Módulo: <id> v<version>
Tipo: <module|widget>

PASS: 18 verificações
WARN: 3 verificações
FAIL: 0 verificações

═══ FALHAS ═══
(nenhuma)

═══ AVISOS ═══
- views/widget.view.php:45 — concatenação HTML detectada
- assets/css/widget.css:12 — cor #ffffff hardcoded
- ...

═══ RECOMENDAÇÕES ═══
- Adicionar `getTranslationStrings()` em Module.php se há strings em JS
- Considerar adicionar `widget.template_support: true` para suportar template dashboards
```

Se houver `FAIL`, exit code 1; senão 0.
