/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        moduleResolution: 'Node16',
        module: 'Node16',
        noEmit: false,
      },
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@forumkit/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  coverageThreshold: {
    global: { lines: 80 },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/providers/**',
  ],
};
