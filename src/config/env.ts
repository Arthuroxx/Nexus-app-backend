export const REQUIRED_ENV_VARS = ['JWT_SECRET'] as const;

export const isMissing = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim().length === 0;

export const validateEnv = (config: Record<string, unknown>) => {
  const missing = REQUIRED_ENV_VARS.filter((name) => isMissing(config[name]));
  if (missing.length > 0) {
    const plural = missing.length > 1;
    throw new Error(
      `Missing required environment variable${plural ? 's' : ''}: ${missing.join(', ')}. Define ${plural ? 'them' : 'it'} in your .env file and restart the server.`,
    );
  }
  return config;
};

export const requireEnv = (name: string) => {
  const value = process.env[name];
  if (isMissing(value)) {
    throw new Error(
      `Missing required environment variable: ${name}. Define it in your .env file and restart the server.`,
    );
  }
  return value as string;
};

export const optionalEnv = (name: string, fallback: string) => {
  const value = process.env[name];
  return isMissing(value) ? fallback : (value as string);
};
