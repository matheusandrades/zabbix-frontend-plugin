# Padrões Zabbix Frontend — Referência Rápida

Compilação dos padrões oficiais que o plugin aplica e valida automaticamente. Use como cheat-sheet.

## 1. Estrutura de arquivos

### Módulo genérico
```
<id>/
├── manifest.json          # OBRIGATÓRIO
├── Module.php             # opcional
├── actions/
│   └── *.php              # CController children
└── views/
    └── *.view.php         # render via helpers
```

### Widget (Zabbix 6.4+)
```
<id>/
├── manifest.json          # type: "widget"
├── Widget.php             # extends CWidget
├── includes/
│   └── WidgetForm.php     # extends CWidgetForm
├── actions/
│   └── WidgetView.php     # extends CControllerDashboardWidgetView
├── views/
│   ├── widget.view.php
│   └── widget.edit.js.php # opcional
└── assets/
    ├── js/class.widget.js # extends CWidget (JS)
    └── css/widget.css     # prefixe .dashboard-widget-<id>
```

## 2. manifest.json — campos obrigatórios

```json
{
    "manifest_version": 2.0,
    "id": "vendor.module_name",
    "name": "Display Name",
    "namespace": "Vendor\\ModuleName",
    "version": "1.0.0"
}
```

| Campo | Regra |
|---|---|
| `manifest_version` | 2.0 (Zabbix 6.4+) |
| `id` | snake_case com prefixo de vendor (`acme.host_report`) |
| `namespace` | PascalCase, casa com diretório (`acme/host_report` → `Acme\HostReport`) |
| Para widget | Adicionar `"type": "widget"` + bloco `"widget": {...}` |

## 3. Classes base obrigatórias

| Tipo | Classe base | Namespace |
|---|---|---|
| Module | `CModule` | `Zabbix\Core` |
| Widget | `CWidget` | `Zabbix\Core` |
| WidgetForm | `CWidgetForm` | `Zabbix\Widgets` |
| Action genérica | `CController` | `(global)` |
| Action de widget | `CControllerDashboardWidgetView` | `(global)` |
| View | (recebe `$this` como `CView`) | — |

## 4. Hooks de Module.php

```php
public function init(): void {}                          // boot
public function onBeforeAction(CAction $action): void {} // pré-action
public function onTerminate(CAction $action): void {}    // pós-action
public function getTranslationStrings(): array { return []; } // i18n JS
```

## 5. Métodos obrigatórios em Action

```php
protected function checkInput(): bool;          // valida HTTP input
protected function checkPermissions(): bool;    // autoriza
protected function doAction(): void;            // lógica + setResponse
```

`init()` é opcional; útil só para `disableCsrfValidation()` em GET puro.

## 6. Tipos de validação em `validateInput()`

| Sintaxe | Comportamento |
|---|---|
| `'db hosts.hostid'` | Tipo conforme schema |
| `'string\|not_empty'` | String não vazia |
| `'string\|max_length:255'` | Limite |
| `'int32'` / `'id'` | Inteiro / ID positivo |
| `'array'` | Array |
| `'in 0,1,2'` | Conjunto |

## 7. Permissões — constantes

| Constante | Valor | Uso |
|---|---|---|
| `USER_TYPE_USER` | 1 | Read-only |
| `USER_TYPE_ZABBIX_USER` | 1 | (alias) |
| `USER_TYPE_ZABBIX_ADMIN` | 2 | Read + write próprio |
| `USER_TYPE_SUPER_ADMIN` | 3 | Tudo |

Permissões finas via `$this->checkAccess(CRoleHelper::UI_*)`.

## 8. Helpers HTML obrigatórios

NUNCA concatene HTML. Use:

```php
new CDiv($content)
new CSpan($text)
new CTag('section', true, $body)
new CHtmlPage()
new CWidgetView($data)
new CFormGrid()
new CFormField($input)
new CTableInfo()
new CRow([...])
new CButtonIcon(ZBX_ICON_*)
new CLink($text, $url)
new CUrl('zabbix.php')->setArgument('action', '...')
```

93 helpers em `ui/include/classes/html/`.

## 9. Acesso a dados — sempre via API

```php
// SEMPRE
API::Host()->get([...]);
API::Item()->get([...]);
API::Problem()->get([...]);
Manager::History()->getLastValues([$item], 1);

// NUNCA
DBselect('SELECT...');
DBfetch(...);
DB::select(...);
```

APIs principais: `Host`, `HostGroup`, `Item`, `Problem`, `Trigger`, `Event`, `User`, `Action`, `Dashboard`, `Map`, `Template`, `Macro`.

## 10. Internacionalização

```php
_('Save')                              // simples
_s('Host "%1$s" deleted', $name)       // placeholder
_n('%1$s host', '%1$s hosts', $count)  // plural
```

