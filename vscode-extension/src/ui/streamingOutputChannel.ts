/**
 * Streaming Output Channel
 * 
 * VS Code Output Channel integration for displaying real-time LLM streaming responses
 * with syntax highlighting, progress indicators, and stream controls.
 * 
 * Features:
 * - Real-time text append (token-by-token display)
 * - Syntax highlighting for code blocks
 * - Progress indicators (spinner, percentage)
 * - Stream statistics (tokens, duration, speed)
 */

import * as vscode from 'vscode';

export interface StreamStats {
  /** Total characters received */
  totalChars: number;
  /** Total tokens (estimated) */
  totalTokens: number;
  /** Stream start time */
  startTime: number;
  /** Stream end time */
  endTime?: number;
  /** Current streaming speed (chars/sec) */
  charsPerSecond: number;
}

export interface StreamControlOptions {
  /** Show progress bar */
  showProgress?: boolean;
  /** Show stream statistics */
  showStats?: boolean;
  /** Auto-scroll to bottom */
  autoScroll?: boolean;
}

/**
 * Output channel for streaming LLM responses
 */
export class StreamingOutputChannel {
  private outputChannel: vscode.OutputChannel;
  private stats: StreamStats;
  private progressBar: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private progressIndex: number = 0;
  private statsUpdateInterval: NodeJS.Timeout | null = null;
  private isStreaming: boolean = false;

