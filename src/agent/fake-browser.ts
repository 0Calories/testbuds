import type { BrowserSession, ActResult } from './browser';

/** In-memory BrowserSession for tests — records calls, returns scripted data. */
export class FakeBrowserSession implements BrowserSession {
  private url = 'https://example.com';
  observeResult: string[] = [];
  screenshotResult = '';
  actShouldFail = false;
  actError = 'element not found';

  navigateCalls: string[] = [];
  actCalls: string[] = [];
  closed = false;

  currentUrl(): string {
    return this.url;
  }

  async observe(): Promise<string[]> {
    return this.observeResult;
  }

  async screenshot(): Promise<string> {
    return this.screenshotResult;
  }

  async act(instruction: string): Promise<ActResult> {
    this.actCalls.push(instruction);
    return this.actShouldFail
      ? { success: false, error: this.actError }
      : { success: true };
  }

  async navigate(url: string): Promise<void> {
    this.navigateCalls.push(url);
    this.url = url;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}
