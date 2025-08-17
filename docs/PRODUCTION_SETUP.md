# Production Setup Guide

This guide will help you deploy PR Manager with real AI analysis for global users.

## 🚀 Quick Production Setup

### 1. Choose Your AI Provider

**Recommended: OpenAI GPT-4**

- Best quality for code analysis
- Reliable JSON output
- Good rate limits

### 2. Get API Keys

#### OpenAI (Recommended)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up/login
3. Create a new API key
4. Add billing information (required for GPT-4)
5. Copy your key: `sk-...`

#### Anthropic Claude (Alternative)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up/login
3. Create API key
4. Copy your key: `sk-ant-...`

#### Google Gemini (Budget Option)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy your key

### 3. Configure Environment

Create `.env` file:

```bash
# For OpenAI (recommended)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_actual_key_here

# For Anthropic
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your_actual_key_here

# For Gemini
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your_actual_key_here

# Optional: GitHub token for private repos
GITHUB_TOKEN=ghp_your_github_token_here

# Production settings
NODE_ENV=production
PORT=3001
```

### 4. Deploy Options

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### Option B: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up
```

#### Option C: Docker

```bash
# Build
docker build -t pr-manager .

# Run
docker run -p 3001:3001 --env-file .env pr-manager
```

## 💰 Cost Estimation

### OpenAI GPT-4 Costs

- **Small PR** (5 files, 200 lines): ~$0.01
- **Medium PR** (15 files, 800 lines): ~$0.02
- **Large PR** (25 files, 2000 lines): ~$0.03

### Monthly Estimates

- **100 analyses/month**: ~$1-3
- **1,000 analyses/month**: ~$10-30
- **10,000 analyses/month**: ~$100-300

### Cost Optimization Tips

1. Use caching (already implemented)
2. Set rate limits per user
3. Consider tiered pricing
4. Use Gemini for free tier users

## 🔒 Security Best Practices

### API Key Security

- Never commit API keys to git
- Use environment variables
- Rotate keys regularly
- Monitor usage in provider dashboards

### Rate Limiting

Add rate limiting middleware:

```bash
npm install express-rate-limit
```

### Input Validation

- Already implemented with Zod
- Size limits prevent abuse
- Secret redaction included

## 📊 Monitoring & Analytics

### Track Usage

```javascript
// Add to your analytics
analytics.track("pr_analysis", {
  provider: process.env.AI_PROVIDER,
  files_count: stats.total_files,
  lines_changed: stats.additions + stats.deletions,
  risk_level: result.ai.risk.level,
});
```

### Monitor Costs

- Check provider dashboards daily
- Set up billing alerts
- Track cost per analysis

## 🚀 Scaling Considerations

### Performance

- Use Redis for caching in production
- Add CDN for static assets
- Consider serverless functions

### Reliability

- Implement circuit breakers
- Add retry logic (already included)
- Fallback to mock on failures

### Multi-tenancy

- Add user authentication
- Per-user rate limits
- Usage tracking

## 🔧 Troubleshooting

### Common Issues

**"API key not found"**

- Check environment variables are set
- Verify key format (sk- prefix for OpenAI)

**"Rate limit exceeded"**

- Check provider dashboard
- Implement user rate limiting
- Consider upgrading plan

**"Invalid JSON response"**

- AI providers sometimes return malformed JSON
- App automatically retries and falls back to mock

### Debug Mode

```bash
# Enable debug logging
DEBUG=pr-manager:* npm start
```

## 📈 Business Model Ideas

### Freemium

- Free: 10 analyses/month with mock AI
- Pro: Unlimited with real AI ($9/month)

### Pay-per-use

- $0.10 per analysis
- Bulk discounts available

### Enterprise

- Custom deployment
- White-label options
- SLA guarantees

## 🎯 Next Steps

1. **Test with real API**: Set up OpenAI key and test
2. **Deploy to staging**: Use Vercel/Railway
3. **Add authentication**: Implement user accounts
4. **Monitor usage**: Set up analytics
5. **Scale gradually**: Start with small user base

## 📞 Support

For production deployment help:

- Check the main README.md
- Review error logs
- Monitor provider status pages
- Consider professional support options

---

**Ready to go live?** Start with OpenAI GPT-4 - it provides the best results for code analysis and has reliable JSON output format.
