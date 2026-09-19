import https from 'node:https';

/** Resolves to the server's public IP, or null on any failure. Never rejects. */
export function fetchPublicIp(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = https.get('https://api.ipify.org?format=json', { timeout: 5000 }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          resolve((JSON.parse(raw) as { ip?: string }).ip ?? null);
        } catch {
          resolve(null);
        }
      });
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
  });
}
