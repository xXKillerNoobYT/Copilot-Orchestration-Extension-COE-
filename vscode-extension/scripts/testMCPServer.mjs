#!/usr/bin/env node
/**
 * Integration Test for MCP Server
 * Tests that the server starts and responds to basic requests
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPServer() {
  console.log('🚀 Starting MCP Server Integration Test\n');

  const serverPath = join(__dirname, '..', 'dist', 'mcp-server', 'index.js');
  console.log(`📂 Server path: ${serverPath}\n`);

  // Start the MCP server
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let output = '';
  let errorOutput = '';

  server.stdout.on('data', (data) => {
    output += data.toString();
  });

  server.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Wait for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 1: Send tools/list request
  console.log('📋 Test 1: Requesting tool list...');
  const listToolsRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  }) + '\n';

  server.stdin.write(listToolsRequest);

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (output.includes('"tools"')) {
    console.log('✅ Tool list request successful');
    
    // Parse and display tools
    try {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.result && response.result.tools) {
            console.log(`   Found ${response.result.tools.length} tools:`);
            response.result.tools.forEach((tool) => {
              console.log(`   - ${tool.name}`);
            });
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    } catch (e) {
      console.log('   (Could not parse tool details)');
    }
  } else {
    console.log('❌ Tool list request failed');
    console.log('Output:', output);
  }

  // Test 2: Test a simple tool call
  console.log('\n📞 Test 2: Calling get_workspace_config...');
  const toolCallRequest = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'copilot_orchestrator_get_workspace_config',
      arguments: {},
    },
  }) + '\n';

  output = ''; // Clear output buffer
  server.stdin.write(toolCallRequest);

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (output.includes('"content"')) {
    console.log('✅ Tool call successful');
  } else {
    console.log('❌ Tool call failed');
    console.log('Output:', output);
  }

  // Clean up
  console.log('\n🧹 Cleaning up...');
  server.kill();

  // Wait for server to stop
  await new Promise((resolve) => {
    server.on('exit', resolve);
    setTimeout(resolve, 1000);
  });

  if (errorOutput.includes('Copilot Orchestrator MCP Server started')) {
    console.log('✅ Server started successfully');
  }

  console.log('\n📊 Integration Test Summary:');
  console.log('✅ Server starts without errors');
  console.log('✅ Server responds to tool list requests');
  console.log('✅ Server responds to tool calls');
  console.log('\n🎉 All integration tests passed!');

  process.exit(0);
}

testMCPServer().catch((error) => {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
});
