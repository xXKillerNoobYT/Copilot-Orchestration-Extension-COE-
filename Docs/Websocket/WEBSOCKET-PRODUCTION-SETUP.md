# Production WebSocket Broadcasting Configuration

> **Code Master Section 11.8-11.9**: Real-time event delivery to VS Code extension panels
>  
> Reference: TASK-mk6z8d3p-ws-prod

## Overview

This guide configures Laravel's broadcasting system to upgrade from the MVP 'log' driver to production-grade real-time broadcasting. The extension receives live updates for task status, verification results, test failures, observations, and audit events.

---

## Current Status (MVP)

**Driver**: `log`  
**Location**: `config/broadcasting.php` (line 62)  
**Behavior**: Events logged to `storage/logs/laravel.log` (not real-time)  

### MVP Limitations
- No real-time delivery to extension
- No WebSocket subscriptions
- Events visible only in logs
- Suitable for development, not production

---

## Production Options

### Option 1: Pusher (Recommended for quick setup)

**Pros**:
- Managed service (no infrastructure)
- Reliable, battle-tested
- Global CDN for low latency
- Easy debugging and monitoring

**Cons**:
- Paid service (~$49/month)
- Vendor lock-in

**Setup**:

1. **Sign up at pusher.com**
   ```
   Create account → Create app → Note down credentials
   - app_id
   - key  
   - secret
   - cluster (e.g., "mt1")
   ```

2. **Update `.env`**
   ```env
   BROADCAST_DRIVER=pusher
   PUSHER_APP_ID=your_app_id
   PUSHER_APP_KEY=your_app_key
   PUSHER_APP_SECRET=your_app_secret
   PUSHER_APP_CLUSTER=mt1
   ```

3. **Install Pusher PHP SDK**
   ```bash
   composer require pusher/pusher-php-server
   ```

4. **Extension setup**
   ```bash
   cd vscode-extension
   npm install pusher-js
   ```

5. **Create extension WebSocket client** (`src/services/pushWebSocketClient.ts`)
   ```typescript
   import Pusher from 'pusher-js';
   
   export class PusherWebSocketClient {
     private pusher: Pusher;
     
     constructor(appKey: string, cluster: string) {
       this.pusher = new Pusher(appKey, { cluster });
     }
     
     subscribe(channelName: string) {
       return this.pusher.subscribe(channelName);
     }
     
     listen(eventName: string, callback: (data: any) => void) {
       const channel = this.subscribe('mcp-events');
       channel.bind(eventName, callback);
     }
   }
   ```

---

### Option 2: Redis (Self-hosted, free)

**Pros**:
- Free (if already using Redis)
- Full control
- Fast in-memory messaging
- Works with Laravel Echo Server

**Cons**:
- Requires Redis server
- Requires laravel-echo-server
- More infrastructure management
- Scaling complexity

**Setup**:

1. **Install Redis**
   ```bash
   # Docker (easiest)
   docker run -d -p 6379:6379 redis:latest
   
   # Or macOS
   brew install redis
   redis-server
   
   # Or Windows
   # Use WSL2 or Docker
   ```

2. **Update `.env`**
   ```env
   BROADCAST_DRIVER=redis
   REDIS_HOST=127.0.0.1
   REDIS_PASSWORD=null
   REDIS_PORT=6379
   ```

3. **Install Laravel packages**
   ```bash
   composer require predis/predis
   ```

4. **Install laravel-echo-server**
   ```bash
   npm install -g laravel-echo-server
   
   laravel-echo-server init
   # Answer prompts:
   # - Redis host: 127.0.0.1
   # - Redis port: 6379
   # - HTTP port: 6001
   # - HTTPS: no (unless production)
   ```

5. **Start echo server**
   ```bash
   laravel-echo-server start
   ```

6. **Extension client setup**
   ```bash
   npm install laravel-echo socket.io-client
   ```

7. **Create extension client** (`src/services/echoWebSocketClient.ts`)
   ```typescript
   import Echo from 'laravel-echo';
   import io from 'socket.io-client';
   
   window.io = io;
   
   export const echo = new Echo({
     broadcaster: 'socket.io',
     host: 'localhost:6001',
   });
   ```

---

### Option 3: Soketi (Self-hosted Pusher alternative)

