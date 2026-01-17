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
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /__tests__/, /\.test\.ts$/],
          use: [{ loader: 'ts-loader' }],
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
      // Mocha test runner (for integration/agent loop tests)
      'extension.agentLoop.test': './src/extension.agentLoop.test.ts',
      // Integration test runner
      'integration/runTest': './src/integration/runTest.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode',
      mocha: 'commonjs mocha'
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
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /__tests__/],
          use: [{ loader: 'ts-loader' }],
        },
      ],
    },
  },
];
