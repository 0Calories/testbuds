import { describe, it, expect } from 'vitest';
import { userDataDirFor } from './storage-state';

describe('userDataDirFor', () => {
  it('returns a stable directory path keyed by loginUrl + username', () => {
    const a = userDataDirFor({ loginUrl: 'https://x.com/login', username: 'alice' }, '/data');
    const b = userDataDirFor({ loginUrl: 'https://x.com/login', username: 'alice' }, '/data');
    expect(a).toBe(b);
    expect(a).toMatch(/^\/data\/auth\/[0-9a-f]{64}$/);
  });

  it('different identities produce different paths', () => {
    const a = userDataDirFor({ loginUrl: 'https://x.com/login', username: 'alice' }, '/data');
    const b = userDataDirFor({ loginUrl: 'https://x.com/login', username: 'bob' }, '/data');
    expect(a).not.toBe(b);
  });

  it('different dataDir roots produce different paths', () => {
    const a = userDataDirFor({ loginUrl: 'https://x.com/login', username: 'alice' }, '/data1');
    const b = userDataDirFor({ loginUrl: 'https://x.com/login', username: 'alice' }, '/data2');
    expect(a).not.toBe(b);
  });
});
