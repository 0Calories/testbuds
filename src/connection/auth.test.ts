import { describe, it, expect, vi } from 'vitest';
import { establishAuth, type AuthDriver } from './auth';

function makeFakeDriver() {
  const navigateCalls: string[] = [];
  const actCalls: string[] = [];
  const driver: AuthDriver = {
    navigateTo: vi.fn(async (url: string) => {
      navigateCalls.push(url);
    }),
    act: vi.fn(async (instruction: string) => {
      actCalls.push(instruction);
    }),
  };
  return { driver, navigateCalls, actCalls };
}

describe('establishAuth', () => {
  it('does nothing for a public connection', async () => {
    const { driver, navigateCalls, actCalls } = makeFakeDriver();
    await establishAuth(driver, { mode: 'public' });
    expect(navigateCalls).toEqual([]);
    expect(actCalls).toEqual([]);
  });

  it('logs in for a test-credential connection', async () => {
    const { driver, navigateCalls, actCalls } = makeFakeDriver();
    await establishAuth(driver, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'pw123',
    });
    expect(navigateCalls).toEqual(['https://app.example.com/login']);
    expect(actCalls.length).toBe(3);
    expect(actCalls.some((c) => c.includes('agent@test.com'))).toBe(true);
    expect(actCalls.some((c) => c.includes('pw123'))).toBe(true);
  });
});
