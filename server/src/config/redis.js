class RedisClient {
  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL;
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN;
  }

  async get(key) {
    try {
      const response = await fetch(`${this.url}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, expirySeconds = null) {
    try {
      const url = expirySeconds 
        ? `${this.url}/setex/${key}/${expirySeconds}/${encodeURIComponent(value)}`
        : `${this.url}/set/${key}/${encodeURIComponent(value)}`;
      
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await fetch(`${this.url}/del/${key}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async incr(key) {
    try {
      const response = await fetch(`${this.url}/incr/${key}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  }

  async expire(key, seconds) {
    try {
      await fetch(`${this.url}/expire/${key}/${seconds}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }
}

const redis = new RedisClient();

export default redis;
