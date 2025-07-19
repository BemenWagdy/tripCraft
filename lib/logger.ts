export function appendError(err: unknown, scope = 'server') {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    scope,
    message: (err as any)?.message ?? String(err),
    stack: (err as any)?.stack ?? ''
  });
  
  if (process.env.NODE_ENV === 'development') {
    // Only import and use fs on the server side
    if (typeof window === 'undefined') {
      try {
        const fs = require('fs');
        fs.appendFileSync('.error-log.txt', entry + '\n');
      } catch (writeErr) {
        console.error('Failed to write to error log:', writeErr);
      }
    }
  }
}