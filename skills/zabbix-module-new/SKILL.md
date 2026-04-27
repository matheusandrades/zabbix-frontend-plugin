---
name: zabbix-module-new
description: Cria módulo Zabbix frontend completo seguindo manifest.json v2.0, com Module.php (extends CModule), actions (CController), views (CView) e estrutura oficial. Use quando o usuário pedir "criar módulo Zabbix", "novo frontend Zabbix", "submenu Zabbix" ou "extensão Zabbix".
allowed-tools: Read, Write, Edit, Glob, Bash
---

# Criar Módulo Zabbix Frontend

## REGRAS MONZPHERE (OBRIGATÓRIAS)

Aplique antes de qualquer geração de código:

1. **Prefixo CSS `.mnz-`** em TODAS as classes de div/span/blocos (ex: `.mnz-host-table`)
2. **Variáveis CSS** (`var(--bg-color)`, `var(--font-color)`, `var(--border-color)`) — nunca hardcoded
3. **i18n com `_()`** em toda string visível; `_s()` para placeholders, `_n()` para plurais
4. **CProfile** para preferências persistentes (filtros, ordenação) com chave `mnz.<modulo>.<campo>`
5. **CWebUser** para permissões: `CWebUser::checkAccess()`, `CWebUser::getType()`, `CWebUser::isGuest()`
6. **JS em `views/js/<name>.view.js.php`** carregado via `$this->includeJsFile('js/<name>.view.js.php')` no fim da view. (Widgets ficam em `assets/js/`, mas isso é skill `zabbix-widget-new`.)
7. **Rodapé "Developed by MonZphere"** OBRIGATÓRIO no final de toda view de module:
   ```php
   $footer = (new CDiv(_('Developed by MonZphere')))->addClass('mnz-footer');
   (new CHtmlPage())->...->addItem($footer)->show();
   ```

Referência completa: `docs/MONZPHERE-STANDARDS.md`.

---

Quando o usuário solicitar criação de módulo Zabbix, siga este processo rigoroso.

## 1. Coletar requisitos

Pergunte (apenas se não estiver claro):
- Versão Zabbix alvo: **6.4** ou **7.0+** (default: 7.0)
- Identificador único do módulo (`id` no manifest, em snake_case)
- Namespace PHP (PascalCase, ex: `Acme\HostReport`)
- Adiciona item de menu? Em qual seção? (`menu.main`, submenu)
- Precisa de actions próprias? Quais URLs?

## 2. Estrutura obrigatória

```
my_module/
├── manifest.json          # OBRIGATÓRIO
├── Module.php             # opcional, mas recomendado se modificar menu
├── actions/
│   └── MyAction.php       # uma classe por action
└── views/
    └── my.action.view.php # nome casa com action
```

## 3. manifest.json — campos obrigatórios

| Campo | Tipo | Regra |
|---|---|---|
| `manifest_version` | Double | **2.0** sempre (Zabbix 6.4+) |
| `id` | String | snake_case, único globalmente, prefixe com vendor (`acme.host_report`) |
| `name` | String | Nome legível em Administração → General → Modules |
| `namespace` | String | PHP namespace; deve casar com nome do diretório capitalizado |
| `version` | String | semver |

Opcionais relevantes: `author`, `description`, `url`, `actions`, `assets`, `config`.

**Template** (use `assets/templates/manifest.module.json` como base):

```json
{
    "manifest_version": 2.0,
    "id": "acme.host_report",
    "name": "Host Report",
    "namespace": "Acme\\HostReport",
    "version": "1.0.0",
    "author": "Acme",
    "description": "Relatório customizado de hosts críticos",
    "url": "https://acme.example.com/zabbix/host-report",
    "actions": {
        "host.report.view": {
            "class": "HostReportView",
            "view": "host.report.view",
            "layout": "layout.htmlpage"
        }
    }
}
```

**REGRAS:**
- `namespace` no JSON usa `\\` (escape JSON), no PHP usa `\`
- Nome do diretório do módulo deve casar com último segmento do namespace em snake_case (`HostReport` → `host_report/`)
- `id` deve ser único — sempre prefixe com vendor para evitar colisão

## 4. Module.php — apenas se necessário

Use **apenas** se o módulo modifica menu, registra hooks ou inicializa estado. Senão, omita — Zabbix instancia `CModule` default.

```php
<?php declare(strict_types = 0);

namespace Acme\HostReport;

use Zabbix\Core\CModule,
    APP,
    CMenuItem;

class Module extends CModule {

    public function init(): void {
        APP::Component()->get('menu.main')
            ->findOrAdd(_('Reports'))
            ->getSubmenu()
            ->add((new CMenuItem(_('Host Report')))
                ->setAction('host.report.view')
            );
    }
}
```

**REGRAS:**
- `declare(strict_types = 0)` é o padrão Zabbix (não use `strict_types = 1` em módulos)
- Hooks disponíveis: `init()`, `onBeforeAction(CAction $action)`, `onTerminate(CAction $action)`, `getTranslationStrings()`
- Use `_()` para strings de menu — permite tradução

## 5. Action (controller) — actions/HostReportView.php

Toda action herda de `CController` (alias `CAction` é convenção).

```php
<?php declare(strict_types = 0);

