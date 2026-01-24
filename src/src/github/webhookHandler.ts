/**
 * GitHub webhook handler for task synchronization
 * Parses and dispatches GitHub webhook events
 */

import { createHmac } from 'crypto';

export interface GitHubWebhookPayload {
  action: string;
  issue?: {
    number: number;
    title: string;
    body?: string;
    state: string;
    labels: Array<{ name: string }>;
    assignees: Array<{ login: string }>;
    milestone?: { number: number; title: string };
    html_url: string;
  };
  pull_request?: {
    number: number;
    title: string;
    body?: string;
    state: string;
    html_url: string;
  };
  repository?: {
    name: string;
    owner: { login: string };
  };
  sender?: {
    login: string;
  };
}

export interface WebhookEvent {
  type: 'issue' | 'pull_request';
  action: string;
  payload: GitHubWebhookPayload;
  timestamp: string;
}

export type WebhookHandler = (event: WebhookEvent) => Promise<void>;

/**
 * Webhook processor for GitHub events
 */
export class WebhookProcessor {
  private secret: string;
  private handlers: Map<string, WebhookHandler[]> = new Map();

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Register a handler for webhook events
   * @param eventType Issue or pull_request
   * @param handler Handler function to call
   */
  onEvent(eventType: string, handler: WebhookHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.push(handler);
    }
  }

  /**
   * Verify webhook signature
   * @param payload Raw request body
   * @param signature X-Hub-Signature-256 header value
   * @returns true if signature is valid
   */
  verifySignature(payload: string, signature: string): boolean {
    const hmac = createHmac('sha256', this.secret);
    hmac.update(payload);
    const computed = `sha256=${hmac.digest('hex')}`;
    return computed === signature;
  }

  /**
   * Process an incoming webhook
   * @param payload Raw webhook payload
   * @param signature Signature header for verification
   * @returns Processing result with any errors
   */
  async processWebhook(payload: string, signature: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify signature
      if (!this.verifySignature(payload, signature)) {
        return { success: false, error: 'Invalid signature' };
      }

      // Parse payload
      const data: unknown = JSON.parse(payload);
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid JSON payload' };
      }

      const payloadObj = data as Record<string, unknown>;

      // Determine event type
      let eventType: 'issue' | 'pull_request' | null = null;
      if (payloadObj.issue) {
        eventType = 'issue';
      } else if (payloadObj.pull_request) {
        eventType = 'pull_request';
      }

      if (!eventType) {
        return { success: false, error: 'Unknown event type' };
      }

      const action = String(payloadObj.action || 'unknown');

      const event: WebhookEvent = {
        type: eventType,
        action,
        payload: payloadObj as unknown as GitHubWebhookPayload,
        timestamp: new Date().toISOString(),
      };

      // Call registered handlers
      const handlers = this.handlers.get(eventType) || [];
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Handler error for ${eventType}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process webhook: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * Parse issue webhook payload to extract relevant fields
 */
export function parseIssueWebhook(payload: GitHubWebhookPayload): {
  issueNumber: number;
  title: string;
  body?: string;
  state: string;
  labels: string[];
  assignees: string[];
  milestone?: string;
  url: string;
} | null {
  if (!payload.issue) return null;

  return {
    issueNumber: payload.issue.number,
    title: payload.issue.title,
    body: payload.issue.body,
    state: payload.issue.state,
    labels: payload.issue.labels.map((l) => l.name),
    assignees: payload.issue.assignees.map((a) => a.login),
    milestone: payload.issue.milestone?.title,
    url: payload.issue.html_url,
  };
}

/**
 * Create a sync event from GitHub issue update
 */
export interface SyncEvent {
  source: 'github' | 'task';
  action: 'created' | 'updated' | 'closed' | 'reopened';
  issueNumber: number;
  taskId?: string;
  title: string;
  state: string;
  labels: string[];
  assignees: string[];
  timestamp: string;
}

export function createSyncEvent(action: string, issue: ReturnType<typeof parseIssueWebhook>): SyncEvent | null {
  if (!issue) return null;

  let syncAction: 'created' | 'updated' | 'closed' | 'reopened' = 'updated';
  if (action === 'opened') {
    syncAction = 'created';
  } else if (action === 'closed') {
    syncAction = 'closed';
  } else if (action === 'reopened') {
    syncAction = 'reopened';
  }

  return {
    source: 'github',
    action: syncAction,
    issueNumber: issue.issueNumber,
    title: issue.title,
    state: issue.state,
    labels: issue.labels,
    assignees: issue.assignees,
    timestamp: new Date().toISOString(),
  };
}
