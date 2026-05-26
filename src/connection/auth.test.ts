import { describe, it, expect, vi } from 'vitest';
import { establishAuth } from './auth';

type Call = { kind: string; args: unknown[] };

function fakePage(opts: {
  failOn?: 'goto' | 'fill-email' | 'fill-password' | 'click';
} = {}) {
  const calls: Call[] = [];
  const fillCalls: { selector: string; value: string }[] = [];

  const isSubmitSelector = (s: string) =>
    s.includes('button[type="submit"]') || s.includes(':has-text(');
  const isPasswordSelector = (s: string) => s === 'input[type="password"]';

  function locator(selector: string) {
    return {
      first() {
        return {
          async fill(value: string, _o?: unknown) {
            const isPwd = isPasswordSelector(selector);
            const isEmail = !isPwd && !isSubmitSelector(selector);
            if (opts.failOn === 'fill-email' && isEmail) throw new Error('email fill failed');
            if (opts.failOn === 'fill-password' && isPwd) throw new Error('password fill failed');
            fillCalls.push({ selector, value });
            calls.push({ kind: 'fill', args: [selector, value] });
          },
          async click() {
            if (!isSubmitSelector(selector)) throw new Error('click on non-submit selector');
            if (opts.failOn === 'click') throw new Error('click failed');
            calls.push({ kind: 'click', args: [selector] });
          },
        };
      },
    };
  }

  return {
    page: {
      async goto(url: string, _o?: unknown) {
        if (opts.failOn === 'goto') throw new Error('goto failed');
        calls.push({ kind: 'goto', args: [url] });
      },
      locator,
      async waitForLoadState(_state: string, _o?: unknown) {
        calls.push({ kind: 'waitForLoadState', args: [] });
      },
    } as unknown as Parameters<typeof establishAuth>[0],
    calls,
    fillCalls,
  };
}

describe('establishAuth', () => {
  it('does nothing for a public connection', async () => {
    const { page, calls } = fakePage();
    await establishAuth(page, { mode: 'public' });
    expect(calls).toEqual([]);
  });

  it('navigates, fills email + password, and clicks submit', async () => {
    const { page, calls, fillCalls } = fakePage();
    await establishAuth(page, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'pw123',
    });
    expect(calls[0]).toEqual({ kind: 'goto', args: ['https://app.example.com/login'] });
    expect(fillCalls).toHaveLength(2);
    expect(fillCalls.find((c) => c.selector.includes('"email"'))?.value).toBe('agent@test.com');
    expect(fillCalls.find((c) => c.selector === 'input[type="password"]')?.value).toBe('pw123');
    expect(calls.some((c) => c.kind === 'click')).toBe(true);
  });

  it('swallows interaction errors so the agent loop can continue', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { page } = fakePage({ failOn: 'fill-password' });
    await expect(
      establishAuth(page, {
        mode: 'test-credential',
        loginUrl: 'https://app.example.com/login',
        username: 'agent@test.com',
        password: 'pw123',
      }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not include the password in the warn message on failure', async () => {
    const messages: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((msg: unknown) => {
      messages.push(String(msg));
    });
    const { page } = fakePage({ failOn: 'fill-password' });
    await establishAuth(page, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'CANARY-pw-do-not-log',
    });
    expect(messages.join('\n')).not.toContain('CANARY-pw-do-not-log');
    warn.mockRestore();
  });
});
