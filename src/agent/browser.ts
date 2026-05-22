import { Stagehand } from '@browserbasehq/stagehand';

export interface ActResult {
  success: boolean;
  error?: string;
}

/** A browser the agent can observe and act on. */
export interface BrowserSession {
  currentUrl(): string;
  /** Plain-language descriptions of the actionable elements on the page. */
  observe(): Promise<string[]>;
  /** A PNG screenshot of the viewport, base64-encoded. */
  screenshot(): Promise<string>;
  /** Execute a plain-language instruction (click/type/scroll). */
  act(instruction: string): Promise<ActResult>;
  navigate(url: string): Promise<void>;
  close(): Promise<void>;
}

/** BrowserSession backed by Stagehand running on a Browserbase hosted browser. */
export class StagehandBrowser implements BrowserSession {
  private constructor(private readonly stagehand: Stagehand) {}

  static async create(): Promise<StagehandBrowser> {
    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      model: {
        modelName: 'anthropic/claude-sonnet-4-6',
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
    });
    await stagehand.init();
    return new StagehandBrowser(stagehand);
  }

  currentUrl(): string {
    return this.stagehand.context?.activePage()?.url() ?? '';
  }

  async observe(): Promise<string[]> {
    if (!this.stagehand.context) {
      throw new Error('Browserbase session is no longer available (likely timed out)');
    }
    const results = await this.stagehand.observe();
    return results.map((r) => r.description);
  }

  async screenshot(): Promise<string> {
    const page = this.stagehand.context?.activePage();
    if (!page) return '';
    const buffer = await page.screenshot();
    return Buffer.from(buffer).toString('base64');
  }

  async act(instruction: string): Promise<ActResult> {
    if (!this.stagehand.context) {
      return { success: false, error: 'Browserbase session is no longer available (likely timed out)' };
    }
    try {
      const result = await this.stagehand.act(instruction);
      return { success: result.success, error: result.success ? undefined : result.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async navigate(url: string): Promise<void> {
    const page = this.stagehand.context?.activePage();
    if (!page) throw new Error('Browserbase session is no longer available (likely timed out)');
    await page.goto(url);
  }

  async close(): Promise<void> {
    await this.stagehand.close();
  }
}
