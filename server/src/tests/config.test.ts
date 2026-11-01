import { describe, expect, it } from 'vitest';

import { readConfig } from '../config.js';

const baseEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost:27017/libery-test',
  JWT_ACCESS_SECRET: 'test-signing-secret-that-is-at-least-32-bytes',
};

describe('server configuration', () => {
  it('allows Cloudinary to remain unconfigured', () => {
    expect(readConfig(baseEnvironment).cloudinary).toBeUndefined();
  });

  it('requires all Cloudinary credentials together', () => {
    expect(() => readConfig({
      ...baseEnvironment,
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
    })).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it('loads Cloudinary credentials as server-only configuration', () => {
    expect(readConfig({
      ...baseEnvironment,
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    }).cloudinary).toEqual({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });
  });
});
