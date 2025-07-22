import { processPayment, updateStats } from './processPayment.js';

const MAX_CONCURRENT_TASKS = 40;
const activeTasks = new Set();

async function handlePayment(redis, payment) {
  try {
    const result = await processPayment(payment);
    const processor = result.processor || 'default';
    await updateStats(redis, processor, payment.amount);
  } catch (error) {
    // console.error(`Error processing payment ${payment.id}: ${error.message}`);
  }
}

async function startProcessor(redis) {
  console.log(`Payment processor started (Concurrency: ${MAX_CONCURRENT_TASKS})`);

  while (true) {
    try {
      if (activeTasks.size >= MAX_CONCURRENT_TASKS) {
        await Promise.race(activeTasks);
      }

      const paymentData = await redis.brpop('pending_payments_queue', 10);

      if (paymentData) {
        const payment = JSON.parse(paymentData[1]);
        
        const task = handlePayment(redis, payment);
        
        activeTasks.add(task);
        
        task.finally(() => {
          activeTasks.delete(task);
        });
      }
    } catch (error) {
      // console.error(`Processor loop error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

export { startProcessor };