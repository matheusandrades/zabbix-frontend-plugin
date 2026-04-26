---
description: Valida módulo/widget Zabbix contra padrões oficiais
argument-hint: [diretório] (default: cwd)
allowed-tools: Read, Bash, Glob, Grep
---

# /zabbix-validate

Argumento: `$ARGUMENTS` (caminho do módulo a validar; default = diretório atual)

## Fluxo

1. Mude para o diretório alvo (ou use cwd)
2. Verifique se há `manifest.json` — se não, recuse:
   ```
   Não encontrei manifest.json em <dir>. Não parece ser um módulo Zabbix.
   ```
3. Invoque a skill `zabbix-validate` (gratuita, todos os tiers)
4. Reporte resultado em formato amigável com cores (✓ ✗ ⚠)

## Saída esperada

```
═══ ZABBIX VALIDATOR ═══
Módulo: acme.host_report v1.0.0
Tipo: module

✓ 18 verificações passadas
⚠ 3 avisos
✗ 0 falhas

═══ Avisos ═══
1. views/host.list.view.php:34 — concatenação HTML detectada
2. assets/css/widget.css:12 — cor #ffffff hardcoded
3. actions/HostEdit.php:5 — falta declare(strict_types = 0)

Status: APROVADO COM RESSALVAS
```
