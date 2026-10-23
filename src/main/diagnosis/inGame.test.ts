import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  applyGameProfile,
  applyValuesToDocument,
  parseIni,
  revertGameConfig,
  serializeIni,
  type IniDocument,
} from './inGame.js';
import type { InGameGameConfig } from '../../shared/types/index.js';

const SAMPLE = `; Sample GameUserSettings.ini
[/Script/Engine.GameUserSettings]
bUseVSync=True
bUseDynamicResolution=False
FrameRateLimit=120.000000
PreferredRefreshRate=120.000000

[SystemSettings]
r.ShadowQuality=3
r.TextureQuality=2
`;

describe('parseIni', () => {
  it('splits sections and key/value pairs', () => {
    const doc = parseIni(SAMPLE);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].name).toBe('/Script/Engine.GameUserSettings');
    const vsync = doc.sections[0].entries.find(e => e.key === 'bUseVSync');
    expect(vsync?.value).toBe('True');
  });

  it('keeps comments in the preamble', () => {
    const doc = parseIni(SAMPLE);
    expect(doc.preamble.join('\n')).toContain('Sample GameUserSettings.ini');
  });
});

describe('applyValuesToDocument', () => {
  it('replaces existing values and reports the change', () => {
    const doc = parseIni(SAMPLE);
    const changed = applyValuesToDocument(
      doc,
      { '/Script/Engine.GameUserSettings': { bUseVSync: 'False' } },
      ['/Script/Engine.GameUserSettings']
    );
    expect(changed).toHaveLength(1);
    expect(changed[0]).toContain('bUseVSync');
    const vsync = doc.sections[0].entries.find(e => e.key === 'bUseVSync');
    expect(vsync?.value).toBe('False');
  });

  it('creates missing sections and keys', () => {
    const doc: IniDocument = { preamble: [], sections: [] };
    const changed = applyValuesToDocument(
      doc,
      { '/Script/Engine.Engine': { 't.MaxFPS': '240.000000' } },
      ['/Script/Engine.Engine']
    );
    expect(changed[0]).toContain('(nuevo)');
    expect(doc.sections[0].name).toBe('/Script/Engine.Engine');
    expect(doc.sections[0].entries[0].key).toBe('t.MaxFPS');
  });

  it('does not report a change when the value is identical', () => {
    const doc = parseIni(SAMPLE);
    const changed = applyValuesToDocument(
      doc,
      { '/Script/Engine.GameUserSettings': { FrameRateLimit: '120.000000' } },
      ['/Script/Engine.GameUserSettings']
    );
    expect(changed).toHaveLength(0);
  });
});

describe('serializeIni', () => {
  it('round-trips a document', () => {
    const doc = parseIni(SAMPLE);
    applyValuesToDocument(
      doc,
      { 'SystemSettings': { 'r.ShadowQuality': '0' } },
      ['SystemSettings']
    );
    const roundTrip = parseIni(serializeIni(doc));
    const shadow = roundTrip.sections
      .find(s => s.name === 'SystemSettings')
      ?.entries.find(e => e.key === 'r.ShadowQuality');
    expect(shadow?.value).toBe('0');
  });
});

describe('applyGameProfile / revertGameConfig', () => {
  let tmpDir = '';
  let configPath = '';

  const game: InGameGameConfig = {
    gameId: 'testgame',
    name: 'Test Game',
    executable: 'test.exe',
    configPath: '',
    supported: true,
    writableKeys: {
      '/Script/Engine.GameUserSettings': ['bUseVSync', 'FrameRateLimit'],
      'SystemSettings': ['r.ShadowQuality'],
    },
  };

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zt-ingame-'));
    configPath = path.join(tmpDir, 'GameUserSettings.ini');
    await fs.writeFile(configPath, SAMPLE, 'utf8');
    game.configPath = configPath;
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('applies a profile and keeps a backup', async () => {
    const result = await applyGameProfile(game, 'max_performance');
    expect(result.ok).toBe(true);
    expect(result.changedKeys.length).toBeGreaterThan(0);
    expect(result.backupPath).toBeTruthy();

    const written = await fs.readFile(configPath, 'utf8');
    const doc = parseIni(written);
    const vsync = doc.sections
      .find(s => s.name === '/Script/Engine.GameUserSettings')
      ?.entries.find(e => e.key === 'bUseVSync');
    expect(vsync?.value).toBe('False');

    // The backup holds the original content.
    const backup = await fs.readFile(result.backupPath!, 'utf8');
    expect(backup).toContain('bUseVSync=True');
  });

  it('restores the original file', async () => {
    const result = await revertGameConfig(game);
    expect(result.ok).toBe(true);
    const restored = await fs.readFile(configPath, 'utf8');
    expect(restored).toContain('bUseVSync=True');
  });
});
