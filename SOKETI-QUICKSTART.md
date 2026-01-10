# Soketi WebSocket Quick Start Guide

**Status**: Ready to use  
**Soketi Version**: Latest (soketi/soketi:latest)  
**Extension Integration**: Complete  

---

## 60-Second Setup

### Step 1: Start Soketi Docker Container

```bash
docker-compose -f docker-compose.soketi.yml up -d
```

**Verify it's running**:
```bash
curl http://localhost:6001/ping
# Response: {"ok":true}
```

### Step 2: Configure VS Code Extension

Open VS Code with the Copilot Orchestrator extension.

1. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
2. **Type**: "Configure WebSocket"
3. **Select driver**: `soketi`
4. **Enter App Key**: `default-app-key`
5. **Enter Host**: `localhost`
6. **Enter Port**: `6001`

### Step 3: Connect to WebSocket

1. **Open Command Palette**: `Cmd+Shift+P`
2. **Type**: "Connect WebSocket"
3. **Check notification**: Should show "Connected to soketi ✓"

### Done! 🎉

WebSocket connection is active. The extension will now receive real-time events from the backend.

---

## What is Soketi?

**Soketi** is a free, open-source alternative to Pusher that runs WebSocket servers for real-time messaging.

- **Cost**: Free (self-hosted)
- **Protocol**: Pusher-compatible WebSocket
- **Performance**: Fast, low-latency
- **Scalability**: Horizontal scaling supported
- **Ideal for**: Development, testing, and self-hosted production

---

## Docker Container Details

**File**: `docker-compose.soketi.yml`

### Configuration

```yaml
services:
  soketi:
    image: soketi/soketi:latest
    ports:
      - "6001:6001"          # WebSocket port
    environment:
      DEFAULT_APP_ID: "app-123"
      DEFAULT_APP_KEY: "app-key-123"
      DEFAULT_APP_SECRET: "app-secret-123"
      DEBUG: "1"              # Enable debug logging
      LOG_LEVEL: "debug"
```

### Credentials

Default credentials for development:
- **App ID**: `app-123`
- **App Key**: `app-key-123`
- **App Secret**: `app-secret-123`

⚠️ **Change these for production!**

---

## Common Commands

### Start Soketi
```bash
docker-compose -f docker-compose.soketi.yml up -d
```

### Stop Soketi
```bash
docker-compose -f docker-compose.soketi.yml down
```

### View Logs
```bash
docker-compose -f docker-compose.soketi.yml logs -f soketi
```

### Restart Soketi
```bash
docker-compose -f docker-compose.soketi.yml restart soketi
```

### Health Check
```bash
curl http://localhost:6001/ping
curl http://localhost:6001/health
```

---

## Testing WebSocket Connectivity

### From Extension

1. **Configure WebSocket** (if not done)
2. **Open Command Palette**: `Cmd+Shift+P`
3. **Type**: "Test WebSocket"
4. **Result**: Should show "Connected to soketi ✓"

### From Command Line

```bash
# Test using curl
curl http://localhost:6001/ping

# Test using websocat (requires installation)
websocat ws://localhost:6001/app/app-key-123
```

### From Browser Console

```javascript
const Pusher = require('pusher-js/dist/web/pusher');

const pusher = new Pusher('app-key-123', {
  cluster: 'us-east-1',
  wsHost: 'localhost',
  wsPort: 6001,
  disableStats: true,
  forceTLS: false,
});

pusher.connection.bind('connected', () => {
  console.log('✓ Connected to Soketi');
});
```

---

## Publishing Events (Backend)

### Laravel Example

Publish a task status event:

```php
// In app/Services/TaskService.php or similar
use App\Models\Task;
use App\Events\TaskStatusUpdated;

public function updateTaskStatus(Task $task, string $newStatus) {
    $task->update(['status' => $newStatus]);
    
    // Broadcast event to all connected clients
    TaskStatusUpdated::dispatch($task, $newStatus);
}
```

Define the event:

```php
// app/Events/TaskStatusUpdated.php
namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskStatusUpdated implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task,
        public string $newStatus
    ) {}

    public function broadcastOn(): Channel {
        return new Channel('mcp-events');
    }

    public function broadcastAs(): string {
        return 'task-status-updated';
    }

    public function broadcastWith(): array {
        return [
            'taskId' => $this->task->id,
            'status' => $this->newStatus,
            'timestamp' => now(),
        ];
    }
}
```

### Configure Laravel Broadcasting

In `config/broadcasting.php`:

```php
'default' => env('BROADCAST_DRIVER', 'pusher'),

'connections' => [
    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'useTLS' => false,
            // Use Soketi instead of Pusher
            'host' => env('PUSHER_HOST', 'api.pusherapp.com'),
            'port' => env('PUSHER_PORT', 80),
            'scheme' => env('PUSHER_SCHEME', 'http'),
        ],
    ],
],
```

In `.env`:

