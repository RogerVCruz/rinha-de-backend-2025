import { isProcessorHealthy } from './healthCheck.js';
import process from 'process';
var failedRequests = 0;

async function processPayment(payment) {
  const { correlationId, amount } = payment;
  
  try {
    const result = await tryProcessor('default', { correlationId, amount });
    if (result) return { ...result, processor: 'default' };
  } catch (error) {
    // console.log(`Default processor failed: ${error.message}`);
  }
  
  try {
    const result = await tryProcessor('fallback', { correlationId, amount });
    if (result) return { ...result, processor: 'fallback' };
  } catch (error) {
    // console.log(`Fallback processor failed: ${error.message}`);
  }
  failedRequests ++;
  console.log("Total failed requests: ", failedRequests)
  throw new Error('Both processors failed');
}

async function tryProcessor(processor, payment) {
  const health = isProcessorHealthy(processor);
  
  if (!health) {
    throw new Error(`${processor} processor is unhealthy`);
  }
  
  const baseUrl = processor === 'default' 
    ? (process?.env?.DEFAULT_PROCESSOR_URL || 'http://localhost:8001')
    : (process?.env?.FALLBACK_PROCESSOR_URL || 'http://localhost:8002');

  const url = `${baseUrl}/payments`;
  // console.log(`Trying ${processor} processor at ${url}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
    signal: AbortSignal.timeout(5000)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return await response.json();
}

async function updateStats(redis, processor, amount) {
  await redis.incrbyfloat(`stats:${processor}:amount`, amount);
  await redis.incr(`stats:${processor}:count`);
}

export { processPayment, updateStats };