JS: `t('Save')` (após exportar em `getTranslationStrings()`).

## 11. Convenções CSS Zabbix

### Naming
```
.dashboard-grid-widget               /* container de qualquer widget */
.dashboard-widget-<id-com-hifens>    /* prefixo do seu widget */
.btn-                                /* botões */
.icon-, .zi-                         /* ícones */
.menu-popup-                         /* menus de contexto */
.list-table                          /* tabelas */
.table-forms                         /* tabelas de formulários */
.form-grid                           /* CFormGrid */
.msg-bad, .msg-good, .msg-warning    /* mensagens */
```

### Variáveis CSS — nunca hardcode
```css
/* CERTO */
background: var(--bg-color);
color: var(--font-color);
border: 1px solid var(--border-color);

/* ERRADO */
background: #ffffff;
color: #000000;
```

Variáveis: `--bg-color`, `--font-color`, `--border-color`, `--color-primary`, `--color-success`, `--color-danger`, `--color-warning`, `--font-stack`, `--font-stack-mono`.

## 12. Temas suportados

Os 6 temas oficiais que seu CSS deve respeitar:

- `blue-theme.css` (default)
- `dark-theme.css`
- `blue-classic-theme.css`
- `dark-classic-theme.css`
- `hc-light.css` (high contrast light)
- `hc-dark.css` (high contrast dark)

## 13. Tipos de campo de Widget Form

`CWidgetFieldCheckBox`, `CWidgetFieldCheckBoxList`, `CWidgetFieldColor`, `CWidgetFieldDatePicker`, `CWidgetFieldGraphDataSet`, `CWidgetFieldHostPatternSelect`, `CWidgetFieldIntegerBox`, `CWidgetFieldLatLng`, `CWidgetFieldMultiSelectGroup`, `CWidgetFieldMultiSelectHost`, `CWidgetFieldMultiSelectItem`, `CWidgetFieldMultiSelectItemPrototype`, `CWidgetFieldMultiSelectOverrideHost`, `CWidgetFieldNumericBox`, `CWidgetFieldRadioButtonList`, `CWidgetFieldRangeControl`, `CWidgetFieldReference`, `CWidgetFieldSelect`, `CWidgetFieldSeverities`, `CWidgetFieldTags`, `CWidgetFieldTextArea`, `CWidgetFieldTextBox`, `CWidgetFieldTimePeriod`, `CWidgetFieldTimeZone`.

Flags: `FLAG_NOT_EMPTY`, `FLAG_LABEL_ASTERISK`.

## 14. Broadcast widget-to-widget (Zabbix 7.0+)

```json
{
    "widget": {
        "in": {"time_period": {"type": "_timeperiod"}},
        "out": [{"type": "_hostid"}, {"type": "_hostids"}]
    }
}
```

Tipos: `_itemid`, `_itemids`, `_hostid`, `_hostids`, `_hostgroupids`, `_timeperiod`.

## 15. JavaScript — hooks de CWidget

```javascript
class CWidgetMy extends CWidget {
    onInitialize() {}      // construtor
    onStart() {}           // antes de ativar
    onActivate() {}        // visível
    onDeactivate() {}      // saiu de viewport
    onEdit() {}            // modo edição
    onResize() {}          // resize
    onAfterUpdate() {}     // pós-update
    getUpdateRequestData() // payload pro action
    processUpdateResponse() // tratar resposta
}
```

## 16. Convenção `declare(strict_types)`

Padrão Zabbix:

```php
<?php declare(strict_types = 0);
```

NÃO use `strict_types = 1` em módulos — quebra interop com helpers que aceitam tipos mistos.

## 17. Constantes Zabbix mais usadas

```php
HOST_STATUS_MONITORED       // 0
HOST_STATUS_NOT_MONITORED   // 1
TRIGGER_SEVERITY_NOT_CLASSIFIED  // 0
TRIGGER_SEVERITY_INFORMATION     // 1
TRIGGER_SEVERITY_WARNING         // 2
TRIGGER_SEVERITY_AVERAGE         // 3
TRIGGER_SEVERITY_HIGH            // 4
TRIGGER_SEVERITY_DISASTER        // 5
ITEM_VALUE_TYPE_FLOAT       // 0
ITEM_VALUE_TYPE_STR         // 1
ITEM_VALUE_TYPE_LOG         // 2
ITEM_VALUE_TYPE_UINT64      // 3
ITEM_VALUE_TYPE_TEXT        // 4
ZBX_SORT_UP / ZBX_SORT_DOWN
ZBX_STYLE_GREEN / _RED / _YELLOW / _GREY
```

## Fontes oficiais

- https://www.zabbix.com/documentation/current/en/devel/modules
- https://github.com/zabbix/zabbix
- Código em `ui/widgets/clock/`, `ui/widgets/gauge/`, `ui/widgets/svggraph/` (exemplos completos)
