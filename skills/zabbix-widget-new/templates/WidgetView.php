<?php declare(strict_types = 0);

namespace {{NAMESPACE}}\Actions;

use API,
    CControllerDashboardWidgetView,
    CControllerResponseData;

class WidgetView extends CControllerDashboardWidgetView {

    protected function doAction(): void {
        // $this->fields_values vem do CWidgetForm
        // $this->widget é a instância CWidget
        // $this->isTemplateDashboard() detecta dashboard de template

        $hosts = API::Host()->get([
            'output' => ['hostid', 'name', 'status'],
            'groupids' => $this->fields_values['groupids'] ?? null,
            'limit' => $this->fields_values['limit'] ?? 10
        ]);

        $this->setResponse(new CControllerResponseData([
            'name' => $this->getInput('name', $this->widget->getDefaultName()),
            'hosts' => $hosts,
            'user' => ['debug_mode' => $this->getDebugMode()]
        ]));
    }
}