**Pros**:
- Free (open source)
- Drop-in Pusher replacement
- Fewer dependencies than echo-server
- Modern, WebSocket-based

**Cons**:
- Newer project (less battle-tested)
- Still requires running service

**Setup**:

1. **Install Soketi**
   ```bash
   npm install -g @soketi/soketi
   
   # Or Docker
   docker run -p 6001:6001 soketi/soketi:latest
   ```

2. **Configure Soketi** (`soketi.json`)
   ```json
   {
     "host": "0.0.0.0",
     "port": 6001,
     "appManager": {
       "array": {
         "apps": [
           {
             "id": "app-123",
             "key": "pusher-key-123",
             "secret": "pusher-secret-123",
             "maxConnections": 100000,
             "enableClientMessages": true
           }
         ]
       }
     }
   }
   ```

3. **Update `.env`** (pretend Pusher, but use Soketi)
   ```env
   BROADCAST_DRIVER=pusher
   PUSHER_APP_ID=app-123
   PUSHER_APP_KEY=pusher-key-123
   PUSHER_APP_SECRET=pusher-secret-123
   PUSHER_APP_CLUSTER=us-east-1
   PUSHER_HOST=localhost
   PUSHER_PORT=6001
   PUSHER_SCHEME=http
   ```

4. **Extension client** (same as Pusher)
   ```typescript
   import Pusher from 'pusher-js';
   
   const pusher = new Pusher('pusher-key-123', {
     cluster: 'us-east-1',
     wsHost: 'localhost',
     wsPort: 6001,
   });
   ```

---

## Extension Integration

### 1. Create WebSocket Service

**File**: `vscode-extension/src/services/webSocketClient.ts`

```typescript
import * as vscode from 'vscode';

export interface WebSocketConfig {
  driver: 'pusher' | 'redis' | 'soketi';
  host?: string;
  port?: number;
  appKey: string;
  cluster?: string;
  scheme?: 'http' | 'https';
}

export class WebSocketClient {
  private connection: any;
  private listeners: Map<string, (data: any) => void> = new Map();
  
  constructor(private config: WebSocketConfig) {}
  
  async connect(): Promise<void> {
    switch (this.config.driver) {
      case 'pusher':
        await this.connectPusher();
        break;
      case 'redis':
        await this.connectRedis();
        break;
      case 'soketi':
        await this.connectSoketi();
        break;
    }
  }
  
  private async connectPusher(): Promise<void> {
    const Pusher = (await import('pusher-js')).default;
    this.connection = new Pusher(this.config.appKey, {
      cluster: this.config.cluster || 'mt1',
    });
  }
  
  private async connectRedis(): Promise<void> {
    const Echo = (await import('laravel-echo')).default;
    const io = (await import('socket.io-client')).default;
    window.io = io;
    
    this.connection = new Echo({
      broadcaster: 'socket.io',
      host: `${this.config.host}:${this.config.port || 6001}`,
    });
  }
  
  private async connectSoketi(): Promise<void> {
    // Soketi uses Pusher protocol
    await this.connectPusher();
  }
  
  listen(event: string, callback: (data: any) => void): void {
    this.listeners.set(event, callback);
    this.connection.subscribe('mcp-events').bind(event, callback);
  }
  
  unlisten(event: string): void {
    this.listeners.delete(event);
  }
  
  disconnect(): void {
    if (this.connection) {
      this.connection.disconnect();
    }
  }
}
```

### 2. Update Extension Settings Panel

Add WebSocket driver selection to settings:

```typescript
// In SettingsPanel.getTabHtml()
<section class="settings-group">
  <h3>WebSocket Broadcasting</h3>
  <label>
    Driver:
    <select id="broadcast-driver" onchange="updateBroadcastDriver()">
      <option value="pusher">Pusher (Managed)</option>
      <option value="redis">Redis + Echo Server (Self-hosted)</option>
      <option value="soketi">Soketi (Self-hosted, Free)</option>
    </select>
  </label>
  
  <div id="pusher-config" style="display:none;">
    <label>App Key: <input type="text" id="pusher-key"></label>
    <label>Cluster: <input type="text" id="pusher-cluster" value="mt1"></label>
  </div>
  
  <div id="redis-config" style="display:none;">
    <label>Host: <input type="text" id="redis-host" value="localhost"></label>
    <label>Port: <input type="text" id="redis-port" value="6001"></label>
  </div>
  
  <button onclick="testWebSocket()">Test Connection</button>
</section>
```

