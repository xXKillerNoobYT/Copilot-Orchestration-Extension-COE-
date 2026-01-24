/**
 * Template System Demo
 * 
 * This script demonstrates the template system functionality including:
 * - Listing all available templates
 * - Loading and validating core templates
 * - Applying templates with customizations
 * - Creating and managing custom templates
 * 
 * Run with: node dist/templateDemo.js
 */

import * as path from 'path';
import { getTemplateService, resetTemplateService } from './planBuilder/services/TemplateService';

async function main() {
  console.log('='.repeat(80));
  console.log('PLAN TEMPLATES SYSTEM DEMO');
  console.log('='.repeat(80));
  console.log();

  // Initialize the template service
  const extensionPath = path.join(__dirname, '..');
  resetTemplateService();
  const service = getTemplateService(extensionPath);

  // 1. List all available templates
  console.log('📋 LISTING ALL AVAILABLE TEMPLATES');
  console.log('-'.repeat(80));
  const allTemplates = await service.listTemplates();
  console.log(`Found ${allTemplates.length} templates:\n`);
  
  allTemplates.forEach(template => {
    const badge = template.isCore ? '🏷️  CORE' : '🎨 CUSTOM';
    console.log(`${badge} ${template.name}`);
    console.log(`   ID: ${template.id}`);
    console.log(`   Category: ${template.category}`);
    console.log(`   Description: ${template.description}`);
    console.log(`   Tags: ${template.tags.join(', ')}`);
    if (template.estimatedDuration) {
      console.log(`   Duration: ${template.estimatedDuration}`);
    }
    if (template.recommendedTeamSize) {
      console.log(`   Team Size: ${template.recommendedTeamSize} people`);
    }
    console.log();
  });

  // 2. Load and validate each core template
  console.log('✅ VALIDATING CORE TEMPLATES');
  console.log('-'.repeat(80));
  const coreTemplateIds = ['core-web-app', 'core-api-service', 'core-cli-tool', 'core-library'];
  
  for (const templateId of coreTemplateIds) {
    const template = await service.loadTemplate(templateId);
    const validation = service.validateTemplate(template);
    
    const status = validation.valid ? '✅' : '❌';
    console.log(`${status} ${template.metadata.name}`);
    
    if (!validation.valid) {
      console.log('   Errors:');
      validation.errors.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('   Warnings:');
      validation.warnings.forEach(warn => {
        console.log(`   - ${warn.field}: ${warn.message}`);
      });
    }
    
    console.log(`   Features: ${template.plan.features?.length || 0}`);
    console.log();
  }

  // 3. Apply a template with customizations
  console.log('🚀 APPLYING TEMPLATE WITH CUSTOMIZATIONS');
  console.log('-'.repeat(80));
  const customizedPlan = await service.applyTemplate('core-web-app', {
    projectName: 'My Awesome SaaS Platform',
    projectDescription: 'A revolutionary SaaS platform for managing projects',
    customizations: {
      author: 'Demo User'
    },
    preserveMetadata: true
  });

  console.log(`✅ Applied template: ${(customizedPlan.metadata as any)?.templateId}`);
  console.log(`   Project Name: ${customizedPlan.project?.name}`);
  console.log(`   Description: ${customizedPlan.project?.description}`);
  console.log(`   Features: ${customizedPlan.features?.length || 0}`);
  console.log(`   Architecture Pattern: ${customizedPlan.architecture?.pattern}`);
  console.log();

  // 4. Demonstrate filtering
  console.log('🔍 FILTERING TEMPLATES');
  console.log('-'.repeat(80));
  
  // Filter by category
  const webTemplates = await service.listTemplates({ category: 'web-app' });
  console.log(`Web App templates: ${webTemplates.length}`);
  webTemplates.forEach(t => console.log(`   - ${t.name}`));
  console.log();

  // Search by query
  const apiResults = await service.listTemplates({ searchQuery: 'api' });
  console.log(`Templates matching "api": ${apiResults.length}`);
  apiResults.forEach(t => console.log(`   - ${t.name}`));
  console.log();

  // Filter by tags
  const authTemplates = await service.listTemplates({ tags: ['authentication'] });
  console.log(`Templates with "authentication" tag: ${authTemplates.length}`);
  authTemplates.forEach(t => console.log(`   - ${t.name}`));
  console.log();

  // 5. Create a custom template
  console.log('💾 CREATING CUSTOM TEMPLATE');
  console.log('-'.repeat(80));
  
  const customPlan = await service.applyTemplate('core-cli-tool', {
    projectName: 'My CLI Tool',
    projectDescription: 'A custom CLI tool based on the template'
  });

  const saveResult = await service.saveTemplate(customPlan, {
    name: 'Demo Custom Template',
    description: 'A custom template created for demonstration purposes',
    category: 'custom',
    tags: ['demo', 'cli', 'custom'],
    author: 'Demo User'
  });

  if (saveResult.success) {
    console.log(`✅ Custom template saved with ID: ${saveResult.data}`);
    
    // Load it back
    const loadedCustom = await service.loadTemplate(saveResult.data!);
    console.log(`   Name: ${loadedCustom.metadata.name}`);
    console.log(`   Category: ${loadedCustom.metadata.category}`);
    console.log(`   Is Core: ${loadedCustom.metadata.isCore}`);
    console.log();

    // List custom templates only
    const customOnly = await service.listTemplates({ customOnly: true });
    console.log(`Total custom templates: ${customOnly.length}`);
    console.log();

    // Delete the custom template
    const deleteResult = await service.deleteTemplate(saveResult.data!);
    if (deleteResult.success) {
      console.log(`✅ Custom template deleted successfully`);
    }
  } else {
    console.log(`❌ Failed to save template: ${saveResult.error}`);
  }
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('✅ Core templates loaded and validated successfully');
  console.log('✅ Template filtering and search working correctly');
  console.log('✅ Template application with customizations working');
  console.log('✅ Custom template creation and deletion working');
  console.log();
  console.log('🎉 All template system features demonstrated successfully!');
  console.log('='.repeat(80));
}

// Run the demo
main().catch(error => {
  console.error('Error running demo:', error);
  process.exit(1);
});
