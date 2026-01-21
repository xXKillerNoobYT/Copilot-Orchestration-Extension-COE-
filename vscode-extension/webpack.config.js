/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = [
  // Main extension bundle
  {
    name: 'extension',
    target: 'node',
    mode: 'production',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode',
    },
    stats: {
      warnings: false,
    },
    ignoreWarnings: [
      /punycode/,
      /sqlite/,
    ],
    resolve: {
      extensions: ['.ts', '.js'],
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /__tests__/, /\.test\.ts$/],
          use: [{ 
            loader: 'ts-loader',
            options: {
              // transpileOnly: true disables TypeScript type-checking in this webpack build
              // Run `tsc --noEmit` (covering all TS files, including tests) separately in CI to catch type errors
              transpileOnly: true
            }
          }],
        },
      ],
    },
  },
  // Test and demo bundles
  {
    name: 'tools',
    target: 'node',
    mode: 'production',
    entry: {
      taskGraphTest: './src/taskGraphTest.ts',
      taskGraphDemo: './src/taskGraphDemo.ts',
      llmConfigTest: './src/llmConfigTest.ts',
      'config/llmConfig.test': './src/config/llmConfig.test.ts',
      'config/protocolValidation.test': './src/config/protocolValidation.test.ts',
      llmClientTest: './src/llmClientTest.ts',
      'llm/clientTest': './src/llm/clientTest.ts',
      'llm/openaiClient.errorHandling.test': './src/llm/openaiClient.errorHandling.test.ts',
      'llm/transportTest': './src/llm/transportTest.ts',
      'workspace/tasksSourceTest': './src/workspace/tasksSourceTest.ts',
      'commands/executeLLMTest': './src/commands/executeLLMTest.ts',
      'github/githubSyncTest': './src/github/githubSyncTest.ts',
      'panels/llmResponsePanelTest': './src/panels/llmResponsePanelTest.ts',
      'transport/transportTest': './src/transport/transportTest.ts',
      // GitHub sync test dependencies (test-time only, not in production bundle)
      // These are compiled as separate modules so githubSyncTest can load them at runtime
      // They are also marked as 'externals' below so webpack doesn't bundle them into the test file
      'github/webhookHandler': './src/github/webhookHandler.ts',
      'services/githubSyncService': './src/services/githubSyncService.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode',
      // GitHub sync test dependencies - mark as external so they're not bundled in test files
      './webhookHandler.js': 'commonjs ./webhookHandler.js',
      '../services/githubSyncService.js': 'commonjs ../services/githubSyncService.js',
    },
    stats: {
      warnings: false,
    },
    ignoreWarnings: [
      /punycode/,
      /sqlite/,
    ],
    resolve: {
      extensions: ['.ts', '.js'],
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /__tests__/],
          use: [{ 
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }],
        },
      ],
    },
  },
];
