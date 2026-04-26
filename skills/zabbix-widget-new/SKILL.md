---
name: zabbix-widget-new
description: Cria widget Zabbix dashboard (7.0+) completo com Widget.php (CWidget), WidgetForm.php (CWidgetForm), WidgetView (CControllerDashboardWidgetView), view PHP e JS class (CWidget). Use quando o usuário pedir "criar widget Zabbix", "novo dashboard widget", "widget customizado".
allowed-tools: Read, Write, Edit, Glob, Bash
---

# Criar Widget Zabbix Dashboard

Widgets diferem de módulos genéricos: têm estrutura específica, suportam dashboard, e (Zabbix 7.0+) podem fazer broadcast/feedback entre si.

## 1. Pré-requisitos

- **Zabbix 6.4+** obrigatório (widgets como módulos não existiam em 6.0)
- **Zabbix 7.0+** para sistema de broadcast (`widget.in` / `widget.out`)
- Verifique a versão alvo na config do plugin (`zabbix_version`)

## 2. Estrutura obrigatória

```
my_widget/
├── manifest.json
├── Widget.php                       # extends Zabbix\Core\CWidget
├── includes/
│   └── WidgetForm.php               # extends Zabbix\Widgets\CWidgetForm
├── actions/
│   └── WidgetView.php               # extends CControllerDashboardWidgetView
├── views/
│   ├── widget.view.php              # render do widget
│   ├── widget.edit.php              # opcional - form de configuração
│   └── widget.edit.js.php           # opcional - JS do form
└── assets/
    ├── js/
    │   └── class.widget.js          # extends CWidget (JS)
    └── css/
        └── widget.css               # opcional
```

## 3. manifest.json — específico de widget

```json
{
    "manifest_version": 2.0,
    "id": "acme.problem_top",
    "type": "widget",
    "name": "Top Problem Hosts",
    "namespace": "Acme\\ProblemTop",
    "version": "1.0.0",
    "author": "Acme",
    "description": "Mostra hosts com mais problemas críticos abertos",
    "url": "web_interface/frontend_sections/dashboards/widgets/problem_top",
    "widget": {
        "size": {"width": 12, "height": 5},
        "js_class": "CWidgetProblemTop",
        "refresh_rate": 60,
        "template_support": true,
        "in": {
            "time_period": {"type": "_timeperiod"}
        },
        "out": [
            {"type": "_hostid"},
            {"type": "_hostids"}
        ]
    },
    "actions": {
        "widget.acme.problem_top.view": {
            "class": "WidgetView"
        }
    },
    "assets": {
        "js": ["class.widget.js"],
        "css": ["widget.css"]
    }
}
```

**REGRAS:**
- `type: "widget"` é OBRIGATÓRIO (default seria `module`)
- `widget.size`: largura em colunas (max 36), altura em linhas
- `widget.js_class`: nome da classe JS (deve casar com `class.widget.js`)
- `widget.refresh_rate`: segundos. 0 = sem refresh; 60+ recomendado
- `widget.template_support`: se `true`, widget pode ser usado em template dashboards
- `widget.in`: tipos de dados que ESTE widget aceita receber via broadcast
- `widget.out`: tipos de dados que ESTE widget envia para outros (Zabbix 7.0+)
- `actions` da widget **devem** começar com `widget.<id>.<nome>`

**Tipos de broadcast disponíveis:**
- `_itemid` (single item)
- `_itemids` (multiple items)
- `_hostid` (single host)
- `_hostids` (multiple hosts)
- `_hostgroupids` (host groups)
- `_timeperiod` (time range)

## 4. Widget.php — declaração da widget

```php
<?php declare(strict_types = 0);

namespace Acme\ProblemTop;

use Zabbix\Core\CWidget;

class Widget extends CWidget {

    // Constantes específicas do domínio
    public const SHOW_HOSTS = 0;
    public const SHOW_GROUPS = 1;

    public const SEVERITY_NOT_CLASSIFIED = 0;
    public const SEVERITY_INFORMATION    = 1;
    public const SEVERITY_WARNING        = 2;
    public const SEVERITY_AVERAGE        = 3;
    public const SEVERITY_HIGH           = 4;
    public const SEVERITY_DISASTER       = 5;

    public function getDefaultName(): string {
        return _('Top Problem Hosts');
    }
}
```

**REGRAS:**
- Estender `Zabbix\Core\CWidget` (NÃO `CModule`)
- `getDefaultName()`: nome exibido ao adicionar widget no dashboard
- Constantes de domínio (severities, modos) ficam aqui — referenciadas em form e view
- Override opcional: `getDefaultSize()`, `getDefaultRefreshRate()`, `getJSClass()`, `isDeprecated()`

## 5. WidgetForm.php — configuração do widget

