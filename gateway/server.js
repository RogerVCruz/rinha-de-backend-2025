import Fastify from 'fastify'
import fastifyRedis from '@fastify/redis'
import { startProcessor } from '../processors/processor.js'

const fastify = Fastify({
  logger: true
})

fastify.register(fastifyRedis, { url: process.env.REDIS_URL || 'redis://localhost:6379'})



fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (req, body, done) => {
    if (body.length === 0) {
      done(null, {});
    } else {
      try {
        done(null, JSON.parse(body.toString()));
      } catch (err) {
        err.statusCode = 400;
        done(err);
      }
    }
  }
);

fastify.post('/payments', async function (request, response) {
  const { correlationId, amount } = request.body;
  if (!correlationId || !amount) {
    return response.code(400).send({ error: 'Invalid payload' })
  }

  await fastify.redis.lpush('pending_payments_queue', JSON.stringify({correlationId, amount}));
  response.code(202).send({message: 'added to qeue'});
});

fastify.get('/payments-summary', async function (request, response) {
  const { fromDate, toDate } = req.query;


  await fastify.redis.lpush('pending_payments_queue', JSON.stringify({correlationId, amount}));
  response.code(202).send({message: 'added to qeue'});
});

fastify.post('/purge-payments', async function (request, response) {
  await fastify.redis.del('pending_payments_queue');
  response.code(200).send({message: 'payments purged'});
});


try {
  await fastify.listen({ port: 3000 })
  startProcessor(fastify.redis);
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}