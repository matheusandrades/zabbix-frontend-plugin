<?php declare(strict_types = 0);

namespace {{NAMESPACE}};

use Zabbix\Core\CWidget;

class Widget extends CWidget {

    // Constantes específicas do domínio
    public const SHOW_HOSTS = 0;
    public const SHOW_GROUPS = 1;

    public function getDefaultName(): string {
        return _('{{WIDGET_NAME}}');
    }

    // Override opcional:
    // public function getDefaultSize(): array {
    //     return ['width' => 12, 'height' => 5];
    // }

    // public function getDefaultRefreshRate(): int {
    //     return 60;
    // }
}
