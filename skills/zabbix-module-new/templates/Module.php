<?php declare(strict_types = 0);

namespace {{NAMESPACE}};

use Zabbix\Core\CModule,
    APP,
    CMenuItem;

class Module extends CModule {

    public function init(): void {
        APP::Component()->get('menu.main')
            ->findOrAdd(_('{{MENU_SECTION}}'))
            ->getSubmenu()
            ->add((new CMenuItem(_('{{MENU_LABEL}}')))
                ->setAction('{{ACTION_KEY}}.view')
            );
    }

    public function getTranslationStrings(): array {
        return [
            'class.{{MODULE_ID}}.js' => [
                'No data' => _('No data'),
                'Loading...' => _('Loading...')
            ]
        ];
    }
}