namespace Acme\HostReport\Actions;

use CController as CAction,
    CControllerResponseData,
    CControllerResponseFatal,
    API;

class HostReportView extends CAction {

    public function init(): void {
        // GET puro pode desabilitar CSRF; POSTs nunca devem desabilitar
        $this->disableCsrfValidation();
    }

    protected function checkInput(): bool {
        $fields = [
            'groupid' => 'db hosts_groups.groupid',
            'severity' => 'in 0,1,2,3,4,5'
        ];

        $ret = $this->validateInput($fields);
        if (!$ret) {
            $this->setResponse(new CControllerResponseFatal());
        }
        return $ret;
    }

    protected function checkPermissions(): bool {
        return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
    }

    protected function doAction(): void {
        $hosts = API::Host()->get([
            'output' => ['hostid', 'name', 'status'],
            'selectInterfaces' => ['ip'],
            'groupids' => $this->hasInput('groupid') ? [$this->getInput('groupid')] : null,
            'limit' => 100
        ]);

        $data = [
            'hosts' => $hosts,
            'severity' => $this->getInput('severity', 0)
        ];

        $response = new CControllerResponseData($data);
        $response->setTitle(_('Host Report'));
        $this->setResponse($response);
    }
}
```

**REGRAS DE SEGURANÇA:**
- `checkPermissions()` SEMPRE retorna bool baseado em `getUserType()` ou `checkAccess($rule)`
- `checkInput()` SEMPRE valida com `validateInput()`; em falha, retorna `CControllerResponseFatal`
- Nunca acesse `$_GET`/`$_POST` diretamente — use `$this->getInput()` e `$this->hasInput()`
- Acesso a dados SEMPRE via `API::Foo()->get()` — nunca SQL bruto, nunca `DB::select()`

**Constantes de permissão úteis:**
- `USER_TYPE_USER` (Zabbix user / read-only)
- `USER_TYPE_ZABBIX_USER`
- `USER_TYPE_ZABBIX_ADMIN`
- `USER_TYPE_SUPER_ADMIN`

## 6. View — views/host.report.view.php

```php
<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$rows = [];
foreach ($data['hosts'] as $host) {
    $rows[] = (new CRow([
        $host['name'],
        $host['interfaces'][0]['ip'] ?? '-',
        $host['status'] == HOST_STATUS_MONITORED ? _('Enabled') : _('Disabled')
    ]));
}

$table = (new CTableInfo())
    ->setHeader([_('Host'), _('IP'), _('Status')])
    ->setNoDataMessage(_('No hosts found'));

foreach ($rows as $row) {
    $table->addRow($row);
}

(new CHtmlPage())
    ->setTitle(_('Host Report'))
    ->addItem($table)
    ->show();
```

**REGRAS DE VIEW:**
- NUNCA concatene HTML como string. SEMPRE use helpers (`CDiv`, `CSpan`, `CTag`, `CTableInfo`, etc.) — eles fazem escaping automático
- Strings traduzíveis SEMPRE via `_()` ou `_s()`
- Para incluir JS específico desta view: `$this->includeJsFile('host.report.view.js.php');`

## 7. Helpers HTML mais usados

`CHtmlPage`, `CDiv`, `CSpan`, `CTag`, `CForm`, `CFormGrid`, `CFormField`, `CFormFieldset`, `CButton`, `CButtonLink`, `CButtonIcon`, `CCheckBox`, `CColorPicker`, `CRow`, `CCol`, `CColHeader`, `CTableInfo`, `CFilter`, `CIcon`, `CMenuItem`, `CDateSelector`, `CMultiSelect`.

## 8. Internacionalização (i18n)

```php
_('Save')                              // tradução simples
_s('Host "%1$s" was deleted', $name)   // com placeholder
_n('%1$s host', '%1$s hosts', $count)  // plural
```

Para strings em JS, exponha em `Module.php`:
```php
public function getTranslationStrings(): array {
    return [
        'class.host.report.js' => [
            'No data' => _('No data')
        ]
    ];
}
```
No JS: `t('No data')`.

## 9. Após criar arquivos

Sempre execute:

```bash
# 1. Verificar sintaxe PHP
php -l Module.php
find actions/ -name "*.php" -exec php -l {} \;

# 2. Validar manifest.json
python3 -c "import json; json.load(open('manifest.json'))"
```

E execute a skill `zabbix-validate` para validação completa de padrões.

## 10. Instruções para o usuário

Após criar:

```
Para instalar:
1. Copie a pasta para <zabbix-frontend>/modules/
2. Acesse Administration → General → Modules
3. Clique em "Scan directory"
4. Habilite o módulo
5. Acesse via menu (item adicionado em init())
```

## Fontes oficiais

- https://www.zabbix.com/documentation/current/en/devel/modules
- https://www.zabbix.com/documentation/current/en/devel/modules/file_structure
- https://www.zabbix.com/documentation/current/en/devel/modules/tutorials/module
