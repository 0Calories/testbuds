declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: 'development' | 'prod' | 'test';
			// PORT: string;
			// DATABASE_URL: string;
		}
	}
}

// If this file has no imports or exports, add an empty export to mark it as a module
export {};
