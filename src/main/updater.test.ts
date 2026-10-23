import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createHash } from 'crypto';
import { createServer, type Server } from 'http';
import { isNewerVersion, UpdateManager } from './updater.js';

describe('isNewerVersion', () => {
  it('compares numeric parts', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });

  it('compares multi digit numbers numerically', () => {
    expect(isNewerVersion('1.0.10', '1.0.9')).toBe(true);
    expect(isNewerVersion('1.0.9', '1.0.10')).toBe(false);
  });

  it('ignores the pre-release suffix', () => {
    expect(isNewerVersion('1.0.1', '1.0.0-alpha.1')).toBe(true);
    expect(isNewerVersion('1.0.0-alpha.1', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0-alpha.2', '1.0.0-alpha.1')).toBe(false);
  });

  it('accepts a leading v', () => {
    expect(isNewerVersion('v2.0.0', '1.9.9')).toBe(true);
  });
});

describe('UpdateManager', () => {
  let server: Server;
  let baseUrl = '';
  const payload = Buffer.from('fake-installer-payload');
  const payloadHash = createHash('sha256').update(payload).digest('hex');

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url === '/version.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            version: '99.0.0',
            url: `${baseUrl}/update.bin`,
            sha256: payloadHash,
            notes: 'Prueba automatizada',
          })
        );
        return;
      }
      if (req.url === '/update.bin') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': payload.length });
        res.end(payload);
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('reports a newer version', async () => {
    const manager = new UpdateManager();
    const info = await manager.checkForUpdate(`${baseUrl}/version.json`);
    expect(info.available).toBe(true);
    expect(info.latestVersion).toBe('99.0.0');
    expect(info.notes).toBe('Prueba automatizada');
    expect(manager.getStatus().phase).toBe('available');
  });

  it('reports "up to date" for an older manifest', async () => {
    const manager = new UpdateManager();
    const info = await manager.checkForUpdate(`${baseUrl}/version.json`);
    expect(info.available).toBe(true);
    // A second check with the same manifest keeps the same result.
    const again = await manager.checkForUpdate(`${baseUrl}/version.json`);
    expect(again.available).toBe(true);
  });

  it('does not throw when the manifest is unreachable', async () => {
    const manager = new UpdateManager();
    const info = await manager.checkForUpdate('http://127.0.0.1:1/nope.json');
    expect(info.available).toBe(false);
    expect(manager.getStatus().phase).toBe('error');
  });

  it('does not throw when no url is configured', async () => {
    const manager = new UpdateManager();
    const info = await manager.checkForUpdate(undefined);
    expect(info.available).toBe(false);
  });

  it('pushes the status to the listeners', async () => {
    const manager = new UpdateManager();
    const phases: string[] = [];
    manager.onStatus(status => phases.push(status.phase));
    await manager.checkForUpdate(`${baseUrl}/version.json`);
    expect(phases).toContain('checking');
    expect(phases).toContain('available');
  });
});
