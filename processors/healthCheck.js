import process from 'process';

const cache = {
  default: { failing: false, minResponseTime: 0 },
  fallback: { failing: false, minResponseTime: 0 }
};

async function performHealthCheck(processor) {
  try {
    const baseUrl = processor === 'default' 
      ? (process?.env?.DEFAULT_PROCESSOR_URL || 'http://localhost:8001')
      : (process?.env?.FALLBACK_PROCESSOR_URL || 'http://localhost:8002');
    const url = `${baseUrl}/payments/service-health`;
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.error("429 TOO MANY REQUESTS")
      cache[processor] = { failing: true, minResponseTime: 999 };
      return;
    }

    const health = await response.json();
    cache[processor] = health;
    
  } catch (error) {
    console.error(`Health check for ${processor} failed:`, error.message);
    cache[processor] = { failing: true, minResponseTime: 999 };
  }
}

function isProcessorHealthy(processor) {
  return !cache[processor].failing;
}

function startHealthChecking() {
  setInterval(async () => {
    await Promise.all([
      performHealthCheck('default'),
      performHealthCheck('fallback')
    ]);
  }, 5000);
}

export { isProcessorHealthy, startHealthChecking };