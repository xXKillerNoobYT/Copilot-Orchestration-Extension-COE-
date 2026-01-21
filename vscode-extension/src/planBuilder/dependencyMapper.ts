/**
 * Dependency Mapper
 * 
 * Utility for automatically detecting and mapping dependencies from wizard answers.
 * Supports parsing feature relationships from text and preserving dependencies 
 * when applying templates.
 * 
 * Reference: PRD.json - Feature F003 "Dependency Graph Visualization"
 */

export interface Feature {
  name: string;
  description?: string;
  priority?: string;
  dependsOn?: string[] | null;
}

export interface Milestone {
  name: string;
  date?: string;
  phase?: string;
  dependsOn?: string[] | null;
}

/**
 * Parse dependencies from text using common patterns
 * 
 * Patterns matched:
 * - "depends on X"
 * - "requires X"
 * - "after X"
 * - "based on X"
 * - "needs X"
 */
export function parseDependenciesFromText(text: string, availableItems: string[]): string[] {
  if (!text || !availableItems || availableItems.length === 0) {
    return [];
  }

  const dependencies: Set<string> = new Set();
  const lowerText = text.toLowerCase();
  
  // Common dependency keywords
  const patterns = [
    /depends?\s+on\s+([^,.;]+)/gi,
    /requires?\s+([^,.;]+)/gi,
    /after\s+([^,.;]+)/gi,
    /based\s+on\s+([^,.;]+)/gi,
    /needs?\s+([^,.;]+)/gi,
    /following\s+([^,.;]+)/gi,
    /once\s+([^,.;]+)\s+(?:is\s+)?(?:complete|done|finished)/gi,
  ];

  // Extract potential dependencies - handle "and" separators
  const potentialDeps: string[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        // Split on "and" to handle multiple dependencies in one match
        const parts = match[1].split(/\s+and\s+/i);
        for (const part of parts) {
          potentialDeps.push(part.trim());
        }
      }
    }
  }

  // Match against available items (case-insensitive)
  for (const dep of potentialDeps) {
    const lowerDep = dep.toLowerCase();
    for (const item of availableItems) {
      const lowerItem = item.toLowerCase();
      
      // Check if dependency text contains or matches the item name
      // Or if item name is contained in dependency text (for partial matches)
      if (lowerDep.includes(lowerItem) || lowerItem.includes(lowerDep)) {
        dependencies.add(item);
        break;
      }
      
      // Check for word boundaries to handle cases like "User Auth" matching "User Authentication"
      const depWords = lowerDep.split(/\s+/);
      const itemWords = lowerItem.split(/\s+/);
      
      // If all words from dependency are found in item name, it's a match
      if (depWords.every(word => itemWords.some(itemWord => itemWord.includes(word) || word.includes(itemWord)))) {
        dependencies.add(item);
        break;
      }
    }
  }

  return Array.from(dependencies);
}

/**
 * Map dependencies from template plan data to wizard answer format
 * 
 * Preserves dependency relationships when converting template data
 * to wizard answers.
 */
export function mapTemplateDependencies(
  templateData: any,
  allFeatures: Feature[]
): Feature[] {
  if (!templateData || !Array.isArray(templateData)) {
    return [];
  }

  const featureNames = allFeatures.map(f => f.name);
  
  return templateData.map((item: any) => {
    let dependsOn: string[] | null = null;

    // Check if template has explicit dependencies
    if (item.depends_on && Array.isArray(item.depends_on)) {
      dependsOn = item.depends_on;
    } else if (item.dependsOn && Array.isArray(item.dependsOn)) {
      dependsOn = item.dependsOn;
    } else if (item.dependencies && Array.isArray(item.dependencies)) {
      dependsOn = item.dependencies;
    }
    
    // Parse dependencies from description if no explicit dependencies
    if (!dependsOn && item.description) {
      const parsed = parseDependenciesFromText(item.description, featureNames);
      dependsOn = parsed.length > 0 ? parsed : null;
    }

    return {
      name: item.name,
      description: item.description,
      priority: item.priority,
      dependsOn,
    };
  });
}

/**
 * Auto-populate dependencies from wizard answers
 * 
 * Analyzes feature descriptions and automatically detects dependencies
 * based on common patterns and references to other features.
 */
export function autoPopulateDependencies(features: Feature[]): Feature[] {
  if (!features || features.length === 0) {
    return [];
  }

  const featureNames = features.map(f => f.name);
  
  return features.map(feature => {
    // Skip if already has dependencies
    if (feature.dependsOn && feature.dependsOn.length > 0) {
      return feature;
    }

    // Parse from description
    const description = feature.description || '';
    const detectedDeps = parseDependenciesFromText(description, featureNames);
    
    // Filter out self-dependencies
    const validDeps = detectedDeps.filter(dep => dep !== feature.name);

    return {
      ...feature,
      dependsOn: validDeps.length > 0 ? validDeps : null,
    };
  });
}

/**
 * Validate dependency graph for cycles
 * 
 * Returns validation result with cycle detection
 */
export function validateDependencyGraph(items: (Feature | Milestone)[]): {
  valid: boolean;
  errors: string[];
  cycles: string[][];
} {
  const errors: string[] = [];
  const cycles: string[][] = [];

  if (!items || items.length === 0) {
    return { valid: true, errors, cycles };
  }

  // Build adjacency list
  const graph = new Map<string, string[]>();
  const itemNames = new Set(items.map(item => item.name));

  for (const item of items) {
    if (!item.dependsOn || item.dependsOn.length === 0) {
      graph.set(item.name, []);
      continue;
    }

    // Validate dependencies exist
    const validDeps: string[] = [];
    for (const dep of item.dependsOn) {
      if (!itemNames.has(dep)) {
        errors.push(`"${item.name}" depends on "${dep}" which does not exist`);
      } else {
        validDeps.push(dep);
      }
    }
    graph.set(item.name, validDeps);
  }

  // Detect cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function hasCycle(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle - extract it
        const cycleStart = currentPath.indexOf(neighbor);
        const cycle = currentPath.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        cycles.push(cycle);
        return true;
      }
    }

    recursionStack.delete(node);
    currentPath.pop();
    return false;
  }

  for (const item of items) {
    if (!visited.has(item.name)) {
      hasCycle(item.name);
    }
  }

  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push(`Circular dependency detected: ${cycle.join(' → ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cycles,
  };
}
