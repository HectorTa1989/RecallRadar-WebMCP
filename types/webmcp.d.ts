export {};

declare global {
  interface ModelContextToolDefinition {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
    execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => string | Promise<string>;
  }

  interface ModelContextAPI {
    registerTool: (tool: ModelContextToolDefinition, options?: { signal?: AbortSignal; exposedTo?: string[] }) => Promise<void>;
    getTools?: () => Promise<Array<{ name: string }>>;
  }

  interface Document {
    modelContext?: ModelContextAPI;
  }

  interface Window {
    __RECALL_RADAR_TOOLS__?: ModelContextToolDefinition[];
  }
}
