export function createTestEnvironment(): Promise<{
  root: string;
  userData: string;
  extensions: string;
  port: number;
}>;