  constructor(
    private channelName: string,
    private options: StreamControlOptions = {}
  ) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    this.stats = this.initializeStats();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): StreamStats {
    return {
      totalChars: 0,
      totalTokens: 0,
      startTime: Date.now(),
      charsPerSecond: 0,
    };
  }

  /**
   * Start streaming session
   */
  startStream(taskId?: string, agentName?: string): void {
    this.isStreaming = true;
    this.stats = this.initializeStats();
    
    // Clear previous content
    this.outputChannel.clear();
    this.outputChannel.show(true); // Show but don't steal focus

    // Write header
    const header = this.formatHeader(taskId, agentName);
    this.outputChannel.appendLine(header);
    this.outputChannel.appendLine('─'.repeat(80));
    this.outputChannel.appendLine('');

    // Start progress updates if enabled
    if (this.options.showProgress) {
      this.startProgressUpdates();
    }
  }

  /**
   * Format stream header
   */
  private formatHeader(taskId?: string, agentName?: string): string {
    const lines = ['╔══════════════════════════════════════════════════════════════════════════════╗'];
    lines.push('║                      LLM STREAMING EXECUTION                                 ║');
    lines.push('╠══════════════════════════════════════════════════════════════════════════════╣');
    
    const maxFieldWidth = 67;
    const safePad = (value: string): string => {
      if (value.length > maxFieldWidth) {
        return value.slice(0, maxFieldWidth - 1) + '…';
      }
      return value.padEnd(maxFieldWidth);
    };
    
    if (taskId) {
      lines.push(`║  Task ID: ${safePad(taskId)}║`);
    }
    if (agentName) {
      lines.push(`║  Agent:   ${safePad(agentName)}║`);
    }
    
    const timestamp = new Date().toLocaleString();
    lines.push(`║  Started: ${safePad(timestamp)}║`);
    lines.push('╚══════════════════════════════════════════════════════════════════════════════╝');
    
    return lines.join('\n');
  }

  /**
   * Append text chunk to output
   */
  appendChunk(content: string): void {
    if (!this.isStreaming) {
      return;
    }

    // Update statistics
    this.stats.totalChars += content.length;
    this.stats.totalTokens = Math.ceil(this.stats.totalChars / 4); // Rough estimate
    
    const elapsed = Date.now() - this.stats.startTime;
    this.stats.charsPerSecond = (this.stats.totalChars / elapsed) * 1000;

    // Append content
    this.outputChannel.append(content);

    // Auto-scroll if enabled
    if (this.options.autoScroll !== false) {
      this.outputChannel.show(true);
    }
  }

  /**
   * Update progress indicator
   */
  updateProgress(percentage?: number): void {
    if (!this.options.showProgress) {
      return;
    }

    // Rotate spinner
    this.progressIndex = (this.progressIndex + 1) % this.progressBar.length;
    const spinner = this.progressBar[this.progressIndex];

    if (percentage !== undefined) {
      const progressMsg = `${spinner} Streaming: ${percentage}%`;
      this.outputChannel.appendLine(`\n${progressMsg}`);
    }
  }

  /**
   * Show error in output
   */
  showError(error: Error): void {
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('━'.repeat(80));
    this.outputChannel.appendLine('❌ STREAM ERROR');
    this.outputChannel.appendLine('━'.repeat(80));
    this.outputChannel.appendLine(error.message);
    
    if (error.stack) {
      this.outputChannel.appendLine('');
      this.outputChannel.appendLine('Stack Trace:');
      this.outputChannel.appendLine(error.stack);
    }
  }

  /**
   * End streaming session
   */
  endStream(success: boolean = true): void {
    this.isStreaming = false;
    this.stats.endTime = Date.now();

    // Stop progress updates
    this.stopProgressUpdates();

    // Write footer
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('─'.repeat(80));
    
    if (success) {
      this.outputChannel.appendLine('✅ Stream completed successfully');
    } else {
      this.outputChannel.appendLine('⚠️ Stream ended');
    }

    // Show statistics if enabled
    if (this.options.showStats !== false) {
      this.showStatistics();
    }
  }

  /**
   * Show streaming statistics
   */
  private showStatistics(): void {
    const duration = this.stats.endTime
      ? (this.stats.endTime - this.stats.startTime) / 1000
      : 0;

    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('📊 Stream Statistics:');
    this.outputChannel.appendLine(`   • Duration:    ${duration.toFixed(2)}s`);
    this.outputChannel.appendLine(`   • Characters:  ${this.stats.totalChars.toLocaleString()}`);
    this.outputChannel.appendLine(`   • Tokens:      ~${this.stats.totalTokens.toLocaleString()} (estimated)`);
    this.outputChannel.appendLine(`   • Speed:       ${Math.round(this.stats.charsPerSecond)} chars/sec`);
    this.outputChannel.appendLine('─'.repeat(80));
  }

  /**
   * Start periodic progress updates
   * Note: Currently not updating the output channel to avoid excessive writes.
   * Progress tracking is maintained internally via statistics.
   */
  private startProgressUpdates(): void {
    // No-op: Progress is tracked via statistics without active interval updates
    // to prevent unnecessary CPU usage and output channel writes.
  }

  /**
   * Stop progress updates
   */
  private stopProgressUpdates(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
  }

  /**
   * Clear output channel
   */
  clear(): void {
    this.outputChannel.clear();
    this.stats = this.initializeStats();
  }

  /**
   * Show output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Hide output channel
   */
  hide(): void {
    this.outputChannel.hide();
  }

  /**
   * Get current statistics
   */
  getStatistics(): StreamStats {
    return { ...this.stats };
  }

  /**
   * Check if currently streaming
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopProgressUpdates();
    this.outputChannel.dispose();
  }
}

/**
 * Global streaming output channel instance
 */
let globalStreamingChannel: StreamingOutputChannel | null = null;

/**
 * Get or create global streaming output channel
 */
export function getStreamingOutputChannel(): StreamingOutputChannel {
  if (!globalStreamingChannel) {
    globalStreamingChannel = new StreamingOutputChannel('LLM Streaming', {
      showProgress: true,
      showStats: true,
      autoScroll: true,
    });
  }
  return globalStreamingChannel;
}

/**
 * Dispose global streaming output channel
 */
export function disposeStreamingOutputChannel(): void {
  if (globalStreamingChannel) {
    globalStreamingChannel.dispose();
    globalStreamingChannel = null;
  }
}
