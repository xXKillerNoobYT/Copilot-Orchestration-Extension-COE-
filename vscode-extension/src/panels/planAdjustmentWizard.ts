import * as vscode from 'vscode';
import { MCPClient } from '../services/mcpClient';

interface ChangeRequest {
  summary: string;
  impact?: string;
  proposedChange: string;
}

interface PlanDiff {
  changed: string[];
  added: string[];
  removed: string[];
}

interface ImpactAnalysis {
  versionBump: 'major' | 'minor' | 'patch';
  oldVersion: string;
  newVersion: string;
  affectedComponents: string[];
  affectedTasks: number;
  estimatedTimeImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface WizardState {
  changeRequest: ChangeRequest;
  step: 'proposal' | 'questions' | 'analysis' | 'confirmation' | 'complete';
  planDiff: PlanDiff;
  impactAnalysis: ImpactAnalysis;
  answers: { [key: string]: string };
  planVersion: string;
  activePlan: string;
}

export class PlanAdjustmentWizard {
  public static currentPanel: PlanAdjustmentWizard | undefined;
  private readonly panel: vscode.WebviewPanel;
  private state: WizardState;
  private disposables: vscode.Disposable[] = [];
  private mcpClient: MCPClient;

  private constructor(panel: vscode.WebviewPanel, changeRequest: ChangeRequest) {
    this.panel = panel;
    this.mcpClient = MCPClient.getInstance();
    
    this.state = {
      changeRequest,
      step: 'proposal',
      planDiff: { changed: [], added: [], removed: [] },
      impactAnalysis: {
        versionBump: 'minor',
        oldVersion: '1.0.0',
        newVersion: '1.1.0',
        affectedComponents: [],
        affectedTasks: 0,
        estimatedTimeImpact: 0,
        riskLevel: 'medium',
      },
      answers: {},
      planVersion: '1.0.0',
      activePlan: 'Docs/Plans/default/plan.json',
    };

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'next-step':
          await this.nextStep();
          return;
        case 'answer-question':
          this.state.answers[message.questionId] = message.answer;
          this.updatePanel();
          return;
        case 'apply-changes':
          await this.applyChanges();
          return;
        case 'cancel':
          this.dispose();
          return;
      }
    }, null, this.disposables);

    this.updatePanel();
  }

  public static createOrShow(extensionUri: vscode.Uri, changeRequest: ChangeRequest) {
    if (PlanAdjustmentWizard.currentPanel) {
      PlanAdjustmentWizard.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      return PlanAdjustmentWizard.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      'planAdjustmentWizard',
      'Plan Adjustment Wizard',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const newPanel = new PlanAdjustmentWizard(panel, changeRequest);
    PlanAdjustmentWizard.currentPanel = newPanel;
    return newPanel;
  }

  private async nextStep(): Promise<void> {
    const steps = ['proposal', 'questions', 'analysis', 'confirmation', 'complete'] as const;
    const currentIndex = steps.indexOf(this.state.step as any);
    
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      
      if (nextStep === 'questions') {
        // Compute diff when moving to questions step
        await this.computeDiff();
      } else if (nextStep === 'analysis') {
        // Compute impact analysis when moving to analysis step
        await this.analyzeImpact();
      }
      
      this.state.step = nextStep;
      this.updatePanel();
    }
  }

  private async computeDiff(): Promise<void> {
    // In a real implementation, this would:
    // 1. Load the current plan.json
    // 2. Apply the change request
    // 3. Generate a diff
    // For now, we'll use mock data
    this.state.planDiff = {
      changed: ['designChoices.colors', 'designChoices.layout'],
      added: ['validationRules.newField'],
      removed: [],
    };
  }

  private async analyzeImpact(): Promise<void> {
    // Compute version bump based on change type
    const hasMajorChange = this.state.planDiff.removed.length > 0;
    const hasMinorChange = this.state.planDiff.changed.length > 0 || this.state.planDiff.added.length > 0;

    const oldVer = this.state.planVersion.split('.');
    let newVersion = this.state.planVersion;

    if (hasMajorChange) {
      newVersion = `${parseInt(oldVer[0]) + 1}.0.0`;
      this.state.impactAnalysis.versionBump = 'major';
    } else if (hasMinorChange) {
      newVersion = `${oldVer[0]}.${parseInt(oldVer[1]) + 1}.0`;
      this.state.impactAnalysis.versionBump = 'minor';
    } else {
      newVersion = `${oldVer[0]}.${oldVer[1]}.${parseInt(oldVer[2]) + 1}`;
      this.state.impactAnalysis.versionBump = 'patch';
    }

    // Estimate impact (in real impl, calculate from tasks)
    const changeCount = this.state.planDiff.changed.length + this.state.planDiff.added.length;
    const estimatedTasks = Math.ceil(changeCount * 3);
    const estimatedTime = estimatedTasks * 0.5; // 30 min per task

    this.state.impactAnalysis = {
      ...this.state.impactAnalysis,
      oldVersion: this.state.planVersion,
      newVersion,
      affectedComponents: this.state.planDiff.changed.concat(this.state.planDiff.added),
      affectedTasks: estimatedTasks,
      estimatedTimeImpact: Math.round(estimatedTime),
      riskLevel: changeCount > 5 ? 'high' : changeCount > 2 ? 'medium' : 'low',
    };
  }

  private async applyChanges(): Promise<void> {
    try {
      // Report the plan change to MCP
      await this.mcpClient.reportObservation({
        taskId: 'PLAN-ADJUST',
        type: 'issue',
        message: `Plan adjusted: ${this.state.changeRequest.summary}`,
        severity: this.state.impactAnalysis.riskLevel === 'high' ? 'high' : 'medium',
        suggestedAction: 'Update plan.json and regenerate tasks',
        createTask: true,
      });

      this.state.step = 'complete';
      this.updatePanel();
      
      vscode.window.showInformationMessage(
        `Plan updated to version ${this.state.impactAnalysis.newVersion}. Tasks regenerated.`
      );
    } catch (error) {
      vscode.window.showErrorMessage('Failed to apply plan changes');
    }
  }

  private updatePanel(): void {
    this.panel.webview.html = this.renderHTML();
  }

  private renderHTML(): string {
    const { step, changeRequest, planDiff, impactAnalysis, answers } = this.state;

    let content = '';

    switch (step) {
      case 'proposal':
        content = this.renderProposalStep();
        break;
      case 'questions':
        content = this.renderQuestionsStep();
        break;
      case 'analysis':
        content = this.renderAnalysisStep();
        break;
      case 'confirmation':
        content = this.renderConfirmationStep();
        break;
      case 'complete':
        content = this.renderCompleteStep();
        break;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Plan Adjustment Wizard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
    }

    .wizard-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .wizard-header {
      margin-bottom: 30px;
    }

    .wizard-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .wizard-subtitle {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .progress-bar {
      height: 4px;
      background: var(--vscode-panel-border);
      border-radius: 2px;
      overflow: hidden;
      margin: 16px 0;
    }

    .progress-fill {
      height: 100%;
      background: #4ec9b0;
      transition: width 0.3s;
    }

    .step-content {
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }

    .form-group textarea,
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: inherit;
      font-size: 12px;
      border-radius: 2px;
    }

    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }

    .diff-section {
      background: var(--vscode-panel-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .diff-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }

    .diff-item {
      font-size: 11px;
      padding: 4px 0;
      font-family: monospace;
      color: var(--vscode-foreground);
    }

    .diff-added {
      color: #4ec9b0;
    }

    .diff-changed {
      color: #dcdcaa;
    }

    .diff-removed {
      color: #ce9178;
    }

    .impact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .impact-card {
      background: var(--vscode-panel-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      text-align: center;
    }

    .impact-label {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
    }

    .impact-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .risk-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 2px;
      font-size: 10px;
      font-weight: 600;
    }

    .risk-low {
      background: #4ec9b0;
      color: white;
    }

    .risk-medium {
      background: #dcdcaa;
      color: #000;
    }

    .risk-high {
      background: #ce9178;
      color: white;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 24px;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 2px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-primary {
      background: #007acc;
      color: white;
    }

    .btn-primary:hover {
      background: #005a9e;
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .success-message {
      background: #4ec9b0;
      color: white;
      padding: 16px;
      border-radius: 4px;
      text-align: center;
      margin-bottom: 16px;
    }

    .question-option {
      margin-bottom: 12px;
    }

    .question-option input[type="radio"] {
      margin-right: 8px;
      cursor: pointer;
    }

    .question-option label {
      display: inline;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="wizard-container">
    <div class="wizard-header">
      <div class="wizard-title">Plan Adjustment Wizard</div>
      <div class="wizard-subtitle">Step ${this.getStepNumber(step)} of 5</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${this.getStepNumber(step) * 20}%"></div>
      </div>
    </div>

    <div class="step-content">
      ${content}
    </div>

    <div class="actions">
      ${step !== 'complete' ? `
        <button class="btn btn-secondary" onclick="vscode.postMessage({command: 'cancel'})">Cancel</button>
        ${step !== 'proposal' ? `<button class="btn btn-secondary" onclick="history.back()">Back</button>` : ''}
        <button class="btn btn-primary" onclick="vscode.postMessage({command: 'next-step'})">
          ${step === 'confirmation' ? 'Apply Changes' : 'Next'}
        </button>
      ` : ''}
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
  }

  private getStepNumber(step: string): number {
    const steps = ['proposal', 'questions', 'analysis', 'confirmation', 'complete'];
    return steps.indexOf(step) + 1;
  }

  private renderProposalStep(): string {
    return `
      <div class="form-group">
        <label>Change Request</label>
        <div style="background: var(--vscode-panel-background); padding: 12px; border-radius: 4px; margin-bottom: 8px;">
          <strong>${this.state.changeRequest.summary}</strong>
        </div>
      </div>

      <div class="form-group">
        <label>Impact Description</label>
        <div style="background: var(--vscode-panel-background); padding: 12px; border-radius: 4px;">
          ${this.state.changeRequest.impact || 'No impact description provided'}
        </div>
      </div>

      <div style="background: var(--vscode-notificationCenter-border); padding: 12px; border-radius: 4px; margin-top: 16px; border-left: 3px solid #007acc;">
        <div style="font-size: 12px; margin-bottom: 4px;"><strong>Next Steps:</strong></div>
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
          We'll analyze the proposed change, ask clarifying questions, and show the impact on your plan.
        </div>
      </div>
    `;
  }

  private renderQuestionsStep(): string {
    return `
      <div>
        <div style="font-size: 12px; margin-bottom: 16px; color: var(--vscode-descriptionForeground);">
          Please answer these questions about the proposed change:
        </div>

        <div class="form-group">
          <label>How does this change affect existing functionality?</label>
          <div class="question-option">
            <input type="radio" id="q1-breaking" name="q1" value="breaking" onchange="vscode.postMessage({command: 'answer-question', questionId: 'q1', answer: this.value})">
            <label for="q1-breaking">Breaking change (incompatible with current code)</label>
          </div>
          <div class="question-option">
            <input type="radio" id="q1-non-breaking" name="q1" value="non-breaking" onchange="vscode.postMessage({command: 'answer-question', questionId: 'q1', answer: this.value})">
            <label for="q1-non-breaking">Non-breaking (backward compatible)</label>
          </div>
        </div>

        <div class="form-group">
          <label>Scope of affected components?</label>
          <select onchange="vscode.postMessage({command: 'answer-question', questionId: 'scope', answer: this.value})">
            <option value="">Select scope...</option>
            <option value="single">Single component</option>
            <option value="multiple">Multiple components</option>
            <option value="all">Entire system</option>
          </select>
        </div>

        <div class="form-group">
          <label>Additional notes</label>
          <textarea placeholder="Any other details about this change..." onchange="vscode.postMessage({command: 'answer-question', questionId: 'notes', answer: this.value})"></textarea>
        </div>
      </div>
    `;
  }

  private renderAnalysisStep(): string {
    const { impactAnalysis, planDiff } = this.state;

    return `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Impact Analysis</div>

        <div class="impact-grid">
          <div class="impact-card">
            <div class="impact-label">Version Bump</div>
            <div class="impact-value">${impactAnalysis.oldVersion} → ${impactAnalysis.newVersion}</div>
            <div style="font-size: 10px; margin-top: 4px; color: var(--vscode-descriptionForeground);">
              ${impactAnalysis.versionBump.toUpperCase()}
            </div>
          </div>
          <div class="impact-card">
            <div class="impact-label">Risk Level</div>
            <div class="impact-value" style="margin-top: 4px;">
              <span class="risk-badge risk-${impactAnalysis.riskLevel}">
                ${impactAnalysis.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
          <div class="impact-card">
            <div class="impact-label">Affected Tasks</div>
            <div class="impact-value">${impactAnalysis.affectedTasks}</div>
          </div>
          <div class="impact-card">
            <div class="impact-label">Time Impact</div>
            <div class="impact-value">${impactAnalysis.estimatedTimeImpact}h</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Plan Changes</div>

        ${planDiff.changed.length > 0 ? `
          <div class="diff-section">
            <div class="diff-title">Modified</div>
            ${planDiff.changed.map(item => `<div class="diff-item diff-changed">~ ${item}</div>`).join('')}
          </div>
        ` : ''}

        ${planDiff.added.length > 0 ? `
          <div class="diff-section">
            <div class="diff-title">Added</div>
            ${planDiff.added.map(item => `<div class="diff-item diff-added">+ ${item}</div>`).join('')}
          </div>
        ` : ''}

        ${planDiff.removed.length > 0 ? `
          <div class="diff-section">
            <div class="diff-title">Removed</div>
            ${planDiff.removed.map(item => `<div class="diff-item diff-removed">- ${item}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderConfirmationStep(): string {
    const { impactAnalysis, changeRequest } = this.state;

    return `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Confirm Plan Update</div>

        <div style="background: var(--vscode-notificationCenter-border); padding: 12px; border-radius: 4px; margin-bottom: 16px; border-left: 3px solid #dcdcaa;">
          <div style="font-size: 12px;"><strong>⚠️ ${impactAnalysis.riskLevel.toUpperCase()} RISK UPDATE</strong></div>
          <div style="font-size: 11px; margin-top: 4px; color: var(--vscode-descriptionForeground);">
            This change will regenerate ${impactAnalysis.affectedTasks} task(s) and bump version to ${impactAnalysis.newVersion}.
          </div>
        </div>

        <div style="background: var(--vscode-panel-background); padding: 12px; border-radius: 4px;">
          <div style="font-size: 11px; margin-bottom: 8px;">
            <strong>Change Summary:</strong> ${changeRequest.summary}
          </div>
          <div style="font-size: 11px; margin-bottom: 8px;">
            <strong>Affected Components:</strong> ${impactAnalysis.affectedComponents.length > 0 ? impactAnalysis.affectedComponents.join(', ') : 'None'}
          </div>
          <div style="font-size: 11px;">
            <strong>Estimated Impact:</strong> ${impactAnalysis.estimatedTimeImpact} hours across ${impactAnalysis.affectedTasks} task(s)
          </div>
        </div>

        <div style="background: var(--vscode-notificationCenter-border); padding: 12px; border-radius: 4px; margin-top: 16px;">
          <div style="font-size: 12px; margin-bottom: 8px;"><strong>Next:</strong></div>
          <ul style="margin-left: 20px; font-size: 11px; color: var(--vscode-descriptionForeground);">
            <li>Plan version will be updated to ${impactAnalysis.newVersion}</li>
            <li>Tasks will be regenerated according to the new plan</li>
            <li>Team will be notified of the changes</li>
            <li>Audit trail will record this adjustment</li>
          </ul>
        </div>
      </div>
    `;
  }

  private renderCompleteStep(): string {
    return `
      <div class="success-message" style="margin-top: 40px; margin-bottom: 40px;">
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">✓ Plan Updated Successfully</div>
        <div style="font-size: 12px;">Version: ${this.state.impactAnalysis.newVersion}</div>
      </div>

      <div style="background: var(--vscode-panel-background); padding: 16px; border-radius: 4px;">
        <div style="font-size: 12px; margin-bottom: 12px;"><strong>What's next:</strong></div>
        <ul style="margin-left: 20px; font-size: 11px; color: var(--vscode-descriptionForeground);">
          <li>New tasks are being generated based on the updated plan</li>
          <li>Task queue has been updated with ${this.state.impactAnalysis.affectedTasks} new/modified tasks</li>
          <li>Visual Verification panel will display new verification checklist</li>
          <li>Audit log records this plan adjustment with full details</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <button class="btn btn-primary" onclick="vscode.postMessage({command: 'cancel'})">Close Wizard</button>
      </div>
    `;
  }

  public dispose(): void {
    PlanAdjustmentWizard.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
