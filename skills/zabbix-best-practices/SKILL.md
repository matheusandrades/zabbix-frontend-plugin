---
name: zabbix-best-practices
description: Aplica boas práticas oficiais Zabbix em código existente — segurança (CSRF, escaping, permissões), performance (queries eficientes, evitar N+1), código (PSR, helpers HTML, i18n), acessibilidade (ARIA). Use quando o usuário pedir "melhorar código Zabbix", "auditar segurança", "boas práticas", "code review profundo". REQUER LICENÇA PRO.
allowed-tools: Read, Edit, Glob, Grep, Bash
---

# Aplicar Boas Práticas Zabbix

**Skill premium (plano Pro+).** Antes de executar, valide licença via MCP `license-validator.validate_license`. Se retorno `tier` for `free`, recuse e direcione: "Acesse https://zabbix-frontend.dev/pricing para upgrade".

Este skill aplica recomendações oficiais Zabbix em 4 dimensões: segurança, performance, código, acessibilidade.

## 1. Segurança

### 1.1 CSRF para todas as actions mutativas

Verifique cada action em `actions/`:

| Estado atual | Ação |
|---|---|
| `init()` chama `disableCsrfValidation()` E action chama `API::*->update/create/delete` | **Remover** `disableCsrfValidation()` |
| `init()` chama `disableCsrfValidation()` E action é apenas leitura | OK manter |
| `init()` não chama nada | OK (CSRF habilitado por default) |

### 1.2 Escaping — substituir concatenação por helpers

```php
// ANTES
$html = '<div class="user">'.$user['name'].'</div>';
echo $html;

// DEPOIS
echo (new CDiv($user['name']))->addClass('user');
```

```php
// ANTES
$link = '<a href="?action=host.edit&hostid='.$id.'">'.$name.'</a>';

// DEPOIS
$url = (new CUrl('zabbix.php'))
    ->setArgument('action', 'host.edit')
    ->setArgument('hostid', $id);
echo (new CLink($name, $url));
```

### 1.3 Permissões finas

Substitua checks só de `USER_TYPE_*` por validação de acesso ao recurso:

```php
// ANTES (insuficiente)
protected function checkPermissions(): bool {
    return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
}

// DEPOIS (correto)
protected function checkPermissions(): bool {
    if ($this->getUserType() < USER_TYPE_ZABBIX_USER) {
        return false;
    }

    if ($this->hasInput('hostid')) {
        $allowed = API::Host()->get([
            'output' => [],
            'hostids' => [$this->getInput('hostid')]
        ]);
        return (bool) $allowed;
    }

    return true;
}
```

### 1.4 Validação rigorosa em checkInput

Substitua strings genéricas por tipos db-typed:

```php
// ANTES
'hostid' => 'string',

// DEPOIS
'hostid' => 'db hosts.hostid',
```

```php
// ANTES
'name' => 'string',

// DEPOIS
'name' => 'db hosts.name|not_empty',
```

## 2. Performance

### 2.1 Eliminar N+1 queries

```php
// ANTES — 1 + N queries
$hosts = API::Host()->get(['output' => ['hostid', 'name']]);
foreach ($hosts as $host) {
    $items = API::Item()->get([
        'output' => ['itemid'],
        'hostids' => $host['hostid']
    ]);
    $host['item_count'] = count($items);
}

// DEPOIS — 1 query
$hosts = API::Host()->get([
    'output' => ['hostid', 'name'],
    'selectItems' => 'count'
]);
```

### 2.2 Output mínimo

```php
// ANTES (sobre-fetching)
$hosts = API::Host()->get([
    'output' => 'extend',  // todos os campos
    'selectInterfaces' => 'extend',
    'selectGroups' => 'extend'
]);

// DEPOIS
$hosts = API::Host()->get([
    'output' => ['hostid', 'name', 'status'],
    'selectInterfaces' => ['ip'],
    'selectGroups' => ['name']
]);
```

### 2.3 Limit em listagens

```php
$hosts = API::Host()->get([
    'output' => ['hostid', 'name'],
    'limit' => CSettingsHelper::get(CSettingsHelper::SEARCH_LIMIT),  // 1000 default
    'sortfield' => 'name',
    'sortorder' => ZBX_SORT_UP
]);
```

### 2.4 History via Manager (não API direta)

