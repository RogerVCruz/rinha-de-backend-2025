const lastCall = {
  default: 0,
  fallback: 0
};

const cache = {
  default: null,
  fallback: null
};

async function checkHealth(processor) {
  const now = Date.now();
  
  if (now - lastCall[processor] < 5000 && cache[processor]) {
    return cache[processor];
  }

  try {
    const url = `http://localhost:${processor === 'default' ? '8001' : '8002'}/payments/service-health`;
    const response = await fetch(url);
    
    if (response.status === 429) {
      return cache[processor] || { failing: true, minResponseTime: 999 };
    }

    const health = await response.json();
    lastCall[processor] = now;
    cache[processor] = health;
    
    return health;
  } catch (error) {
    return { failing: true, minResponseTime: 999 };
  }
}

export { checkHealth };