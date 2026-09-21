module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  clearMocks: true,
  collectCoverageFrom: ["src/pkjs/index.js"],
  coverageDirectory: ".coverage",
  moduleNameMapper: {
    "^@rebble/clay$": "<rootDir>/tests/mocks/clay.js",
  },
};
