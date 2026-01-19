<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;

class PlanImportController extends Controller
{
    /**
     * Analyze imported context and suggest template
     * 
     * POST /api/v1/plans/analyze-context
     */
    public function analyzeContext(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|string|max:1000000', // Max 1MB of text
        ]);

        $content = $validated['content'];
        
        // Extract key information
        $topics = $this->extractTopics($content);
        $summary = $this->generateSummary($content);
        $suggestedTemplate = $this->suggestTemplate($topics);
        $estimatedDuration = $this->estimateDuration($topics);
        $teamSize = $this->estimateTeamSize($topics);

        return response()->json([
            'success' => true,
            'suggestedTemplate' => $suggestedTemplate,
            'topics' => $topics,
            'summary' => $summary,
            'estimatedDuration' => $estimatedDuration,
            'recommendedTeamSize' => $teamSize,
            'confidence' => count($topics) > 0 ? 0.8 : 0.5
        ]);
    }

    /**
     * Extract topics from content using keyword matching
     */
    private function extractTopics(string $content): array
    {
        $topics = [];
        $lowerContent = strtolower($content);

        $keywordMap = [
            'api' => ['rest api', 'graphql', 'api', 'endpoint', 'http', 'request', 'response'],
            'database' => ['database', 'sql', 'mongodb', 'postgres', 'mysql', 'redis', 'cache', 'storage'],
            'frontend' => ['react', 'vue', 'angular', 'ui', 'component', 'frontend', 'web app', 'interface'],
            'backend' => ['backend', 'server', 'node', 'python', 'java', 'service', 'laravel'],
            'mobile' => ['mobile', 'ios', 'android', 'react native', 'flutter', 'app development'],
            'devops' => ['docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure', 'cloud', 'aws', 'azure'],
            'authentication' => ['auth', 'login', 'oauth', 'jwt', 'session', 'password', 'security'],
            'testing' => ['test', 'jest', 'unittest', 'integration test', 'e2e', 'qc', 'quality assurance'],
            'monitoring' => ['monitoring', 'logging', 'metrics', 'alerting', 'sentry', 'analytics'],
            'documentation' => ['documentation', 'docs', 'api docs', 'openapi', 'swagger', 'readme']
        ];

        foreach ($keywordMap as $topic => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($lowerContent, $keyword) !== false) {
                    $topics[] = $topic;
                    break; // Only add topic once
                }
            }
        }

        return array_unique($topics);
    }

    /**
     * Suggest template based on detected topics
     */
    private function suggestTemplate(array $topics): string
    {
        // Priority-based template selection
        if (in_array('api', $topics) && !in_array('frontend', $topics)) {
            return 'core-api-service';
        }
        if (in_array('frontend', $topics)) {
            return 'core-web-app';
        }
        if (in_array('mobile', $topics)) {
            return 'core-web-app'; // Use web-app as fallback for mobile
        }
        if (in_array('devops', $topics)) {
            return 'core-api-service'; // DevOps usually involves backend services
        }
        
        // Default to blank template if no clear match
        return 'core-blank';
    }

    /**
     * Generate a summary of the content
     */
    private function generateSummary(string $content): string
    {
        // Extract first few sentences (split by period, exclamation, or question mark)
        $sentences = preg_split('/[.!?]+/', $content);
        
        // Filter out empty sentences and take first 3
        $sentences = array_filter($sentences, function($s) {
            return trim($s) !== '';
        });
        $sentences = array_slice($sentences, 0, 3);
        
        $summary = implode('. ', $sentences);
        
        // Truncate to 200 characters
        if (strlen($summary) > 200) {
            $summary = substr($summary, 0, 197) . '...';
        } else {
            $summary .= '...';
        }
        
        return $summary;
    }

    /**
     * Estimate project duration based on topics
     */
    private function estimateDuration(array $topics): string
    {
        $topicCount = count($topics);
        
        if ($topicCount > 5) {
            return '3-6 months';
        }
        if ($topicCount > 3) {
            return '1-3 months';
        }
        if ($topicCount > 0) {
            return '2-4 weeks';
        }
        
        return '1-2 weeks';
    }

    /**
     * Estimate team size based on topics
     */
    private function estimateTeamSize(array $topics): int
    {
        // Full-stack project needs more team members
        if (in_array('frontend', $topics) && in_array('api', $topics)) {
            return 3;
        }
        
        // DevOps or complex backend
        if (in_array('devops', $topics) || count($topics) > 4) {
            return 2;
        }
        
        // Simple projects
        return 1;
    }
}
