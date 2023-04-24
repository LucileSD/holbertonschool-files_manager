import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => { console.log(error.message); });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    this.getAsync = promisify(this.client.get).bind(this.client);
    const reply = await this.getAsync(key);
    return reply;
  }

  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
