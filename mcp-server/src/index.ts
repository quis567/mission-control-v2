import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const CRM_BASE_URL = process.env.CRM_BASE_URL || "http://localhost:3000";
const CRM_API_KEY = process.env.CRM_API_KEY || "";

if (!CRM_API_KEY) {
  console.error("CRM_API_KEY is not set in .env");
  process.exit(1);
}

async function crmFetch(path: string, options: RequestInit = {}) {
  const url = `${CRM_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CRM_API_KEY,
      ...options.headers,
    },
  });
  return res.json();
}

const server = new McpServer({
  name: "truepath-crm",
  version: "1.0.0",
});

// Tool 1: Check if a lead already exists
server.tool(
  "check_duplicate",
  "Check if a lead already exists in the TruePath CRM before adding it",
  {
    name: z.string().describe("Business name"),
    phone: z.string().optional().describe("Phone number"),
    website: z.string().optional().describe("Website URL"),
  },
  async ({ name, phone, website }) => {
    const result = await crmFetch("/api/leads/check-duplicate", {
      method: "POST",
      body: JSON.stringify({ name, phone, website }),
    });

    if (result.exists) {
      return {
        content: [
          {
            type: "text" as const,
            text: `DUPLICATE: "${name}" already exists in CRM (status: ${result.status}, id: ${result.clientId})`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `NEW LEAD: "${name}" does not exist in CRM. Safe to add.`,
        },
      ],
    };
  }
);

// Tool 2: Create a new lead in the CRM
server.tool(
  "create_lead",
  "Add a new contractor lead to the TruePath CRM pipeline",
  {
    name: z.string().describe("Business name"),
    type: z.string().describe("Business type (e.g., Roofer, Plumber, HVAC)"),
    phone: z.string().optional().describe("Phone number"),
    email: z.string().optional().describe("Email address"),
    website: z.string().optional().describe("Website URL"),
    address: z.string().optional().describe("Business address"),
    area: z.string().describe("Target area (e.g., 'Winter Garden, FL')"),
    site_score: z
      .string()
      .optional()
      .describe("Website quality score 1-10 or N/A"),
    site_reason: z
      .string()
      .optional()
      .describe("Explanation of the website score"),
  },
  async ({ name, type, phone, email, website, address, area, site_score, site_reason }) => {
    const result = await crmFetch("/api/leads/intake", {
      method: "POST",
      body: JSON.stringify({
        name,
        type,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        area,
        site_score: site_score || "N/A",
        site_reason: site_reason || "",
        source: "lead-gen-auto",
      }),
    });

    if (result.status === "duplicate") {
      return {
        content: [
          {
            type: "text" as const,
            text: `SKIPPED: "${name}" is a duplicate — already in CRM.`,
          },
        ],
      };
    }

    if (result.status === "created") {
      return {
        content: [
          {
            type: "text" as const,
            text: `ADDED: "${name}" (${type}) added to CRM pipeline as Lead. ID: ${result.id}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `ERROR: ${JSON.stringify(result)}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TruePath CRM MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
