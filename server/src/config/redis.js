class RedisClient {
  get url() { return process.env.UPSTASH_REDIS_REST_URL; }
  get token() { return process.env.UPSTASH_REDIS_REST_TOKEN; }

  async fixedWindow(key, seconds) {
    const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n";
    const result = await this.request(['EVAL', script, 1, key, seconds]);
    return result?.ok && !result.payload?.error ? result.payload?.result ?? null : null;
  }

  async setIfAbsent(key, value, seconds) {
    const result = await this.request(['SET', key, value, 'EX', seconds, 'NX']);
    return result?.ok && result.payload?.result === 'OK';
  }

  async getdel(key) {
    const result = await this.request(['GETDEL', key]);
    return result?.ok && !result.payload?.error ? result.payload?.result ?? null : null;
  }

  hasConfig() {
    if (!this.url || !this.token) {
      console.error('[redis] missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
      return false;
    }

    return true;
  }

  async request(command) {
    if (!this.hasConfig()) {
      return null;
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(5000)
      });

      const body = await response.text().catch(() => '<failed to read body>');
      let payload = null;

      try {
        payload = body ? JSON.parse(body) : null;
      } catch (error) {
        console.error(`[redis] ${command[0]} invalid_json status=${response.status} body=${body}`, error);
      }

      return {
        body,
        ok: response.ok,
        payload,
        status: response.status
      };
    } catch (error) {
      console.error(`[redis] ${command[0]} error:`, error);
      return null;
    }
  }

  async get(key) {
    const result = await this.request(['GET', key]);
    if (!result) {
      return null;
    }

    if (!result.ok) {
      console.error(`[redis] GET failed status=${result.status} body=${result.body}`);
      return null;
    }

    return result.payload?.result ?? null;
  }

  async set(key, value, expirySeconds = null) {
    const command = expirySeconds
      ? ['SETEX', key, expirySeconds, value]
      : ['SET', key, value];

    const result = await this.request(command);
    if (!result) {
      return false;
    }

    if (!result.ok || result.payload?.result !== 'OK') {
      console.error(`[redis] ${command[0]} failed status=${result.status} body=${result.body}`);
      return false;
    }

    console.info(`[redis] ${command[0]} success key=${key}`);
    return true;
  }

  async del(key) {
    const result = await this.request(['DEL', key]);
    if (!result) {
      return false;
    }

    if (!result.ok) {
      console.error(`[redis] DEL failed status=${result.status} body=${result.body}`);
      return false;
    }

    return true;
  }

  async incr(key) {
    const result = await this.request(['INCR', key]);
    if (!result) {
      return null;
    }

    if (!result.ok) {
      console.error(`[redis] INCR failed status=${result.status} body=${result.body}`);
      return null;
    }

    return result.payload?.result ?? null;
  }

  async expire(key, seconds) {
    const result = await this.request(['EXPIRE', key, seconds]);
    if (!result) {
      return false;
    }

    if (!result.ok) {
      console.error(`[redis] EXPIRE failed status=${result.status} body=${result.body}`);
      return false;
    }

    return true;
  }
}

const redis = new RedisClient();

export default redis;
