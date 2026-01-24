import * as vscode from 'vscode';
import { ParsedTask } from './taskParser';
import { TaskStatusParser } from './taskStatusParser';

/**
 * TaskFileSyntaxHighlighter: Provides custom syntax highlighting and decorations
 * for .task.md files, including:
 * - YAML front matter field highlighting
 * - Status badge decorations
 * - Priority indicators
 * - Dependency linking
 * - Section headers with context
 */
export class TaskFileSyntaxHighlighter {
  private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
  private statusParser: TaskStatusParser;

  constructor() {
    this.statusParser = new TaskStatusParser();
    this.createDecorationTypes();
  }

  /**
   * Create custom decoration types for different task elements
   */
  private createDecorationTypes(): void {
    // Status field highlighting
    this.decorationTypes.set(
      'statusField',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(100, 150, 255, 0.2)',
        textDecoration: 'underline wavy',
        cursor: 'pointer',
      })
    );

    // Priority field highlighting
    this.decorationTypes.set(
      'priorityField',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 150, 100, 0.2)',
        textDecoration: 'underline wavy',
      })
    );

    // Dependency reference highlighting
    this.decorationTypes.set(
      'dependencyRef',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(150, 200, 100, 0.15)',
        color: new vscode.ThemeColor('terminal.ansiGreen'),
        cursor: 'pointer',
      })
    );

    // Type field highlighting
    this.decorationTypes.set(
      'typeField',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(200, 100, 255, 0.15)',
        textDecoration: 'underline dotted',
      })
    );

    // Required field highlighting
    this.decorationTypes.set(
      'requiredField',
      vscode.window.createTextEditorDecorationType({
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 200, 0, 0.1)',
      })
    );

    // Invalid field warning
    this.decorationTypes.set(
      'invalidField',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        textDecoration: 'wavy underline red',
      })
    );

    // Markdown section header
    this.decorationTypes.set(
      'sectionHeader',
      vscode.window.createTextEditorDecorationType({
        fontWeight: 'bold',
        color: new vscode.ThemeColor('markdown.link.foreground'),
        backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackgroundColor'),
      })
    );

    // Inline code (references to task IDs, etc.)
    this.decorationTypes.set(
      'taskReference',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(100, 100, 255, 0.1)',
        color: new vscode.ThemeColor('textPreformat.foreground'),
        cursor: 'pointer',
      })
    );

    // GitHub issue reference
    this.decorationTypes.set(
      'githubIssueRef',
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(0, 100, 150, 0.15)',
        color: new vscode.ThemeColor('terminal.ansiCyan'),
        cursor: 'pointer',
      })
    );
  }

  /**
   * Apply syntax highlighting to a .task.md file
   */
  applySyntaxHighlighting(editor: vscode.TextEditor): void {
    const document = editor.document;

    if (!document.uri.fsPath.endsWith('.task.md')) {
      return;
    }

    const text = document.getText();

    // Parse to get structure
    const result = this.statusParser.parseTaskFile(document.uri.fsPath, text);
    if (!result.task) {
      return;
    }

    // Apply YAML front matter highlighting
    this.highlightYAMLFrontMatter(editor, document, text, result.task);

    // Apply markdown body highlighting
    this.highlightMarkdownBody(editor, document, text, result.task);

    // Apply inline references
    this.highlightInlineReferences(editor, document, text);
  }

  /**
   * Highlight YAML front matter fields
   */
  private highlightYAMLFrontMatter(
    editor: vscode.TextEditor,
    document: vscode.TextDocument,
    text: string,
    task: ParsedTask
  ): void {
    const frontMatterMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) {
      return;
    }

    const frontMatterStart = 1; // Line after opening ---
    const lines = frontMatterMatch[1].split('\n');

    const statusDecorations: vscode.DecorationOptions[] = [];
    const priorityDecorations: vscode.DecorationOptions[] = [];
    const typeDecorations: vscode.DecorationOptions[] = [];
    const requiredDecorations: vscode.DecorationOptions[] = [];
    const dependencyDecorations: vscode.DecorationOptions[] = [];
    const invalidDecorations: vscode.DecorationOptions[] = [];

    const requiredFields = ['id', 'title', 'type', 'priority', 'status'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = frontMatterStart + i;
      const range = new vscode.Range(lineNum, 0, lineNum, line.length);

      // Match field: value pattern
      const fieldMatch = line.match(/^(\s*)([a-z_]+):\s*(.*)$/);
      if (!fieldMatch) {
        continue;
      }

      const [, indent, field, value] = fieldMatch;
      const fieldStart = lineNum;
      const fieldRange = new vscode.Range(
        fieldStart,
        indent.length,
        fieldStart,
        indent.length + field.length
      );

      // Highlight required fields
      if (requiredFields.includes(field)) {
        requiredDecorations.push({ range: fieldRange });
      }

      // Status field highlighting
      if (field === 'status') {
        const valueStart = indent.length + field.length + 2;
        const valueRange = new vscode.Range(fieldStart, valueStart, fieldStart, valueStart + value.length);
        statusDecorations.push({ range: valueRange });
      }

      // Priority field highlighting
      if (field === 'priority') {
        const valueStart = indent.length + field.length + 2;
        const valueRange = new vscode.Range(fieldStart, valueStart, fieldStart, valueStart + value.length);
        priorityDecorations.push({ range: valueRange });
      }

      // Type field highlighting
      if (field === 'type') {
        const valueStart = indent.length + field.length + 2;
        const valueRange = new vscode.Range(fieldStart, valueStart, fieldStart, valueStart + value.length);
        typeDecorations.push({ range: valueRange });
      }

      // Dependencies highlighting
      if (field === 'dependencies') {
        // Find all TASK- references
        const depMatches = [...value.matchAll(/TASK-[A-Za-z0-9]+-[a-z0-9]+/g)];
        for (const match of depMatches) {
          const matchStart = indent.length + field.length + 2 + (match.index || 0);
          const depRange = new vscode.Range(fieldStart, matchStart, fieldStart, matchStart + match[0].length);
          dependencyDecorations.push({ range: depRange });
        }
      }

      // Validate field values
      if (!this.isValidFieldValue(field, value)) {
        const valueStart = indent.length + field.length + 2;
        const valueRange = new vscode.Range(fieldStart, valueStart, fieldStart, valueStart + value.length);
        invalidDecorations.push({ range: valueRange });
      }
    }

    // Apply decorations
    const statusDecoration = this.decorationTypes.get('statusField');
    const priorityDecoration = this.decorationTypes.get('priorityField');
    const typeDecoration = this.decorationTypes.get('typeField');
    const requiredDecoration = this.decorationTypes.get('requiredField');
    const dependencyDecoration = this.decorationTypes.get('dependencyRef');
    const invalidDecoration = this.decorationTypes.get('invalidField');

    if (statusDecoration) editor.setDecorations(statusDecoration, statusDecorations);
    if (priorityDecoration) editor.setDecorations(priorityDecoration, priorityDecorations);
    if (typeDecoration) editor.setDecorations(typeDecoration, typeDecorations);
    if (requiredDecoration) editor.setDecorations(requiredDecoration, requiredDecorations);
    if (dependencyDecoration) editor.setDecorations(dependencyDecoration, dependencyDecorations);
    if (invalidDecoration) editor.setDecorations(invalidDecoration, invalidDecorations);
  }

  /**
   * Highlight markdown body sections
   */
  private highlightMarkdownBody(
    editor: vscode.TextEditor,
    document: vscode.TextDocument,
    text: string,
    task: ParsedTask
  ): void {
    const headerDecorations: vscode.DecorationOptions[] = [];
    const taskRefDecorations: vscode.DecorationOptions[] = [];
    const githubIssueDecorations: vscode.DecorationOptions[] = [];

    // Find markdown headers
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;

    while ((match = headerRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const range = document.lineAt(line).range;
      headerDecorations.push({ range });
    }

    // Highlight GitHub issue references
    if (task.github_issue_url) {
      const issueMatch = text.match(/#\d+|github\.com.*\/issues\/\d+/g);
      if (issueMatch) {
        for (const issue of issueMatch) {
          const index = text.indexOf(issue);
          if (index !== -1) {
            const range = new vscode.Range(
              document.positionAt(index),
              document.positionAt(index + issue.length)
            );
            githubIssueDecorations.push({ range });
          }
        }
      }
    }

    // Apply decorations
    const headerDecoration = this.decorationTypes.get('sectionHeader');
    const githubDecoration = this.decorationTypes.get('githubIssueRef');

    if (headerDecoration) editor.setDecorations(headerDecoration, headerDecorations);
    if (githubDecoration) editor.setDecorations(githubDecoration, githubIssueDecorations);
  }

  /**
   * Highlight inline references (task IDs, etc.)
   */
  private highlightInlineReferences(
    editor: vscode.TextEditor,
    document: vscode.TextDocument,
    text: string
  ): void {
    const taskRefDecorations: vscode.DecorationOptions[] = [];

    // Find all TASK-* references in the document
    const taskRefRegex = /TASK-[A-Za-z0-9]+-[a-z0-9]+/g;
    let match;

    while ((match = taskRefRegex.exec(text)) !== null) {
      const range = new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + match[0].length)
      );
      taskRefDecorations.push({ range });
    }

    const taskRefDecoration = this.decorationTypes.get('taskReference');
    if (taskRefDecoration) {
      editor.setDecorations(taskRefDecoration, taskRefDecorations);
    }
  }

  /**
   * Validate if a field has a valid value for its type
   */
  private isValidFieldValue(field: string, value: string): boolean {
    const validations: Record<string, (v: string) => boolean> = {
      status: (v) => ['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled'].includes(v),
      priority: (v) => ['critical', 'high', 'medium', 'low'].includes(v),
      type: (v) => ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'].includes(v),
      github_issue_id: (v) => /^\d+$/.test(v),
      estimate: (v) => /^\d+[hmd]$|^\d+\.\d+[hmd]$|^\d+$/.test(v),
    };

    if (field in validations) {
      return validations[field](value.trim());
    }

    return true; // Unknown fields are valid by default
  }

  /**
   * Clear all decorations
   */
  clearDecorations(editor: vscode.TextEditor): void {
    for (const decoration of this.decorationTypes.values()) {
      editor.setDecorations(decoration, []);
    }
  }

  /**
   * Dispose of decoration types
   */
  dispose(): void {
    for (const decoration of this.decorationTypes.values()) {
      decoration.dispose();
    }
    this.decorationTypes.clear();
  }
}
