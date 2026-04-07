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
    owner_name: z
      .string()
      .optional()
      .describe("First name of the business owner if findable"),
    google_review_count: z
      .number()
      .optional()
      .describe("Number of Google reviews"),
    has_facebook: z
      .boolean()
      .optional()
      .describe("Whether they have an active Facebook page"),
    has_instagram: z
      .boolean()
      .optional()
      .describe("Whether they have an active Instagram page"),
    last_website_update: z
      .string()
      .optional()
      .describe("Estimated year the website was last updated, e.g., '2019' or 'unknown'"),
    mobile_friendly: z
      .boolean()
      .optional()
      .describe("Whether the website works properly on mobile"),
    has_online_booking: z
      .boolean()
      .optional()
      .describe("Whether the site has online booking or scheduling"),
  },
  async ({
    name,
    type,
    phone,
    email,
    website,
    address,
    area,
    site_score,
    site_reason,
    owner_name,
    google_review_count,
    has_facebook,
    has_instagram,
    last_website_update,
    mobile_friendly,
    has_online_booking,
  }) => {
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
        owner_name: owner_name || null,
        google_review_count: typeof google_review_count === "number" ? google_review_count : null,
        has_facebook: typeof has_facebook === "boolean" ? has_facebook : null,
        has_instagram: typeof has_instagram === "boolean" ? has_instagram : null,
        last_website_update: last_website_update || null,
        mobile_friendly: typeof mobile_friendly === "boolean" ? mobile_friendly : null,
        has_online_booking: typeof has_online_booking === "boolean" ? has_online_booking : null,
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
