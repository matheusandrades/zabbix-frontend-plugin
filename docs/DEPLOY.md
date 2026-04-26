# Deploy do produto completo

Guia para colocar tudo em produção: marketplace, plugin, MCP server e backend de licenças.

## 1. Repositórios necessários

Você precisa de **2 repositórios públicos no GitHub**:

### A. `zabbix-frontend-plugin` (o plugin)
Conteúdo: este diretório atual `/Users/matheusandrade/plugins-claude/`, exceto:
- `marketplace/` — vai num repo separado
- `backend/` — vai num repo privado (segurança)

### B. `zabbix-plugins-marketplace` (o catálogo)
Conteúdo: apenas o subdiretório `marketplace/` com `.claude-plugin/marketplace.json`.

E **1 repositório privado**:

### C. `zabbix-frontend-backend` (privado)
Conteúdo: o subdiretório `backend/` (Stripe keys, lógica de licenciamento).

## 2. Setup dos repositórios

```bash
# Plugin (público)
cd /Users/matheusandrade/plugins-claude
# Remover backend antes de comitar
mv backend ../zabbix-frontend-backend
mv marketplace ../zabbix-plugins-marketplace
git init
git add .
git commit -m "Initial commit: zabbix-frontend plugin v1.0.0"
gh repo create matheusandrades/zabbix-frontend-plugin --public --source=. --push

# Marketplace (público)
cd ../zabbix-plugins-marketplace
git init && git add . && git commit -m "Initial marketplace"
gh repo create matheusandrades/zabbix-plugins-marketplace --public --source=. --push

# Backend (privado)
cd ../zabbix-frontend-backend
git init && git add . && git commit -m "License backend v1.0.0"
gh repo create matheusandrades/zabbix-frontend-backend --private --source=. --push
```

## 3. Deploy do backend

### Opção A — Railway (mais simples, $5-10/mês)

```bash
cd zabbix-frontend-backend
railway login
railway init
railway add  # adicione TODAS as variáveis do .env.example
railway up
railway domain  # gera <projeto>.up.railway.app
```

Configure DNS: `api.zabbix-frontend.dev` → Railway

### Opção B — Fly.io ($5/mês, mais controle)

```bash
fly launch
fly secrets set $(grep -v '^#' .env | xargs)
fly deploy
fly certs add api.zabbix-frontend.dev
```

### Opção C — VPS própria ($5/mês DigitalOcean/Hetzner)

```bash
# Na VPS:
git clone git@github.com:matheusandrades/zabbix-frontend-backend.git /srv/license
cd /srv/license/backend
npm ci --production
cp .env.example .env  # editar
sudo systemctl enable --now zabbix-license  # systemd unit em backend/README.md
```

Caddy para HTTPS:
```caddyfile
api.zabbix-frontend.dev {
    reverse_proxy localhost:3000
}
```

## 4. Configurar Stripe

### Produtos

No dashboard Stripe:

1. **Zabbix Frontend Plugin — Pro Monthly** — $19/month recurring
2. **Zabbix Frontend Plugin — Pro Annual** — $190/year (16% off)
3. **Zabbix Frontend Plugin — Enterprise Monthly** — $99/month
4. **Zabbix Frontend Plugin — Enterprise Annual** — $990/year (16% off)

Copie os 4 `price_xxx` para `.env` do backend.

### Webhook

- Endpoint: `https://api.zabbix-frontend.dev/webhook`
- Eventos:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copie `whsec_xxx` para `STRIPE_WEBHOOK_SECRET`

### Customer Portal

Em Settings → Billing → Customer portal:
- Habilite "Cancel subscription"
- Habilite "Update payment method"
- Habilite "View invoices"
- Return URL: `https://zabbix-frontend.dev`

## 5. Site de venda (zabbix-frontend.dev)

Mínimo viável:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Zabbix Frontend Plugin para Claude Code</title>
</head>
<body>
  <h1>Crie módulos Zabbix em minutos</h1>
  <p>Plugin Claude Code que gera código Zabbix oficial validado.</p>
  <a href="/pricing">Ver planos →</a>
</body>
</html>
```

E uma página `/pricing` que dispara checkout:

```javascript
async function startCheckout(tier, billing) {
    const email = prompt('Seu email:');
    const res = await fetch('https://api.zabbix-frontend.dev/checkout', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, tier, billing})
    });
    const {url} = await res.json();
    window.location = url;
}
```

Hospede em GitHub Pages, Cloudflare Pages, Vercel ou Netlify (grátis).

## 6. Email transacional

Quando cliente paga, backend cria licença e deve enviar email com a chave. Adicione em `backend/src/stripe.js` no `handleCheckoutCompleted`:

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});

await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: customer.email,
    subject: 'Sua chave Zabbix Frontend Plugin',
    html: `
        <h2>Bem-vindo!</h2>
        <p>Sua chave: <code>${license.license_key}</code></p>
        <p>Para ativar:</p>
        <pre>/zabbix-license ${license.license_key}</pre>
        <p>Plano: ${license.tier}</p>
    `
});
```

Recomendado: SendGrid, Resend, ou Postmark.

## 7. Submissão ao marketplace oficial Anthropic

Após plugin estar funcionando publicamente:

1. Vá em https://platform.claude.com/plugins/submit
2. Preencha:
   - Nome: `zabbix-frontend`
   - Descrição (curta e longa)
   - Repositório: `https://github.com/matheusandrades/zabbix-frontend-plugin`
   - Categoria: Monitoring
   - Homepage: `https://zabbix-frontend.dev`
3. Aguarde review (1-2 semanas)

Após aprovado, o plugin aparece em `/plugin` para todos os usuários — descoberta orgânica.

## 8. Checklist pré-lançamento

```
[ ] Backend deployado em api.zabbix-frontend.dev (HTTPS)
[ ] Webhook Stripe testado (use Stripe CLI: stripe trigger checkout.session.completed)
[ ] Endpoint /validate respondendo em < 200ms
[ ] Site de venda no ar (mínimo: home + pricing + success page)
[ ] Email transacional funcionando (envie pra você primeiro)
[ ] Marketplace `zabbix-plugins-marketplace` no GitHub público
[ ] Plugin `zabbix-frontend-plugin` no GitHub público
[ ] Testou /plugin marketplace add + /plugin install em outra máquina
[ ] Testou /zabbix-license com chave criada manualmente no SQLite
[ ] Documentação em zabbix-frontend.dev/docs
[ ] DMCA / termos de uso publicados
[ ] CNPJ / MEI ativo (se Brasil) ou LLC para receber pagamentos
```

## 9. Métricas pós-lançamento

Acompanhe diariamente nas primeiras 4 semanas:

- **Visits** no site de venda (Plausible/Umami)
- **Checkout starts** vs **completed** (Stripe dashboard)
- **MRR** (Monthly Recurring Revenue)
- **Churn rate** (cancelamentos / ativos)
- **Validation requests/min** (carga do backend)
- **Issues no GitHub** (suporte)

## 10. Marketing inicial (gratuito)

- Post no Reddit r/zabbix com case real
- Issue / discussion no fórum oficial Zabbix mostrando exemplo
- LinkedIn post mostrando timelapse de criação de widget
- Tweet/X com gif de uso
- Listar em alternativas (DEV.to, Indie Hackers)
- Tutorial em vídeo (YouTube/LinkedIn) — 5 min mostrando criação de widget

Custo zero, alcance moderado. Boa fundação antes de pagar tráfego.
