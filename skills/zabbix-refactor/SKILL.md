---
name: zabbix-refactor
description: Refatora módulo Zabbix legado para padrão atual — migração 6.0→7.0, manifest_version 1.0→2.0, atualização de extends (CWidget novo, CControllerDashboardWidgetView), conversão de widgets hardcoded para módulos, adoção de broadcast (in/out). Use quando o usuário pedir "atualizar módulo antigo", "migrar Zabbix", "modernizar código". REQUER LICENÇA PRO.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Refatorar Módulo Zabbix Legado

**Skill premium (Pro+).** Valide licença antes via MCP `license-validator.validate_license`.

Este skill atualiza código Zabbix de versões anteriores para o padrão atual (7.0+).

## 1. Detectar versão de origem

Sinais de cada versão:

### Zabbix 6.0 (legado)
- `manifest_version: 1.0` ou ausente
- Sem suporte a widgets como módulos
- Module.php usa `Core\Module` (namespace antigo) em vez de `Zabbix\Core\CModule`
- Actions estendem `CController` mas com sintaxe pré-PHP 7.4 (sem property types)

### Zabbix 6.4
- `manifest_version: 2.0` adotado
- Widgets como módulos surgem
- `Zabbix\Widgets\CWidgetForm` introduzido
- Sem `widget.in` / `widget.out`

### Zabbix 7.0+ (atual)
- `widget.in` / `widget.out` para broadcast entre widgets
- `template_support` no manifest
- `CControllerDashboardWidgetView` consolidado
- `CFormValidator` server + JS simétrico

## 2. Migrações comuns

### 2.1 manifest_version 1.0 → 2.0

```diff
 {
-    "manifest_version": 1.0,
+    "manifest_version": 2.0,
     "id": "my_module",
     "name": "My Module",
     "namespace": "MyModule",
     "version": "1.0.0",
     "actions": {
         "my.module.view": {
             "class": "MyView",
-            "layout": "layout.htmlpage",
             "view": "my.module.view"
         }
     }
 }
```

Mudanças:
- `manifest_version` para `2.0`
- `layout: layout.htmlpage` é default — pode omitir
- Para widgets: adicionar bloco `widget` se ainda não existir

### 2.2 Module.php — namespace e classe base

```diff
-namespace Modules\MyModule;
+namespace MyModule;
-
-use Core\Module;
+use Zabbix\Core\CModule;

-class Module extends Module {
+class Module extends CModule {

     public function init(): void {
-        APP::Component()->get('menu.main')
+        APP::Component()->get('menu.main')
             ->add(...);
     }
 }
```

### 2.3 Widget hardcoded (6.0) → módulo widget (7.0)

Em 6.0, widgets viviam em `ui/include/classes/widgets/`. Para virar módulo:

1. Criar diretório `ui/widgets/<id>/`
2. Mover/converter classes para nova estrutura:

```
Antes (6.0):
ui/include/classes/widgets/CWidgetMyData.php           → Widget.php
ui/include/classes/widgets/forms/CWidgetFormMyData.php → includes/WidgetForm.php
ui/app/controllers/CControllerWidgetMyDataView.php     → actions/WidgetView.php
ui/app/views/monitoring.widget.mydata.view.php         → views/widget.view.php
ui/js/widgets/class.widget.mydata.js                   → assets/js/class.widget.js

Depois (7.0):
ui/widgets/my_data/
├── manifest.json     (criar)
├── Widget.php
├── includes/WidgetForm.php
├── actions/WidgetView.php
├── views/widget.view.php
└── assets/js/class.widget.js
```

### 2.4 CWidget extends — antes vs. depois

```diff
-namespace Zabbix\Widgets;
-
-use Zabbix\Widgets\CWidget;
-
-class CWidgetMyData extends CWidget {
+namespace MyData;
+
+use Zabbix\Core\CWidget;
+
+class Widget extends CWidget {

-    public function getDefaultName() {
+    public function getDefaultName(): string {
         return _('My Data');
     }
 }
```

### 2.5 CWidgetForm — adicionar `addFields()`

Em 6.4, fields eram declarados em construtor:

```diff
 class WidgetForm extends CWidgetForm {

-    public function __construct($data, $templateid) {
-        parent::__construct($data, $templateid);
-        $this->fields = [...];  // declaração antiga
-    }

+    public function addFields(): self {
+        return $this
+            ->addField(new CWidgetFieldSelect('mode', _('Mode'), [...]))
+            ->addField(new CWidgetFieldMultiSelectItem('itemid', _('Item')));
+    }
 }
```

### 2.6 CControllerWidget* → CControllerDashboardWidgetView

