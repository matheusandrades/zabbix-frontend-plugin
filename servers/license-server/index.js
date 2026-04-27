#!/usr/bin/env node
/**
 * MCP server de validação de licença para o plugin Zabbix Frontend.
 *
 * Implementação MCP zero-dependency (apenas Node stdlib).
 * Protocolo: JSON-RPC 2.0 sobre stdio, uma mensagem por linha.
 *
 * Tools expostas:
 *   - validate_license: confirma licença ativa contra backend
 *   - check_feature_access: verifica se feature está liberada no plano
 */

import { createInterface } from "node:readline";

const API_URL = process.env.ZABBIX_PLUGIN_API_URL || "https://api.zabbix-frontend.dev";
const ENV_LICENSE = process.env.LICENSE_KEY || "";

// Cache em memória — evita hit no backend a cada call
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

const TOOLS = [
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
];

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

function send(message) {
    process.stdout.write(JSON.stringify(message) + "\n");
}

function sendResult(id, result) {
    send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
    send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleToolCall(name, args) {
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
                        text: JSON.stringify({ allowed: false, error: "feature parameter required" }),
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
                    text: JSON.stringify({ allowed, tier, required_tier: requiredTier, feature }),
                },
            ],
        };
    }

    throw new Error(`Unknown tool: ${name}`);
}

async function handleMessage(msg) {
    const { id, method, params } = msg;

    try {
        switch (method) {
            case "initialize":
                sendResult(id, {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: {
                        name: "zabbix-frontend-license-validator",
                        version: "1.0.0",
                    },
                });
                break;

            case "notifications/initialized":
                // Notification, no response needed
                break;

            case "tools/list":
                sendResult(id, { tools: TOOLS });
                break;

            case "tools/call": {
                const result = await handleToolCall(params?.name, params?.arguments);
                sendResult(id, result);
                break;
            }

            case "ping":
                sendResult(id, {});
                break;

            default:
                if (id !== undefined) {
                    sendError(id, -32601, `Method not found: ${method}`);
                }
        }
    } catch (err) {
        if (id !== undefined) {
            sendError(id, -32603, `Internal error: ${err.message}`);
        }
    }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
        const msg = JSON.parse(trimmed);
        handleMessage(msg);
    } catch (err) {
        // Linha inválida — ignorar (não há como responder a JSON malformado)
    }
});

rl.on("close", () => {
    process.exit(0);
});
