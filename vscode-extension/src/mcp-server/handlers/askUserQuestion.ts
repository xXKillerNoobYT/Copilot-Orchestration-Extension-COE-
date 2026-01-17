/**
 * Handler for copilot_orchestrator_ask_user_question tool
 */

export async function handleAskUserQuestion(args: any) {
  const { question, context, timeout = 300 } = args;

  // TODO: Integrate with actual user interaction system (VS Code notifications/input boxes)
  // For now, create question request
  
  const questionRequest = {
    id: `Q-${Date.now()}`,
    question,
    context,
    timeout,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + timeout * 1000).toISOString()
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          questionRequest,
          message: `Question submitted to user. Timeout: ${timeout}s. Response will be available via polling or webhook.`
        }, null, 2)
      }
    ]
  };
}
