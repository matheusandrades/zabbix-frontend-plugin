---
name: zabbix-view-new
description: Cria view PHP Zabbix usando helpers HTML oficiais (CHtmlPage/CDiv/CFormGrid/CWidgetView/CTableInfo), classes CSS corretas, escaping automático, i18n via _(). Use quando o usuário pedir "criar view Zabbix", "template Zabbix", "página Zabbix" ou ao gerar markup PHP do frontend.
allowed-tools: Read, Write, Edit, Glob, Bash
---

# Criar View Zabbix

Views no Zabbix são arquivos PHP que recebem `$data` da action e usam helpers HTML para gerar markup. **NUNCA concatene strings HTML** — use sempre os helpers, que fazem escaping automático.

## 1. Estrutura de uma view

```php
<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

// 1. Build do conteúdo usando helpers
$content = (new CDiv())
    ->addClass('content')
    ->addItem(new CSpan($data['title']));

// 2. Render
(new CHtmlPage())
    ->setTitle(_('Title'))
    ->addItem($content)
    ->show();
```

**Sempre incluir docblock** com `@var CView $this` e `@var array $data` para IDE.

## 2. Containers de página

| Helper | Uso |
|---|---|
| `CHtmlPage` | Página completa standalone (top-level) |
| `CWidgetView` | Container de widget (use em `views/widget.view.php`) |
| `CDiv` | Container genérico |
| `CTag('section', true, ...)` | Tag custom |

```php
// Página completa
(new CHtmlPage())
    ->setTitle(_('Page title'))
    ->setDocUrl(CDocHelper::getUrl(CDocHelper::REPORTS_HOST_REPORT))
    ->setControls((new CTag('nav', true))->addItem($filter_button))
    ->addItem($main_content)
    ->show();

// Widget (em widgets/<id>/views/widget.view.php)
(new CWidgetView($data))
    ->addItem($content)
    ->show();
```

## 3. Tabelas — CTableInfo

Padrão Zabbix para listagens:

```php
$table = (new CTableInfo())
    ->setHeader([
        _('Host'),
        _('IP'),
        new CColHeader(_('Status'), 'status'),  // sortable
        _('Actions')
    ])
    ->setNoDataMessage(_('No hosts found'));

foreach ($data['hosts'] as $host) {
    $table->addRow([
        (new CLinkAction($host['name']))->onClick("openHostDetails({$host['hostid']})"),
        $host['interfaces'][0]['ip'] ?? '-',
        $host['status'] == HOST_STATUS_MONITORED
            ? (new CSpan(_('Enabled')))->addClass(ZBX_STYLE_GREEN)
            : (new CSpan(_('Disabled')))->addClass(ZBX_STYLE_RED),
        (new CButtonIcon(ZBX_ICON_REMOVE))
            ->setAjaxAction("delete:{$host['hostid']}")
    ]);
}
```

**Classes de status comuns:**
- `ZBX_STYLE_GREEN` / `ZBX_STYLE_RED` / `ZBX_STYLE_YELLOW` / `ZBX_STYLE_GREY`
- `ZBX_STYLE_NORMAL_BG` / `ZBX_STYLE_INFO_BG` / `ZBX_STYLE_WARNING_BG` / `ZBX_STYLE_AVERAGE_BG` / `ZBX_STYLE_HIGH_BG` / `ZBX_STYLE_DISASTER_BG`

## 4. Forms — CForm + CFormGrid

```php
$form = (new CForm('post'))
    ->setName('host_form')
    ->addVar('hostid', $data['hostid']);  // hidden field

$form_grid = (new CFormGrid())
    ->addItem([
        new CLabel(_('Host name'), 'name'),
        new CFormField(
            (new CTextBox('name', $data['name']))
                ->setAriaRequired()
                ->setAttribute('autofocus', 'autofocus')
                ->setWidth(ZBX_TEXTAREA_STANDARD_WIDTH)
        )
    ])
    ->addItem([
        new CLabel(_('Status'), 'status'),
        new CFormField(
            (new CRadioButtonList('status', (int) $data['status']))
                ->addValue(_('Enabled'), HOST_STATUS_MONITORED)
                ->addValue(_('Disabled'), HOST_STATUS_NOT_MONITORED)
                ->setModern()
        )
    ])
    ->addItem([
        new CLabel(_('Tags'), 'tags'),
        new CFormField(
            (new CPartial('configuration.tags.tab', [
                'source' => 'host',
                'tags' => $data['tags']
            ]))
        )
    ]);

$form->addItem($form_grid)
    ->addItem(
        (new CFormActions())
            ->addItem((new CSimpleButton(_('Save')))->setId('save_btn'))
            ->addItem((new CSimpleButton(_('Cancel')))->setId('cancel_btn'))
    );

(new CHtmlPage())
    ->setTitle(_('Host edit'))
    ->addItem($form)
    ->show();
```

**Inputs disponíveis:**
`CTextBox`, `CTextArea`, `CPasswordBox`, `CInputSecret`, `CCheckBox`, `CCheckBoxList`, `CRadioButtonList`, `CSelect`, `CMultiSelect`, `CDateSelector`, `CColorPicker`, `CRangeControl`, `CNumericBox`, `CFile`.

**Modificadores comuns:**
- `->setAriaRequired()` — adiciona `aria-required="true"` + asterisco visual
- `->setEnabled(false)` — desabilita
- `->setReadonly(true)` — readonly
- `->setWidth(ZBX_TEXTAREA_STANDARD_WIDTH)` — largura padrão
- `->setAttribute('placeholder', _('Enter name'))` — placeholders
- `->setErrorContainer('hostname-error')` — container de erro inline

