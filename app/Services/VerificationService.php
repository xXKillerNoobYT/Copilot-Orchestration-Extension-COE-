<?php

namespace App\Services;

use App\Models\Task;

/**
 * Verification Service
 * Manages verification tasks and results
 * 
 * TODO: Implement full verification workflow per Code Master Section 11.8
 */
class VerificationService
{
    public function createVerificationTask(Task $task): Task
    {
        // Create verification task linked to original task (testing type)
        return Task::create([
            'project_id' => $task->project_id,
            'name' => "VERIFY: {$task->name}",
            'description' => "Verification task for {$task->name}",
            'task_type' => 'testing',
            'priority' => $task->priority,
            'parent_task_id' => $task->id,
            'status' => 'in_progress',
        ]);
    }

    public function applyResult(array $result): array
    {
        // Apply verification result and close or reopen task
        $originalId = $result['originalTaskId'] ?? null;
        if ($originalId) {
            $task = Task::find($originalId);
            if ($task) {
                if (($result['status'] ?? '') === 'passed') {
                    $task->update(['status' => 'completed']);
                    event(new \App\Events\VerificationCompleted($result));
                } elseif (($result['status'] ?? '') === 'failed') {
                    $task->update(['status' => 'in_progress']);
                }
            }
        }

        return [
            'success' => true,
            'originalTaskId' => $originalId,
            'originalTaskStatus' => ($result['status'] ?? 'partial') === 'passed' ? 'completed' : 'in_progress',
        ];
    }
}