```php
<?php declare(strict_types = 0);

namespace Acme\ProblemTop\Includes;

use Zabbix\Widgets\{CWidgetField, CWidgetForm};
use Zabbix\Widgets\Fields\{
    CWidgetFieldCheckBox,
    CWidgetFieldIntegerBox,
    CWidgetFieldMultiSelectGroup,
    CWidgetFieldRadioButtonList,
    CWidgetFieldSeverities,
    CWidgetFieldTextBox
};

use Acme\ProblemTop\Widget;

class WidgetForm extends CWidgetForm {

    public function addFields(): self {
        return $this
            ->addField(
                (new CWidgetFieldRadioButtonList('show', _('Show'), [
                    Widget::SHOW_HOSTS  => _('Hosts'),
                    Widget::SHOW_GROUPS => _('Host groups')
                ]))->setDefault(Widget::SHOW_HOSTS)
            )
            ->addField(
                (new CWidgetFieldMultiSelectGroup('groupids', _('Host groups')))
                    ->setFlags(CWidgetField::FLAG_NOT_EMPTY | CWidgetField::FLAG_LABEL_ASTERISK)
            )
            ->addField(
                (new CWidgetFieldSeverities('severities', _('Severity')))
                    ->setDefault([
                        Widget::SEVERITY_AVERAGE,
                        Widget::SEVERITY_HIGH,
                        Widget::SEVERITY_DISASTER
                    ])
            )
            ->addField(
                (new CWidgetFieldIntegerBox('limit', _('Show top'), 1, 100))
                    ->setDefault(10)
            )
            ->addField(
                new CWidgetFieldCheckBox('show_suppressed', _('Show suppressed'))
            );
    }

    public function validate(bool $strict = false): array {
        $errors = parent::validate($strict);
        if ($errors) return $errors;

        if ($strict && !$this->getFieldValue('groupids')) {
            $errors[] = _s('Invalid parameter "%1$s": %2$s.', _('Host groups'), _('cannot be empty'));
        }

        return $errors;
    }
}
```

**Tipos de campos disponíveis** (namespace `Zabbix\Widgets\Fields`):

| Campo | Para que serve |
|---|---|
| `CWidgetFieldCheckBox` | boolean toggle |
| `CWidgetFieldCheckBoxList` | múltipla escolha (checkboxes) |
| `CWidgetFieldColor` | seletor de cor com `allowInherited()` |
| `CWidgetFieldDatePicker` | data |
| `CWidgetFieldGraphDataSet` | datasets de gráfico |
| `CWidgetFieldHostPatternSelect` | host pattern com wildcard |
| `CWidgetFieldIntegerBox` | inteiro com min/max |
| `CWidgetFieldLatLng` | coordenadas |
| `CWidgetFieldMultiSelectGroup` | host groups |
| `CWidgetFieldMultiSelectHost` | hosts |
| `CWidgetFieldMultiSelectItem` | items (use `setMultiple(false)` para single) |
| `CWidgetFieldMultiSelectItemPrototype` | item prototypes |
| `CWidgetFieldMultiSelectOverrideHost` | override de host (template dashboards) |
| `CWidgetFieldNumericBox` | float |
| `CWidgetFieldRadioButtonList` | escolha única |
| `CWidgetFieldRangeControl` | slider |
| `CWidgetFieldReference` | referência a outro widget (broadcast) |
| `CWidgetFieldSelect` | dropdown |
| `CWidgetFieldSeverities` | seletor de severidades Zabbix |
| `CWidgetFieldTags` | filtro de tags |
| `CWidgetFieldTextBox` | string |
| `CWidgetFieldTextArea` | textarea |
| `CWidgetFieldTimePeriod` | range temporal |
| `CWidgetFieldTimeZone` | timezone |

**Flags úteis:**
- `CWidgetField::FLAG_NOT_EMPTY` — server valida obrigatoriedade
- `CWidgetField::FLAG_LABEL_ASTERISK` — adiciona `*` visual no label

## 6. WidgetView.php — action (controller)

```php
<?php declare(strict_types = 0);

namespace Acme\ProblemTop\Actions;

use API,
    CControllerDashboardWidgetView,
    CControllerResponseData;

class WidgetView extends CControllerDashboardWidgetView {

    protected function doAction(): void {
        // $this->fields_values é populado automaticamente pelo CWidgetForm
        // $this->widget é a instância CWidget do módulo
        // $this->isTemplateDashboard() detecta dashboard de template

        $problems = API::Problem()->get([
            'output' => ['eventid', 'name', 'severity', 'clock'],
            'selectHosts' => ['hostid', 'name'],
            'groupids' => $this->fields_values['groupids'],
            'severities' => $this->fields_values['severities'],
            'suppressed' => $this->fields_values['show_suppressed'] ? null : false,
            'sortfield' => 'eventid',
            'sortorder' => ZBX_SORT_DOWN,
            'limit' => $this->fields_values['limit']
        ]);

        // Agregar por host
        $by_host = [];
        foreach ($problems as $p) {
            foreach ($p['hosts'] as $h) {
                $by_host[$h['hostid']] = $by_host[$h['hostid']] ?? [
                    'name' => $h['name'],
                    'count' => 0
                ];
                $by_host[$h['hostid']]['count']++;
            }
        }

        $this->setResponse(new CControllerResponseData([
            'name' => $this->getInput('name', $this->widget->getDefaultName()),
            'hosts' => $by_host,
            'user' => ['debug_mode' => $this->getDebugMode()]
        ]));
    }
}
```