## 5. CSRF em forms

Forms POST OBRIGATORIAMENTE incluem CSRF token. `CForm` adiciona automaticamente:

```php
$form = (new CForm('post'))->setAction((new CUrl('zabbix.php'))
    ->setArgument('action', 'host.update')
    ->getUrl()
);
// CSRF token é injetado automaticamente
```

Se for AJAX, envie o token no header:
```javascript
fetch(url, {
    headers: {'X-CSRF-TOKEN': document.querySelector('[name=_csrf_token]').value}
});
```

## 6. Botões e ícones

```php
// Botão padrão
(new CButton('save', _('Save')))->setAttribute('type', 'submit');

// Botão ícone-only
(new CButtonIcon(ZBX_ICON_PENCIL))
    ->setTitle(_('Edit'))
    ->setAjaxAction('host.edit');

// Link estilizado
(new CButtonLink(_('Add host')))
    ->setHint(_('Create new host'))
    ->onClick('return PopUp("popup.host.edit", {}, {dialogue_class: "modal-popup"})');

// Botão delete com confirmação
(new CButtonDelete(
    _('Delete selected hosts?'),
    'action=host.delete'
))->setEnabled($can_delete);
```

**Ícones disponíveis** (constantes prefixo `ZBX_ICON_`):
`ZBX_ICON_ADD`, `ZBX_ICON_REMOVE`, `ZBX_ICON_PENCIL`, `ZBX_ICON_FILTER`, `ZBX_ICON_REFRESH`, `ZBX_ICON_DOWNLOAD`, `ZBX_ICON_DEBUG`, `ZBX_ICON_KIOSK`, etc.

## 7. Filtros — CFilter

```php
$filter = (new CFilter())
    ->setProfile($data['filter_profile'], $data['filter_active_tab'])
    ->setActiveTab($data['filter_active_tab'])
    ->addFilterTab(_('Filter'), [
        (new CFormGrid())
            ->addItem([
                new CLabel(_('Host groups'), 'filter_groupids'),
                new CFormField(
                    (new CMultiSelect([
                        'name' => 'filter_groupids[]',
                        'object_name' => 'hostGroup',
                        'data' => $data['filter']['groups']
                    ]))->setWidth(ZBX_TEXTAREA_FILTER_STANDARD_WIDTH)
                )
            ])
    ]);
```

## 8. Mensagens de status

```php
// Sucesso
makeMessageBox(true, [], _('Host updated'))->show();

// Erro
makeMessageBox(false, [_('Field is required')], _('Validation failed'))->show();

// Em CControllerResponseRedirect (preferido)
$response->setMessageOk(_s('Host "%1$s" saved', $name));
$response->setMessageError(_('Cannot save host'));
```

## 9. Reuso via CPartial

Components compartilháveis entre views:

```php
// View principal
(new CPartial('configuration.tags.tab', [
    'source' => 'host',
    'tags' => $data['tags']
]))->show();

// Arquivo: views/configuration.tags.tab.php
// Recebe $data com chaves passadas
```

Partials reusáveis comuns: `configuration.tags.tab`, `js.popup.token.list`.

## 10. Includes JS específicos

```php
// No final da view
$this->includeJsFile('host.edit.view.js.php');
```

Esse arquivo é processado por PHP (pode injetar variáveis traduzidas). Coloque em `views/`.

## 11. Variáveis CSS — temas Zabbix

Use SEMPRE variáveis para garantir compatibilidade com todos os 6 temas (blue, dark, blue-classic, dark-classic, hc-light, hc-dark):

```css
/* CERTO */
.my-widget {
    background: var(--bg-color);
    color: var(--font-color);
    border: 1px solid var(--border-color);
}

/* ERRADO */
.my-widget {
    background: #ffffff;
    color: #000000;
}
```

**Variáveis principais:**
- `--font-stack` / `--font-stack-mono` / `--font-body-size`
- `--bg-color` / `--bg-color-secondary`
- `--font-color` / `--font-color-secondary`
- `--color-primary` / `--color-success` / `--color-danger` / `--color-warning`
- `--border-color` / `--border-radius`

## 12. Naming convention CSS

Para CSS customizado em módulo/widget:

```
.dashboard-widget-<id-com-hifens>          /* container */
.dashboard-widget-<id>__<element>          /* BEM elements */
.dashboard-widget-<id>--<modifier>         /* BEM modifiers */
```

Para módulos genéricos: prefixe com nome do módulo:
```
.module-acme-host-report                   /* container */
.module-acme-host-report__row              /* row */
.module-acme-host-report--loading          /* state */
```

## 13. Erros comuns a evitar

```
[ ] NUNCA: $html = '<div>'.$user_input.'</div>';
[ ] NUNCA: echo "<a href='".$url."'>";
[ ] NUNCA: hardcoded colors (#fff, #000)
[ ] NUNCA: window.location = ... (use Zabbix URL helpers)
[ ] NUNCA: <script>...</script> inline (use includeJsFile)
[ ] NUNCA: query string concatenation (use CUrl::setArgument)
```

```
[+] SEMPRE: CDiv/CSpan/CTag (escape automático)
[+] SEMPRE: _() para strings
[+] SEMPRE: var(--*) para cores
[+] SEMPRE: CUrl helpers para URLs
[+] SEMPRE: includeJsFile() para JS
```

## 14. Fontes

- https://www.zabbix.com/documentation/current/en/devel/modules/file_structure/views
- Helpers em `ui/include/classes/html/` (93 classes disponíveis)
- Exemplos completos: `ui/widgets/clock/views/widget.view.php`, `ui/widgets/svggraph/views/`
