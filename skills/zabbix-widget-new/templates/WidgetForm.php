<?php declare(strict_types = 0);

namespace {{NAMESPACE}}\Includes;

use Zabbix\Widgets\{CWidgetField, CWidgetForm};
use Zabbix\Widgets\Fields\{
    CWidgetFieldCheckBox,
    CWidgetFieldIntegerBox,
    CWidgetFieldMultiSelectGroup,
    CWidgetFieldRadioButtonList,
    CWidgetFieldSeverities,
    CWidgetFieldTextBox
};

use {{NAMESPACE}}\Widget;

class WidgetForm extends CWidgetForm {

    public function addFields(): self {
        return $this
            ->addField(
                (new CWidgetFieldRadioButtonList('show', _('Show'), [
                    Widget::SHOW_HOSTS  => _('Hosts'),
                    Widget::SHOW_GROUPS => _('Host groups')
                ]))->setDefault(Widget::SHOW_HOSTS)
            )
            ->addField(
                (new CWidgetFieldMultiSelectGroup('groupids', _('Host groups')))
                    ->setFlags(CWidgetField::FLAG_NOT_EMPTY | CWidgetField::FLAG_LABEL_ASTERISK)
            )
            ->addField(
                (new CWidgetFieldSeverities('severities', _('Severity')))
            )
            ->addField(
                (new CWidgetFieldIntegerBox('limit', _('Show top'), 1, 100))
                    ->setDefault(10)
            );
    }

    public function validate(bool $strict = false): array {
        $errors = parent::validate($strict);
        if ($errors) return $errors;

        if ($strict && !$this->getFieldValue('groupids')) {
            $errors[] = _s('Invalid parameter "%1$s": %2$s.',
                _('Host groups'), _('cannot be empty'));
        }

        return $errors;
    }
}
