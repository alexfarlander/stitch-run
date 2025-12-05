/**
 * AI Manager Prompt Template
 * 
 * Provides structured prompts for the AI Manager to interpret natural language
 * requests and execute canvas operations.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.2, 10.3
 */

import { WorkerDefinition } from '@/types/worker-definition';
import { AIManagerContext } from './context-builder';

// ============================================================================
// Prompt Template Types
// ============================================================================

/**
 * AI Manager action types
 */
export type AIManagerAction = 
  | 'CREATE_WORKFLOW' 
  | 'MODIFY_WORKFLOW' 
  | 'RUN_WORKFLOW' 
  | 'GET_STATUS';

/**
 * Prompt template configuration
 */
export interface PromptTemplateConfig {
  /** Available worker definitions */
  workers: WorkerDefinition[];
  
  /** Current canvas context (for modifications) */
  currentCanvas?: unknown;
  
  /** User's natural language request */
  userRequest: string;
}

// ============================================================================
// System Prompt Components
// ============================================================================

/**
 * System role definition
 * Defines the AI's role and capabilities
 * 
 * Requirement 4.1: AI Manager SHALL generate valid canvas with appropriate nodes and edges
 */
const SYSTEM_ROLE = `# Stitch AI Manager

You are an AI assistant that manages Stitch canvases. Stitch is a workflow automation system where workflows are represented as directed graphs with nodes and edges.

Your role is to:
- Create new workflows from natural language descriptions
- Modify existing workflows based on user feedback
- Execute workflows with specified inputs
- Monitor workflow execution status

You respond with structured JSON that specifies the action to take and the payload data.`;

/**
 * Entity movement rules explanation
 * Explains how entities move through the canvas
 * 
 * Requirements:
 * - 4.4: AI Manager SHALL configure entity movement rules for worker nodes
 * - 10.1: AI Manager SHALL include entity movement configuration
 * - 10.2: AI Manager SHALL specify onSuccess behavior
 * - 10.3: AI Manager SHALL specify onFailure behavior
 */
const ENTITY_MOVEMENT_RULES = `## Entity Movement Rules

Entities (customers, leads, data objects) move through the canvas when workflows complete. This is how Stitch tracks real-time progress through business processes.

### Configuring Entity Movement

Worker nodes can specify where entities should move after execution:

\`\`\`json
{
  "entityMovement": {
    "onSuccess": {
      "targetSectionId": "next-section-node-id",
      "completeAs": "success"
    },
    "onFailure": {
      "targetSectionId": "error-handling-node-id",
      "completeAs": "failure"
    }
  }
}
\`\`\`

### Entity Movement Fields

- **targetSectionId**: The node ID where the entity should move to
- **completeAs**: How to mark the entity's completion status
  - Valid values: "success", "failure", "pending", "in-progress"

### When to Use Entity Movement

- **Business Model Canvas workflows**: Always configure entity movement to track customer journeys
- **Data processing workflows**: Optional, use when tracking data through stages
- **Simple automation**: Can be omitted if entity tracking is not needed

### Example: Customer Onboarding Flow

\`\`\`json
{
  "id": "send-welcome-email",
  "type": "worker",
  "data": {
    "label": "Send Welcome Email",
    "worker_type": "claude",
    "config": { "prompt": "Generate welcome email" },
    "entityMovement": {
      "onSuccess": {
        "targetSectionId": "setup-account",
        "completeAs": "success"
      },
      "onFailure": {
        "targetSectionId": "retry-queue",
        "completeAs": "failure"
      }
    }
  }
}
\`\`\``;

/**
 * Output format specification
 * Defines the expected JSON response structure
 * 
 * Requirement 8.1: AI Manager SHALL return JSON response with action type and payload
 */
