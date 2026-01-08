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
          exclude: /node_modules/,
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
      llmClientTest: './src/llmClientTest.ts',
      'llm/transportTest': './src/llm/transportTest.ts',
      'copilotDispatcher.test': './src/copilotDispatcher.test.ts',
      'workspace/tasksSourceTest': './src/workspace/tasksSourceTest.ts',
      'commands/executeLLMTest': './src/commands/executeLLMTest.ts',
      'github/githubSyncTest': './src/github/githubSyncTest.ts',
      'panels/llmResponsePanelTest': './src/panels/llmResponsePanelTest.ts',
      'transport/transportTest': './src/transport/transportTest.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
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
          exclude: /node_modules/,
          use: [{ loader: 'ts-loader' }],
        },
      ],
    },
  },
];
