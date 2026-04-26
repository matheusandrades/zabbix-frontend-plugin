---
description: Registra ou verifica chave de licença do plugin
argument-hint: [chave-de-licença] | status | logout
allowed-tools: Bash, Read, Edit
---

# /zabbix-license

Argumento: `$ARGUMENTS`

## Fluxo

### Sem argumento ou `status`
Chame MCP `license-validator.validate_license` com a chave atual de `${user_config.license_key}`. Mostre:

```
═══ STATUS DA LICENÇA ═══
Email: matheeuus22@gmail.com
Plano: Pro
Expira em: 2027-04-26
Recursos ativos: zabbix-best-practices, zabbix-refactor, zabbix-optimizer

Renovar: https://zabbix-frontend.dev/pricing
```

### Com argumento `<chave>`
Valide a chave contra o backend. Se válida:
1. Atualize `~/.claude/plugins/zabbix-frontend/config.json` com a chave
2. Confirme:
   ```
   ✓ Licença Pro registrada com sucesso
   Recursos liberados: ...
   ```

Se inválida:
```
✗ Chave inválida ou expirada
Visite https://zabbix-frontend.dev/pricing para adquirir uma licença
```

### Com argumento `logout`
Remova a chave da config. Avise:
```
✓ Chave removida. Plano atual: Free
```

## Implementação

Use a tool MCP `license-validator.validate_license` para todas as operações.
Nunca grave chave em logs ou histórico do shell.
