# Jest + TypeScript Configuration Quick Reference

## ✅ Working Configuration (context-manager)

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "types": ["node", "jest"],  // ← KEY: Loads Jest globals for IDE
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]  // ← Tests excluded from build
}
```

### jest.config.js
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        types: ['node', 'jest']  // ← ts-jest knows about Jest types
      }
    }]
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts']
};
```

### package.json
```json
{
  "scripts": {
    "test": "jest --runInBand --detectOpenHandles --forceExit",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --runInBand"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.3"
  }
}
```

---

## 🔍 Troubleshooting

### Error: Cannot find name 'describe'
**Fix:** Add `"types": ["node", "jest"]` to `tsconfig.json` compilerOptions

### Error: File not under 'rootDir'
**Fix:** Ensure tests are in `exclude` list, not `include`. Let ts-jest handle them.

### Error: No tests found
**Fix:** Check `testMatch` pattern in `jest.config.js`

### Warning: Unknown cli config "--coverage"
**Fix:** Pass Jest flags in scripts, not through `npm run test -- --flag`

---

## 📋 Verification Commands

```bash
# Type check (should pass with 0 errors)
npx tsc --noEmit

# Run tests (should find and run all tests)
npm test

# Build library (should only compile src/)
npm run build

# Coverage report
npm run test:coverage
```

---

## 🎯 Key Principles

1. **Separation of Concerns**
   - `tsconfig.json` for building library (src/ only)
   - `jest.config.js` for running tests (ts-jest handles TypeScript)
   - Both need `types: ["jest"]` for IDE support

2. **IDE Support**
   - Adding `"jest"` to `types` loads `@types/jest` globally
   - VS Code gets autocomplete and error checking
   - Tests don't need to be in build config

3. **Runtime vs Build**
   - Build: TypeScript compiles `src/` → `dist/`
   - Runtime: ts-jest compiles tests on-the-fly
   - No conflict because tests are excluded from build

---

## 📚 References
- [Jest with TypeScript](https://jestjs.io/docs/getting-started#using-typescript)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [TypeScript types option](https://www.typescriptlang.org/tsconfig#types)
- [Jest CLI Options](https://jestjs.io/docs/cli)

---

## ✅ Success Metrics

- **TypeScript errors**: 0
- **Tests found**: 126 (6 suites)
- **Tests passing**: 126/126 (100%)
- **Build time**: ~2s
- **Test time**: ~6s
- **Coverage**: 85%+ branches, 90%+ lines
