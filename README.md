# Zabbix Frontend Plugin para Claude Code

> Crie módulos e widgets profissionais de frontend Zabbix em minutos. Templates oficiais, validação automática e boas práticas de segurança.

[![Plano](https://img.shields.io/badge/Plano-Free%20%7C%20Pro%20%7C%20Enterprise-blue)](https://zabbix-frontend.dev/pricing)
[![Zabbix](https://img.shields.io/badge/Zabbix-6.4%20%7C%207.0%20LTS%20%7C%207.2-red)](https://www.zabbix.com)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-orange)](https://claude.com/claude-code)

---

## Por que esse plugin?

Desenvolver módulos para o frontend do Zabbix exige conhecer:

- Estrutura `manifest.json` (v2.0) com 6 campos obrigatórios
- Classes base oficiais: `CModule`, `CWidget`, `CWidgetForm`, `CController`, `CView`, `CPartial`
- 24 tipos de campos de widget (`CWidgetFieldSelect`, `CWidgetFieldMultiSelectItem`, etc.)
- Sistema de broadcast widget-to-widget (`_itemid`, `_hostid`, `_timeperiod`)
- Convenções CSS Zabbix (`.dashboard-grid-widget`, `.btn-`, `.icon-`, `.menu-popup-`)
- Temas oficiais (blue, dark, blue-classic, dark-classic, hc-light, hc-dark)
- Segurança: CSRF tokens, escaping via helpers HTML, validação via `CNewValidator`
- I18n com `_()`, `_s()`, `_n()` e `getTranslationStrings()`
- Acesso a dados sempre via `API::Foo()->get()` (nunca SQL bruto)

Esse plugin entrega tudo isso pronto.

---

## Instalação

```bash
# Adicionar marketplace
/plugin marketplace add matheusandrades/zabbix-plugins-marketplace

# Instalar plugin
/plugin install zabbix-frontend@zabbix-plugins
```

Configure sua licença:

```bash
/zabbix-license SUA-CHAVE-AQUI
```

Sem licença, você tem acesso gratuito ao tier Free.

---

## O que está incluído

### Skills (conhecimento que Claude usa automaticamente)

| Skill | Descrição | Plano |
|---|---|---|
| `zabbix-module-new` | Cria módulo Zabbix completo (manifest + Module.php + actions + views) | Free |
| `zabbix-widget-new` | Cria widget Zabbix 7.0+ (Widget.php + WidgetForm + WidgetView + JS class) | Free |
| `zabbix-action-new` | Cria controller `CController` com `checkInput`/`checkPermissions`/`doAction` | Free |
| `zabbix-view-new` | Cria view com helpers `CDiv`/`CFormGrid`/`CWidgetView` | Free |
| `zabbix-validate` | Valida CSS prefix, escaping, CSRF, types, APIs | Free |
| `zabbix-best-practices` | Aplica boas práticas oficiais Zabbix em código existente | Pro |
| `zabbix-refactor` | Refatora módulo legado para padrão atual (6.0→7.0, manifest 1.0→2.0) | Pro |

### Subagents

| Agent | Função | Modelo |
|---|---|---|
| `zabbix-architect` | Projeta arquitetura de módulos complexos | Sonnet |
| `zabbix-validator` | Code review focado em padrões Zabbix | Haiku |
| `zabbix-optimizer` | Análise de performance e refatoração | Sonnet |

### Slash Commands

- `/zabbix-new module|widget` — inicia criação interativa
- `/zabbix-validate` — valida código atual contra padrões oficiais
- `/zabbix-license <key>` — registra chave de licença

### Hooks

- `PostToolUse` — valida arquivos PHP/CSS/JS ao salvar (prefix `.zabbix-`, escape, namespace)
- `SessionStart` — verifica status de licença e mostra plano ativo

### MCP Server

- `license-validator` — valida licença em tempo real contra backend

---

## Planos

| Recurso | Free | Pro ($5/mês) | Enterprise ($25/mês) |
|---|---|---|---|
| Skills básicas (module/widget/action/view) | ✓ | ✓ | ✓ |
| Validador automático | ✓ | ✓ | ✓ |
| Refactor de código legado | — | ✓ | ✓ |
| Best practices auto-aplicadas | — | ✓ | ✓ |
| Subagent `zabbix-architect` | — | ✓ | ✓ |
| Suporte por email | — | 48h | 8h |
| Templates customizados | — | — | ✓ |
| Validação contra schema interno | — | — | ✓ |
| Compatibilidade multi-versão (6.0/6.4/7.0/7.2) | 7.0 | 7.0/7.2 | Todas |

[Ver planos detalhados →](https://zabbix-frontend.dev/pricing)

---

## Exemplo rápido

```
> Crie um widget que mostra os 5 hosts com mais problemas críticos abertos

[Skill zabbix-widget-new ativada]
[Validando licença...] ✓ Pro
[Gerando estrutura...]

✓ Criado: ui/widgets/critical_hosts/manifest.json
✓ Criado: ui/widgets/critical_hosts/Widget.php
✓ Criado: ui/widgets/critical_hosts/includes/WidgetForm.php
✓ Criado: ui/widgets/critical_hosts/actions/WidgetView.php
✓ Criado: ui/widgets/critical_hosts/views/widget.view.php
✓ Criado: ui/widgets/critical_hosts/assets/js/class.widget.js

[Validador]
✓ manifest.json v2.0 válido
✓ Namespace `Widgets\CriticalHosts` consistente
✓ JS class `CWidgetCriticalHosts` estende CWidget
✓ Sem SQL bruto (usa API::Problem()->get)
✓ CSRF preservado em CControllerDashboardWidgetView
✓ Strings traduzidas via _()
```

---

## Documentação

- [Instalação](docs/INSTALLATION.md)
- [Uso](docs/USAGE.md)
- [Padrões Zabbix](docs/ZABBIX-STANDARDS.md)
- [Lista de preços](docs/PRICING.md)

---

## Suporte

- Email: matheeuus22@gmail.com
- Docs: https://zabbix-frontend.dev/docs
- Issues: https://github.com/matheusandrades/zabbix-frontend-plugin/issues (clientes Pro+)

---

© 2026 Matheus Andrade. Plugin comercial. Veja [LICENSE](LICENSE).
