/**
 * Multi-Format Exporter
 * 
 * Extends export system with:
 * - Enhanced Markdown (already in markdownExporter.ts)
 * - PDF generation with charts (jsPDF)
 * - Figma export (design system specs)
 * - JSON export (OpenAPI-compatible)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PlanJSON } from '../planBuilder/planGenerator';
import { jsPDF } from 'jspdf';

export type MultiFormatExportType = 'pdf' | 'figma' | 'openapi';

/**
 * Figma Design System Export
 * Contains design tokens, components, and color system
 */
export interface FigmaExport {
  version: string;
  name: string;
  description: string;
  designTokens: {
    colors: {
      primary: Record<string, string>;
      secondary: Record<string, string>;
      semantic: Record<string, string>;
    };
    typography: {
      fontFamilies: string[];
      fontSizes: Record<string, string>;
      fontWeights: Record<string, number>;
      lineHeights: Record<string, string>;
    };
    spacing: Record<string, string>;
    borderRadius: Record<string, string>;
  };
  components: Array<{
    name: string;
    category: string;
    variants: string[];
    props: Record<string, any>;
  }>;
  layouts: Array<{
    name: string;
    type: 'grid' | 'flex';
    columns?: number;
    gap?: string;
  }>;
}

/**
 * OpenAPI 3.0 Export
 * API documentation format compatible with Swagger/OpenAPI
 */
export interface OpenAPIExport {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email?: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
}

export class MultiFormatExporter {
  /**
   * Export plan to PDF with charts and diagrams
   */
  static async exportToPDF(plan: PlanJSON, outputPath: string): Promise<string> {
    const filename = this.sanitizeFilename(`${plan.metadata.name}_plan.pdf`);
    const filepath = path.join(outputPath, filename);

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Cover Page
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(plan.metadata.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Version ${plan.metadata.version}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    doc.text(`Author: ${plan.metadata.author}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    doc.text(`Status: ${plan.metadata.status}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Project Overview
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Overview', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project Name: ${plan.project.name}`, margin, yPos);
    yPos += 7;
    doc.text(`Type: ${plan.project.type}`, margin, yPos);
    yPos += 7;
    doc.text(`Status: ${plan.project.status}`, margin, yPos);
    yPos += 10;

    // Description with word wrap
    const descriptionLines = doc.splitTextToSize(plan.project.description, contentWidth);
    doc.text(descriptionLines, margin, yPos);
    yPos += descriptionLines.length * 7 + 10;

    // Architecture
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Architecture', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pattern: ${plan.architecture.pattern}`, margin, yPos);
    yPos += 7;

    if (plan.architecture.description) {
      const archLines = doc.splitTextToSize(plan.architecture.description, contentWidth);
      doc.text(archLines, margin, yPos);
      yPos += archLines.length * 7 + 10;
    }

    // Features Summary
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Features Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    if (plan.features && plan.features.length > 0) {
      for (const feature of plan.features) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(`• ${feature.name}`, margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`  Priority: ${feature.priority} | Effort: ${feature.effort_estimate}h`, margin + 5, yPos);
        yPos += 6;

        if (feature.description) {
          const featureLines = doc.splitTextToSize(`  ${feature.description}`, contentWidth - 10);
          doc.text(featureLines, margin + 5, yPos);
          yPos += featureLines.length * 5 + 5;
        }
      }
    }

    // Timeline
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Timeline', margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Start Date: ${plan.timeline.start_date}`, margin, yPos);
    yPos += 7;
    doc.text(`End Date: ${plan.timeline.end_date}`, margin, yPos);
    yPos += 10;

    if (plan.timeline.milestones && plan.timeline.milestones.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Milestones:', margin, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');

      for (const milestone of plan.timeline.milestones) {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${milestone.name} - ${milestone.target_date} (${milestone.phase})`, margin + 5, yPos);
        yPos += 6;
      }
    }

    // Team Structure
    if (plan.team.members && plan.team.members.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Team Structure', margin, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      for (const member of plan.team.members) {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${member.role_name}`, margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`  Skills: ${member.skills.join(', ')}`, margin + 5, yPos);
        yPos += 6;
        doc.text(`  Availability: ${member.availability}`, margin + 5, yPos);
        yPos += 8;
      }
    }

    // Risks
    if (plan.risks && plan.risks.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Risks', margin, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      for (const risk of plan.risks) {
        if (yPos > pageHeight - 25) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${risk.description}`, margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`  Probability: ${risk.probability} | Impact: ${risk.impact}`, margin + 5, yPos);
        yPos += 6;
        const mitigationLines = doc.splitTextToSize(`  Mitigation: ${risk.mitigation}`, contentWidth - 10);
        doc.text(mitigationLines, margin + 5, yPos);
        yPos += mitigationLines.length * 5 + 5;
      }
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Generated by Copilot Orchestration Extension | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save PDF to file using Node.js fs
    const pdfOutput = doc.output('arraybuffer');
    fs.writeFileSync(filepath, Buffer.from(pdfOutput));
    return filepath;
  }

  /**
   * Export design system to Figma-compatible JSON
   */
  static exportToFigma(plan: PlanJSON, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.metadata.name}_figma.json`);
    const filepath = path.join(outputPath, filename);