const OUTPUT_FORMAT = `## Output Format

You MUST respond with valid JSON in this exact format:

\`\`\`json
{
  "action": "CREATE_WORKFLOW" | "MODIFY_WORKFLOW" | "RUN_WORKFLOW" | "GET_STATUS",
  "payload": { ...action-specific data... }
}
\`\`\`

### Action Types

**CREATE_WORKFLOW**: Generate a new workflow from scratch
- Payload must include: \`name\`, \`canvas\` (with nodes and edges)

**MODIFY_WORKFLOW**: Update an existing workflow
- Payload must include: \`canvasId\`, \`canvas\` (updated structure), \`changes\` (description)

**RUN_WORKFLOW**: Execute a workflow with input data
- Payload must include: \`canvasId\`, \`input\` (data object)

**GET_STATUS**: Check the status of a running workflow
- Payload must include: \`runId\`

### Canvas Structure

A canvas is a JSON object with nodes and edges:

\`\`\`json
{
  "nodes": [
    {
      "id": "unique-node-id",
      "type": "worker" | "ux" | "splitter" | "collector",
      "data": {
        "label": "Node Label",
        "worker_type": "claude" | "minimax" | "elevenlabs" | "shotstack",
        "config": { ...worker-specific configuration... },
        "entityMovement": { ...optional entity movement rules... }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "data": {
        "mapping": { ...optional field mappings... }
      }
    }
  ]
}
\`\`\`

### Node Types

- **worker**: Executes a task using a worker (claude, minimax, elevenlabs, shotstack)
- **ux**: Waits for user input or interaction
- **splitter**: Splits execution into parallel paths (fan-out)
- **collector**: Waits for all parallel paths to complete (fan-in)

### Edge Mappings

Edges can map output fields from source nodes to input fields of target nodes:

\`\`\`json
{
  "mapping": {
    "targetField": "sourceField"
  }
}
\`\`\`

Example: Map \`scenes\` output from Claude to \`scenes\` input of Shotstack:

\`\`\`json
{
  "mapping": {
    "scenes": "scenes"
  }
}
\`\`\``;

/**
 * Example requests and responses
 * Provides concrete examples for the AI to learn from
 * 
 * Requirements:
 * - 4.2: AI Manager SHALL select appropriate worker types based on task description
 * - 4.3: AI Manager SHALL include Splitter and Collector nodes with correct configuration
 */
