#!/usr/bin/env node
/**
 * PRD Validation Script (Task #10)
 * 
 * Validates consistency between PRD.json and PRD.md:
 * - Version, date, and status alignment
 * - Feature ID coverage and matching
 * - Structure validation
 * - Acceptance criteria completeness
 * 
 * Usage:
 *   node scripts/validate-prd.js
 *   npm run validate:prd
 * 
 * Exit codes:
 *   0 - Valid (no errors)
 *   1 - Validation errors found
 *   2 - File read/parse errors
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Paths to PRD files
const PRD_JSON_PATH = path.join(__dirname, '..', 'PRD.json');
const PRD_MD_PATH = path.join(__dirname, '..', 'PRD.md');
const PRD_IPYNB_PATH = path.join(__dirname, '..', 'PRD.ipynb');

// Validation results
const errors = [];
const warnings = [];
const info = [];

/**
 * Read and parse PRD.json
 */
function readPRDJson() {
    try {
        const content = fs.readFileSync(PRD_JSON_PATH, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} Failed to read/parse PRD.json`);
        console.error(error.message);
        process.exit(2);
    }
}

/**
 * Read PRD.md
 */
function readPRDMarkdown() {
    try {
        return fs.readFileSync(PRD_MD_PATH, 'utf8');
    } catch (error) {
        console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} Failed to read PRD.md`);
        console.error(error.message);
        process.exit(2);
    }
}

/**
 * Extract metadata from PRD.md frontmatter
 */
function extractMarkdownMetadata(markdown) {
    const versionMatch = markdown.match(/\*\*Version\*\*:\s*(\S+)/);
    const dateMatch = markdown.match(/\*\*Date\*\*:\s*(\S+)/);
    const statusMatch = markdown.match(/\*\*Status\*\*:\s*(.+?)$/m);

    return {
        version: versionMatch ? versionMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null,
        status: statusMatch ? statusMatch[1].trim() : null
    };
}

/**
 * Extract feature IDs from markdown
 */
function extractMarkdownFeatures(markdown) {
    const featurePattern = /####\s+(F\d{3}):/g;
    const features = [];
    let match;

    while ((match = featurePattern.exec(markdown)) !== null) {
        features.push(match[1]);
    }

    return features;
}

/**
 * Validate version format
 */
function validateVersionFormat(version) {
    const semverPattern = /^\d+\.\d+\.\d+$/;
    if (!semverPattern.test(version)) {
        errors.push(`Invalid version format: "${version}" (expected semver: X.Y.Z)`);
        return false;
    }
    return true;
}

/**
 * Validate date format
 */
function validateDateFormat(date) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
        errors.push(`Invalid date format: "${date}" (expected YYYY-MM-DD)`);
        return false;
    }
    
    // Check if date is valid
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        errors.push(`Invalid date value: "${date}"`);
        return false;
    }
    
    return true;
}

/**
 * Validate metadata consistency
 */
function validateMetadata(jsonData, mdMetadata) {
    console.log(`\n${colors.cyan}${colors.bold}Validating Metadata...${colors.reset}`);
    
    // Version
    if (jsonData.version !== mdMetadata.version) {
        errors.push(`Version mismatch: JSON="${jsonData.version}" vs MD="${mdMetadata.version}"`);
    } else {
        info.push(`✓ Version matches: ${jsonData.version}`);
        validateVersionFormat(jsonData.version);
    }
    
    // Date
    if (jsonData.date !== mdMetadata.date) {
        errors.push(`Date mismatch: JSON="${jsonData.date}" vs MD="${mdMetadata.date}"`);
    } else {
        info.push(`✓ Date matches: ${jsonData.date}`);
        validateDateFormat(jsonData.date);
    }
    
    // Status
    if (jsonData.status !== mdMetadata.status) {
        errors.push(`Status mismatch: JSON="${jsonData.status}" vs MD="${mdMetadata.status}"`);
    } else {
        info.push(`✓ Status matches: ${jsonData.status}`);
    }
}

/**
 * Validate feature coverage
 */
function validateFeatures(jsonData, mdFeatures) {
    console.log(`\n${colors.cyan}${colors.bold}Validating Features...${colors.reset}`);
    
    // Extract feature IDs from JSON
    const jsonFeatures = jsonData.features.map(f => f.id);
    
    info.push(`Found ${jsonFeatures.length} features in JSON`);
    info.push(`Found ${mdFeatures.length} features in MD`);
    
    // Check for features in JSON but not in MD
    const missingInMd = jsonFeatures.filter(id => !mdFeatures.includes(id));
    if (missingInMd.length > 0) {
        errors.push(`Features in JSON but not in MD: ${missingInMd.join(', ')}`);
    }
    
    // Check for features in MD but not in JSON
    const missingInJson = mdFeatures.filter(id => !jsonFeatures.includes(id));
    if (missingInJson.length > 0) {
        errors.push(`Features in MD but not in JSON: ${missingInJson.join(', ')}`);
    }
    
    // Check for duplicate feature IDs
    const duplicateIds = jsonFeatures.filter((id, index) => jsonFeatures.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        errors.push(`Duplicate feature IDs in JSON: ${[...new Set(duplicateIds)].join(', ')}`);
    }
    
    if (missingInMd.length === 0 && missingInJson.length === 0) {
        info.push(`✓ All ${jsonFeatures.length} features present in both files`);
    }
}

/**
 * Validate feature structure
 */
