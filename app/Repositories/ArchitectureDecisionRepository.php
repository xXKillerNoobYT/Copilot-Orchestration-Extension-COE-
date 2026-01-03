<?php

namespace App\Repositories;

use App\Models\ArchitectureDecision;
use Illuminate\Support\Collection;

class ArchitectureDecisionRepository
{
    /**
     * Create a new architecture decision record
     */
    public function create(array $data): ArchitectureDecision
    {
        return ArchitectureDecision::create($data);
    }

    /**
     * Find decisions for an architecture design
     */
    public function findForDesign(string $designId): Collection
    {
        return ArchitectureDecision::where('architecture_design_id', $designId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Find decisions by status
     */
    public function findByStatus(string $status): Collection
    {
        return ArchitectureDecision::where('status', $status)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Update decision status
     */
    public function updateStatus(string $adrId, string $status): ArchitectureDecision
    {
        $adr = ArchitectureDecision::findOrFail($adrId);
        $adr->status = $status;
        $adr->save();
        
        return $adr;
    }

    /**
     * Get recent decisions
     */
    public function getRecentDecisions(int $limit = 10): Collection
    {
        return ArchitectureDecision::orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}
