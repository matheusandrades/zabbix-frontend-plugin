---
name: zabbix-action-new
description: Cria action (controller) Zabbix CController com checkInput/checkPermissions/doAction validados, validação CNewValidator, acesso seguro via API::Foo()->get(), CSRF, response types corretos. Use quando o usuário pedir "criar action Zabbix", "controller Zabbix", "endpoint Zabbix" ou adicionar comportamento server-side a um módulo.
allowed-tools: Read, Write, Edit, Glob, Bash
---

# Criar Action (Controller) Zabbix

## REGRAS MONZPHERE (OBRIGATÓRIAS)

Aplique em toda action gerada:

1. **`CWebUser` para permissões** (não `$this->getUserType()` direto):
   ```php
   protected function checkPermissions(): bool {
       if (CWebUser::isGuest()) return false;
       return CWebUser::getType() >= USER_TYPE_ZABBIX_USER
           && CWebUser::checkAccess(CRoleHelper::UI_MONITORING_HOSTS);
   }
   ```
2. **`CProfile` para estado persistente** (filtros, paginação) com chave `mnz.<modulo>.<campo>`:
   ```php
   $severity = CProfile::get('mnz.host_report.filter.severity', 0);
   CProfile::update('mnz.host_report.filter.severity', $severity, PROFILE_TYPE_INT);
   ```
3. **i18n** — `_()` em mensagens de erro/sucesso, `_s()` em placeholders
4. **CSRF habilitado** em qualquer action que muta dados (NÃO chame `disableCsrfValidation()` em POST)
5. Sempre via `API::*->get()` — zero SQL bruto

Referência completa: `docs/MONZPHERE-STANDARDS.md`.

---

Toda interação dinâmica no frontend Zabbix passa por uma `Action` — uma classe que estende `CController`. É o "controller" do MVC.

## 1. Padrão de fluxo

```
HTTP request → CController.__construct() → init()
            → checkInput()        (valida HTTP input)
            → checkPermissions()  (autorização)
            → doAction()          (lógica)
            → setResponse(...)    (retorno)
```

Toda action deve implementar os 3 métodos protected: `checkInput()`, `checkPermissions()`, `doAction()`.

## 2. Estrutura básica

```php
<?php declare(strict_types = 0);

namespace Acme\HostReport\Actions;

use CController as CAction,
    CControllerResponseData,
    CControllerResponseFatal,
    CControllerResponseRedirect,
    API;

class HostReportEdit extends CAction {

    public function init(): void {
        // Apenas para GET puro idempotente
        // POSTs MUNCA devem desabilitar CSRF
        // $this->disableCsrfValidation();
    }

    protected function checkInput(): bool {
        $fields = [
            'hostid'   => 'db hosts.hostid',
            'name'     => 'string|not_empty|max_length:255',
            'status'   => 'in '.implode(',', [HOST_STATUS_MONITORED, HOST_STATUS_NOT_MONITORED]),
            'tags'     => 'array',
            'severity' => 'in 0,1,2,3,4,5'
        ];

        $ret = $this->validateInput($fields);
        if (!$ret) {
            $this->setResponse(new CControllerResponseFatal());
        }
        return $ret;
    }

    protected function checkPermissions(): bool {
        if ($this->getUserType() < USER_TYPE_ZABBIX_USER) {
            return false;
        }

        // Verificar acesso ao recurso específico
        if ($this->hasInput('hostid')) {
            $hosts = API::Host()->get([
                'output' => [],
                'hostids' => $this->getInput('hostid')
            ]);
            return (bool) $hosts;
        }

        return true;
    }

    protected function doAction(): void {
        $data = [
            'hostid' => $this->getInput('hostid', 0),
            'name' => $this->getInput('name', ''),
            'status' => $this->getInput('status', HOST_STATUS_MONITORED)
        ];

        $response = new CControllerResponseData($data);
        $response->setTitle(_('Host edit'));
        $this->setResponse($response);
    }
}
```

## 3. Tipos de validação em `validateInput()`

| Sintaxe | Comportamento |
|---|---|
| `'db hosts.hostid'` | Valida tipo conforme schema da coluna |
| `'string'` | String |
| `'string\|not_empty'` | Não vazia |
| `'string\|max_length:255'` | Limite de tamanho |
| `'int32'` | Inteiro 32 bits |
| `'id'` | ID válido (positivo) |
| `'array'` | Array |
| `'array_db hosts.name'` | Array de strings db-tipados |
| `'in 0,1,2,3'` | Valor em conjunto |
| `'in '.implode(',', [...])` | Mesmo, dinâmico |
| `'fatal'` | Em falha, fatal direto |
| `'required'` | Obrigatório |

Combinar com `|`: `'string|not_empty|max_length:255'`.

## 4. Tipos de Response

### CControllerResponseData — render view

```php
$response = new CControllerResponseData([
    'hosts' => $hosts,
    'count' => count($hosts)
]);
$response->setTitle(_('Hosts'));
$response->setFileName('hosts.html');  // opcional
$this->setResponse($response);
```

A view executada é definida pelo `manifest.json:actions.<name>.view`.

### CControllerResponseFatal — erro fatal

```php
$response = new CControllerResponseFatal();
$response->addMessage(_('Cannot delete: host is in use'));
$this->setResponse($response);
```

Mostra página de erro 500-style.

### CControllerResponseRedirect — redirect

```php
$response = new CControllerResponseRedirect(
    (new CUrl('zabbix.php'))
        ->setArgument('action', 'host.list')
        ->getUrl()
);
$response->setMessageOk(_s('Host "%1$s" updated', $name));
$this->setResponse($response);
```