function validateFeatureStructure(jsonData) {
    console.log(`\n${colors.cyan}${colors.bold}Validating Feature Structure...${colors.reset}`);
    
    const requiredFields = ['id', 'name', 'category', 'description', 'status'];
    const recommendedFields = ['acceptance_criteria', 'priority', 'effort_estimate'];
    
    let structureValid = true;
    
    jsonData.features.forEach((feature, index) => {
        // Required fields
        requiredFields.forEach(field => {
            if (!feature[field]) {
                errors.push(`Feature #${index} (${feature.id || 'unknown'}): missing required field "${field}"`);
                structureValid = false;
            }
        });
        
        // Recommended fields
        recommendedFields.forEach(field => {
            if (!feature[field]) {
                warnings.push(`Feature ${feature.id}: missing recommended field "${field}"`);
            }
        });
        
        // Validate acceptance criteria
        if (feature.acceptance_criteria) {
            if (!Array.isArray(feature.acceptance_criteria)) {
                errors.push(`Feature ${feature.id}: acceptance_criteria must be an array`);
                structureValid = false;
            } else if (feature.acceptance_criteria.length === 0) {
                warnings.push(`Feature ${feature.id}: acceptance_criteria is empty`);
            }
        }
    });
    
    if (structureValid && warnings.filter(w => w.includes('missing required field')).length === 0) {
        info.push(`✓ All features have required fields`);
    }
}

/**
 * Validate user stories
 */
function validateUserStories(jsonData) {
    console.log(`\n${colors.cyan}${colors.bold}Validating User Stories...${colors.reset}`);
    
    if (!jsonData.user_stories || !Array.isArray(jsonData.user_stories)) {
        warnings.push('No user_stories array found in PRD.json');
        return;
    }
    
    info.push(`Found ${jsonData.user_stories.length} user stories`);
    
    jsonData.user_stories.forEach((story, index) => {
        if (!story.id) {
            errors.push(`User story #${index}: missing id`);
        }
        if (!story.persona) {
            errors.push(`User story ${story.id || '#' + index}: missing persona`);
        }
        if (!story.acceptance_criteria || story.acceptance_criteria.length === 0) {
            warnings.push(`User story ${story.id || '#' + index}: missing or empty acceptance_criteria`);
        }
    });
}

/**
 * Check if PRD.ipynb needs regeneration
 */
function checkNotebookStatus() {
    console.log(`\n${colors.cyan}${colors.bold}Checking PRD.ipynb Status...${colors.reset}`);
    
    try {
        const jsonStats = fs.statSync(PRD_JSON_PATH);
        const mdStats = fs.statSync(PRD_MD_PATH);
        const notebookStats = fs.statSync(PRD_IPYNB_PATH);
        
        const jsonTime = jsonStats.mtime.getTime();
        const mdTime = mdStats.mtime.getTime();
        const notebookTime = notebookStats.mtime.getTime();
        
        if (jsonTime > notebookTime || mdTime > notebookTime) {
            warnings.push('PRD.json or PRD.md is newer than PRD.ipynb - consider running notebook to regenerate');
        } else {
            info.push('✓ PRD.ipynb is up to date');
        }
    } catch (error) {
        warnings.push(`Could not check PRD.ipynb status: ${error.message}`);
    }
}

/**
 * Print validation results
 */
function printResults() {
    console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}PRD VALIDATION RESULTS${colors.reset}`);
    console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
    
    // Errors
    if (errors.length > 0) {
        console.log(`${colors.red}${colors.bold}❌ ERRORS (${errors.length}):${colors.reset}`);
        errors.forEach(err => console.log(`   ${colors.red}•${colors.reset} ${err}`));
        console.log();
    }
    
    // Warnings
    if (warnings.length > 0) {
        console.log(`${colors.yellow}${colors.bold}⚠️  WARNINGS (${warnings.length}):${colors.reset}`);
        warnings.forEach(warn => console.log(`   ${colors.yellow}•${colors.reset} ${warn}`));
        console.log();
    }
    
    // Info
    if (info.length > 0) {
        console.log(`${colors.green}${colors.bold}✓ PASSED CHECKS (${info.length}):${colors.reset}`);
        info.forEach(i => console.log(`   ${colors.green}•${colors.reset} ${i}`));
        console.log();
    }
    
    // Summary
    console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
    if (errors.length === 0) {
        console.log(`${colors.green}${colors.bold}✅ PRD VALIDATION PASSED${colors.reset}`);
        if (warnings.length > 0) {
            console.log(`${colors.yellow}   (with ${warnings.length} warning${warnings.length > 1 ? 's' : ''})${colors.reset}`);
        }
    } else {
        console.log(`${colors.red}${colors.bold}❌ PRD VALIDATION FAILED${colors.reset}`);
        console.log(`${colors.red}   ${errors.length} error${errors.length > 1 ? 's' : ''} must be fixed${colors.reset}`);
    }
    console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
}

/**
 * Main validation function
 */
function validatePRD() {
    console.log(`${colors.bold}${colors.blue}PRD Validation Script${colors.reset}`);
    console.log(`${colors.cyan}Comparing PRD.json and PRD.md for consistency...${colors.reset}\n`);
    
    // Read files
    const jsonData = readPRDJson();
    const markdown = readPRDMarkdown();
    const mdMetadata = extractMarkdownMetadata(markdown);
    const mdFeatures = extractMarkdownFeatures(markdown);
    
    // Run validations
    validateMetadata(jsonData, mdMetadata);
    validateFeatures(jsonData, mdFeatures);
    validateFeatureStructure(jsonData);
    validateUserStories(jsonData);
    checkNotebookStatus();
    
    // Print results
    printResults();
    
    // Exit with appropriate code
    process.exit(errors.length > 0 ? 1 : 0);
}

// Run validation
validatePRD();
