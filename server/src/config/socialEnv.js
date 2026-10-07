// Validate operator-supplied settings; never accept provider endpoints or callback URLs from a request.
export function validateSocialEnvironment(env = process.env) {
  for (const provider of ['GOOGLE', 'TELEGRAM']) {
    const id = env[`${provider}_CLIENT_ID`],
      secret = env[`${provider}_CLIENT_SECRET`];
    if (Boolean(id) !== Boolean(secret))
      throw new Error(`${provider} requires both CLIENT_ID and CLIENT_SECRET`);
    if (!id) continue;
    if (!env.APP_URL) throw new Error('APP_URL is required for social login');
    const url = new URL(env.APP_URL);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      !['http:', 'https:'].includes(url.protocol)
    )
      throw new Error('APP_URL must be a website origin');
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:')
      throw new Error('Production social login requires HTTPS');
    if (env.CORS_ORIGIN !== url.origin)
      throw new Error('CORS_ORIGIN must match APP_URL origin');
    if (provider === 'TELEGRAM') {
      if (!/^\d+$/.test(id) || env.TELEGRAM_BOT_TOKEN?.split(':')[0] !== id)
        throw new Error(
          'Telegram login and notifications must use the same bot'
        );
      if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(env.TELEGRAM_BOT_USERNAME || ''))
        throw new Error('TELEGRAM_BOT_USERNAME is required for bot activation');
      if (!env.TELEGRAM_WEBHOOK_SECRET)
        throw new Error('TELEGRAM_WEBHOOK_SECRET is required');
    }
  }
}
