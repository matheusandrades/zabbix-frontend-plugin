<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$table = (new CTableInfo())
    ->setHeader([
        _('Host'),
        _('Status')
    ])
    ->setNoDataMessage(_('No data found'));

foreach ($data['hosts'] as $host) {
    $status_span = $host['status'] == HOST_STATUS_MONITORED
        ? (new CSpan(_('Enabled')))->addClass(ZBX_STYLE_GREEN)
        : (new CSpan(_('Disabled')))->addClass(ZBX_STYLE_RED);

    $table->addRow([
        $host['name'],
        $status_span
    ]);
}

(new CHtmlPage())
    ->setTitle(_('{{PAGE_TITLE}}'))
    ->addItem($table)
    ->show();