**REGRAS:**
- Estender `CControllerDashboardWidgetView` (NÃO `CController`)
- Já implementa `checkInput()`, `checkPermissions()` automaticamente para widgets
- `$this->fields_values` vem do `CWidgetForm` — chaves casam com nomes dos campos
- `$this->widget` é o `Widget` extends `CWidget`
- Sempre incluir `'user' => ['debug_mode' => $this->getDebugMode()]` na resposta

## 7. View — views/widget.view.php

```php
<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$rows = [];
$position = 1;
foreach ($data['hosts'] as $hostid => $info) {
    $rows[] = (new CRow([
        $position++,
        $info['name'],
        (new CSpan($info['count']))->addClass('problem-count')
    ]));
}

$table = (new CTableInfo())
    ->setHeader([_('#'), _('Host'), _('Problems')])
    ->setNoDataMessage(_('No problems found'));

foreach ($rows as $row) {
    $table->addRow($row);
}

(new CWidgetView($data))
    ->addItem($table)
    ->show();
```

**REGRAS:**
- USE `CWidgetView` (não `CHtmlPage`) para widgets
- `CWidgetView` já aplica classes/themes corretos do dashboard

## 8. JavaScript — assets/js/class.widget.js

```javascript
class CWidgetProblemTop extends CWidget {

    onInitialize() {
        super.onInitialize();
        this._refresh_interval = null;
    }

    onActivate() {
        super.onActivate();
    }

    onDeactivate() {
        super.onDeactivate();
    }

    onResize() {
        if (!this._has_contents) {
            return;
        }
        // ajustar tamanhos relativos ao novo width/height
    }

    getUpdateRequestData() {
        return {
            ...super.getUpdateRequestData(),
            // adicionar dados extras se necessário
        };
    }

    processUpdateResponse(response) {
        super.processUpdateResponse(response);
        // hook customizado pós-update
    }

    hasPadding() {
        return true; // false se widget desenha edge-to-edge
    }
}
```

**REGRAS:**
- Nome da classe DEVE casar com `widget.js_class` no manifest (`CWidgetProblemTop`)
- DEVE estender `CWidget`
- Sempre chamar `super.method()` ao override hooks de ciclo de vida
- Hooks: `onInitialize`, `onStart`, `onActivate`, `onDeactivate`, `onEdit`, `onResize`, `onAfterUpdate`

## 9. CSS opcional — assets/css/widget.css

```css
.dashboard-widget-acme-problem-top .problem-count {
    font-weight: bold;
    color: var(--color-danger);
}
```

**REGRAS:**
- Prefixe SEMPRE classes com `.dashboard-widget-<id-com-traços>`
- Use variáveis CSS Zabbix (`--color-*`, `--font-*`) para suportar todos os temas
- Nunca hardcode cores que mudam entre light/dark

## 10. Tradução de strings JS

Em `Module.php` (criar se não existir):

```php
<?php declare(strict_types = 0);

namespace Acme\ProblemTop;

use Zabbix\Core\CModule;

class Module extends CModule {

    public function getTranslationStrings(): array {
        return [
            'class.widget.js' => [
                'No data' => _('No data'),
                'Loading...' => _('Loading...')
            ]
        ];
    }
}
```

No JS: `t('No data')`, `t('Loading...')`.

## 11. Validação após criar

Execute:

```bash
php -l Widget.php
php -l includes/WidgetForm.php
php -l actions/WidgetView.php
python3 -c "import json; json.load(open('manifest.json'))"
node --check assets/js/class.widget.js
```

E rode skill `zabbix-validate` para conferir padrões completos.

## 12. Instalação

```
1. Copie pasta para <zabbix>/ui/widgets/
2. Administration → General → Modules → Scan directory
3. Habilite o widget
4. Em qualquer dashboard, "Add widget" → procure o nome
```

## Fontes oficiais

- https://www.zabbix.com/documentation/current/en/devel/modules/tutorials/widget
- Código-fonte: `ui/widgets/clock/`, `ui/widgets/gauge/`, `ui/widgets/svggraph/`
