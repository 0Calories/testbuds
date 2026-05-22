import { describe, it, expect } from 'vitest';
import { FakeBrowserSession } from './fake-browser';

describe('FakeBrowserSession', () => {
  it('records navigate calls and updates the url', async () => {
    const b = new FakeBrowserSession();
    await b.navigate('https://example.com/pricing');
    expect(b.navigateCalls).toEqual(['https://example.com/pricing']);
    expect(b.currentUrl()).toBe('https://example.com/pricing');
  });

  it('records act calls and reports success by default', async () => {
    const b = new FakeBrowserSession();
    const result = await b.act('click the button');
    expect(b.actCalls).toEqual(['click the button']);
    expect(result.success).toBe(true);
  });

  it('reports failure when actShouldFail is set', async () => {
    const b = new FakeBrowserSession();
    b.actShouldFail = true;
    const result = await b.act('click the missing button');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns the configured observe result', async () => {
    const b = new FakeBrowserSession();
    b.observeResult = ['a Sign Up button', 'a Pricing link'];
    expect(await b.observe()).toEqual(['a Sign Up button', 'a Pricing link']);
  });
});