Usa flash messages (`setMessageOk`/`setMessageError`).

### Resposta JSON (AJAX) — Zabbix 7.0+

```php
$response = (new CControllerResponseData(['main_block' => json_encode([
    'success' => true,
    'data' => $items
])]))->disableView();

$this->setResponse($response);
```

`->disableView()` retorna apenas `main_block` — usado por AJAX.

## 5. CSRF Tokens — REGRAS DE SEGURANÇA

| Cenário | Comportamento |
|---|---|
| Action POST que modifica dados | **CSRF habilitado** (default). Form deve incluir `<input type="hidden" name="_csrf_token" value="...">` |
| Action GET idempotente (apenas leitura, sem efeitos) | OK chamar `$this->disableCsrfValidation()` no `init()` |
| Action GET que modifica dados | **NÃO** desabilite CSRF. Refatore para POST |
| Action de download/export | OK desabilitar (read-only) |

`$validate_csrf_token` é `true` por default em `CController`. Nunca mude isso globalmente.

## 6. Permissões — checkPermissions()

```php
protected function checkPermissions(): bool {
    // Tipo de usuário
    if ($this->getUserType() < USER_TYPE_ZABBIX_ADMIN) {
        return false;
    }

    // Permissão fina via CRoleHelper
    if (!$this->checkAccess(CRoleHelper::UI_REPORTS_ACTION_LOG)) {
        return false;
    }

    // Acesso a recurso específico
    if ($this->hasInput('hostid')) {
        $allowed = API::Host()->get([
            'output' => [],
            'hostids' => $this->getInput('hostid')
        ]);
        if (!$allowed) return false;
    }

    return true;
}
```

**Constantes de tipo:**
- `USER_TYPE_USER` = 1
- `USER_TYPE_ZABBIX_USER` = 1
- `USER_TYPE_ZABBIX_ADMIN` = 2
- `USER_TYPE_SUPER_ADMIN` = 3

## 7. Acesso a dados — sempre via API::*

NUNCA faça SQL bruto:

```php
// ERRADO
$result = DBfetchArray(DBselect('SELECT * FROM hosts WHERE hostid='.$id));

// CERTO
$result = API::Host()->get([
    'output' => ['hostid', 'name', 'status'],
    'hostids' => [$id]
]);
```

APIs comuns:
- `API::Host()` — hosts
- `API::HostGroup()` — grupos
- `API::Item()` — items
- `API::Problem()` — problemas
- `API::Trigger()` — triggers
- `API::Event()` — eventos
- `API::User()` — users
- `API::Action()` — actions de alerting
- `API::Dashboard()` — dashboards
- `API::Map()` — maps
- `API::Template()` — templates
- `API::Macro()` / `API::UserMacro()` — macros

Para histórico/dados de séries temporais:

```php
$last = Manager::History()->getLastValues([$item], 1, ZBX_HISTORY_PERIOD);
```

## 8. Helpers úteis em CController

| Método | Uso |
|---|---|
| `$this->getInput($name, $default)` | Lê input validado |
| `$this->hasInput($name)` | Existe? |
| `$this->getUserType()` | Tipo do usuário logado |
| `$this->getDebugMode()` | Debug ativo? |
| `$this->checkAccess($rule)` | Permissão fina |
| `$this->validateTimeSelectorPeriod()` | Valida from/to time selector |
| `CWebUser::$data['userid']` | ID do usuário logado |

## 9. Registrar action no manifest.json

```json
{
    "actions": {
        "host.report.view": {
            "class": "HostReportView",
            "view": "host.report.view",
            "layout": "layout.htmlpage"
        },
        "host.report.update": {
            "class": "HostReportUpdate"
        }
    }
}
```

- `class` — sem namespace, apenas o nome (Zabbix descobre via `namespace` do módulo)
- `view` — nome do arquivo em `views/` sem `.php`. Omitir para AJAX-only
- `layout` — `layout.htmlpage` (full page) ou omitir para AJAX

## 10. Exemplo: action AJAX completa

```php
<?php declare(strict_types = 0);

namespace Acme\HostReport\Actions;

use CController as CAction,
    CControllerResponseData,
    API;

class HostReportData extends CAction {

    protected function init(): void {
        $this->setPostContentType(self::POST_CONTENT_TYPE_JSON);
    }

    protected function checkInput(): bool {
        return $this->validateInput([
            'groupid' => 'db hosts_groups.groupid|required'
        ]);
    }

    protected function checkPermissions(): bool {
        return $this->getUserType() >= USER_TYPE_ZABBIX_USER;
    }

    protected function doAction(): void {
        $hosts = API::Host()->get([
            'output' => ['hostid', 'name'],
            'groupids' => [$this->getInput('groupid')],
            'limit' => 100
        ]);

        $this->setResponse(
            (new CControllerResponseData(['main_block' => json_encode([
                'hosts' => $hosts
            ])]))->disableView()
        );
    }
}
```

## 11. Checklist final

```
[ ] init() não desabilita CSRF se action modifica dados
[ ] checkInput() retorna bool e seta response em falha
[ ] checkInput() valida TODOS os inputs lidos em doAction()
[ ] checkPermissions() valida tipo + acesso ao recurso
[ ] doAction() usa apenas API::*->get() (zero SQL bruto)
[ ] Strings traduzíveis usam _() ou _s()
[ ] setResponse() é chamado em todos os caminhos
[ ] Action registrada no manifest.json:actions
```

## Fontes oficiais

- https://www.zabbix.com/documentation/current/en/devel/modules/file_structure/actions
- Código-fonte: `ui/include/classes/mvc/CController.php`
