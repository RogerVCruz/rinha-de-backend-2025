import { processPayment, updateStats } from './processPayment.js';

async function startProcessor(redis) {
  console.log('Payment processor started');
  
  while (true) {
    try {
      const paymentData = await redis.brpop('pending_payments_queue', 1);
      
      if (paymentData) {
        const payment = JSON.parse(paymentData[1]);
        // console.log(`Processing payment: ${payment.correlationId}`);
        
        const result = await processPayment(payment);
        const processor = result.processor || 'default';
        await updateStats(redis, processor, payment.amount);
        // console.log(`Payment processed: ${payment.correlationId}`);
      }
    } catch (error) {
      console.error(`Processor error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export { startProcessor };