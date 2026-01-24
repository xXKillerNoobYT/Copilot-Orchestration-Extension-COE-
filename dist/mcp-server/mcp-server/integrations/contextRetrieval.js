/**
 * Context Retrieval Integration
 * Retrieves workspace context for tasks
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
export class ContextRetrieval {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot || process.cwd();
    }
    /**
     * Get comprehensive context bundle for a task
     */
    async getContextBundle(task, options) {
        const { includeFiles = true, includeDocs = true } = options || {};
        const relevantFiles = includeFiles ? await this.findRelevantFiles(task) : [];
        const documentation = includeDocs ? await this.findRelevantDocumentation(task) : [];
        const dependencies = await this.getDependencies();
        return {
            taskId: task.id,
            task: {
                title: task.title,
                description: task.description,
                acceptanceCriteria: task.acceptanceCriteria || [],
            },
            relevantFiles,
            documentation,
            dependencies,
            relatedTasks: [],
            agentGuidance: this.generateAgentGuidance(task),
        };
    }
    /**
     * Find relevant files based on task description and type
     */
    async findRelevantFiles(task) {
        const files = [];
        try {
            // Search in common source directories
            const searchDirs = ['src', 'lib', 'app', 'components', 'pages'];
            for (const dir of searchDirs) {
                const dirPath = path.join(this.workspaceRoot, dir);
                try {
                    await fs.access(dirPath);
                    const foundFiles = await this.searchDirectory(dirPath, task);
                    files.push(...foundFiles);
                }
                catch {
                    // Directory doesn't exist, skip
                }
            }
            // Limit to top 10 most relevant files
            return files.slice(0, 10);
        }
        catch (error) {
            console.error('Error finding relevant files:', error);
            return [];
        }
    }
    /**
     * Search directory for files matching task keywords
     */
    async searchDirectory(dirPath, task, depth = 0, maxDepth = 5) {
        const files = [];
        const keywords = this.extractKeywords(task);
        // Prevent excessive recursion
        if (depth >= maxDepth) {
            return files;
        }
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules and other common exclude directories
                    if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                        const subFiles = await this.searchDirectory(fullPath, task, depth + 1, maxDepth);
                        files.push(...subFiles);
                    }
                }
                else if (entry.isFile()) {
                    // Check if filename matches keywords
                    const matchesKeywords = keywords.some((kw) => entry.name.toLowerCase().includes(kw.toLowerCase()));
                    if (matchesKeywords && this.isRelevantFileType(entry.name)) {
                        const stats = await fs.stat(fullPath);
                        files.push({
                            path: path.relative(this.workspaceRoot, fullPath),
                            summary: `File related to ${task.title}`,
                            lastModified: stats.mtime.toISOString(),
                        });
                    }
                }
                // Early return if we have enough files
                if (files.length >= 20) {
                    break;
                }
            }
        }
        catch (error) {
            // Ignore errors from inaccessible directories
        }
        return files;
    }
    /**
     * Find relevant documentation files
     */
    async findRelevantDocumentation(task) {
        const docs = [];
        try {
            const docsDir = path.join(this.workspaceRoot, 'Docs');
            try {
                await fs.access(docsDir);
                const files = await fs.readdir(docsDir);
                for (const file of files) {
                    if (file.endsWith('.md')) {
                        docs.push({
                            title: file.replace('.md', '').replace(/-/g, ' '),
                            path: path.join('Docs', file),
                            relevance: 'medium',
                            summary: `Documentation file: ${file}`,
                        });
                    }
                }
            }
            catch {
                // Docs directory doesn't exist
            }
            // Limit to top 5 most relevant docs
            return docs.slice(0, 5);
        }
        catch (error) {
            console.error('Error finding documentation:', error);
            return [];
        }
    }
    /**
     * Get project dependencies from package.json
     */
    async getDependencies() {
        try {
            const packagePath = path.join(this.workspaceRoot, 'package.json');
            const content = await fs.readFile(packagePath, 'utf-8');
            const packageData = JSON.parse(content);
            const deps = [];
            // Add main dependencies
            if (packageData.dependencies) {
                const depEntries = Object.entries(packageData.dependencies).slice(0, 5);
                for (const [name, version] of depEntries) {
                    deps.push({
                        name,
                        version: String(version),
                        purpose: 'Runtime dependency',
                    });
                }
            }
            return deps;
        }
        catch {
            return [];
        }
    }
    /**
     * Extract keywords from task for file matching
     */
    extractKeywords(task) {
        const keywords = [];
        const text = `${task.title} ${task.description}`.toLowerCase();
        // Extract common programming terms
        const terms = [
            'auth',
            'authentication',
            'api',
            'user',
            'test',
            'middleware',
            'route',
            'component',
            'service',
            'util',
            'helper',
            'config',
        ];
        for (const term of terms) {
            if (text.includes(term)) {
                keywords.push(term);
            }
        }
        // Extract words from title
        keywords.push(...task.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
        return keywords;
    }
    /**
     * Check if file type is relevant for code tasks
     */
    isRelevantFileType(filename) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.rb'];
        return extensions.some((ext) => filename.endsWith(ext));
    }
    /**
     * Generate agent guidance based on task
     */
    generateAgentGuidance(task) {
        return {
            recommendedApproach: 'Start by reviewing the task description and acceptance criteria, then explore relevant files.',
            commonPitfalls: [
                'Not running tests before committing changes',
                'Hardcoding values instead of using configuration',
                'Missing error handling',
            ],
            bestPractices: [
                'Follow existing code patterns and conventions',
                'Write tests for new functionality',
                'Add inline documentation for complex logic',
                'Keep changes minimal and focused',
            ],
        };
    }
}
