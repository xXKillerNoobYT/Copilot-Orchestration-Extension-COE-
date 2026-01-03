<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditTrailService
{
    public function __construct(
        private LoggingService $logging
    ) {}

    /**
     * Log task-related audit event
     */
    public function logTaskAudit(
        string $action,
        string $taskId,
        array $changes = [],
        ?string $userId = null
    ): void {
        $this->createAuditLog([
            'entity_type' => 'task',
            'entity_id' => $taskId,
            'action' => $action,
            'user_id' => $userId ?? Auth::id(),
            'changes' => $changes,
            'metadata' => $this->getRequestMetadata(),
        ]);
    }

    /**
     * Log agent-related audit event
     */
    public function logAgentAudit(
        string $action,
        string $agentId,
        array $changes = [],
        ?string $userId = null
    ): void {
        $this->createAuditLog([
            'entity_type' => 'agent',
            'entity_id' => $agentId,
            'action' => $action,
            'user_id' => $userId ?? Auth::id(),
            'changes' => $changes,
            'metadata' => $this->getRequestMetadata(),
        ]);
    }

    /**
     * Log user-related audit event
     */
    public function logUserAudit(
        string $action,
        string $userId,
        array $changes = [],
        ?string $actorId = null
    ): void {
        $this->createAuditLog([
            'entity_type' => 'user',
            'entity_id' => $userId,
            'action' => $action,
            'user_id' => $actorId ?? Auth::id(),
            'changes' => $changes,
            'metadata' => $this->getRequestMetadata(),
        ]);
    }

    /**
     * Log security-related audit event
     */
    public function logSecurityAudit(
        string $action,
        string $severity,
        array $details = []
    ): void {
        $this->createAuditLog([
            'entity_type' => 'security',
            'entity_id' => null,
            'action' => $action,
            'user_id' => Auth::id(),
            'changes' => $details,
            'metadata' => array_merge(
                $this->getRequestMetadata(),
                ['severity' => $severity]
            ),
        ]);
        
        $this->logging->logSecurityEvent($action, $severity, $details);
    }

    /**
     * Log access attempt (authentication/authorization)
     */
    public function logAccessAttempt(
        string $action,
        bool $success,
        ?string $userId = null,
        array $details = []
    ): void {
        $this->createAuditLog([
            'entity_type' => 'access',
            'entity_id' => $userId,
            'action' => $action,
            'user_id' => $userId,
            'changes' => array_merge($details, ['success' => $success]),
            'metadata' => $this->getRequestMetadata(),
        ]);
        
        if (!$success) {
            $this->logging->logSecurityEvent(
                "Failed {$action}",
                'medium',
                array_merge(['user_id' => $userId], $details)
            );
        }
    }

    /**
     * Log data export/access for compliance
     */
    public function logDataAccess(
        string $entityType,
        string $entityId,
        string $operation,
        ?string $userId = null
    ): void {
        $this->createAuditLog([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => "data_{$operation}",
            'user_id' => $userId ?? Auth::id(),
            'changes' => ['operation' => $operation],
            'metadata' => array_merge(
                $this->getRequestMetadata(),
                ['compliance' => true]
            ),
        ]);
    }

    /**
     * Log configuration changes
     */
    public function logConfigurationChange(
        string $configKey,
        mixed $oldValue,
        mixed $newValue,
        ?string $userId = null
    ): void {
        $this->createAuditLog([
            'entity_type' => 'configuration',
            'entity_id' => $configKey,
            'action' => 'update',
            'user_id' => $userId ?? Auth::id(),
            'changes' => [
                'key' => $configKey,
                'old_value' => $oldValue,
                'new_value' => $newValue,
            ],
            'metadata' => $this->getRequestMetadata(),
        ]);
    }

    /**
     * Get audit trail for entity
     */
    public function getAuditTrail(
        string $entityType,
        string $entityId,
        array $filters = []
    ): array {
        $query = AuditLog::where('entity_type', $entityType)
            ->where('entity_id', $entityId);
        
        if (isset($filters['action'])) {
            $query->where('action', $filters['action']);
        }
        
        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
        
        if (isset($filters['from_date'])) {
            $query->where('created_at', '>=', $filters['from_date']);
        }
        
        if (isset($filters['to_date'])) {
            $query->where('created_at', '<=', $filters['to_date']);
        }
        
        return $query->orderBy('created_at', 'desc')
            ->limit($filters['limit'] ?? 100)
            ->get()
            ->toArray();
    }

    /**
     * Get recent audit events
     */
    public function getRecentAudits(int $limit = 50, array $filters = []): array
    {
        $query = AuditLog::query();
        
        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }
        
        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
        
        if (isset($filters['action'])) {
            $query->where('action', $filters['action']);
        }
        
        return $query->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Get audit statistics
     */
    public function getAuditStatistics(string $period = '24h'): array
    {
        $since = $this->parsePeriod($period);
        
        $stats = AuditLog::where('created_at', '>=', $since)
            ->selectRaw('
                entity_type,
                action,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_users
            ')
            ->groupBy('entity_type', 'action')
            ->get();
        
        return [
            'period' => $period,
            'total_events' => $stats->sum('count'),
            'unique_users' => AuditLog::where('created_at', '>=', $since)
                ->distinct('user_id')
                ->count(),
            'by_entity_type' => $stats->groupBy('entity_type')->map(function ($group) {
                return [
                    'total' => $group->sum('count'),
                    'actions' => $group->mapWithKeys(function ($item) {
                        return [$item->action => $item->count];
                    }),
                ];
            }),
        ];
    }

    /**
     * Search audit logs
     */
    public function searchAudits(array $criteria): array
    {
        $query = AuditLog::query();
        
        if (isset($criteria['entity_type'])) {
            $query->where('entity_type', $criteria['entity_type']);
        }
        
        if (isset($criteria['entity_id'])) {
            $query->where('entity_id', $criteria['entity_id']);
        }
        
        if (isset($criteria['action'])) {
            $query->where('action', $criteria['action']);
        }
        
        if (isset($criteria['user_id'])) {
            $query->where('user_id', $criteria['user_id']);
        }
        
        if (isset($criteria['from_date'])) {
            $query->where('created_at', '>=', $criteria['from_date']);
        }
        
        if (isset($criteria['to_date'])) {
            $query->where('created_at', '<=', $criteria['to_date']);
        }
        
        if (isset($criteria['ip_address'])) {
            $query->whereJsonContains('metadata->ip_address', $criteria['ip_address']);
        }
        
        return $query->orderBy('created_at', 'desc')
            ->paginate($criteria['per_page'] ?? 50)
            ->toArray();
    }

    /**
     * Export audit logs for compliance
     */
    public function exportAudits(array $filters, string $format = 'json'): string
    {
        $audits = $this->searchAudits($filters);
        
        return match($format) {
            'json' => json_encode($audits, JSON_PRETTY_PRINT),
            'csv' => $this->convertToCsv($audits),
            default => json_encode($audits),
        };
    }

    /**
     * Create audit log entry
     */
    private function createAuditLog(array $data): void
    {
        try {
            AuditLog::create([
                'entity_type' => $data['entity_type'],
                'entity_id' => $data['entity_id'],
                'action' => $data['action'],
                'user_id' => $data['user_id'],
                'changes' => $data['changes'],
                'metadata' => $data['metadata'],
                'created_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            $this->logging->logError($e, ['context' => 'audit_trail_creation']);
        }
    }

    /**
     * Get request metadata for audit log
     */
    private function getRequestMetadata(): array
    {
        if (app()->runningInConsole()) {
            return [
                'source' => 'console',
                'command' => $_SERVER['argv'][1] ?? 'unknown',
            ];
        }
        
        return [
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'method' => Request::method(),
            'url' => Request::fullUrl(),
            'request_id' => Request::header('X-Request-ID') ?? uniqid('req_', true),
        ];
    }

    /**
     * Parse period string to Carbon date
     */
    private function parsePeriod(string $period): \Carbon\Carbon
    {
        return match(true) {
            str_ends_with($period, 'h') => now()->subHours((int)rtrim($period, 'h')),
            str_ends_with($period, 'd') => now()->subDays((int)rtrim($period, 'd')),
            str_ends_with($period, 'w') => now()->subWeeks((int)rtrim($period, 'w')),
            default => now()->subDay(),
        };
    }

    /**
     * Convert audit logs to CSV format
     */
    private function convertToCsv(array $audits): string
    {
        $csv = "ID,Entity Type,Entity ID,Action,User ID,Created At\n";
        
        foreach ($audits['data'] ?? [] as $audit) {
            $csv .= implode(',', [
                $audit['id'],
                $audit['entity_type'],
                $audit['entity_id'] ?? '',
                $audit['action'],
                $audit['user_id'] ?? '',
                $audit['created_at'],
            ]) . "\n";
        }
        
        return $csv;
    }
}
