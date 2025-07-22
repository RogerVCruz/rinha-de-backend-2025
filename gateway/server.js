import Fastify from 'fastify';
import fastifyRedis from '@fastify/redis';

const fastify = Fastify({
  logger: false
});

fastify.register(fastifyRedis, { url: process.env.REDIS_URL || 'redis://localhost:6379' });

fastify.post('/payments', async function (request, response) {
  const { correlationId, amount } = request.body;
  if (!correlationId || !amount) {
    return response.code(400).send({ error: 'Invalid payload' });
  }

  fastify.redis.lpush('pending_payments_queue', JSON.stringify({ correlationId, amount }));
  response.code(202).send({ message: 'added to queue' });
});

fastify.get('/payments-summary', async function (request, response) {
  try {
    const pipeline = fastify.redis.pipeline();
    pipeline.get('stats:default:amount');
    pipeline.get('stats:default:count');
    pipeline.get('stats:fallback:amount');
    pipeline.get('stats:fallback:count');

    const results = await pipeline.exec();
    const [defaultAmount, defaultCount, fallbackAmount, fallbackCount] = results.map(r => r[1]);

    const summary = {
      default: {
        totalRequests: parseInt(defaultCount || '0'),
        totalAmount: parseFloat(defaultAmount || '0')
      },
      fallback: {
        totalRequests: parseInt(fallbackCount || '0'),
        totalAmount: parseFloat(fallbackAmount || '0')
      }
    };

    response.code(200).send(summary);
  } catch (error) {
    response.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post('/purge-payments', async function (request, response) {
  await fastify.redis.flushdb();
  response.code(200).send({ message: 'payments purged' });
});

try {
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
  console.log('API Server listening on port 3000');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}