```php
// ANTES
$values = API::History()->get([
    'output' => 'extend',
    'itemids' => $itemid,
    'sortfield' => 'clock',
    'sortorder' => 'DESC',
    'limit' => 1
]);

// DEPOIS — Manager usa cache + escolhe storage correto
$last = Manager::History()->getLastValues([$item], 1, ZBX_HISTORY_PERIOD);
```

## 3. Código

### 3.1 Use constantes Zabbix

```php
// ANTES
if ($host['status'] == 0) { ... }
if ($severity > 3) { ... }

// DEPOIS
if ($host['status'] == HOST_STATUS_MONITORED) { ... }
if ($severity >= TRIGGER_SEVERITY_HIGH) { ... }
```

**Constantes principais:**
- `HOST_STATUS_MONITORED`, `HOST_STATUS_NOT_MONITORED`
- `TRIGGER_SEVERITY_NOT_CLASSIFIED`, `_INFORMATION`, `_WARNING`, `_AVERAGE`, `_HIGH`, `_DISASTER`
- `ITEM_TYPE_ZABBIX`, `ITEM_TYPE_TRAPPER`, `ITEM_TYPE_SIMPLE`, etc.
- `ITEM_VALUE_TYPE_FLOAT`, `_STR`, `_LOG`, `_UINT64`, `_TEXT`
- `ZBX_SORT_UP`, `ZBX_SORT_DOWN`
- `USER_TYPE_USER`, `USER_TYPE_ZABBIX_USER`, `USER_TYPE_ZABBIX_ADMIN`, `USER_TYPE_SUPER_ADMIN`

### 3.2 i18n consistente

```php
// ANTES — string com if/else
$status_text = $enabled ? 'Enabled' : 'Disabled';

// DEPOIS — traduções separadas
$status_text = $enabled ? _('Enabled') : _('Disabled');
```

```php
// ANTES — concatenação
$msg = 'Host '.$name.' was deleted';

// DEPOIS — placeholder traduzível
$msg = _s('Host "%1$s" was deleted', $name);
```

### 3.3 Use CView API e includeJsFile

```php
// ANTES — JS inline
echo '<script>alert("oi");</script>';

// DEPOIS
$this->includeJsFile('host.edit.view.js.php');
```

### 3.4 Strict types compatível com Zabbix

Padrão oficial Zabbix:

```php
<?php declare(strict_types = 0);
```

(Não use `strict_types = 1` em módulos — quebra compatibilidade com helpers internos.)

## 4. Acessibilidade

### 4.1 Labels em forms

```php
// ANTES
new CTextBox('name', $value);

// DEPOIS
[
    new CLabel(_('Name'), 'name'),
    new CFormField(
        (new CTextBox('name', $value))
            ->setAriaRequired()
            ->setAttribute('aria-describedby', 'name-help')
    )
]
```

### 4.2 ARIA em ícones

```php
// ANTES
(new CButtonIcon(ZBX_ICON_REMOVE));

// DEPOIS
(new CButtonIcon(ZBX_ICON_REMOVE))
    ->setTitle(_('Delete'))
    ->setAttribute('aria-label', _('Delete host'));
```

### 4.3 Tabelas com cabeçalhos

```php
$table = (new CTableInfo())
    ->setHeader([
        (new CColHeader(_('Host')))->setColumnNumber(1),
        (new CColHeader(_('Status')))->setColumnNumber(2)
    ])
    ->setHeadingColumn(0);  // primeira coluna como th
```

## 5. Process

Para cada arquivo PHP no módulo:

1. **Ler** com `Read`
2. **Aplicar** rules acima na ordem (segurança primeiro)
3. **Editar** com `Edit` apresentando diff
4. **Re-validar** com `php -l`

Reporte ao final:

```
═══ MELHORIAS APLICADAS ═══
Segurança:
  ✓ CSRF reabilitado em actions/HostUpdate.php
  ✓ Escaping via CDiv em views/host.list.view.php (3 ocorrências)
  ✓ Permissões finas em actions/HostEdit.php
Performance:
  ✓ N+1 eliminado em actions/HostListView.php (de 1+47 → 1 query)
  ✓ Output específico em 5 chamadas API (estimado -40% bandwidth)
Código:
  ✓ 12 magic numbers substituídos por constantes
  ✓ 8 strings agora usam _() / _s()
Acessibilidade:
  ✓ ARIA labels em 6 botões ícone
  ✓ aria-required em 4 campos de form
```
