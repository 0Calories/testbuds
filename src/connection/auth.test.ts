import { describe, it, expect, vi } from 'vitest';
import { establishAuth } from './auth';

type Call = { kind: string; args: unknown[] };

function fakePage(opts: {
  failOn?: 'goto' | 'fill-email' | 'fill-password' | 'click';
  /** URL the page reports AFTER a successful submit. Defaults to a post-login URL. */
  postSubmitUrl?: string;
  /** URL the page reports AFTER goto but BEFORE submit (i.e. still on login). */
  loginUrl?: string;
} = {}) {
  const calls: Call[] = [];
  const fillCalls: { selector: string; value: string }[] = [];
  let currentUrl = '';
  let submitClicked = false;

  function locator(selector: string) {
    return {
      first() {
        return {
          async fill(value: string, _o?: unknown) {
            const isPwd = selector === 'input[type="password"]';
            const isEmail = !isPwd;
            if (opts.failOn === 'fill-email' && isEmail) throw new Error('email fill failed');
            if (opts.failOn === 'fill-password' && isPwd) throw new Error('password fill failed');
            fillCalls.push({ selector, value });
            calls.push({ kind: 'fill', args: [selector, value] });
          },
        };
      },
    };
  }

  function getByRole(_role: string, _opts: unknown) {
    return {
      first() {
        return {
          async click() {
            if (opts.failOn === 'click') throw new Error('click failed');
            calls.push({ kind: 'click', args: [] });
            submitClicked = true;
            // Simulate post-submit navigation by flipping the reported URL.
            currentUrl = opts.postSubmitUrl ?? 'https://app.example.com/dashboard';
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
        currentUrl = url;
      },
      url() {
        return currentUrl;
      },
      locator,
      getByRole,
      async waitForLoadState(_state: string, _o?: unknown) {
        calls.push({ kind: 'waitForLoadState', args: [] });
      },
    } as unknown as Parameters<typeof establishAuth>[0],
    calls,
    fillCalls,
    get submitClicked() { return submitClicked; },
  };
}

describe('establishAuth', () => {
  it('returns false for a public connection and does nothing', async () => {
    const { page, calls } = fakePage();
    const result = await establishAuth(page, { mode: 'public' });
    expect(result).toBe(false);
    expect(calls).toEqual([]);
  });

  it('returns true when sign-in completes and the URL navigates away', async () => {
    const { page, calls, fillCalls } = fakePage({
      postSubmitUrl: 'https://app.example.com/dashboard',
    });
    const result = await establishAuth(page, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'pw123',
    });
    expect(result).toBe(true);
    expect(calls[0]).toEqual({ kind: 'goto', args: ['https://app.example.com/login'] });
    expect(fillCalls).toHaveLength(2);
    expect(fillCalls.find((c) => c.selector.includes('"email"'))?.value).toBe('agent@test.com');
    expect(fillCalls.find((c) => c.selector === 'input[type="password"]')?.value).toBe('pw123');
    expect(calls.some((c) => c.kind === 'click')).toBe(true);
  });

  it('returns false when the URL is still on loginUrl after submit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // postSubmitUrl matches the loginUrl prefix — simulates credentials rejected
    // (form stays on the login page with an inline error).
    const { page } = fakePage({ postSubmitUrl: 'https://app.example.com/login?error=invalid' });
    const result = await establishAuth(page, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'wrong',
    });
    expect(result).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns false and swallows interaction errors so the agent loop can continue', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { page } = fakePage({ failOn: 'fill-password' });
    const result = await establishAuth(page, {
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'agent@test.com',
      password: 'pw123',
    });
    expect(result).toBe(false);
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