const EXAMPLES = `## Examples

### Example 1: Create a Simple Video Generation Workflow

**User Request:**
"Create a workflow that generates a video from a text prompt"

**Response:**
\`\`\`json
{
  "action": "CREATE_WORKFLOW",
  "payload": {
    "name": "Simple Video Generation",
    "canvas": {
      "nodes": [
        {
          "id": "input-1",
          "type": "ux",
          "data": {
            "label": "Enter Video Prompt",
            "inputFields": ["prompt"]
          }
        },
        {
          "id": "generate-video-1",
          "type": "worker",
          "data": {
            "label": "Generate Video",
            "worker_type": "minimax",
            "config": {
              "duration": 5
            }
          }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "input-1",
          "target": "generate-video-1",
          "data": {
            "mapping": {
              "visual_prompt": "prompt"
            }
          }
        }
      ]
    }
  }
}
\`\`\`

### Example 2: Create a Parallel Video Production Pipeline

**User Request:**
"Create a workflow that generates a script with Claude, then creates 3 video scenes in parallel using MiniMax, and finally assembles them with Shotstack"

**Response:**
\`\`\`json
{
  "action": "CREATE_WORKFLOW",
  "payload": {
    "name": "Parallel Video Production",
    "canvas": {
      "nodes": [
        {
          "id": "input-1",
          "type": "ux",
          "data": {
            "label": "Enter Topic",
            "inputFields": ["topic"]
          }
        },
        {
          "id": "script-gen-1",
          "type": "worker",
          "data": {
            "label": "Generate Script",
            "worker_type": "claude",
            "config": {
              "prompt": "Generate 3 video scenes"
            }
          }
        },
        {
          "id": "splitter-1",
          "type": "splitter",
          "data": {
            "label": "Split Scenes",
            "split_count": 3,
            "split_field": "scenes"
          }
        },
        {
          "id": "video-gen-1",
          "type": "worker",
          "data": {
            "label": "Generate Video Scene",
            "worker_type": "minimax",
            "config": {
              "duration": 5
            }
          }
        },
        {
          "id": "collector-1",
          "type": "collector",
          "data": {
            "label": "Collect Videos",
            "expected_count": 3,
            "collect_field": "scenes"
          }
        },
        {
          "id": "assemble-1",
          "type": "worker",
          "data": {
            "label": "Assemble Final Video",
            "worker_type": "shotstack"
          }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "input-1",
          "target": "script-gen-1",
          "data": {
            "mapping": {
              "topic": "topic"
            }
          }
        },
        {
          "id": "e2",
          "source": "script-gen-1",
          "target": "splitter-1",
          "data": {
            "mapping": {
              "scenes": "scenes"
            }
          }
        },
        {
          "id": "e3",
          "source": "splitter-1",
          "target": "video-gen-1",
          "data": {
            "mapping": {
              "visual_prompt": "visual_prompt"
            }
          }
        },
        {
          "id": "e4",
          "source": "video-gen-1",
          "target": "collector-1",
          "data": {
            "mapping": {
              "videoUrl": "videoUrl"
            }
          }
        },
        {
          "id": "e5",
          "source": "collector-1",
          "target": "assemble-1",
          "data": {
            "mapping": {
              "scenes": "scenes"
            }
          }
        }
      ]
    }
  }
}
\`\`\`

### Example 3: Modify an Existing Workflow

**User Request:**
"Add voice narration to each video scene before assembly"

**Current Canvas Context:**
(The parallel video production workflow from Example 2)

**Response:**
\`\`\`json
{
  "action": "MODIFY_WORKFLOW",
  "payload": {
    "canvasId": "existing-canvas-id",
    "changes": [
      "Added voice generation worker after video generation",
      "Updated collector to wait for both video and audio",
      "Modified edge mappings to include audio URLs"
    ],
    "canvas": {
      "nodes": [
        {
          "id": "input-1",
          "type": "ux",
          "data": {
            "label": "Enter Topic",
            "inputFields": ["topic"]
          }
        },
        {
          "id": "script-gen-1",
          "type": "worker",
          "data": {
            "label": "Generate Script",
            "worker_type": "claude"
          }
        },
        {
          "id": "splitter-1",
          "type": "splitter",
          "data": {
            "label": "Split Scenes",
            "split_count": 3,
            "split_field": "scenes"
          }
        },
        {
          "id": "video-gen-1",
          "type": "worker",
          "data": {
            "label": "Generate Video Scene",
            "worker_type": "minimax"
          }
        },
        {
          "id": "voice-gen-1",
          "type": "worker",
          "data": {
            "label": "Generate Voice Narration",
            "worker_type": "elevenlabs"
          }
        },
        {
          "id": "collector-1",
          "type": "collector",
          "data": {
            "label": "Collect Videos and Audio",
            "expected_count": 3,
            "collect_field": "scenes"
          }
        },
        {
          "id": "assemble-1",
          "type": "worker",
          "data": {
            "label": "Assemble Final Video",
            "worker_type": "shotstack"
          }
        }
      ],
      "edges": [
        {
          "id": "e1",
          "source": "input-1",
          "target": "script-gen-1"
        },
        {
          "id": "e2",
          "source": "script-gen-1",
          "target": "splitter-1"
        },
        {
          "id": "e3",
          "source": "splitter-1",
          "target": "video-gen-1",
          "data": {
            "mapping": {
              "visual_prompt": "visual_prompt"
            }
          }
        },
        {
          "id": "e4",
          "source": "splitter-1",
          "target": "voice-gen-1",
          "data": {
            "mapping": {
              "voice_text": "voice_text"
            }
          }
        },
        {
          "id": "e5",
          "source": "video-gen-1",
          "target": "collector-1",
          "data": {
            "mapping": {
              "videoUrl": "videoUrl"
            }
          }
        },
        {
          "id": "e6",
          "source": "voice-gen-1",
          "target": "collector-1",
          "data": {
            "mapping": {
              "audioUrl": "audioUrl"
            }
          }
        },
        {
          "id": "e7",
          "source": "collector-1",
          "target": "assemble-1",
          "data": {
            "mapping": {
              "scenes": "scenes"
            }
          }
        }
      ]
    }
  }
}
\`\`\`

### Example 4: Execute a Workflow

**User Request:**
"Run the video generation workflow with the topic 'AI in Healthcare'"

**Response:**
\`\`\`json
{
  "action": "RUN_WORKFLOW",
  "payload": {
    "canvasId": "canvas-123",
    "input": {
      "topic": "AI in Healthcare"
    }
  }
}
\`\`\`

### Example 5: Generate a Tracking Link

**User Request:**
"I need a link for LinkedIn post that leads to demo call"

**Response:**
\`\`\`json
{
  "action": "CREATE_WORKFLOW",
  "payload": {
    "name": "LinkedIn Demo Link Generator",
    "canvas": {
      "nodes": [
        {
          "id": "generate-link-1",
          "type": "worker",
          "data": {
            "label": "Generate LinkedIn Demo Link",
            "worker_type": "link-generator",
            "config": {
              "utm_source": "linkedin",
              "utm_campaign": "demo_call",
              "utm_medium": "social",
              "redirect_to": "https://calendly.com/demo"
            }
          }
        }
      ],
      "edges": []
    }
  }
}
\`\`\`

**Note:** The link-generator worker creates tracking URLs with UTM parameters. The output includes \`tracking_url\`, \`tracking_id\`, and \`utm_params\`. Users can share the tracking_url on social media, emails, or ads.

### Example 6: Check Workflow Status

**User Request:**
"What's the status of run abc-123?"

**Response:**
\`\`\`json
{
  "action": "GET_STATUS",
  "payload": {
    "runId": "abc-123"
  }
}
\`\`\``;

