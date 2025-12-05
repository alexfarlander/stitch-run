#!/usr/bin/env tsx
/**
 * Verify Mermaid Diagrams
 * 
 * This script validates all Mermaid diagram files in the documentation:
 * 1. Checks that files exist
 * 2. Validates basic Mermaid syntax
 * 3. Checks for common syntax errors
 * 4. Verifies diagram types are valid
 * 5. Reports any issues found
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DiagramCheck {
  file: string;
  exists: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
  type?: string;
  lineCount?: number;
}

const DIAGRAM_FILES = [
  'architecture-overview.mmd',
  'execution-flow.mmd',
  'type-relationships.mmd',
  'version-management.mmd',
  'entity-movement.mmd',
  'worker-callback.mmd',
  'database-schema.mmd',
];

const DIAGRAM_DIR = join(process.cwd(), 'docs/implementation/diagrams');

const VALID_DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'erDiagram',
  'stateDiagram',
  'gantt',
  'pie',
  'journey',
  'gitGraph',
];

function checkDiagramFile(filename: string): DiagramCheck {
  const filepath = join(DIAGRAM_DIR, filename);
  const check: DiagramCheck = {
    file: filename,
    exists: false,
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check if file exists
  if (!existsSync(filepath)) {
    check.errors.push('File does not exist');
    check.valid = false;
    return check;
  }

  check.exists = true;

  try {
    // Read file content
    const content = readFileSync(filepath, 'utf-8');
    check.lineCount = content.split('\n').length;

    // Remove markdown code fences if present
    let mermaidContent = content.trim();
    if (mermaidContent.startsWith('```mermaid')) {
      mermaidContent = mermaidContent
        .replace(/^```mermaid\n/, '')
        .replace(/\n```$/, '');
    }

    // Check if content is empty
    if (!mermaidContent.trim()) {
      check.errors.push('File is empty');
      check.valid = false;
      return check;
    }

    // Detect diagram type (skip comment lines)
    const lines = mermaidContent.trim().split('\n');
    let diagramType = '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('%%')) {
        diagramType = trimmedLine.split(/[\s{(]/)[0];
        break;
      }
    }
    check.type = diagramType;

    // Validate diagram type
    if (!VALID_DIAGRAM_TYPES.includes(diagramType)) {
      check.errors.push(`Unknown diagram type: ${diagramType}`);
      check.valid = false;
    }

    // Check for common syntax errors
    const contentLines = mermaidContent.split('\n');
    
    // Check for unclosed brackets/parentheses
    let openBrackets = 0;
    let openParens = 0;
    let openBraces = 0;
    
    contentLines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Skip comment lines for bracket counting
      if (line.trim().startsWith('%%')) {
        return;
      }
      
      // Count brackets
      openBrackets += (line.match(/\[/g) || []).length;
      openBrackets -= (line.match(/\]/g) || []).length;
      
      // Count parentheses
      openParens += (line.match(/\(/g) || []).length;
      openParens -= (line.match(/\)/g) || []).length;
      
      // Count braces (but skip ER diagram relationship syntax like ||--o{)
      // For ER diagrams and class diagrams, only count braces in entity/class definitions
      if (diagramType === 'erDiagram' || diagramType === 'classDiagram') {
        // Match class/entity opening: "class Name {" or "EntityName {"
        const isOpening = line.match(/^\s*(class|enum)?\s*\w+\s*\{/) || line.match(/^\s*\w+\s*\{/);
        // Match closing brace on its own line
        const isClosing = line.match(/^\s*\}$/);
        if (isOpening || isClosing) {
          openBraces += (line.match(/\{/g) || []).length;
          openBraces -= (line.match(/\}/g) || []).length;
        }
      } else {
        // For other diagram types, count all braces
        openBraces += (line.match(/\{/g) || []).length;
        openBraces -= (line.match(/\}/g) || []).length;
      }
      
      // Check for common issues
      if (line.includes('-->') && diagramType === 'sequenceDiagram') {
        check.warnings.push(`Line ${lineNum}: Using '-->' in sequence diagram (should use '->' or '->>')`);
      }
      
      if (line.includes('->') && diagramType === 'graph') {
        // This is actually valid for graphs
      }
      
      // Check for trailing whitespace (can cause issues)
      if (line.endsWith(' ') || line.endsWith('\t')) {
        check.warnings.push(`Line ${lineNum}: Trailing whitespace`);
      }
    });

    // Check final bracket/paren/brace counts
    if (openBrackets !== 0) {
      check.errors.push(`Unmatched brackets: ${openBrackets > 0 ? 'unclosed' : 'extra closing'}`);
      check.valid = false;
    }
    
    if (openParens !== 0) {
      check.errors.push(`Unmatched parentheses: ${openParens > 0 ? 'unclosed' : 'extra closing'}`);
      check.valid = false;
    }
    
    if (openBraces !== 0) {
      check.errors.push(`Unmatched braces: ${openBraces > 0 ? 'unclosed' : 'extra closing'}`);
      check.valid = false;
    }

    // Diagram-specific checks
    if (diagramType === 'sequenceDiagram') {
      const hasParticipants = mermaidContent.includes('participant');
      if (!hasParticipants) {
        check.warnings.push('No participants defined (may be using implicit participants)');
      }
    }

    if (diagramType === 'classDiagram') {
      const hasClasses = mermaidContent.includes('class ');
      if (!hasClasses) {
        check.warnings.push('No classes defined');
      }
    }

    if (diagramType === 'erDiagram') {
      const hasRelationships = mermaidContent.match(/\|\|--|\}o--|\}|--/);
      if (!hasRelationships) {
        check.warnings.push('No relationships defined');
      }
    }

    if (diagramType === 'graph' || diagramType === 'flowchart') {
      const hasNodes = mermaidContent.match(/\w+\[/);
      if (!hasNodes) {
        check.warnings.push('No nodes defined');
      }
    }

  } catch (_error) {
    check.errors.push(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
    check.valid = false;
  }

  return check;
}

function printResults(checks: DiagramCheck[]): void {
  console.log('\n=== Mermaid Diagram Verification ===\n');

  let allValid = true;
  let totalErrors = 0;
  let totalWarnings = 0;

  checks.forEach((check) => {
    const status = check.valid ? '✓' : '✗';
    const statusColor = check.valid ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';

    console.log(`${statusColor}${status}${resetColor} ${check.file}`);
    
    if (check.type) {
      console.log(`  Type: ${check.type}`);
    }
    
    if (check.lineCount) {
      console.log(`  Lines: ${check.lineCount}`);
    }

    if (check.errors.length > 0) {
      console.log(`  Errors:`);
      check.errors.forEach((error) => {
        console.log(`    - ${error}`);
      });
      totalErrors += check.errors.length;
      allValid = false;
    }

    if (check.warnings.length > 0) {
      console.log(`  Warnings:`);
      check.warnings.forEach((warning) => {
        console.log(`    - ${warning}`);
      });
      totalWarnings += check.warnings.length;
    }

    console.log('');
  });

  console.log('=== Summary ===\n');
  console.log(`Total diagrams: ${checks.length}`);
  console.log(`Valid: ${checks.filter(c => c.valid).length}`);
  console.log(`Invalid: ${checks.filter(c => !c.valid).length}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total warnings: ${totalWarnings}`);

  if (allValid) {
    console.log('\n✓ All diagrams are valid!\n');
  } else {
    console.log('\n✗ Some diagrams have errors. Please fix them before proceeding.\n');
    process.exit(1);
  }
}

// Main execution
console.log('Verifying Mermaid diagrams...');
const checks = DIAGRAM_FILES.map(checkDiagramFile);
printResults(checks);
