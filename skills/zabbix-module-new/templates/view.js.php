<?php declare(strict_types = 0); ?>
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        const root = document.querySelector('.mnz-{{MODULE_ID}}');
        if (!root) {
            return;
        }

        // Inicialização do módulo aqui

        // Exemplo: handler de filtro
        const filter = root.querySelector('.mnz-{{MODULE_ID}}-filter');
        if (filter) {
            filter.addEventListener('submit', function(e) {
                // ...
            });
        }
    });
})();