```diff
-class CControllerWidgetMyDataView extends CControllerWidget {
-    public function __construct() {
-        parent::__construct();
-        $this->setValidationRules([...]);
-    }
+class WidgetView extends CControllerDashboardWidgetView {
+    // checkInput / checkPermissions herdados

     protected function doAction(): void {
-        $fields = $this->getForm()->getFieldsData();
+        // $this->fields_values é populado automaticamente
-        $items = API::Item()->get([..., 'itemids' => $fields['itemid']]);
+        $items = API::Item()->get([..., 'itemids' => $this->fields_values['itemid']]);

         $this->setResponse(new CControllerResponseData([
             'name' => $this->getInput('name', $this->widget->getDefaultName()),
             'data' => $items,
             'user' => ['debug_mode' => $this->getDebugMode()]
         ]));
     }
 }
```

### 2.7 Adoção de broadcast (Zabbix 7.0+)

Se o widget consome dado de outro (ex: time_period selecionado num filtro):

```diff
 {
     "widget": {
         "size": {"width": 12, "height": 5},
+        "in": {
+            "time_period": {"type": "_timeperiod"}
+        }
     }
 }
```

E no JS:

```diff
 class CWidgetMyData extends CWidget {
+    onFeedback({type, value}) {
+        if (type === '_timeperiod') {
+            this._time_period = value;
+            this._startUpdating();
+        }
+    }
 }
```

### 2.8 Migração SQL bruto → API

Procure `DBselect`, `DBfetch`, `DB::*`:

```diff
-$result = DBselect('SELECT hostid,name FROM hosts WHERE status='.HOST_STATUS_MONITORED);
-while ($row = DBfetch($result)) {
-    $hosts[] = $row;
-}

+$hosts = API::Host()->get([
+    'output' => ['hostid', 'name'],
+    'filter' => ['status' => HOST_STATUS_MONITORED]
+]);
```

### 2.9 i18n — strings literais → `_()`

```diff
-$title = 'Hosts overview';
+$title = _('Hosts overview');

-$msg = 'Host '.$name.' deleted';
+$msg = _s('Host "%1$s" deleted', $name);
```

### 2.10 declare(strict_types)

Padrão Zabbix 7.0+:

```diff
-<?php
+<?php declare(strict_types = 0);
```

## 3. Workflow de refactor

```
1. Detectar versão de origem (analisar manifest.json + extends)
2. Backup automático: cp -r module_dir module_dir.backup
3. Aplicar migrations 2.1 → 2.10 em ordem
4. Re-rodar `zabbix-validate` skill
5. Apresentar diff resumido ao usuário
6. Se OK, manter; senão restaurar do backup
```

## 4. Comandos úteis

### Detectar versão de origem
```bash
manifest_v=$(python3 -c "import json; print(json.load(open('manifest.json')).get('manifest_version', 1.0))")
echo "manifest_version: $manifest_v"

# Detectar uso de classes legadas
grep -rn "use Core\\\\Module" --include="*.php" | head -5
grep -rn "extends CControllerWidget[^V]" --include="*.php" | head -5
```

### Backup
```bash
target=$(basename "$PWD")
cp -r "$PWD" "../${target}.backup-$(date +%Y%m%d)"
```

### Validar pós-refactor
```bash
find . -name "*.php" -exec php -l {} \;
python3 -c "import json; json.load(open('manifest.json'))"
```

## 5. Relatório final

```
═══ MIGRAÇÃO ZABBIX REFACTOR ═══
Origem detectada: Zabbix 6.0 (manifest 1.0)
Destino: Zabbix 7.0 (manifest 2.0)

ARQUIVOS MIGRADOS:
✓ manifest.json — manifest_version 1.0 → 2.0
✓ Module.php — namespace + extends CModule (Zabbix\Core)
✓ Widget.php — extends CWidget (Zabbix\Core)
✓ includes/WidgetForm.php — addFields() em vez de __construct
✓ actions/WidgetView.php — extends CControllerDashboardWidgetView
✓ views/widget.view.php — CWidgetView em vez de raw HTML

MIGRAÇÕES APLICADAS:
- 7 strings agora usam _()/_s()
- 3 chamadas DBselect substituídas por API::*
- declare(strict_types = 0) adicionado em 5 arquivos
- N+1 eliminado em WidgetView (1+12 → 1 query)

NÃO MIGRADO (revisar manualmente):
- assets/js/class.widget.js linha 87 — chamada legacy `widget.refresh()` (deprecated)
- views/widget.edit.php — uso de table HTML em vez de CFormGrid

BACKUP: ../my_module.backup-20260426/
```
