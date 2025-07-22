// processor-worker.js
import Redis from 'ioredis';
import { startProcessor } from './processors/processor.js';

console.log('Worker process starting...');


const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
  console.log('Worker connected to Redis.');
  startProcessor(redis);
});

redis.on('error', (err) => {
  process.exit(1);
});