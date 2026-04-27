<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$rows = [];
foreach ($data['hosts'] as $host) {
    $rows[] = (new CRow([
        $host['name'],
        $host['status'] == HOST_STATUS_MONITORED
            ? (new CSpan(_('Enabled')))->addClass(ZBX_STYLE_GREEN)
            : (new CSpan(_('Disabled')))->addClass(ZBX_STYLE_RED)
    ]));
}

$table = (new CTableInfo())
    ->addClass('mnz-widget-{{ID_WITH_HYPHENS}}__table')
    ->setHeader([_('Host'), _('Status')])
    ->setNoDataMessage(_('No data found'));

foreach ($rows as $row) {
    $table->addRow($row);
}

(new CWidgetView($data))
    ->addItem($table)
    ->show();
