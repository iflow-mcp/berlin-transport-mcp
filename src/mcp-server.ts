#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const VBB_API_BASE = "https://v6.vbb.transport.rest";

// Create MCP server
const server = new Server(
  {
    name: "berlin-transport-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_stops",
        description: "Search for public transport stops in Berlin-Brandenburg",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for stops",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_departures",
        description: "Get upcoming departures for a specific stop",
        inputSchema: {
          type: "object",
          properties: {
            stop_id: {
              type: "string",
              description: "Stop ID to get departures for",
            },
            results: {
              type: "number",
              description: "Number of results to return",
            },
          },
          required: ["stop_id"],
        },
      },
      {
        name: "get_journeys",
        description: "Get journey options from one stop to another",
        inputSchema: {
          type: "object",
          properties: {
            from: {
              type: "string",
              description: "Origin stop ID",
            },
            to: {
              type: "string",
              description: "Destination stop ID",
            },
            departure: {
              type: "string",
              description: "Departure time (e.g. tomorrow 2pm)",
            },
            results: {
              type: "number",
              description: "Number of results to return",
            },
          },
          required: ["from", "to"],
        },
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_stops": {
        const { query } = args as { query: string };
        const url = new URL("/locations", VBB_API_BASE);
        url.searchParams.set("query", query);
        url.searchParams.set("poi", "false");
        url.searchParams.set("addresses", "false");

        const response = await fetch(url);
        const data = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_departures": {
        const { stop_id, results } = args as { stop_id: string; results?: number };
        const url = new URL(`/stops/${stop_id}/departures`, VBB_API_BASE);
        if (results) {
          url.searchParams.set("results", String(results));
        }

        const response = await fetch(url);
        const data = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_journeys": {
        const { from, to, departure, results } = args as {
          from: string;
          to: string;
          departure?: string;
          results?: number;
        };
        const url = new URL("/journeys", VBB_API_BASE);
        url.searchParams.set("from", from);
        url.searchParams.set("to", to);
        if (departure) {
          url.searchParams.set("departure", departure);
        }
        if (results) {
          url.searchParams.set("results", String(results));
        }

        const response = await fetch(url);
        const data = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Berlin Transport MCP Server running on stdio");
}

// Start the server if this file is run directly
main().catch(console.error);