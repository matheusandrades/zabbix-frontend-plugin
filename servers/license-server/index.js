#!/usr/bin/env node
/**
 * MCP server de validação de licença para o plugin Zabbix Frontend.
 *
 * Expõe ferramentas:
 *   - validate_license: confirma licença ativa contra backend
 *   - check_feature_access: verifica se feature específica está liberada no plano
 *
 * Backend esperado em ZABBIX_PLUGIN_API_URL (default https://api.zabbix-frontend.dev)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.ZABBIX_PLUGIN_API_URL || "https://api.zabbix-frontend.dev";
const ENV_LICENSE = process.env.LICENSE_KEY || "";

// Cache em memória — evita hit no backend a cada call
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const TIER_FEATURES = {
    free: [
        "zabbix-module-new",
        "zabbix-widget-new",
        "zabbix-action-new",
        "zabbix-view-new",
        "zabbix-validate",
    ],
    pro: [
        "zabbix-module-new",
        "zabbix-widget-new",
        "zabbix-action-new",
        "zabbix-view-new",
        "zabbix-validate",
        "zabbix-best-practices",
        "zabbix-refactor",
        "zabbix-architect",
        "zabbix-optimizer",
    ],
    enterprise: [
        "zabbix-module-new",
        "zabbix-widget-new",
        "zabbix-action-new",
        "zabbix-view-new",
        "zabbix-validate",
        "zabbix-best-practices",
        "zabbix-refactor",
        "zabbix-architect",
        "zabbix-optimizer",
        "custom-templates",
        "multi-version-support",
        "schema-validation",
    ],
};

async function callBackend(licenseKey) {
    if (!licenseKey) {
        return { valid: false, tier: "free", reason: "no-key" };
    }

    const cached = cache.get(licenseKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.data;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${API_URL}/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ license_key: licenseKey }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            return { valid: false, tier: "free", reason: `http-${res.status}` };
        }

        const data = await res.json();
        cache.set(licenseKey, { ts: Date.now(), data });
        return data;
    } catch (err) {
        return {
            valid: false,
            tier: "free",
            reason: err.name === "AbortError" ? "timeout" : `error:${err.message}`,
        };
    }
}

const server = new Server(
    {
        name: "zabbix-frontend-license-validator",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "validate_license",
            description:
                "Valida a chave de licença contra o backend. Retorna {valid, tier, expires_at, features}. Use no início de skills premium para verificar autorização.",
            inputSchema: {
                type: "object",
                properties: {
                    license_key: {
                        type: "string",
                        description:
                            "Chave de licença. Se omitida, usa a configurada em LICENSE_KEY.",
                    },
                },
                required: [],
            },
        },
        {
            name: "check_feature_access",
            description:
                "Verifica se uma feature específica (skill, agent) está disponível no plano atual. Retorna {allowed, tier, required_tier}.",
            inputSchema: {
                type: "object",
                properties: {
                    feature: {
                        type: "string",
                        description:
                            "Nome da feature (ex: 'zabbix-best-practices', 'zabbix-refactor', 'zabbix-optimizer').",
                    },
                    license_key: {
                        type: "string",
                        description: "Chave de licença (opcional, usa env se omitida).",
                    },
                },
                required: ["feature"],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "validate_license") {
        const key = args?.license_key || ENV_LICENSE;
        const result = await callBackend(key);

        const features = TIER_FEATURES[result.tier] || TIER_FEATURES.free;

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        valid: result.valid,
                        tier: result.tier,
                        expires_at: result.expires_at || null,
                        features,
                        reason: result.reason,
                    }),
                },
            ],
        };
    }

    if (name === "check_feature_access") {
        const feature = args?.feature;
        if (!feature) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            allowed: false,
                            error: "feature parameter required",
                        }),
                    },
                ],
                isError: true,
            };
        }

        const key = args?.license_key || ENV_LICENSE;
        const result = await callBackend(key);

        const tier = result.tier || "free";
        const features = TIER_FEATURES[tier] || TIER_FEATURES.free;
        const allowed = features.includes(feature);

        let requiredTier = "free";
        for (const [t, list] of Object.entries(TIER_FEATURES)) {
            if (list.includes(feature)) {
                requiredTier = t;
                break;
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        allowed,
                        tier,
                        required_tier: requiredTier,
                        feature,
                    }),
                },
            ],
        };
    }

    return {
        content: [
            {
                type: "text",
                text: `Unknown tool: ${name}`,
            },
        ],
        isError: true,
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
