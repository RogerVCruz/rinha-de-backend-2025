import { isProcessorHealthy } from './healthCheck.js';
import process from 'process';
import { Agent } from 'undici';

var failedRequests = 0;

const keepAliveAgent = new Agent({
  keepAliveTimeout: 10 * 1000, 
  keepAliveMaxTimeout: 60 * 1000
});

async function processPayment(payment) {
  const { correlationId, amount } = payment;
  
  let defaultResult = await tryProcessorSafe('default', { correlationId, amount });
  if (defaultResult.success) return { ...defaultResult.data, processor: 'default' };
  
  let fallbackResult = await tryProcessorSafe('fallback', { correlationId, amount });
  if (fallbackResult.success) return { ...fallbackResult.data, processor: 'fallback' };
  
  if (!defaultResult.success && !fallbackResult.success) {
    await new Promise(resolve => setTimeout(resolve, defaultResult.unhealthy && fallbackResult.unhealthy ? 5000 : 1000));
    
    if (!defaultResult.unhealthy) {
      const retryDefault = await tryProcessorSafe('default', { correlationId, amount });
      if (retryDefault.success) return { ...retryDefault.data, processor: 'default' };
    }
    
    if (!fallbackResult.unhealthy) {
      const retryFallback = await tryProcessorSafe('fallback', { correlationId, amount });
      if (retryFallback.success) return { ...retryFallback.data, processor: 'fallback' };
    }
  }
  
  failedRequests++;
  console.log("Total failed requests: ", failedRequests);
  throw new Error('Both processors failed after retry');
}

async function tryProcessorSafe(processor, payment) {
  try {
    const result = await tryProcessor(processor, payment);
    return { success: true, data: result, unhealthy: false };
  } catch (error) {
    const isUnhealthy = error.message.includes('unhealthy');
    return { success: false, data: null, unhealthy: isUnhealthy };
  }
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
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
    signal: AbortSignal.timeout(5000),
    dispatcher: keepAliveAgent
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