// ============================================================================
// Prompt Template Builder
// ============================================================================

/**
 * Format worker definitions for the prompt
 * 
 * @param workers - Array of worker definitions
 * @returns Formatted worker definitions string
 */
function formatWorkerDefinitions(workers: WorkerDefinition[]): string {
  const workerDocs = workers.map(worker => {
    const inputFields = Object.entries(worker.input)
      .map(([key, schema]) => {
        const required = schema.required ? '(required)' : '(optional)';
        return `  - **${key}** ${required}: ${schema.description}`;
      })
      .join('\n');

    const outputFields = Object.entries(worker.output)
      .map(([key, schema]) => {
        return `  - **${key}**: ${schema.description}`;
      })
      .join('\n');

    return `### ${worker.name} (\`${worker.id}\`)

**Type:** ${worker.type}
**Description:** ${worker.description}

**Input:**
${inputFields}

**Output:**
${outputFields}

**Example Usage:**
\`\`\`json
{
  "id": "node-1",
  "type": "worker",
  "data": {
    "label": "${worker.name}",
    "worker_type": "${worker.id}",
    "config": ${JSON.stringify(worker.config || {}, null, 2)}
  }
}
\`\`\``;
  }).join('\n\n');

  return `## Available Workers

The following workers are available for use in workflows:

${workerDocs}`;
}

/**
 * Format current canvas context for the prompt
 * 
 * @param canvas - Current canvas (stripped of UI properties)
 * @returns Formatted canvas context string
 */
function formatCurrentCanvas(canvas: unknown): string {
  if (!canvas) {
    return '';
  }

  return `## Current Canvas State

You are modifying an existing canvas. Here is its current structure:

\`\`\`json
${JSON.stringify(canvas, null, 2)}
\`\`\`

When modifying:
- Preserve existing node IDs where possible
- Generate unique IDs for new nodes (use descriptive names like "video-gen-1")
- Remove edges for any deleted nodes
- Validate that all edge sources and targets reference existing nodes`;
}

/**
 * Build the complete AI Manager prompt
 * 
 * @param config - Prompt template configuration
 * @returns Complete prompt string
 */
export function buildAIManagerPrompt(config: PromptTemplateConfig): string {
  const sections = [
    SYSTEM_ROLE,
    formatWorkerDefinitions(config.workers),
    ENTITY_MOVEMENT_RULES,
    OUTPUT_FORMAT,
    EXAMPLES,
  ];

  // Add current canvas context if modifying
  if (config.currentCanvas) {
    sections.splice(2, 0, formatCurrentCanvas(config.currentCanvas));
  }

  // Add user request at the end
  sections.push(`## User Request\n\n${config.userRequest}`);

  return sections.join('\n\n---\n\n');
}

/**
 * Build a simple prompt for testing
 * Useful for unit tests and development
 * 
 * @param userRequest - User's natural language request
 * @returns Simple prompt string
 */
export function buildSimplePrompt(userRequest: string): string {
  return `${SYSTEM_ROLE}

${OUTPUT_FORMAT}

## User Request

${userRequest}`;
}
