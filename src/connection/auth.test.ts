import { describe, it, expect } from 'vitest';
import { establishAuth } from './auth';
import { FakeBrowserSession } from '../agent/fake-browser';

describe('establishAuth', () => {
  it('does nothing for a public connection', async () => {
    const browser = new FakeBrowserSession();
    await establishAuth(browser, { mode: 'public' });
    expect(browser.navigateCalls).toEqual([]);
    expect(browser.actCalls).toEqual([]);
  });

  it('logs in for a test-credential connection', async () => {
    const browser = new FakeBrowserSession();
    await establishAuth(browser, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'pw123',
    });
    expect(browser.navigateCalls).toEqual(['https://app.example.com/login']);
    expect(browser.actCalls.length).toBe(3);
    expect(browser.actCalls.some((c) => c.includes('agent@test.com'))).toBe(true);
    expect(browser.actCalls.some((c) => c.includes('pw123'))).toBe(true);
  });
});
