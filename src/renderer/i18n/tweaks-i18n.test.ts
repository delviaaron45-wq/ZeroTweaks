// Every tweak must be translatable: the i18n keys declared on the tweak
// objects have to exist in both catalogues and resolve to a real string.
//
// `i18next.t` returns the key itself when the translation is missing, so the
// lookup is done by hand against the plain catalogue objects.
import { describe, expect, it } from 'vitest';
import { allTweaks } from '../../shared/tweaks';
import { es } from './locales/es';
import { en } from './locales/en';

const KEY_FIELDS = ['nameKey', 'descriptionKey', 'whenHelpsKey'] as const;

/** Walks a dotted key through a catalogue object, like i18next does. */
function resolveKey(catalogue: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalogue
    );
}

describe('tweaks i18n', () => {
  it('declares a non-empty i18n key for name, description and whenHelps', () => {
    expect(allTweaks.length).toBeGreaterThan(0);
    for (const tweak of allTweaks) {
      for (const field of KEY_FIELDS) {
        const key = tweak[field];
        expect(typeof key, `${tweak.id}: ${field} must be a string`).toBe('string');
        expect((key as string).trim(), `${tweak.id}: ${field} must not be empty`).not.toBe('');
      }
    }
  });

  it('resolves every key to a non-empty string in both languages', () => {
    const languages: Array<[string, unknown]> = [
      ['es', es],
      ['en', en],
    ];
    for (const tweak of allTweaks) {
      for (const field of KEY_FIELDS) {
        const key = tweak[field] as string;
        for (const [lang, catalogue] of languages) {
          const value = resolveKey(catalogue, key);
          expect(
            typeof value,
            `${lang}: no translation for ${key} (${tweak.id}.${field})`
          ).toBe('string');
          expect(
            (value as string).trim(),
            `${lang}: empty translation for ${key} (${tweak.id}.${field})`
          ).not.toBe('');
        }
      }
    }
  });

  it('uses no duplicated keys between tweaks', () => {
    const owners = new Map<string, string>();
    const duplicates: string[] = [];
    for (const tweak of allTweaks) {
      for (const field of KEY_FIELDS) {
        const key = tweak[field] as string;
        const owner = owners.get(key);
        if (owner) {
          duplicates.push(`${key} (${owner} and ${tweak.id})`);
        } else {
          owners.set(key, tweak.id);
        }
      }
    }
    expect(duplicates).toEqual([]);
    expect(owners.size).toBe(allTweaks.length * KEY_FIELDS.length);
  });
});
