module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  clearMocks: true,
  moduleNameMapper: {
    "^@rebble/clay$": "<rootDir>/tests/mocks/clay.js",
  },
};