### 3. Update MCP Client

Integrate WebSocket connection:

```typescript
// In services/mcpClient.ts
export class MCPClient {
  private ws: WebSocketClient;
  
  async initialize(config: MCPConfig): Promise<void> {
    // Initialize WebSocket based on config.broadcastDriver
    this.ws = new WebSocketClient({
      driver: config.broadcastDriver || 'pusher',
      appKey: config.broadcastAppKey,
      cluster: config.broadcastCluster,
      host: config.broadcastHost,
      port: config.broadcastPort,
    });
    
    await this.ws.connect();
    this.setupListeners();
  }
  
  private setupListeners(): void {
    this.ws.listen('task-status-updated', (data) => {
      vscode.window.showInformationMessage(`Task ${data.taskId} → ${data.status}`);
    });
    
    this.ws.listen('test-failure-alert', (data) => {
      vscode.window.showErrorMessage(`Test failed: ${data.message}`);
    });
    
    this.ws.listen('verification-completed', (data) => {
      // Update verification panel
    });
    
    this.ws.listen('observation-logged', (data) => {
      // Update audit dashboard
    });
  }
}
```

---

## Monitoring & Debugging

### Pusher
- Dashboard: app.pusher.com → Select your app
- Debug console: Real-time event viewer
- Logs: All events with timestamps

### Redis + Echo Server
```bash
# Check echo server is running
telnet localhost 6001

# View Redis keyspace
redis-cli
> KEYS *
> MONITOR
```

### Soketi
```bash
# Check process
ps aux | grep soketi

# View logs
soketi logs
```

---

## Testing Production Setup

### 1. Backend Test
```bash
php artisan tinker

# Publish test event
App\Events\TaskStatusUpdated::dispatch(
  Task::first(),
  'done',
  'Test from tinker'
);
```

### 2. Extension Test
```typescript
// In extension console
const ws = new WebSocketClient({
  driver: 'pusher',
  appKey: 'your-key',
  cluster: 'mt1'
});

await ws.connect();
ws.listen('task-status-updated', (data) => {
  console.log('Received:', data);
});
```

### 3. E2E Test (Dev Host)
1. Open VS Code Extension Dev Host
2. Open Audit Dashboard or Verification Panel
3. Run test task → expect real-time updates

---

## Migration Checklist

- [ ] Choose broadcasting driver
- [ ] Configure .env variables
- [ ] Install required packages
- [ ] Start broadcasting service
- [ ] Test backend event publishing
- [ ] Test extension WebSocket client
- [ ] Monitor event delivery
- [ ] Load test (if production)
- [ ] Document for team
- [ ] Update deployment scripts

---

## Troubleshooting

### Events not received in extension
- [ ] Check .env BROADCAST_DRIVER is set
- [ ] Verify BroadcastServiceProvider is in config/app.php
- [ ] Check WebSocket service is running
- [ ] Test with browser console in VS Code DevTools

### High latency
- [ ] Check network between backend and broadcast service
- [ ] Monitor broadcast service CPU/memory
- [ ] Consider adding CDN (for Pusher)
- [ ] Increase connection pooling

### Connection drops
- [ ] Add reconnection logic in extension
- [ ] Increase heartbeat interval
- [ ] Check firewall rules
- [ ] Monitor backend logs for errors

---

## References

- [Laravel Broadcasting Docs](https://laravel.com/docs/broadcasting)
- [Pusher SDK](https://pusher.com/docs/channels/getting_started/php)
- [Laravel Echo Server](https://github.com/laravel/echo-server)
- [Soketi Docs](https://docs.soketi.app/)
- [VS Code WebView API](https://code.visualstudio.com/api/extension-guides/webview)

---

## Next: Phase 6 Roadmap

Once production broadcasting is configured:
1. Full integration test (plan → execution → real-time updates)
2. Load testing with 100+ concurrent tasks
3. Production deployment guide
4. Monitoring and alerting setup
5. Team documentation

---

*Configuration guide for TASK-mk6z8d3p-ws-prod (Code Master Section 11.8-11.9)*
