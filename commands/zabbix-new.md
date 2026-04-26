---
description: Inicia criação interativa de módulo ou widget Zabbix
argument-hint: module | widget [nome]
allowed-tools: Read, Write, Glob, Bash
---

# /zabbix-new

Argumentos recebidos: `$ARGUMENTS`

## Fluxo

1. Se o primeiro argumento é `module` → invoque a skill `zabbix-module-new`
2. Se o primeiro argumento é `widget` → invoque a skill `zabbix-widget-new`
3. Se vazio ou inválido → pergunte ao usuário qual tipo

## Comportamento

Antes de iniciar, **valide a licença** chamando o MCP `license-validator.validate_license`. Mesmo para skills gratuitas, use o resultado para mostrar o tier ativo na primeira mensagem:

```
[Plano: Free] Iniciando criação de <module|widget>...
```

Se há um nome sugerido como segundo argumento (ex: `/zabbix-new widget problem_top`), use-o como `id` do módulo. Senão, pergunte.

Sempre confirme com o usuário antes de criar arquivos:

```
Vou criar:
- ui/widgets/problem_top/manifest.json
- ui/widgets/problem_top/Widget.php
- ui/widgets/problem_top/includes/WidgetForm.php
- ui/widgets/problem_top/actions/WidgetView.php
- ui/widgets/problem_top/views/widget.view.php
- ui/widgets/problem_top/assets/js/class.widget.js

Confirma? (s/n)
```
