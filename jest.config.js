module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          types: ["node", "jest"],
          esModuleInterop: true,
          skipLibCheck: true
        }
      }
    ]
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/server.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleDirectories: ["node_modules", "<rootDir>"],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"]
};