```env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=app-123
PUSHER_APP_KEY=app-key-123
PUSHER_APP_SECRET=app-secret-123
PUSHER_APP_CLUSTER=us-east-1
PUSHER_HOST=localhost
PUSHER_PORT=6001
PUSHER_SCHEME=http
```

---

## Receiving Events in Extension

### Auto-subscribed Events

The extension automatically subscribes to these events when connected:

1. **`task-status-updated`** → Shows info notification
2. **`test-failure-alert`** → Shows error notification
3. **`observation-logged`** → Logs to console
4. **`verification-completed`** → Shows info notification

### Custom Event Subscriptions

To subscribe to custom events in a panel:

```typescript
import { getWebSocketClient } from '../services/webSocketClient';

class MyPanel {
  private setupWebSocketListeners(): void {
    const ws = getWebSocketClient();
    if (!ws) {
      console.warn('WebSocket not connected');
      return;
    }

    ws.subscribe('mcp-events', 'custom-event', (data) => {
      console.log('Received custom event:', data);
      this.updatePanel(data);
    });
  }
}
```

---

## Production Deployment

### Soketi on Production Server

1. **Install Docker** on your production server
2. **Copy docker-compose.soketi.yml** to server
3. **Update credentials** in environment variables
4. **Use Docker Compose**:
   ```bash
   docker-compose -f docker-compose.soketi.yml up -d --restart=always
   ```
5. **Enable TLS** for security:
   ```bash
   # Use a reverse proxy (nginx, caddy) or enable TLS in Soketi config
   ```

### Scaling Soketi

For high-traffic production:

```bash
# Run multiple Soketi instances behind load balancer
docker-compose -f docker-compose.soketi.yml up -d --scale soketi=3
```

Or use Kubernetes:

```yaml
# kubernetes/soketi.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: soketi
spec:
  replicas: 3
  selector:
    matchLabels:
      app: soketi
  template:
    metadata:
      labels:
        app: soketi
    spec:
      containers:
      - name: soketi
        image: soketi/soketi:latest
        ports:
        - containerPort: 6001
        env:
        - name: DEFAULT_APP_KEY
          valueFrom:
            secretKeyRef:
              name: soketi-secrets
              key: app-key
```

---

## Troubleshooting

### Issue: "Connection failed"

**Check if Soketi is running**:
```bash
docker ps | grep soketi
```

If not running, start it:
```bash
docker-compose -f docker-compose.soketi.yml up -d
```

### Issue: "Port 6001 already in use"

**Check what's using port 6001**:
```bash
# On Mac/Linux
lsof -i :6001

# On Windows
netstat -ano | findstr :6001
```

**Solution**: Either stop the conflicting service or change the port in `docker-compose.soketi.yml`.

### Issue: "WebSocket connection dropped"

**Possible causes**:
1. Soketi crashed → Check logs: `docker-compose logs soketi`
2. Network issue → Check firewall rules
3. Extension error → Check VS Code output panel

**Recovery**:
1. Restart Soketi: `docker-compose restart soketi`
2. Reconnect extension: Command Palette → "Disconnect WebSocket" → "Connect WebSocket"

### Issue: "Events not received in extension"

**Check event publishing** in backend:
```php
Log::info('Broadcasting event', ['event' => 'task-status-updated']);
TaskStatusUpdated::dispatch($task, $newStatus);
```

**Check WebSocket subscription** in extension:
```typescript
const ws = getWebSocketClient();
const status = ws?.getStatus();
console.log('WebSocket status:', status);
```

**Verify channel name** matches:
- Backend publishes to: `mcp-events`
- Extension subscribes to: `mcp-events`

---

## Performance Tips

1. **Event debouncing**: Avoid publishing too many events (>100/sec)
2. **Batch updates**: Combine multiple status changes into one event
3. **Monitor memory**: Soketi uses ~50MB base + ~1MB per 1000 connections
4. **Connection limits**: Default 100,000 max connections per Soketi instance
5. **Clean disconnections**: Always call `disposeWebSocketClient()` on extension shutdown

---

## Next Steps

1. ✅ Soketi running locally
2. ✅ Extension configured and connected
3. → **Backend integration**: Add event publishing (see Laravel example above)
4. → **Panel integration**: Add event listeners to your panels
5. → **Production deployment**: Move to your production server

---

## References

- **Soketi Docs**: https://docs.soketi.app/
- **Pusher SDK**: https://pusher.com/docs/channels/using_channels/client-api
- **Laravel Broadcasting**: https://laravel.com/docs/broadcasting
- **Docker**: https://www.docker.com/
- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

---

**Questions or issues?** Check the main [WEBSOCKET-PRODUCTION-SETUP.md](./WEBSOCKET-PRODUCTION-SETUP.md) or [WEBSOCKET-PRODUCTION-PHASE1-COMPLETE.md](./WEBSOCKET-PRODUCTION-PHASE1-COMPLETE.md) documents.
