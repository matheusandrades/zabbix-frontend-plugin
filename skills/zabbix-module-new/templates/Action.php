<?php declare(strict_types = 0);

namespace {{NAMESPACE}}\Actions;

use CController as CAction,
    CControllerResponseData,
    CControllerResponseFatal,
    CWebUser,
    CProfile,
    CRoleHelper,
    API;

class {{ACTION_CLASS}}View extends CAction {

    public function init(): void {
        // Apenas para GET puro idempotente. POSTs nunca devem desabilitar CSRF.
        $this->disableCsrfValidation();
    }

    protected function checkInput(): bool {
        $fields = [
            // 'hostid' => 'db hosts.hostid',
            // 'severity' => 'in 0,1,2,3,4,5'
        ];

        $ret = $this->validateInput($fields);
        if (!$ret) {
            $this->setResponse(new CControllerResponseFatal());
        }
        return $ret;
    }

    protected function checkPermissions(): bool {
        if (CWebUser::isGuest()) {
            return false;
        }
        return CWebUser::getType() >= USER_TYPE_ZABBIX_USER;
    }

    protected function doAction(): void {
        // Recuperar preferências persistidas do usuário
        $severity = (int) CProfile::get('mnz.{{MODULE_ID}}.filter.severity', 0);

        // Persistir input atual (se vier via request)
        if ($this->hasInput('severity')) {
            $severity = (int) $this->getInput('severity');
            CProfile::update('mnz.{{MODULE_ID}}.filter.severity', $severity, PROFILE_TYPE_INT);
        }

        $hosts = API::Host()->get([
            'output' => ['hostid', 'name', 'status'],
            'limit' => 100
        ]);

        $data = [
            'hosts' => $hosts,
            'severity' => $severity
        ];

        $response = new CControllerResponseData($data);
        $response->setTitle(_('{{PAGE_TITLE}}'));
        $this->setResponse($response);
    }
}
