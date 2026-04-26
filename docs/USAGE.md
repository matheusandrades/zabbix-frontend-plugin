# Como usar

## Criar um módulo Zabbix

### Por skill automática
Apenas peça em linguagem natural:

```
> Cria um módulo Zabbix que mostra um relatório de hosts críticos por grupo
```

A skill `zabbix-module-new` é invocada automaticamente.

### Por slash command
```bash
/zabbix-new module host_report
```

## Criar um widget Zabbix dashboard

```
> Cria um widget que mostra os 10 hosts com mais problemas críticos abertos
```

Ou:

```bash
/zabbix-new widget problem_top
```

A skill `zabbix-widget-new` é ativada e gera:

- `manifest.json` (type: widget)
- `Widget.php` (extends CWidget)
- `includes/WidgetForm.php` (CWidgetForm com fields)
- `actions/WidgetView.php` (CControllerDashboardWidgetView)
- `views/widget.view.php` (CWidgetView render)
- `assets/js/class.widget.js` (extends CWidget JS)
- `assets/css/widget.css` (com prefixos corretos)

## Validar código existente

```bash
/zabbix-validate
```

Ou em qualquer mensagem:

```
> Valida esse módulo contra padrões oficiais Zabbix
```

Saída:

```
═══ ZABBIX VALIDATOR ═══
Módulo: acme.host_report v1.0.0
✓ 18 verificações passadas
⚠ 3 avisos
✗ 0 falhas

═══ Avisos ═══
1. views/host.list.view.php:34 — concatenação HTML detectada
...
```

## Refatorar código legado (Pro)

```
> Migra este módulo de Zabbix 6.0 para 7.0
```

A skill `zabbix-refactor` aplica:

- `manifest_version: 1.0` → `2.0`
- `Core\Module` → `Zabbix\Core\CModule`
- Widgets hardcoded → módulos widget
- `CControllerWidget*` → `CControllerDashboardWidgetView`
- SQL bruto → `API::*->get()`
- Strings → `_()` / `_s()`

## Aplicar best practices (Pro)

```
> Aplica boas práticas oficiais Zabbix neste código
```

A skill `zabbix-best-practices` faz:

1. **Segurança** — restaura CSRF onde necessário, refina permissões
2. **Performance** — elimina N+1, output cirúrgico, `Manager::History()`
3. **Código** — magic numbers → constantes Zabbix, i18n consistente
4. **Acessibilidade** — ARIA labels, labels em forms

## Consultar o arquiteto (Pro)

Para decisões de design:

```
> Use o agent zabbix-architect: tenho 3 widgets que filtram por host group.
> Devo usar broadcast ou URL params?
```

## Otimizar performance (Pro)

```
> Use o agent zabbix-optimizer: o widget Top Hosts está demorando 2.3s
> em dashboard com 1000 hosts. Otimiza.
```

## Verificar licença

```bash
/zabbix-license status      # mostra plano atual
/zabbix-license CHAVE       # registra nova chave
/zabbix-license logout      # remove chave (volta a Free)
```

## Configurações por skill

Cada skill respeita `zabbix_version` configurada no plugin:

- `6.0` → manifest_version 1.0, sem widgets como módulos
- `6.4` → manifest_version 2.0, widgets como módulos
- `7.0` → adiciona broadcast (in/out), `template_support`
- `7.2` → CFormValidator simétrico

## Hooks automáticos

Com `auto_validate: true` (default), cada `Write`/`Edit` em arquivo dentro de um módulo Zabbix roda validações:

- Sintaxe PHP/JS
- CSRF + mutações
- SQL bruto
- `$_GET`/`$_POST` direto
- Cores hardcoded em CSS
- JSON inválido em manifest

Para desabilitar:

```bash
/plugin config zabbix-frontend
# Desmarcar auto_validate
```

## FAQ rápido

**P: O plugin precisa de internet?**
R: Apenas para validar licença (1x na sessão, com cache de 5 min). Skills funcionam offline com tier detectado em cache.

**P: Posso usar com Zabbix 5.x?**
R: Não. Plugin suporta 6.0+. Para 5.x, abra issue.

**P: Como debuggar uma skill?**
R: Use `/plugin debug zabbix-frontend skill <skill-name>`.

**P: Posso usar em mais de uma máquina?**
R: Free: até 5 dispositivos. Pro: até 10. Enterprise: ilimitado. Detecção via fingerprint anônimo.
