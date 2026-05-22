/** How the agent gets into the target product. Spec §8 modes 1 and 3. */
export type Connection =
  | { mode: 'public' }
  | {
      mode: 'test-credential';
      loginUrl: string;
      username: string;
      password: string;
    };
