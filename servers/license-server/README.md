# License Validator MCP Server

Servidor MCP local que valida licenças contra o backend `https://api.zabbix-frontend.dev`.

## Como funciona

1. Skills premium chamam `validate_license` antes de executar
2. O server consulta o backend (com cache de 5 min para reduzir latência)
3. Retorna `{valid, tier, expires_at, features}`
4. A skill recusa execução se `tier === 'free'` para features Pro+

## Tools expostas

### `validate_license`
Input: `{license_key?: string}` (default: env `LICENSE_KEY`)
Output: `{valid, tier, expires_at, features, reason}`

### `check_feature_access`
Input: `{feature: string, license_key?: string}`
Output: `{allowed, tier, required_tier, feature}`

## Instalação manual (dev)

```bash
cd servers/license-server
npm install
node index.js  # standalone para teste
```

## Variáveis de ambiente

- `ZABBIX_PLUGIN_API_URL` — URL do backend (default: `https://api.zabbix-frontend.dev`)
- `LICENSE_KEY` — chave a ser usada quando não passada explicitamente

## Segurança

- Cache em memória apenas (não persiste no disco)
- Timeout de 5s no fetch — falha graciosa se backend offline (degrada a Free)
- Nunca loga a chave completa, apenas hash truncado em debug
