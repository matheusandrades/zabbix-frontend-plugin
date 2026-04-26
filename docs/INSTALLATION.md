# Instalação

## 1. Adicionar o marketplace

No Claude Code, execute:

```bash
/plugin marketplace add matheusandrades/zabbix-plugins-marketplace
```

## 2. Instalar o plugin

```bash
/plugin install zabbix-frontend@zabbix-plugins
```

## 3. Configurar (primeira vez)

Após instalar, abra a configuração do plugin para definir:

| Campo | Default | Descrição |
|---|---|---|
| `license_key` | (vazio) | Sua chave de licença. Sem ela, plano Free |
| `zabbix_version` | `7.0` | Versão alvo (`6.0`, `6.4`, `7.0`, `7.2`) |
| `tier` | `free` | Detectado automaticamente via license_key |
| `auto_validate` | `true` | Roda validador a cada Edit/Write |
| `namespace_prefix` | `MyOrg` | Prefixo PHP para módulos gerados |

## 4. Verificar

```bash
/zabbix-license status
```

Saída esperada:

```
═══ STATUS DA LICENÇA ═══
Email: -
Plano: Free
Recursos ativos: zabbix-module-new, zabbix-widget-new, zabbix-action-new, zabbix-view-new, zabbix-validate
```

## 5. Adquirir licença Pro/Enterprise

Acesse https://zabbix-frontend.dev/pricing e faça checkout.

Após pagamento, você recebe a chave por email. Registre:

```bash
/zabbix-license ZBX-XXXX-XXXX-XXXX-XXXX
```

## Requisitos do sistema

- Claude Code instalado (https://claude.com/claude-code)
- Node.js 18+ (para o MCP server de licença)
- PHP 7.4+ no ambiente alvo (apenas para validação local com `php -l`)
- Python 3 (para validação de manifest.json)

## Atualizações

```bash
/plugin update zabbix-frontend
```

Versões publicadas: ver [CHANGELOG.md](../CHANGELOG.md).

## Desinstalar

```bash
/plugin uninstall zabbix-frontend
```

Sua chave de licença permanece válida e pode ser reativada a qualquer momento.
