import { describe, expect, it } from 'vitest';
import { mustChangePassword } from './mustChangePassword';

describe('mustChangePassword', () => {
  it('is true only when the profile flag is set', () => {
    expect(mustChangePassword(null)).toBe(false);
    expect(mustChangePassword({ must_change_password: false })).toBe(false);
    expect(mustChangePassword({ must_change_password: true })).toBe(true);
  });
});