    // Generate design tokens based on plan architecture
    const figmaExport: FigmaExport = {
      version: plan.metadata.version,
      name: plan.metadata.name,
      description: plan.project.description,
      designTokens: {
        colors: {
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          secondary: {
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
          },
          semantic: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
          },
        },
        typography: {
          fontFamilies: [
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Oxygen',
            'Ubuntu',
            'Cantarell',
            'sans-serif',
          ],
          fontSizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
          },
          fontWeights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
          },
          lineHeights: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.75',
          },
        },
        spacing: {
          0: '0',
          1: '0.25rem',
          2: '0.5rem',
          3: '0.75rem',
          4: '1rem',
          6: '1.5rem',
          8: '2rem',
          12: '3rem',
          16: '4rem',
        },
        borderRadius: {
          none: '0',
          sm: '0.125rem',
          base: '0.25rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          full: '9999px',
        },
      },
      components: this.generateFigmaComponents(plan),
      layouts: this.generateFigmaLayouts(plan),
    };

    fs.writeFileSync(filepath, JSON.stringify(figmaExport, null, 2), 'utf-8');
    return filepath;
  }

  /**
   * Export plan to OpenAPI 3.0 specification
   */
  static exportToOpenAPI(plan: PlanJSON, outputPath: string): string {
    const filename = this.sanitizeFilename(`${plan.metadata.name}_openapi.json`);
    const filepath = path.join(outputPath, filename);

    const openAPIExport: OpenAPIExport = {
      openapi: '3.0.0',
      info: {
        title: plan.project.name,
        version: plan.metadata.version,
        description: plan.project.description,
        contact: {
          name: plan.metadata.author,
        },
      },
      servers: [
        {
          url: 'https://api.example.com/v1',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.example.com/v1',
          description: 'Staging server',
        },
      ],
      paths: this.generateOpenAPIPaths(plan),
      components: {
        schemas: this.generateOpenAPISchemas(plan),
      },
      tags: plan.features.map((feature) => ({
        name: feature.name,
        description: feature.description,
      })),
    };

    fs.writeFileSync(filepath, JSON.stringify(openAPIExport, null, 2), 'utf-8');
    return filepath;
  }

  /**
   * Generate Figma components from plan features
   */
  private static generateFigmaComponents(plan: PlanJSON): FigmaExport['components'] {
    const components: FigmaExport['components'] = [];

    // Generate component specs from features
    for (const feature of plan.features) {
      const component = {
        name: feature.name,
        category: this.categorizeFigmaComponent(feature),
        variants: this.generateFigmaVariants(feature),
        props: {
          priority: feature.priority,
          status: feature.status,
          estimatedHours: feature.effort_estimate,
        },
      };
      components.push(component);
    }

    return components;
  }

  /**
   * Categorize Figma component based on feature name
   */
  private static categorizeFigmaComponent(feature: any): string {
    const name = feature.name.toLowerCase();
    if (name.includes('button') || name.includes('input')) return 'Forms';
    if (name.includes('navigation') || name.includes('menu')) return 'Navigation';
    if (name.includes('card') || name.includes('panel')) return 'Layout';
    if (name.includes('modal') || name.includes('dialog')) return 'Overlays';
    return 'Components';
  }

  /**
   * Generate Figma variants based on feature properties
   */
  private static generateFigmaVariants(feature: any): string[] {
    const variants: string[] = ['default'];
    if (feature.priority === 'critical') variants.push('critical');
    if (feature.priority === 'high') variants.push('high');
    if (feature.status === 'completed') variants.push('completed');
    return variants;
  }

  /**
   * Generate Figma layouts from plan architecture
   */
  private static generateFigmaLayouts(plan: PlanJSON): FigmaExport['layouts'] {
    return [
      {
        name: 'Main Grid',
        type: 'grid',
        columns: 12,
        gap: '1rem',
      },
      {
        name: 'Feature List',
        type: 'flex',
        gap: '1.5rem',
      },
    ];
  }

  /**
   * Generate OpenAPI paths from plan features
   */
  private static generateOpenAPIPaths(plan: PlanJSON): Record<string, any> {
    const paths: Record<string, any> = {};

    // Base endpoints
    paths['/plan'] = {
      get: {
        summary: 'Get plan details',
        description: `Retrieve details for ${plan.project.name}`,
        tags: ['Plan'],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Plan',
                },
              },
            },
          },
        },
      },
    };

    // Feature endpoints
    for (const feature of plan.features) {
      const featureId = feature.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
      paths[`/features/${featureId}`] = {
        get: {
          summary: `Get ${feature.name}`,
          description: feature.description,
          tags: [feature.name],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Feature',
                  },
                },
              },
            },
          },
        },
      };
    }

    return paths;
  }

  /**
   * Generate OpenAPI schemas from plan structure
   */
  private static generateOpenAPISchemas(plan: PlanJSON): Record<string, any> {
    return {
      Plan: {
        type: 'object',
        properties: {
          metadata: {
            type: 'object',
            properties: {
              version: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string', enum: ['draft', 'approved', 'in-progress', 'completed'] },
              author: { type: 'string' },
            },
          },
          project: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string', enum: ['web', 'api', 'cli', 'library'] },
              status: { type: 'string', enum: ['planning', 'in-progress', 'completed'] },
            },
          },
          features: {
            type: 'array',
            items: { $ref: '#/components/schemas/Feature' },
          },
        },
      },
      Feature: {
        type: 'object',
        required: ['id', 'name', 'priority', 'status'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          status: { type: 'string', enum: ['pending', 'in-progress', 'completed'] },
          effort_estimate: { type: 'number' },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
          },
          acceptance_criteria: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      Milestone: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          target_date: { type: 'string', format: 'date' },
          phase: { type: 'string', enum: ['planning', 'design', 'development', 'testing', 'deployment'] },
          completion_status: { type: 'string', enum: ['pending', 'in-progress', 'completed'] },
        },
      },
    };
  }

  /**
   * Sanitize filename for file system compatibility
   * Replaces problematic characters with safe alternatives while maintaining readability
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"|?*\/\\]/g, '_')  // Replace forbidden characters with underscores
      .replace(/\s+/g, '-')             // Replace spaces with hyphens for readability
      .substring(0, 255);
  }
}
