class CWidget{{WIDGET_CLASS}} extends CWidget {

    onInitialize() {
        super.onInitialize();
    }

    onActivate() {
        super.onActivate();
    }

    onDeactivate() {
        super.onDeactivate();
    }

    onResize() {
        if (!this._has_contents) {
            return;
        }
        // Ajustes de tamanho relativos
    }

    getUpdateRequestData() {
        return {
            ...super.getUpdateRequestData(),
            // Dados extras a enviar ao action
        };
    }

    processUpdateResponse(response) {
        super.processUpdateResponse(response);
        // Hook customizado pós-update
    }

    hasPadding() {
        return true;
    }

    // Para receber broadcast de outros widgets:
    // onFeedback({type, value}) {
    //     if (type === '_timeperiod') {
    //         this._time_period = value;
    //         this._startUpdating();
    //     }
    // }
}
