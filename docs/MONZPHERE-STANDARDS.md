# Padrões MonZphere — Referência Obrigatória

Padrões adicionais aos do Zabbix oficial. **Toda skill deste plugin segue estas regras** ao gerar código.

## 1. Prefixo CSS `.mnz-` em divs

Todas as classes CSS de elementos `div`/`span`/blocos visuais devem ter prefixo `.mnz-`:

```php
// CERTO
(new CDiv($content))->addClass('mnz-host-list');
(new CSpan($value))->addClass('mnz-status-badge mnz-status-badge--ok');

// ERRADO
(new CDiv($content))->addClass('host-list');
(new CSpan($value))->addClass('status-badge');
```

CSS:
```css
/* CERTO */
.mnz-host-list { ... }
.mnz-status-badge--ok { color: var(--color-success); }

/* ERRADO — sem prefixo */
.host-list { ... }
```

## 2. Temas Zabbix (Blue + Dark)

Usar SEMPRE variáveis CSS Zabbix — nunca hardcoded:

```css
/* CERTO */
.mnz-card {
    background: var(--bg-color);
    color: var(--font-color);
    border: 1px solid var(--border-color);
}

/* ERRADO */
.mnz-card {
    background: #ffffff;
    color: #333333;
}
```

Variáveis principais:
- `--bg-color`, `--bg-color-secondary`
- `--font-color`, `--font-color-secondary`
- `--border-color`
- `--color-primary`, `--color-success`, `--color-danger`, `--color-warning`
- `--font-stack`, `--font-stack-mono`, `--font-body-size`

## 3. Internacionalização (`_()`)

Toda string visível ao usuário passa por `_()`:

```php
// CERTO
$title = _('Hosts overview');
$msg = _s('Host "%1$s" deleted', $name);
$plural = _n('%1$s host', '%1$s hosts', $count);

// ERRADO
$title = 'Hosts overview';
$msg = 'Host '.$name.' deleted';
```

Para JS, exportar via `Module::getTranslationStrings()`:
```php
public function getTranslationStrings(): array {
    return [
        'js/myview.view.js.php' => [
            'No data' => _('No data')
        ]
    ];
}
```
No JS: `t('No data')`.

## 4. CProfile — preferências do usuário

Usar `CProfile` para qualquer estado persistente do usuário (filtros, abas selecionadas, ordenação salva, etc.).

**NÃO use** session vars, cookies, localStorage para isso.

```php
// Ler preferência
$severity = CProfile::get('mnz.host_report.filter.severity', 0);
$page = (int) CProfile::get('mnz.host_report.page', 1);

// Salvar preferência
CProfile::update('mnz.host_report.filter.severity', $severity, PROFILE_TYPE_INT);
CProfile::update('mnz.host_report.filter.host', $host_filter, PROFILE_TYPE_STR);

// Remover preferência (logout, reset)
CProfile::delete('mnz.host_report.filter.severity');
```

**Tipos suportados (`$type`):**
- `PROFILE_TYPE_INT`
- `PROFILE_TYPE_STR`
- `PROFILE_TYPE_ID` (IDs de DB)

**Convenção de chave:** `mnz.<modulo>.<contexto>.<campo>` (lowercase, ponto-separado).

## 5. CWebUser — permissões e identidade

Use `CWebUser` em vez de acessar `$this->getUserType()` direto:

```php
// CERTO
if (CWebUser::isGuest()) { return false; }
$user_id = CWebUser::getId();
$user_type = CWebUser::getType();

if (!CWebUser::checkAccess(CRoleHelper::UI_REPORTS_ACTION_LOG)) {
    return false;
}

// Em checkPermissions() de actions
protected function checkPermissions(): bool {
    if (CWebUser::isGuest()) {
        return false;
    }
    return CWebUser::getType() >= USER_TYPE_ZABBIX_USER;
}
```

**Métodos importantes:**
- `CWebUser::isGuest()` — true se usuário guest/não autenticado
- `CWebUser::getId()` — userid do logado
- `CWebUser::getType()` — USER_TYPE_USER / _ZABBIX_USER / _ZABBIX_ADMIN / _SUPER_ADMIN
- `CWebUser::checkAccess($rule)` — permissão fina via `CRoleHelper::UI_*`
- `CWebUser::$data` — array com dados completos (`userid`, `username`, `name`, `surname`, `lang`, `theme`, `roleid`, etc.)

## 6. JavaScript dos módulos em `views/js/`

**Para módulos genéricos** (não-widgets): JS deve ficar em `views/js/*.js.php` e ser incluído via `$this->includeJsFile()` na view.

```
my_module/
├── manifest.json
├── Module.php
├── actions/
│   └── HostReportView.php
└── views/
    ├── host.report.view.php
    └── js/
        └── host.report.view.js.php   ← JS aqui
```

Na view PHP:
```php
// no final da view, após $this->show()
$this->includeJsFile('js/host.report.view.js.php');
```

Conteúdo do `.js.php`:
```php
<?php declare(strict_types = 0); ?>
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        const root = document.querySelector('.mnz-host-report');
        if (!root) return;

        // lógica aqui
    });
})();
```

**Por que `.js.php`?** Permite injetar variáveis traduzidas (`<?= _('Loading...') ?>`) e config dinâmica do servidor.

**EXCEÇÃO — widgets:** widgets continuam com JS em `assets/js/class.widget.js` (estendendo `CWidget`). Esta regra **não se aplica** a widgets.

## 7. Rodapé "Developed by MonZphere"

**Obrigatório em todas as views de modules** (full pages). Adicionar como último item antes de `->show()`:

```php
$footer = (new CDiv(_('Developed by MonZphere')))
    ->addClass('mnz-footer');

(new CHtmlPage())
    ->setTitle(_('Host report'))
    ->addItem($main_content)
    ->addItem($footer)
    ->show();
```

CSS sugerido:
```css
.mnz-footer {
    margin-top: 24px;
    padding: 12px 0;
    text-align: center;
    color: var(--font-color-secondary);
    font-size: 0.85em;
    border-top: 1px solid var(--border-color);
}
```

**EXCEÇÃO — widgets:** widgets são embedded em dashboards e não devem ter o rodapé. Esta regra **não se aplica** a widgets.

## Checklist rápido

Antes de finalizar qualquer module/widget:

```
[ ] Todas as classes CSS de div têm prefixo .mnz-
[ ] Nenhuma cor hardcoded em CSS (usar var(--*))
[ ] Todas as strings visíveis usam _() ou _s()
[ ] Estados persistentes usam CProfile (não session)
[ ] Permissões via CWebUser::checkAccess / CWebUser::getType
[ ] (Module) JS em views/js/<name>.view.js.php
[ ] (Module) Footer "Developed by MonZphere" no final
[ ] (Widget) JS em assets/js/class.widget.js
```
