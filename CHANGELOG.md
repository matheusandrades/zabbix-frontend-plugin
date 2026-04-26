# Changelog

Todas as mudanças notáveis deste plugin são documentadas aqui. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [1.0.0] - 2026-04-26

### Adicionado
- **Skills** baseadas no código-fonte oficial Zabbix:
  - `zabbix-module-new` — gera módulo completo com manifest v2.0, Module.php, actions, views
  - `zabbix-widget-new` — gera widget Zabbix 7.0+ com Widget/WidgetForm/WidgetView/JS class
  - `zabbix-action-new` — controller `CController` com checkInput/checkPermissions/doAction
  - `zabbix-view-new` — view usando helpers HTML oficiais (CDiv, CFormGrid, CWidgetView)
  - `zabbix-validate` — valida CSS prefix, escaping, CSRF, types, APIs
  - `zabbix-best-practices` (Pro) — aplica boas práticas oficiais
  - `zabbix-refactor` (Pro) — migra código legado (6.0→7.0, manifest 1.0→2.0)
- **Subagents:** zabbix-architect (Sonnet), zabbix-validator (Haiku), zabbix-optimizer (Sonnet)
- **Slash commands:** `/zabbix-new`, `/zabbix-validate`, `/zabbix-license`
- **Hooks:** validação PostToolUse e checagem de licença SessionStart
- **MCP server** `license-validator` para autenticação contra backend
- **Sistema de licenciamento** com tiers Free/Pro/Enterprise
- **Backend de licenças** (Node.js + Stripe + SQLite)
- **Marketplace** próprio para distribuição
- Suporte oficial a Zabbix 6.4, 7.0 LTS, 7.2

### Segurança
- Hook `PreToolUse` que valida licença antes de skills premium
- MCP server isolado para evitar bypass via edição local
- Comunicação backend criptografada (HTTPS obrigatório)
