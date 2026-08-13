import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('editor locale safety', () => {
  it('TextEditorPage reloads editor state only from session, not locale callback', () => {
    const src = readFileSync(join(dir, 'TextEditorPage.tsx'), 'utf8');
    expect(src).toMatch(/setEditorValue\(session\.content\);[\s\S]*?\}, \[session\]\);/);
    expect(src).not.toMatch(/setEditorValue\(session\.content\);[\s\S]*?\}, \[session, t\]\);/);
  });

  it('OfficeEditorPage remounts OnlyOffice only from session, not locale callback', () => {
    const src = readFileSync(join(dir, 'OfficeEditorPage.tsx'), 'utf8');
    expect(src).toMatch(/void mountEditor\(\);[\s\S]*?\}, \[session\]\);/);
    expect(src).not.toMatch(/void mountEditor\(\);[\s\S]*?\}, \[session, t\]\);/);
  });
});
