export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@forumkit/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@forumkit/ai$': '<rootDir>/../../packages/ai/src/index.ts',
    '^@xenova/transformers$': '<rootDir>/tests/__mocks__/xenova-transformers.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: { moduleResolution: 'Node16', module: 'Node16', isolatedModules: true },
    }],
  },
  testTimeout: 15000,
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
