# Guia de Comercialização

Plano prático para tirar o plugin do papel até primeiros assinantes pagantes.

## Cronograma sugerido (4 semanas até MVP no ar)

### Semana 1 — Fundação
- [ ] Registrar domínio `zabbix-frontend.dev` (~$15/ano em Cloudflare/Namecheap)
- [ ] Abrir conta Stripe + verificar identidade
- [ ] Criar conta GitHub para os 3 repositórios (público × 2, privado × 1)
- [ ] Decidir CNPJ/MEI ou Stripe Atlas (LLC)
- [ ] Validar com 5-10 desenvolvedores Zabbix se preço $19/mês faz sentido (entrevistas curtas no LinkedIn)

### Semana 2 — Backend e plugin público
- [ ] Deploy do backend em Railway/Fly.io/VPS (siga `DEPLOY.md`)
- [ ] Configurar 4 produtos no Stripe (Pro/Enterprise × Monthly/Annual)
- [ ] Configurar webhook + testar com Stripe CLI
- [ ] Push do plugin para `github.com/<você>/zabbix-frontend-plugin`
- [ ] Push do marketplace para `github.com/<você>/zabbix-plugins-marketplace`
- [ ] Testar instalação: `/plugin marketplace add` + `/plugin install` em máquina limpa

### Semana 3 — Site de venda
- [ ] Landing simples (home + pricing + docs)
  - Stack mínima: Astro/Next/HTML estático no Cloudflare Pages
- [ ] Implementar fluxo: pricing → checkout Stripe → success page → email com chave
- [ ] Configurar email transacional (Resend/SendGrid)
- [ ] Testar checkout end-to-end (cartão de teste Stripe)
- [ ] Criar política de privacidade + termos de uso (geradores online ok para MVP)

### Semana 4 — Lançamento soft
- [ ] Recrutar 5-10 beta testers (oferecer 3 meses Pro grátis em troca de feedback)
- [ ] Coletar feedback estruturado (Google Forms): instalação OK? skill X gerou código correto? bugs?
- [ ] Iterar: ajustar skills com base em feedback
- [ ] Submeter ao marketplace oficial Anthropic
- [ ] **Lançamento público** — anúncio em 4 canais (ver Marketing abaixo)

## Pricing — racional

### Por que $5 e $25?

- **$5/mês Pro** — preço de impulso. Cliente paga sem precisar justificar (cabe em qualquer cartão pessoal sem aprovação). Aposta em volume: barreira mínima de entrada eleva conversão e abre acesso a devs/freelancers no mercado nacional onde $19 já seria caro.
- **$25/mês Enterprise** — 5× o Pro. Diferenciação clara para times que precisam multi-versão Zabbix e SLA. Ainda dentro de "expense aprovado sem burocracia" para empresas pequenas.
- **Anual com 17% desconto** — incentiva compromisso, melhora cash flow, reduz churn medido.

### Quando subir

Considere subir para $9/$39 quando:
- Tiver 100+ assinantes Pro ativos
- Churn mensal < 5%
- Tiver feedback de que "está barato pelo valor"

Mude apenas para novos assinantes; os atuais ficam em grandfather pricing.

## Aquisição — primeiros 100 clientes

### Canal 1: Reddit r/zabbix (gratuito, alta intenção)
- 1 post por mês, foco em educar (tutorial real) com link sutil ao plugin no fim
- Não pareça anúncio — desenvolva conteúdo útil e relevante
- Exemplo: "Tutorial: como criar widget com broadcast em Zabbix 7.0 (com plugin que faz o boilerplate)"

### Canal 2: Fórum oficial Zabbix (gratuito, alta autoridade)
- Responda dúvidas técnicas reais sobre módulos/widgets
- Em respostas, mencione "construí um plugin que automatiza isso" quando relevante
- Builds reputação ao longo do tempo

### Canal 3: YouTube/LinkedIn — vídeos curtos (gratuito, alcance médio)
- 3-5 minutos mostrando criação de widget do zero
- Antes/depois: 2 horas de boilerplate vs 30 segundos com o plugin
- Formato vertical para LinkedIn/Shorts

### Canal 4: Lista de Email
- Inscrição opt-in na home: "Receba dicas mensais de desenvolvimento Zabbix"
- 1 email por mês com tutorial + plugin como ferramenta
- Lista cresce, vira ativo permanente

### Canal 5: Anúncios pagos (depois de canais 1-4 estarem rodando)
- Google Ads: "zabbix module development", "zabbix widget tutorial"
- LinkedIn Ads: targeting "Zabbix" como skill
- Orçamento inicial: $10-30/dia, escalar se ROAS > 2x

## Suporte — não escala manualmente

Desde o dia 1:

1. **FAQ extensa** em `zabbix-frontend.dev/docs/faq` — 80% das dúvidas
2. **GitHub Issues** público para bugs (qualquer plano)
3. **Email** matheeuus22@gmail.com para Pro+ (SLA 48h)
4. **Discord/Slack** privado apenas Enterprise
5. Use Crisp/Intercom só quando passar de 30 clientes

## Métricas que importam

### Vanity (não obcecar)
- Visitas no site
- Estrelas no GitHub
- Downloads do marketplace

### Reais (foco)
- **MRR** (Monthly Recurring Revenue)
- **Churn rate mensal** (cancelamentos / ativos no início do mês)
- **CAC** (Customer Acquisition Cost) por canal
- **LTV** (Lifetime Value) — receita total por cliente / churn
- **Conversion rate** (visitas → checkout → paid)

Meta inicial (Pro a $5/mês — exige volume):
- Mês 1: 10 clientes Pro = $50 MRR
- Mês 3: 50 clientes = $250 MRR
- Mês 6: 150 clientes = $750 MRR (cobre custos do backend + domínio)
- Mês 12: 400 clientes = $2.000 MRR (renda complementar)
- Mês 18: 800 clientes + 20 Enterprise = $4.500 MRR (renda significativa)

Observação: o preço baixo ($5) é uma aposta deliberada em volume. Se conversion rate for boa mas volume insuficiente após 6 meses, considere subir para $9/mês ou adicionar tiers intermediários.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Anthropic muda API de plugins | Médio | Alto | Acompanhar changelog; manter compatibilidade lateral |
| Zabbix muda padrões drasticamente (8.0?) | Médio | Médio | Skills versionadas; suporte multi-versão |
| Concorrente lança grátis | Baixo | Alto | Foco em qualidade > quantidade de skills; reputação |
| Cliente compartilha chave | Alto | Baixo | Device fingerprinting + limites por tier |
| Stripe bloqueia conta | Baixo | Crítico | Backup com Paddle/Lemon Squeezy pronto |
| Backend cai | Baixo | Médio | Cache no MCP server (5 min) → degrada graciosa para Free; uptime monitoring |

## Próximos passos imediatos

1. Validar 5 entrevistas com devs Zabbix nesta semana — confirmar dor real e disposição a pagar
2. Registrar domínio + abrir Stripe esta semana
3. Não escrever mais código até confirmar que há mercado

Boa sorte. O produto está tecnicamente sólido — o trabalho agora é distribuição.
