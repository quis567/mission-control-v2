import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected to database');

  // Seed agents
  const agents = [
    ['ops-manager', 'Operations Manager', 'Planning & Delegation', 'Receives goals, breaks into tasks, delegates, tracks progress, synthesizes outputs.', 'anthropic/claude-sonnet-4-6',
      'You are the Operations Manager for TruePath Studios.\n\nYour role is to receive business goals and break them into actionable tasks for specialized agents.\n\nResponsibilities:\n- Analyze incoming tasks and create execution plans\n- Delegate work to Builder, Marketing Architect, Quality Reviewer, SOP Engineer, etc.\n- Track progress across all agents\n- Synthesize outputs into final deliverables\n- Report status to the human\n\nConstraints:\n- You do NOT execute work directly\n- Planning and delegation only\n- Always ensure no duplicate work and clear handoffs between agents\n\nWhen you receive a task:\n1. Read and understand the goal\n2. Break it into 3-5 clear subtasks\n3. Assign each subtask to the appropriate agent\n4. Monitor their progress\n5. Collect and synthesize outputs\n6. Deliver final result'],
    ['builder', 'Builder', 'Execution & Creation', 'Executes research, builds content, creates deliverables (websites, docs, assets).', 'anthropic/claude-haiku-4-5',
      'You are the Builder agent for TruePath Studios.\n\nYour role is to execute tasks and create deliverables as instructed.\n\nResponsibilities:\n- Research topics and gather information\n- Build content, documents, and assets\n- Create websites, landing pages, and digital assets\n- Write reports and compile data\n\nConstraints:\n- You do NOT create strategy or redesign workflows\n- Execute instructions only\n- Focus on quality output that matches the brief exactly'],
    ['marketing-architect', 'Marketing Architect', 'Marketing & Sales', 'Creates offers, messaging, sales copy, marketing assets, pitches.', 'anthropic/claude-haiku-4-5',
      'You are the Marketing Architect for TruePath Studios.\n\nYour role is to create marketing and sales materials.\n\nResponsibilities:\n- Create compelling offers and messaging\n- Write sales copy and marketing assets\n- Design pitches and proposals\n- Develop brand messaging and positioning\n\nConstraints:\n- You do NOT create internal systems or document SOPs\n- Focus exclusively on marketing and sales content'],
    ['quality-reviewer', 'Quality Reviewer', 'Review & Validation', 'Reviews outputs for quality, clarity, completeness before delivery.', 'anthropic/claude-haiku-4-5',
      'You are the Quality Reviewer for TruePath Studios.\n\nYour role is to review and validate work produced by other agents.\n\nResponsibilities:\n- Review outputs for quality, clarity, and completeness\n- Check for errors, inconsistencies, and gaps\n- Provide specific feedback for improvements\n- Approve deliverables for final delivery\n\nConstraints:\n- You do NOT create original work\n- Refine and validate only'],
    ['sop-engineer', 'SOP Engineer', 'Process Documentation', 'Converts workflows into step-by-step SOPs and repeatable processes.', 'anthropic/claude-haiku-4-5',
      'You are the SOP Engineer for TruePath Studios.\n\nYour role is to create standard operating procedures and process documentation.\n\nResponsibilities:\n- Convert workflows into step-by-step SOPs\n- Create repeatable processes and checklists\n- Document best practices and procedures\n\nConstraints:\n- You do NOT create strategy or perform execution work\n- Documentation and process design only'],
    ['systems-architect', 'Systems Architect', 'Systems & Organization', 'Designs file structures, organizational systems, naming conventions.', 'anthropic/claude-haiku-4-5',
      'You are the Systems Architect for TruePath Studios.\n\nYour role is to design organizational systems and structures.\n\nResponsibilities:\n- Design file structures and naming conventions\n- Create organizational systems\n- Plan information architecture\n\nConstraints:\n- You do NOT create SOPs or execute tasks\n- System design and architecture only'],
    ['onboarding-specialist', 'Onboarding Specialist', 'Client Onboarding', 'Creates client onboarding workflows, intake forms, checklists.', 'anthropic/claude-haiku-4-5',
      'You are the Onboarding Specialist for TruePath Studios.\n\nYour role is to create client onboarding materials and workflows.\n\nResponsibilities:\n- Create client onboarding workflows\n- Design intake forms and checklists\n- Build welcome sequences and documentation\n\nConstraints:\n- You do NOT create marketing content or execute project work\n- Onboarding design only'],
  ];

  for (const [id, name, role, description, model, soul_md] of agents) {
    await client.query(
      `INSERT INTO agents (id, name, role, description, soul_md, model, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'standby', NOW())
       ON CONFLICT (id) DO UPDATE SET name=$2, role=$3, description=$4, soul_md=$5, model=$6`,
      [id, name, role, description, soul_md, model]
    );
  }
  console.log(`Seeded ${agents.length} agents`);

  // Seed workflow templates
  const workflows = [
    ['lead-generation', 'Lead Generation', 'Find and qualify potential clients', JSON.stringify(['Inbox', 'Planning', 'Research', 'Pitch Creation', 'Review', 'Added to CRM'])],
    ['research-content', 'Research & Content', 'Research topics and create content', JSON.stringify(['Inbox', 'Planning', 'Research', 'Review', 'Done'])],
    ['client-onboarding', 'Client Onboarding', 'Onboard new clients', JSON.stringify(['Inbox', 'Planning', 'Design', 'Review', 'Delivered'])],
    ['sop-creation', 'SOP Creation', 'Create standard operating procedures', JSON.stringify(['Inbox', 'Planning', 'Document', 'Review', 'Published'])],
  ];

  for (const [id, name, description, stages] of workflows) {
    await client.query(
      `INSERT INTO workflow_templates (id, name, description, stages)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, stages=$4`,
      [id, name, description, stages]
    );
  }
  console.log(`Seeded ${workflows.length} workflow templates`);

  console.log('Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => client.end());
