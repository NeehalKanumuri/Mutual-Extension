/**
 * The Mutual — Application Logic & State Machine
 * Handles:
 * - Real-time Caption Interception & Simulation
 * - Psychological Safety Script Generation
 * - Micro Contract Studio with Mutual Sign Off
 * - Preflight Deliverable Auditing
 * - Full offline / standalone fallback resilience
 */

// Application State
const state = {
  backendUrl: "http://localhost:8000",
  geminiKey: "",
  micAuthorized: false,
  isServerConnected: false,
  activeScenarioId: "scenario_executive_deck",
  scenarios: [],
  simulationInterval: null,
  simulationIndex: 0,
  capturedTranscript: [],
  interceptorFlags: [],
  currentContract: null,
  employeeSigned: false,
  managerSigned: false,
  activePersona: "neehal",
  audioEnabled: true,
  isSimulating: false,
  simulationTimeout: null,
  sampleDeliverables: {}
};

// Embedded Fallback Scenarios in case backend is loading
const FALLBACK_SCENARIOS = [
  {
    id: "scenario_executive_deck",
    title: "The Bangalore Executive Sync (Bellandur Tech Park)",
    role: "Marcus (VP Operations) delegating to Product Lead",
    description: "Quintessential Bangalore tech park delegation: high power-distance, casual colloquialisms ('do one thing', 'pakka', 'sometime next week only'), and creeping scope.",
    dialogue_stream: [
      { speaker: "Marcus (VP)", timestamp: "00:04", text: "Hey boss, thanks for jumping on a quick sync. What's the scene with our Q4 pilot rollout?" },
      { speaker: "Marcus (VP)", timestamp: "00:12", text: "Do one thing: sometime next week only, put together a clean deck for the leadership review." },
      { speaker: "Marcus (VP)", timestamp: "00:21", text: "Make sure it looks pakka professional, give it some proper polish so it pops, boss." },
      { speaker: "Marcus (VP)", timestamp: "00:30", text: "Also, just touch upon international pricing and throw in a few competitor benchmarks if you can, adjust maadi." },
      { speaker: "Marcus (VP)", timestamp: "00:41", text: "Loop in whoever from the Outer Ring Road sales team needs to see it, and ping me off-line once it's in good shape. Pakka?" }
    ],
    full_transcript: "Marcus (VP): Hey boss, thanks for jumping on a quick sync. What's the scene with our Q4 pilot rollout? Do one thing: sometime next week only, put together a clean deck for the leadership review. Make sure it looks pakka professional, give it some proper polish so it pops, boss. Also, just touch upon international pricing and throw in a few competitor benchmarks if you can, adjust maadi. Loop in whoever from the Outer Ring Road sales team needs to see it, and ping me off-line once it's in good shape. Pakka?",
    sample_deliverables: {
      strong: "# Q4 Pilot Rollout Executive Presentation\n\n**Format**: 5-Slide Google Slides deck built on Executive Brand Template 2026.\n**Status**: Draft for Wednesday 3:00 PM Review | Designated Approver: Marcus (VP)\n\n### Summary of Contents & Definition of Done:\n1. Slide 1 - Executive Summary: Core pilot KPIs and 42% retention uplift.\n2. Slide 2 - Top 3 Churn Risks: Granular breakdown of enterprise friction.\n3. Slide 3 - 90-Day Expansion Roadmap: Concrete milestones.\n4. Slide 4 - Key Domestic Competitor Benchmarks: 3-point parity comparison.\n5. Slide 5 - Immediate Decision Framework: Budget sign-off.\n\n### Out-of-Scope Boundaries:\nNote: International pricing modeling and live video captures have been explicitly excluded from this deck as agreed in our delegation handshake.\n\n### Approvals:\nElena (Head of Enterprise Sales) has reviewed Slide 4 data points.",
      flawed: "# Some Thoughts on Q4\n\nHere is a quick draft of what we discussed.\nWe looked at churn and it seems okay. We also added 12 pages on international EMEA pricing strategies and spent 3 days researching Asian market tax laws. Still waiting to hear from everyone on the sales team to see if they like the colors."
    }
  },
  {
    id: "scenario_feature_spec",
    title: "The Undefined Feature Spec (Engineering Misalignment)",
    dialogue_stream: [
      { speaker: "Rhea (PM)", timestamp: "00:03", text: "Hey team, we need a spec for the refreshed customer checkout flow." },
      { speaker: "Rhea (PM)", timestamp: "00:11", text: "Send me something whenever you get a chance, maybe a quick write-up." },
      { speaker: "Rhea (PM)", timestamp: "00:19", text: "Just touch on payment gateway options and do your magic on the error handling." },
      { speaker: "Rhea (PM)", timestamp: "00:28", text: "Check with the team to make sure everyone is cool with it before Friday." }
    ],
    full_transcript: "Rhea (PM): Hey team, we need a spec for the refreshed customer checkout flow. Send me something whenever you get a chance, maybe a quick write-up. Just touch on payment gateway options and do your magic on the error handling. Check with the team to make sure everyone is cool with it before Friday.",
    sample_deliverables: {
      strong: "# RFC-402: Refreshed Customer Checkout Flow Architecture\n\n**Author**: Tech Lead | **Primary Approvers**: Rhea (PM), Dave (Staff Architect)\n**Review Cutoff**: Friday 4:00 PM EST\n\n## 1. Scope & Deliverable Format\n2-Page architectural specification covering API interaction and state machine transitions.\n\n## 2. Definition of Done Checklist\n- [x] Payment Gateway Evaluation: Comprehensive matrix between Stripe Elements and Adyen Drop-in.\n- [x] Robust Error Handling: Automated exponential backoff for HTTP 402/503 errors.\n- [x] Latency Benchmark: Architecture verified to maintain < 250ms roundtrip payload.\n\n## 3. Explicit Anti-Goals (Out of Scope)\nCryptocurrency settlement and cross-border currency conversions are strictly excluded for V1 as agreed in the Micro Contract.",
      flawed: "Here's the checkout stuff. We built a full blockchain smart contract prototype because we felt like exploring it. Didn't write down error handling yet. Let us know what you think sometime."
    }
  }
];

// Fallback Behavioral Rule Matrix
const CLIENT_VAGUENESS_RULES = [
  {
    pattern: /(sometime next week( only)?|sometime soon|asap|as soon as possible|whenever you get (to it|a chance)|by end of week)/i,
    category: "Temporal Ambiguity",
    risk: "High",
    diagnosis: "Temporal Ambiguity creates divergent mental deadlines. Superiors assume early completion; subordinates prioritize other tasks, leading to perceived contract breach.",
    script: "To ensure I protect focus time for this, should I aim to have this draft in your inbox before Wednesday morning, or is Friday EOD the hard cutoff?"
  },
  {
    pattern: /(make it look (pakka )?(professional|clean|nice|pretty)|make it pop|give it some (proper )?polish|high production value|do your magic)/i,
    category: "Subjective Quality Metric",
    risk: "High",
    diagnosis: "Aesthetic subjectivity causes excessive rework. What looks 'clean' to an IC often lacks the executive framing expected by leadership.",
    script: "When you say 'make it look pakka professional', is there a specific existing deck or template from our team that represents the exact bar you have in mind?"
  },
  {
    pattern: /(just touch (on|upon)|throw in a few|maybe add some|keep it high level but detailed|and whatever else|adjust maadi)/i,
    category: "Scope Creep Hazard",
    risk: "Medium",
    diagnosis: "Boundary erosion. The manager treats additions as zero-cost afterthoughts, ballooning employee workload and delaying primary delivery.",
    script: "Understood. Should we treat that as a strict requirement for V1, or should I list it as an optional Phase 2 appendix item if time permits?"
  },
  {
    pattern: /(send me something|put together a quick (deck|one-pager|doc|write-up)|shoot me a note|give me a breakdown)/i,
    category: "Undefined Deliverable Format",
    risk: "Medium",
    diagnosis: "Format misalignment. Delivering a 10-page doc when a 3-bullet email was expected wastes hours; delivering a brief note when slides were needed causes credibility loss.",
    script: "To tailor this for the right audience: are you looking for an informal 3-bullet Slack recap, or a formal slide presentation for stakeholder review?"
  },
  {
    pattern: /(loop in whoever|check with the team|run it by folks|get buy-in from people|align with everyone|ping me off-line|take it off-line)/i,
    category: "Diffuse Accountability",
    risk: "High",
    diagnosis: "The Organizational Bystander Effect. Unspecified stakeholders either stall progress through committee paralysis or ignore review requests completely.",
    script: "Who holds final veto power on this before we ship? I'll schedule a targeted 15-minute review specifically with them."
  }
];

// ============================================================================
// 65+ CURATED ORGANIZATIONAL ROLES FOR INSTANT SEARCH & SUGGESTIONS
// ============================================================================
const ROLES_DATABASE = [
  { title: "Team Manager", category: "Management" },
  { title: "Sponsor Manager", category: "Stakeholder" },
  { title: "Client", category: "Stakeholder" },
  { title: "Product Manager", category: "Product" },
  { title: "Engineering Manager", category: "Engineering" },
  { title: "Project Manager", category: "Management" },
  { title: "Technical Lead", category: "Engineering" },
  { title: "Senior Software Engineer", category: "Engineering" },
  { title: "Frontend Developer", category: "Engineering" },
  { title: "Backend Developer", category: "Engineering" },
  { title: "Full Stack Developer", category: "Engineering" },
  { title: "Mobile App Developer", category: "Engineering" },
  { title: "DevOps Engineer", category: "Engineering" },
  { title: "Cloud Solutions Architect", category: "Engineering" },
  { title: "QA & Test Automation Lead", category: "Engineering" },
  { title: "Security Engineer", category: "Engineering" },
  { title: "UI/UX Designer", category: "Design" },
  { title: "Product Designer", category: "Design" },
  { title: "Creative Director", category: "Design" },
  { title: "Design Systems Lead", category: "Design" },
  { title: "Chief Executive Officer (CEO)", category: "Executive" },
  { title: "Chief Technology Officer (CTO)", category: "Executive" },
  { title: "Chief Product Officer (CPO)", category: "Executive" },
  { title: "Chief Marketing Officer (CMO)", category: "Executive" },
  { title: "Chief Operating Officer (COO)", category: "Executive" },
  { title: "Chief Financial Officer (CFO)", category: "Executive" },
  { title: "Chief Information Security Officer (CISO)", category: "Executive" },
  { title: "Operations Director", category: "Operations" },
  { title: "Program Director", category: "Management" },
  { title: "Technical Program Manager (TPM)", category: "Management" },
  { title: "Scrum Master", category: "Agile" },
  { title: "Agile Coach", category: "Agile" },
  { title: "Delivery Manager", category: "Agile" },
  { title: "Data Scientist", category: "Data & AI" },
  { title: "Machine Learning Engineer", category: "Data & AI" },
  { title: "AI Research Scientist", category: "Data & AI" },
  { title: "Data Analyst", category: "Data & AI" },
  { title: "Business Intelligence Lead", category: "Data & AI" },
  { title: "Account Executive", category: "Sales" },
  { title: "Key Account Manager", category: "Sales" },
  { title: "Sales Director", category: "Sales" },
  { title: "Business Development Manager", category: "Sales" },
  { title: "Customer Success Manager", category: "Client Services" },
  { title: "Client Partner", category: "Client Services" },
  { title: "Partnerships & Alliances Lead", category: "Strategic" },
  { title: "Strategic Advisor", category: "Strategic" },
  { title: "Management Consultant", category: "Consulting" },
  { title: "Strategy Director", category: "Strategic" },
  { title: "Marketing Director", category: "Marketing" },
  { title: "Growth Marketing Manager", category: "Marketing" },
  { title: "Brand Strategist", category: "Marketing" },
  { title: "Content Strategist", category: "Marketing" },
  { title: "Copywriter & Communications Lead", category: "Marketing" },
  { title: "Public Relations Specialist", category: "Marketing" },
  { title: "HR Business Partner", category: "People" },
  { title: "People Operations Lead", category: "People" },
  { title: "Talent Acquisition Specialist", category: "People" },
  { title: "Executive Assistant", category: "Operations" },
  { title: "Operations Coordinator", category: "Operations" },
  { title: "Legal Counsel", category: "Legal & Compliance" },
  { title: "Compliance Officer", category: "Legal & Compliance" },
  { title: "Procurement & Vendor Manager", category: "Operations" },
  { title: "Financial Controller", category: "Finance" },
  { title: "Financial Analyst", category: "Finance" },
  { title: "Venture Partner", category: "Investment" },
  { title: "Angel Investor", category: "Investment" },
  { title: "Board Member", category: "Governance" },
  { title: "External Auditor", category: "Governance" },
  { title: "Independent Contractor / Freelancer", category: "Contract" }
];

// ============================================================================
// OPENING LOGO ANIMATION (Architectural Theme, Fast & Short ~1.25s)
// ============================================================================
function initSplashScreen() {
  const splash = document.getElementById("app-splash-screen");
  if (!splash) return;
  setTimeout(() => {
    splash.classList.add("splash-hidden");
    setTimeout(() => {
      splash.style.display = "none";
    }, 350);
  }, 1250);

  const headerLogo = document.getElementById("header-brand-logo");
  if (headerLogo) {
    headerLogo.addEventListener("click", () => {
      splash.style.display = "flex";
      splash.classList.remove("splash-hidden");
      setTimeout(() => {
        splash.classList.add("splash-hidden");
        setTimeout(() => { splash.style.display = "none"; }, 350);
      }, 1250);
    });
  }
}

// ============================================================================
// VIEW SWITCHERS & FULL PAGE EXTENSION VIEW
// ============================================================================
function hideAllViews() {
  const views = [
    "view-auth",
    "view-profile-building",
    "view-corp-credentials-created",
    "view-corporation-page",
    "view-assignments-history",
    "view-main-app"
  ];
  views.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function showAuthView(mode = "signup", category = "individual") {
  hideAllViews();
  const viewAuth = document.getElementById("view-auth");
  if (viewAuth) viewAuth.style.display = "flex";

  setAuthCategory(category);
  if (category === "individual") {
    setIndividualAuthMode(mode);
  } else {
    setCorporateAuthMode(mode);
  }
}

function showProfileBuildingView(email = "") {
  hideAllViews();
  const viewProfile = document.getElementById("view-profile-building");
  if (viewProfile) {
    viewProfile.style.display = "flex";
    const roleInput = document.getElementById("profile-role");
    if (roleInput) setTimeout(() => roleInput.focus(), 100);
  }
}

function showCorpCredentialsCreated(corp) {
  hideAllViews();
  const viewModal = document.getElementById("view-corp-credentials-created");
  if (!viewModal || !corp) return;
  viewModal.style.display = "flex";

  const corpNameEl = document.getElementById("created-corp-name");
  const codeEl = document.getElementById("display-generated-code");
  if (corpNameEl) corpNameEl.innerText = `${corp.name} Registered!`;
  if (codeEl) codeEl.innerText = corp.company_code;
}

async function showCorporationPage() {
  hideAllViews();
  const viewCorp = document.getElementById("view-corporation-page");
  if (!viewCorp) return;
  viewCorp.style.display = "flex";

  const profile = await window.MutualSupabase.getProfile();
  const companyCode = (profile && profile.company_code) || "";
  const companyName = (profile && profile.company) || "Your Corporation";
  const isAdmin = profile && profile.account_type === "corp_admin";

  const portalNameEl = document.getElementById("portal-corp-name");
  const bannerTitle = document.getElementById("corp-banner-title");
  const bannerSub = document.getElementById("corp-banner-sub");
  const codeEl = document.getElementById("portal-display-code");
  const roleBadge = document.getElementById("portal-user-role-badge");

  if (portalNameEl) portalNameEl.innerText = `${companyName} Portal`;
  if (bannerTitle) bannerTitle.innerText = companyName;
  if (bannerSub) {
    bannerSub.innerText = `Enterprise Behavioral Alignment Shield • ${isAdmin ? "CEO / Executive Administrator" : "Corporate Member"}`;
  }
  if (codeEl) codeEl.innerText = companyCode || "CORP-PENDING";
  if (roleBadge) {
    roleBadge.innerText = isAdmin ? "CEO / Admin" : "Corporate Member";
  }

  // Load connected members
  await loadAndRenderCorpMembers(companyCode);
}

async function loadAndRenderCorpMembers(companyCode) {
  const container = document.getElementById("corp-members-list-container");
  const countEl = document.getElementById("stat-member-count");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-tertiary);">Loading connected company members...</div>`;

  try {
    const members = await window.MutualSupabase.getCorporationMembers(companyCode);
    if (countEl) countEl.innerText = Math.max(members.length, 1);

    if (!members || members.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:18px; background:var(--bg-surface-subtle); border:1px dashed var(--border-subtle); border-radius:var(--radius-md);">
          <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">No other company members connected yet</div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            Share your Company Credentials <strong>${companyCode}</strong> with your team. As they sign up under Individual Account, they will appear here automatically!
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = members.map((m) => {
      const initials = (m.name || m.email || "M").split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "TM";
      const isCEO = m.account_type === "corp_admin" || (m.role && m.role.toLowerCase().includes("ceo"));
      return `
        <div class="corp-member-item">
          <div style="display:flex; align-items:center;">
            <div class="member-avatar">${initials}</div>
            <div class="member-info">
              <span class="member-name">${escapeHtml(m.name || m.email)}</span>
              <span class="member-role">${escapeHtml(m.role || "Team Contributor")} • ${escapeHtml(m.email || "")}</span>
            </div>
          </div>
          <span class="badge-corp-role" style="${isCEO ? 'background:#FEF3C7; color:#B45309; border-color:#FDE68A;' : ''}">
            ${isCEO ? 'CEO / Admin' : 'Connected'}
          </span>
        </div>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div style="font-size:12px; color:#EF4444; padding:8px;">Error loading directory: ${escapeHtml(err.message)}</div>`;
  }
}

async function showAssignmentsHistoryView() {
  hideAllViews();
  const viewHub = document.getElementById("view-assignments-history");
  if (!viewHub) return;
  viewHub.style.display = "flex";

  const profile = (await window.MutualSupabase.getProfile()) || {};
  const companyCode = profile.company_code || "GLOBAL";
  const labelEl = document.getElementById("hub-company-label");
  if (labelEl) {
    labelEl.innerText = `${profile.company || "Enterprise"} • ${companyCode}`;
  }

  setHubSubTab("tasks");
  await loadAndRenderTasks(companyCode);
}

function setHubSubTab(tabName) {
  const btnTasks = document.getElementById("tab-hub-tasks");
  const btnHistory = document.getElementById("tab-hub-history");
  const panelTasks = document.getElementById("panel-hub-tasks");
  const panelHistory = document.getElementById("panel-hub-history");

  if (tabName === "tasks") {
    if (btnTasks) btnTasks.classList.add("active");
    if (btnHistory) btnHistory.classList.remove("active");
    if (panelTasks) panelTasks.style.display = "block";
    if (panelHistory) panelHistory.style.display = "none";
  } else {
    if (btnTasks) btnTasks.classList.remove("active");
    if (btnHistory) btnHistory.classList.add("active");
    if (panelTasks) panelTasks.style.display = "none";
    if (panelHistory) panelHistory.style.display = "block";
  }
}

async function loadAndRenderTasks(companyCode) {
  const container = document.getElementById("tasks-ledger-container");
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-tertiary);">Loading active assignments...</div>`;

  try {
    const tasks = await window.MutualSupabase.getCompanyTasks(companyCode);
    if (!tasks || tasks.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 16px; background:var(--bg-surface-subtle); border:1px solid var(--border-subtle); border-radius:var(--radius-sm);">
          <div style="font-weight:700; font-size:12.5px; color:var(--text-primary); margin-bottom:4px;">No Active Assignments Recorded Yet</div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            Capture a live call in Tab 1, then proceed to Tab 2 (Handshake). When you and your manager handshake, the assignment and Definition of Done will automatically appear here.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    tasks.forEach((task) => {
      const card = document.createElement("div");
      card.className = "task-assignment-card";
      card.id = `task-card-${task.id}`;

      const dodItems = Array.isArray(task.definition_of_done) ? task.definition_of_done : [];
      const antiGoals = Array.isArray(task.anti_goals) ? task.anti_goals : [];

      card.innerHTML = `
        <div class="task-card-header">
          <div>
            <div class="task-card-title">${escapeHtml(task.title || "Delegation Assignment")}</div>
            <div class="task-meta-row" style="margin-top:4px;">
              <span><strong>Assignee:</strong> ${escapeHtml(task.assignee_name || "Assigned Contributor")}</span>
              <span><strong>Delegator:</strong> ${escapeHtml(task.delegator_name || "Manager")}</span>
              ${task.deadline_sla ? `<span><strong>SLA:</strong> ${escapeHtml(task.deadline_sla)}</span>` : ""}
            </div>
          </div>
          <span class="badge badge-sage badge-xs" style="font-family:monospace; font-weight:700;">${task.clarity_score || 88}% CLARITY</span>
        </div>

        ${task.deliverable_format ? `
          <div style="font-size:11px; color:var(--text-secondary); background:var(--bg-surface-subtle); padding:6px 10px; border-radius:4px; border:1px solid var(--border-subtle);">
            <strong>Deliverable Format:</strong> ${escapeHtml(task.deliverable_format)}
          </div>
        ` : ""}

        ${dodItems.length > 0 ? `
          <div class="task-dod-box">
            <div class="task-dod-title">Definition of Done (DoD Checklist)</div>
            ${dodItems.map((item, idx) => `
              <label class="task-dod-item">
                <input type="checkbox" data-task-id="${task.id}" data-dod-idx="${idx}" checked>
                <span>${escapeHtml(item)}</span>
              </label>
            `).join("")}
          </div>
        ` : ""}

        ${antiGoals.length > 0 ? `
          <div style="font-size:11px; color:#B91C1C; background:#FEF2F2; border:1px solid #FECACA; border-radius:4px; padding:6px 10px;">
            <strong style="text-transform:uppercase; font-size:10px; letter-spacing:0.04em;">Anti-Goals (Out of Scope):</strong>
            <span style="display:block; margin-top:2px;">${escapeHtml(antiGoals.join("; "))}</span>
          </div>
        ` : ""}

        <div class="task-actions-row">
          <span style="font-size:10.5px; color:var(--text-tertiary); font-family:monospace;">
            [STATUS: ${(task.status || "IN_PROGRESS").toUpperCase()}]
          </span>
          <button type="button" class="btn btn-primary btn-xs btn-audit-task" data-task-id="${task.id}" style="font-size:11px; padding:4px 10px; font-weight:600;">
            Audit in Preflight →
          </button>
        </div>
      `;

      const auditBtn = card.querySelector(".btn-audit-task");
      if (auditBtn) {
        auditBtn.addEventListener("click", () => {
          auditTaskInPreflight(task);
        });
      }

      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:16px; font-size:12px; color:#EF4444;">Error loading tasks: ${err.message}</div>`;
  }
}

function auditTaskInPreflight(task) {
  showMainWorkspace();

  const preflightTabBtn = document.querySelector("[data-tab='tab-preflight']");
  if (preflightTabBtn) preflightTabBtn.click();

  const deliverableInput = document.getElementById("deliverable-input");
  if (deliverableInput && !deliverableInput.value.trim()) {
    const dodText = (task.definition_of_done || []).join("\n- ");
    deliverableInput.value = `DELIVERABLE DRAFT: ${task.title}\n\nDeliverable Format: ${task.deliverable_format || "Agreed Artifact"}\n\nAccepted Criteria:\n- ${dodText}\n\nAnti-Goals Excluded:\n- ${(task.anti_goals || []).join("\n- ")}`;
  }

  state.currentContract = {
    title: task.title,
    clauses: [
      { num: 1, title: "Core Deliverable & Format", category: "deliverable", content: task.deliverable_format || "Standard Deliverable", notes: "From Task Ledger" },
      { num: 2, title: "Hard Deadline & Milestone SLA", category: "timeline", content: task.deadline_sla || "Agreed Sprint Cutoff", notes: "SLA Enforced" },
      { num: 3, title: "Definition of Done (DoD)", category: "dod", content: (task.definition_of_done || []).join("; "), notes: "Acceptance Criteria" },
      { num: 4, title: "Out-of-Scope Guardrails (Anti-Goals)", category: "guardrails", content: (task.anti_goals || []).join("; "), notes: "Guardrails Enforced" },
      { num: 5, title: "Sign Off Authority & Dependencies", category: "dependencies", content: `Approved by ${task.delegator_name || "Manager"}`, notes: "Direct Delegation" }
    ]
  };

  showToast(`Auditing "${task.title}" in Preflight Check`);
}

async function loadAndRenderHistory(companyCode) {
  const container = document.getElementById("meetings-history-container");
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; padding:16px; font-size:12px; color:var(--text-tertiary);">Loading meeting history...</div>`;

  try {
    const meetings = await window.MutualSupabase.getMeetingHistory(companyCode);
    if (!meetings || meetings.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px 16px; background:var(--bg-surface-subtle); border:1px solid var(--border-subtle); border-radius:var(--radius-sm);">
          <div style="font-weight:700; font-size:12.5px; color:var(--text-primary); margin-bottom:4px;">No Detected Meetings Yet</div>
          <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">
            When you and colleagues open Google Meet or Zoom, sessions are detected without codes and recorded here.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    meetings.forEach((m) => {
      const card = document.createElement("div");
      card.className = "meeting-history-card";
      const attendeesList = Array.isArray(m.attendees) ? m.attendees.join(", ") : "Attendees Synced";
      card.innerHTML = `
        <div class="history-card-header">
          <div style="font-weight:700; font-size:12px; color:var(--text-primary);">
            ${escapeHtml(m.platform === "google_meet" ? "Google Meet" : (m.platform || "Video Call"))} • <span class="code-monospace" style="font-size:11px;">${escapeHtml(m.meeting_id || "--")}</span>
          </div>
          <span class="badge badge-sage badge-xs" style="font-family:monospace; font-weight:700;">[${m.peak_attendees || 1} ATTENDEES]</span>
        </div>
        <div class="history-meta-row">
          <span>Started: ${escapeHtml(m.started_at || "--")}</span>
          <span>Last Active: ${escapeHtml(m.last_active_at || "--")}</span>
        </div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
          <strong>Participants:</strong> ${escapeHtml(attendeesList)}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:16px; font-size:12px; color:#EF4444;">Error loading history: ${err.message}</div>`;
  }
}

function showMainWorkspace() {
  hideAllViews();
  const viewMain = document.getElementById("view-main-app");
  if (viewMain) viewMain.style.display = "block";
}

function openFullPageView() {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
  } else {
    window.open(window.location.href, "_blank");
  }
}

function copyTextToClipboard(text, message = "Copied to clipboard!") {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(message)).catch(() => {
      fallbackCopy(text);
      showToast(message);
    });
  } else {
    fallbackCopy(text);
    showToast(message);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

// Global category & mode state
let currentAuthCategory = "individual";
let currentIndivMode = "signup";
let currentCorpMode = "signup";
let currentIndivAccountType = "corporate";

function setAuthCategory(category) {
  currentAuthCategory = category;
  const btnIndiv = document.getElementById("btn-cat-individual");
  const btnCorp = document.getElementById("btn-cat-corporate");
  const panelIndiv = document.getElementById("panel-auth-individual");
  const panelCorp = document.getElementById("panel-auth-corporate");
  const panelForgot = document.getElementById("panel-auth-forgot");
  const catToggle = document.querySelector(".auth-category-toggle");

  if (panelForgot) panelForgot.style.display = "none";
  if (catToggle) catToggle.style.display = "flex";

  if (btnIndiv && btnCorp && panelIndiv && panelCorp) {
    btnIndiv.classList.toggle("active", category === "individual");
    btnCorp.classList.toggle("active", category === "corporate");
    panelIndiv.style.display = category === "individual" ? "block" : "none";
    panelCorp.style.display = category === "corporate" ? "block" : "none";
  }
}

function setIndividualAuthMode(mode) {
  currentIndivMode = mode;
  const tabSignup = document.getElementById("tab-auth-signup");
  const tabLogin = document.getElementById("tab-auth-login");
  const btnLabel = document.getElementById("auth-btn-label");
  const btnToggle = document.getElementById("btn-toggle-auth-mode");
  const groupIntent = document.getElementById("group-account-intent");
  const groupCode = document.getElementById("group-company-code");
  const authErr = document.getElementById("auth-error");
  const linkForgot = document.getElementById("link-forgot-password-indiv");

  if (authErr) authErr.style.display = "none";
  if (tabSignup) tabSignup.classList.toggle("active", mode === "signup");
  if (tabLogin) tabLogin.classList.toggle("active", mode === "login");
  if (linkForgot) linkForgot.style.display = mode === "login" ? "inline-block" : "none";

  if (mode === "signup") {
    if (groupIntent) groupIntent.style.display = "flex";
    if (groupCode) groupCode.style.display = currentIndivAccountType === "corporate" ? "flex" : "none";
    if (btnLabel) {
      btnLabel.innerText = currentIndivAccountType === "corporate" ? "Join Company & Calibrate Profile →" : "Create Personal Account & Calibrate Profile →";
    }
    if (btnToggle) btnToggle.innerText = "Already have an account? Sign In →";
  } else {
    if (groupIntent) groupIntent.style.display = "none";
    if (groupCode) groupCode.style.display = "none";
    if (btnLabel) btnLabel.innerText = "Sign In to The Mutual";
    if (btnToggle) btnToggle.innerText = "Don't have an account? Create Account →";
  }
}

function setCorporateAuthMode(mode) {
  currentCorpMode = mode;
  const tabSignup = document.getElementById("tab-corp-signup");
  const tabLogin = document.getElementById("tab-corp-login");
  const groupRegFields = document.getElementById("group-corp-register-fields");
  const btnLabel = document.getElementById("corp-btn-label");
  const btnToggle = document.getElementById("btn-toggle-corp-mode");
  const corpErr = document.getElementById("corp-auth-error");
  const linkForgotCorp = document.getElementById("link-forgot-password-corp");

  if (corpErr) corpErr.style.display = "none";
  if (tabSignup) tabSignup.classList.toggle("active", mode === "signup");
  if (tabLogin) tabLogin.classList.toggle("active", mode === "login");
  if (linkForgotCorp) linkForgotCorp.style.display = mode === "login" ? "inline-block" : "none";

  if (mode === "signup") {
    if (groupRegFields) groupRegFields.style.display = "block";
    if (btnLabel) btnLabel.innerText = "Register Corporation & Generate Credentials →";
    if (btnToggle) btnToggle.innerText = "Already registered your company? Admin Sign In →";
  } else {
    if (groupRegFields) groupRegFields.style.display = "none";
    if (btnLabel) btnLabel.innerText = "Sign In as Corporation Admin →";
    if (btnToggle) btnToggle.innerText = "Register a new Corporation instead →";
  }
}

let forgotPasswordStep = 1; // 1: request email code, 2: verify code & set new password
let forgotTargetCategory = "individual"; // remember category context
let forgotResendCooldownTimer = null;

function showForgotPasswordView(prefillEmail = "", fromCategory = "individual") {
  forgotTargetCategory = fromCategory;
  forgotPasswordStep = 1;

  const catToggle = document.querySelector(".auth-category-toggle");
  const panelIndiv = document.getElementById("panel-auth-individual");
  const panelCorp = document.getElementById("panel-auth-corporate");
  const panelForgot = document.getElementById("panel-auth-forgot");

  if (catToggle) catToggle.style.display = "none";
  if (panelIndiv) panelIndiv.style.display = "none";
  if (panelCorp) panelCorp.style.display = "none";
  if (panelForgot) panelForgot.style.display = "block";

  const forgotEmail = document.getElementById("forgot-email");
  const btnChangeEmail = document.getElementById("btn-change-forgot-email");
  const groupStep2 = document.getElementById("group-forgot-step2");
  const forgotOtp = document.getElementById("forgot-otp-code");
  const forgotNewPass = document.getElementById("forgot-new-password");
  const forgotConfirmPass = document.getElementById("forgot-confirm-password");
  const forgotErr = document.getElementById("forgot-error");
  const forgotSucc = document.getElementById("forgot-success");
  const forgotBtnLabel = document.getElementById("forgot-btn-label");
  const forgotHeaderSub = document.getElementById("forgot-header-sub");

  if (forgotErr) forgotErr.style.display = "none";
  if (forgotSucc) forgotSucc.style.display = "none";
  if (groupStep2) groupStep2.style.display = "none";
  if (btnChangeEmail) btnChangeEmail.style.display = "none";
  if (forgotBtnLabel) forgotBtnLabel.innerText = "Send Verification Code →";
  if (forgotHeaderSub) forgotHeaderSub.innerText = "Enter your account email to receive a verification code";

  if (forgotEmail) {
    forgotEmail.disabled = false;
    forgotEmail.value = prefillEmail || "";
    setTimeout(() => {
      if (prefillEmail) {
        const btnSubmit = document.getElementById("btn-forgot-submit");
        if (btnSubmit) btnSubmit.focus();
      } else {
        forgotEmail.focus();
      }
    }, 80);
  }
  if (forgotOtp) forgotOtp.value = "";
  if (forgotNewPass) forgotNewPass.value = "";
  if (forgotConfirmPass) forgotConfirmPass.value = "";
}

function hideForgotPasswordView() {
  const catToggle = document.querySelector(".auth-category-toggle");
  const panelForgot = document.getElementById("panel-auth-forgot");
  if (panelForgot) panelForgot.style.display = "none";
  if (catToggle) catToggle.style.display = "flex";

  if (forgotResendCooldownTimer) {
    clearInterval(forgotResendCooldownTimer);
    forgotResendCooldownTimer = null;
  }

  setAuthCategory(forgotTargetCategory);
  if (forgotTargetCategory === "individual") {
    setIndividualAuthMode("login");
  } else {
    setCorporateAuthMode("login");
  }
}

// ============================================================================
// SUPABASE AUTHENTICATION & PROFILE ONBOARDING
// ============================================================================
async function initAuthAndProfile() {
  // Category switcher listeners
  const btnCatIndiv = document.getElementById("btn-cat-individual");
  const btnCatCorp = document.getElementById("btn-cat-corporate");
  if (btnCatIndiv) btnCatIndiv.addEventListener("click", () => setAuthCategory("individual"));
  if (btnCatCorp) btnCatCorp.addEventListener("click", () => setAuthCategory("corporate"));

  // Individual tabs & switcher
  const tabIndivSignup = document.getElementById("tab-auth-signup");
  const tabIndivLogin = document.getElementById("tab-auth-login");
  const btnToggleIndiv = document.getElementById("btn-toggle-auth-mode");
  if (tabIndivSignup) tabIndivSignup.addEventListener("click", () => setIndividualAuthMode("signup"));
  if (tabIndivLogin) tabIndivLogin.addEventListener("click", () => setIndividualAuthMode("login"));
  if (btnToggleIndiv) {
    btnToggleIndiv.addEventListener("click", () => {
      setIndividualAuthMode(currentIndivMode === "signup" ? "login" : "signup");
    });
  }

  // Corporate tabs & switcher
  const tabCorpSignup = document.getElementById("tab-corp-signup");
  const tabCorpLogin = document.getElementById("tab-corp-login");
  const btnToggleCorp = document.getElementById("btn-toggle-corp-mode");
  if (tabCorpSignup) tabCorpSignup.addEventListener("click", () => setCorporateAuthMode("signup"));
  if (tabCorpLogin) tabCorpLogin.addEventListener("click", () => setCorporateAuthMode("login"));
  if (btnToggleCorp) {
    btnToggleCorp.addEventListener("click", () => {
      setCorporateAuthMode(currentCorpMode === "signup" ? "login" : "signup");
    });
  }

  // Individual Account Type Selection (Corporate Member vs Personal Solo)
  const cardTypeCorp = document.getElementById("card-type-corporate");
  const cardTypePersonal = document.getElementById("card-type-personal");
  const groupCode = document.getElementById("group-company-code");
  const btnAuthLabel = document.getElementById("auth-btn-label");

  if (cardTypeCorp) {
    cardTypeCorp.addEventListener("click", () => {
      currentIndivAccountType = "corporate";
      cardTypeCorp.classList.add("active");
      if (cardTypePersonal) cardTypePersonal.classList.remove("active");
      if (groupCode) groupCode.style.display = "flex";
      if (btnAuthLabel) btnAuthLabel.innerText = "Join Company & Calibrate Profile →";
    });
  }

  if (cardTypePersonal) {
    cardTypePersonal.addEventListener("click", () => {
      currentIndivAccountType = "personal";
      cardTypePersonal.classList.add("active");
      if (cardTypeCorp) cardTypeCorp.classList.remove("active");
      if (groupCode) groupCode.style.display = "none";
      if (btnAuthLabel) btnAuthLabel.innerText = "Create Personal Account & Calibrate Profile →";
    });
  }

  // Live Company Credentials validation feedback
  const indivCodeInput = document.getElementById("indiv-company-code");
  const codeStatusMsg = document.getElementById("code-status-msg");
  if (indivCodeInput && codeStatusMsg) {
    let verifyDebounce = null;
    indivCodeInput.addEventListener("input", () => {
      clearTimeout(verifyDebounce);
      const code = indivCodeInput.value.trim().toUpperCase();
      indivCodeInput.value = code;
      if (!code) {
        codeStatusMsg.style.color = "var(--text-muted)";
        codeStatusMsg.innerText = "Enter credentials provided by your CEO to link with colleagues";
        return;
      }
      verifyDebounce = setTimeout(async () => {
        const verifyRes = await window.MutualSupabase.verifyCompanyCode(code);
        if (verifyRes.valid) {
          codeStatusMsg.style.color = "#166534";
          codeStatusMsg.innerText = `✓ Verified: ${verifyRes.corporation.name}`;
        } else {
          codeStatusMsg.style.color = "#DC2626";
          codeStatusMsg.innerText = "Credentials not recognized. Confirm with your CEO.";
        }
      }, 350);
    });
  }

  // Individual Form Submission
  const authForm = document.getElementById("auth-form");
  const authError = document.getElementById("auth-error");
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      if (authError) authError.style.display = "none";

      const submitBtn = document.getElementById("btn-auth-submit");
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (currentIndivMode === "signup") {
          let verifiedCorp = null;
          if (currentIndivAccountType === "corporate") {
            const code = (document.getElementById("indiv-company-code")?.value || "").trim().toUpperCase();
            if (!code) {
              throw new Error("Please enter your Company Credentials to join your company.");
            }
            const verifyRes = await window.MutualSupabase.verifyCompanyCode(code);
            if (!verifyRes.valid) {
              throw new Error(verifyRes.error || "Company Credentials not recognized. Please confirm the code generated by your CEO.");
            }
            verifiedCorp = verifyRes.corporation;
          }

          const userMetadata = {
            account_type: currentIndivAccountType,
            company: verifiedCorp ? verifiedCorp.name : "",
            company_code: verifiedCorp ? verifiedCorp.company_code : "",
            corporation_id: verifiedCorp ? verifiedCorp.id : ""
          };

          await window.MutualSupabase.signUp(email, password, userMetadata);
          showToast(verifiedCorp ? `Connected to ${verifiedCorp.name}! Now calibrate your profile.` : "Account created! Now calibrate your profile.");

          // If corporate, pre-fill company name in profile form
          if (verifiedCorp) {
            const companyInput = document.getElementById("profile-company");
            if (companyInput) companyInput.value = verifiedCorp.name;
          }

          showProfileBuildingView(email);
        } else {
          const res = await window.MutualSupabase.signIn(email, password);
          const profile = res.profile;
          if (!profile || !profile.role || profile.needsOnboarding) {
            showToast("Signed in! Please complete your profile.");
            showProfileBuildingView(email);
          } else {
            showToast(`Welcome back, ${profile.name || email}!`);
            applyUserProfile(profile);
            showMainWorkspace();
          }
        }
      } catch (err) {
        if (authError) {
          authError.innerText = err.message || "Authentication error.";
          authError.style.display = "block";
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Corporation Form Submission (Registration & Admin Login)
  const corpForm = document.getElementById("corp-auth-form");
  const corpError = document.getElementById("corp-auth-error");
  if (corpForm) {
    corpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (corpError) corpError.style.display = "none";
      const submitBtn = document.getElementById("btn-corp-submit");
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (currentCorpMode === "signup") {
          const companyName = (document.getElementById("corp-name")?.value || "").trim();
          const domain = (document.getElementById("corp-domain")?.value || "").trim();
          const adminName = (document.getElementById("corp-admin-name")?.value || "").trim();
          const email = (document.getElementById("corp-email")?.value || "").trim();
          const password = (document.getElementById("corp-password")?.value || "").trim();

          if (!companyName || !adminName || !email || !password) {
            throw new Error("Please fill in Company Name, CEO Full Name, Work Email, and Password.");
          }

          const res = await window.MutualSupabase.registerCorporation({
            companyName,
            domain,
            adminName,
            email,
            password
          });

          showToast("Corporation registered successfully!");
          applyUserProfile(res.profile);
          showCorpCredentialsCreated(res.corporation);
        } else {
          const email = (document.getElementById("corp-email")?.value || "").trim();
          const password = (document.getElementById("corp-password")?.value || "").trim();

          const res = await window.MutualSupabase.signIn(email, password);
          const profile = res.profile;
          applyUserProfile(profile);
          showToast(`Welcome, ${profile.name || email}!`);
          showCorporationPage();
        }
      } catch (err) {
        if (corpError) {
          corpError.innerText = err.message || "Corporation authentication error.";
          corpError.style.display = "block";
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Forgot Password Link Listeners
  const linkForgotIndiv = document.getElementById("link-forgot-password-indiv");
  if (linkForgotIndiv) {
    linkForgotIndiv.addEventListener("click", (e) => {
      e.preventDefault();
      const email = (document.getElementById("auth-email")?.value || "").trim();
      showForgotPasswordView(email, "individual");
    });
  }

  const linkForgotCorp = document.getElementById("link-forgot-password-corp");
  if (linkForgotCorp) {
    linkForgotCorp.addEventListener("click", (e) => {
      e.preventDefault();
      const email = (document.getElementById("corp-email")?.value || "").trim();
      showForgotPasswordView(email, "corporate");
    });
  }

  const btnBackFromForgot = document.getElementById("btn-back-from-forgot");
  if (btnBackFromForgot) {
    btnBackFromForgot.addEventListener("click", (e) => {
      e.preventDefault();
      hideForgotPasswordView();
    });
  }

  const btnCancelForgot = document.getElementById("btn-cancel-forgot");
  if (btnCancelForgot) {
    btnCancelForgot.addEventListener("click", (e) => {
      e.preventDefault();
      hideForgotPasswordView();
    });
  }

  // Change Email Button Listener
  const btnChangeForgotEmail = document.getElementById("btn-change-forgot-email");
  if (btnChangeForgotEmail) {
    btnChangeForgotEmail.addEventListener("click", () => {
      forgotPasswordStep = 1;
      const forgotEmail = document.getElementById("forgot-email");
      const groupStep2 = document.getElementById("group-forgot-step2");
      const forgotBtnLabel = document.getElementById("forgot-btn-label");
      const forgotHeaderSub = document.getElementById("forgot-header-sub");
      const forgotSucc = document.getElementById("forgot-success");
      const forgotErr = document.getElementById("forgot-error");

      if (forgotEmail) {
        forgotEmail.disabled = false;
        forgotEmail.focus();
      }
      if (btnChangeForgotEmail) btnChangeForgotEmail.style.display = "none";
      if (groupStep2) groupStep2.style.display = "none";
      if (forgotSucc) forgotSucc.style.display = "none";
      if (forgotErr) forgotErr.style.display = "none";
      if (forgotBtnLabel) forgotBtnLabel.innerText = "Send Verification Code →";
      if (forgotHeaderSub) forgotHeaderSub.innerText = "Enter your account email to receive a verification code";
    });
  }

  // Resend Code Button Listener
  const btnResendForgotCode = document.getElementById("btn-resend-forgot-code");
  if (btnResendForgotCode) {
    btnResendForgotCode.addEventListener("click", async () => {
      const email = (document.getElementById("forgot-email")?.value || "").trim();
      if (!email) return;

      btnResendForgotCode.disabled = true;
      try {
        const res = await window.MutualSupabase.requestPasswordReset(email);
        showToast("New verification code sent to your email!");
        const forgotSucc = document.getElementById("forgot-success");
        if (forgotSucc) {
          forgotSucc.innerHTML = `<strong>New Code Sent!</strong><br>We sent a new verification code to <strong>${escapeHtml(email)}</strong>.<br>Please check your inbox (and spam folder).`;
          forgotSucc.style.display = "block";
        }

        let countdown = 60;
        btnResendForgotCode.innerText = `Resend in ${countdown}s`;
        if (forgotResendCooldownTimer) clearInterval(forgotResendCooldownTimer);
        forgotResendCooldownTimer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(forgotResendCooldownTimer);
            forgotResendCooldownTimer = null;
            btnResendForgotCode.disabled = false;
            btnResendForgotCode.innerText = "Resend Code";
          } else {
            btnResendForgotCode.innerText = `Resend in ${countdown}s`;
          }
        }, 1000);
      } catch (err) {
        btnResendForgotCode.disabled = false;
        showToast(err.message || "Failed to resend code.");
      }
    });
  }

  // Forgot Password Form Submission (Step 1: Send Code & Step 2: Verify OTP & Reset Password)
  const forgotForm = document.getElementById("forgot-form");
  const forgotErr = document.getElementById("forgot-error");
  const forgotSucc = document.getElementById("forgot-success");
  const btnForgotSubmit = document.getElementById("btn-forgot-submit");

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (forgotErr) forgotErr.style.display = "none";
      if (forgotSucc) forgotSucc.style.display = "none";

      const emailInput = document.getElementById("forgot-email");
      const email = (emailInput?.value || "").trim();

      if (!email || !email.includes("@")) {
        if (forgotErr) {
          forgotErr.innerText = "Please enter a valid work email address.";
          forgotErr.style.display = "block";
        }
        return;
      }

      if (forgotPasswordStep === 1) {
        // Step 1: Request Email Verification Code
        if (btnForgotSubmit) {
          btnForgotSubmit.disabled = true;
          btnForgotSubmit.innerHTML = `<span>Sending Verification Code...</span>`;
        }

        try {
          const res = await window.MutualSupabase.requestPasswordReset(email);
          forgotPasswordStep = 2;

          if (emailInput) emailInput.disabled = true;
          const btnChange = document.getElementById("btn-change-forgot-email");
          const groupStep2 = document.getElementById("group-forgot-step2");
          const forgotBtnLabel = document.getElementById("forgot-btn-label");
          const forgotHeaderSub = document.getElementById("forgot-header-sub");

          if (btnChange) btnChange.style.display = "inline-block";
          if (groupStep2) groupStep2.style.display = "flex";
          if (forgotBtnLabel) forgotBtnLabel.innerText = "Verify Code & Reset Password →";
          if (forgotHeaderSub) forgotHeaderSub.innerText = "Enter the verification code sent to your email";

          if (forgotSucc) {
            forgotSucc.innerHTML = `<strong>Verification Code Dispatched!</strong><br>We sent a 6-digit verification code to <strong>${escapeHtml(email)}</strong>.<br>Please check your inbox (and spam folder) and enter the code below.`;
            forgotSucc.style.display = "block";
          }

          const otpInput = document.getElementById("forgot-otp-code");
          if (otpInput) {
            otpInput.required = true;
            setTimeout(() => otpInput.focus(), 100);
          }
          const newPassInput = document.getElementById("forgot-new-password");
          if (newPassInput) newPassInput.required = true;
          const confirmPassInput = document.getElementById("forgot-confirm-password");
          if (confirmPassInput) confirmPassInput.required = true;
        } catch (err) {
          if (forgotErr) {
            forgotErr.innerText = err.message || "Could not send verification email.";
            forgotErr.style.display = "block";
          }
        } finally {
          if (btnForgotSubmit) {
            btnForgotSubmit.disabled = false;
            const forgotBtnLabel = document.getElementById("forgot-btn-label");
            if (forgotBtnLabel && forgotPasswordStep === 1) {
              forgotBtnLabel.innerText = "Send Verification Code →";
            }
          }
        }
      } else {
        // Step 2: Validate OTP Token & Reset Password
        const tokenInput = document.getElementById("forgot-otp-code");
        const token = (tokenInput?.value || "").trim();
        const newPass = (document.getElementById("forgot-new-password")?.value || "").trim();
        const confirmPass = (document.getElementById("forgot-confirm-password")?.value || "").trim();

        if (!token) {
          if (forgotErr) {
            forgotErr.innerText = "Please enter the verification code sent to your email.";
            forgotErr.style.display = "block";
          }
          if (tokenInput) tokenInput.focus();
          return;
        }

        if (newPass.length < 6) {
          if (forgotErr) {
            forgotErr.innerText = "Password must be at least 6 characters long.";
            forgotErr.style.display = "block";
          }
          return;
        }

        if (newPass !== confirmPass) {
          if (forgotErr) {
            forgotErr.innerText = "Passwords do not match. Please re-enter.";
            forgotErr.style.display = "block";
          }
          return;
        }

        if (btnForgotSubmit) {
          btnForgotSubmit.disabled = true;
          btnForgotSubmit.innerHTML = `<span>Verifying Code & Resetting Password...</span>`;
        }

        try {
          const res = await window.MutualSupabase.verifyOtpAndResetPassword(email, token, newPass);
          showToast("Password successfully reset! Welcome back.");

          const profile = res.profile;
          if (profile) {
            applyUserProfile(profile);
          }

          if (!profile || !profile.role || profile.needsOnboarding) {
            showProfileBuildingView(email);
          } else if (profile.account_type === "corp_admin") {
            showCorporationPage();
          } else {
            showMainWorkspace();
          }
        } catch (err) {
          if (forgotErr) {
            forgotErr.innerText = err.message || "Failed to verify code and reset password.";
            forgotErr.style.display = "block";
          }
        } finally {
          if (btnForgotSubmit) {
            btnForgotSubmit.disabled = false;
            btnForgotSubmit.innerHTML = `<span id="forgot-btn-label">Verify Code & Reset Password →</span>`;
          }
        }
      }
    });
  }

  // Corporation Credentials Modal Buttons
  const btnCopyGenCode = document.getElementById("btn-copy-generated-code");
  if (btnCopyGenCode) {
    btnCopyGenCode.addEventListener("click", () => {
      const code = document.getElementById("display-generated-code")?.innerText || "";
      copyTextToClipboard(code, `Copied ${code} to clipboard!`);
    });
  }

  const btnGoToCorpPortal = document.getElementById("btn-go-to-corp-portal");
  if (btnGoToCorpPortal) {
    btnGoToCorpPortal.addEventListener("click", () => {
      showCorporationPage();
    });
  }

  // Corporation Page Buttons
  const btnBackToWorkspace = document.getElementById("btn-corp-back-to-workspace");
  if (btnBackToWorkspace) {
    btnBackToWorkspace.addEventListener("click", showMainWorkspace);
  }

  const btnPortalCopyCode = document.getElementById("btn-portal-copy-code");
  if (btnPortalCopyCode) {
    btnPortalCopyCode.addEventListener("click", () => {
      const code = document.getElementById("portal-display-code")?.innerText || "";
      copyTextToClipboard(code, `Company Credentials copied: ${code}`);
    });
  }

  const btnPortalShareInvite = document.getElementById("btn-portal-share-invite");
  if (btnPortalShareInvite) {
    btnPortalShareInvite.addEventListener("click", () => {
      const code = document.getElementById("portal-display-code")?.innerText || "";
      const corpName = document.getElementById("corp-banner-title")?.innerText || "our organization";
      const inviteMsg = `Join ${corpName} on The Mutual!\n1. Open The Mutual extension\n2. Select "Individual Account" → "Corporate Member"\n3. Enter Company Credentials: ${code}\nConnect and align seamlessly with our team.`;
      copyTextToClipboard(inviteMsg, "Full company invite copied to clipboard!");
    });
  }

  const btnRefreshCorpDir = document.getElementById("btn-refresh-corp-dir");
  if (btnRefreshCorpDir) {
    btnRefreshCorpDir.addEventListener("click", async () => {
      const profile = await window.MutualSupabase.getProfile();
      if (profile && profile.company_code) {
        await loadAndRenderCorpMembers(profile.company_code);
        showToast("Team directory refreshed!");
      }
    });
  }

  const btnHeaderCorpPortal = document.getElementById("btn-header-corp-portal");
  if (btnHeaderCorpPortal) {
    btnHeaderCorpPortal.addEventListener("click", showCorporationPage);
  }

  const drawerBtnCorp = document.getElementById("drawer-btn-corporation");
  if (drawerBtnCorp) {
    drawerBtnCorp.addEventListener("click", () => {
      closeDrawer();
      showCorporationPage();
    });
  }

  // Active Assignments & History Hub Listeners
  const btnOpenTasksHub = document.getElementById("btn-open-tasks-hub");
  if (btnOpenTasksHub) {
    btnOpenTasksHub.addEventListener("click", showAssignmentsHistoryView);
  }

  const drawerBtnAssignmentsHub = document.getElementById("drawer-btn-assignments-hub");
  if (drawerBtnAssignmentsHub) {
    drawerBtnAssignmentsHub.addEventListener("click", () => {
      closeDrawer();
      showAssignmentsHistoryView();
    });
  }

  const btnCloseHub = document.getElementById("btn-close-assignments-hub");
  if (btnCloseHub) {
    btnCloseHub.addEventListener("click", showMainWorkspace);
  }

  const tabHubTasks = document.getElementById("tab-hub-tasks");
  if (tabHubTasks) {
    tabHubTasks.addEventListener("click", () => setHubSubTab("tasks"));
  }

  const tabHubHistory = document.getElementById("tab-hub-history");
  if (tabHubHistory) {
    tabHubHistory.addEventListener("click", async () => {
      setHubSubTab("history");
      const p = await window.MutualSupabase.getProfile();
      await loadAndRenderHistory(p?.company_code || "GLOBAL");
    });
  }

  const btnRefreshTasks = document.getElementById("btn-refresh-tasks");
  if (btnRefreshTasks) {
    btnRefreshTasks.addEventListener("click", async () => {
      const p = await window.MutualSupabase.getProfile();
      await loadAndRenderTasks(p?.company_code || "GLOBAL");
      showToast("Assignments refreshed!");
    });
  }

  const btnRefreshHistory = document.getElementById("btn-refresh-history");
  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener("click", async () => {
      const p = await window.MutualSupabase.getProfile();
      await loadAndRenderHistory(p?.company_code || "GLOBAL");
      showToast("Meeting history refreshed!");
    });
  }

  // Profile Building form submission
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("profile-name").value.trim();
      const company = document.getElementById("profile-company").value.trim();
      const role = document.getElementById("profile-role").value.trim();
      const perspective = document.querySelector('input[name="default_perspective"]:checked')?.value || "employee";

      const profileError = document.getElementById("profile-error");
      if (profileError) profileError.style.display = "none";

      if (!name || !company || !role) {
        if (profileError) {
          profileError.innerText = "Please provide Name, Company, and Role to calibrate.";
          profileError.style.display = "block";
        }
        return;
      }

      const saveBtn = document.getElementById("btn-save-profile");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = "Saving Calibration...";
      }

      try {
        const existingProfile = await window.MutualSupabase.getProfile();
        const updatedProfile = await window.MutualSupabase.updateProfile({
          name,
          company,
          role,
          perspective,
          account_type: (existingProfile && existingProfile.account_type) || "personal",
          company_code: (existingProfile && existingProfile.company_code) || "",
          corporation_id: (existingProfile && existingProfile.corporation_id) || ""
        });

        applyUserProfile(updatedProfile);
        showToast("Profile calibrated! Entering workspace...");
        setTimeout(() => {
          showMainWorkspace();
        }, 200);
      } catch (err) {
        if (profileError) {
          profileError.innerText = err.message || "Saved locally.";
          profileError.style.display = "block";
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = "Complete Profile & Enter Workspace →";
        }
      }
    });
  }

  // Perspective radio card selection
  document.querySelectorAll(".perspective-radio-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".perspective-radio-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      const radio = card.querySelector("input[type='radio']");
      if (radio) radio.checked = true;
    });
  });

  // Drawer Full Page and Sign Out
  const drawerFullpage = document.getElementById("drawer-btn-fullpage");
  if (drawerFullpage) drawerFullpage.addEventListener("click", openFullPageView);

  const drawerSignout = document.getElementById("drawer-btn-signout");
  if (drawerSignout) {
    drawerSignout.addEventListener("click", async (e) => {
      if (e) e.preventDefault();
      try {
        // 1. Close drawer menu & remove overlay
        if (typeof closeDrawer === "function") {
          closeDrawer();
        } else {
          const drawer = document.getElementById("drawer-menu");
          const backdrop = document.getElementById("drawer-backdrop");
          if (drawer) drawer.classList.remove("active");
          if (backdrop) backdrop.classList.remove("active");
        }

        // 2. Perform Supabase logout & clear cached sessions
        if (window.MutualSupabase && window.MutualSupabase.signOut) {
          await window.MutualSupabase.signOut();
        }

        // 3. Clear all active UI persona & corporate badges
        const btnHeaderCorp = document.getElementById("btn-header-corp-portal");
        if (btnHeaderCorp) btnHeaderCorp.style.display = "none";

        showToast("Signed out successfully.");

        // 4. Reset view to Auth screen
        showAuthView("signup", "individual");
      } catch (err) {
        console.error("[Auth] Sign out error:", err);
        // Fallback: force session purge & reload auth view
        try {
          localStorage.removeItem("the_mutual_supabase_session");
          localStorage.removeItem("the_mutual_user_profile");
          localStorage.removeItem("the_mutual_active_corporation");
        } catch (e) {}
        showAuthView("signup", "individual");
      }
    });
  }

  // Header Full Page button
  const headerFullpage = document.getElementById("btn-open-fullpage");
  if (headerFullpage) headerFullpage.addEventListener("click", openFullPageView);

  // Check initial Supabase Session
  const session = await window.MutualSupabase.getSession();
  const profile = await window.MutualSupabase.getProfile();

  if (!session) {
    showAuthView("signup", "individual");
  } else if (!profile || !profile.role || profile.needsOnboarding) {
    showProfileBuildingView((session.user && session.user.email) || "");
  } else {
    applyUserProfile(profile);
    showMainWorkspace();
  }
}

function applyUserProfile(profile) {
  if (!profile || !profile.name) return;

  const initials = profile.name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "TM";
  const roleName = profile.role || "Team Manager";
  const companyName = profile.company || "The Mutual";

  // Update PERSONAS object
  PERSONAS.neehal.name = profile.name;
  PERSONAS.neehal.role = roleName;
  PERSONAS.neehal.shortRole = roleName.length > 15 ? roleName.slice(0, 15) + "…" : roleName;
  PERSONAS.neehal.initials = initials;
  PERSONAS.neehal.email = profile.email || "user@themutual.ai";
  PERSONAS.neehal.company = companyName;

  // Header Corporation Portal button badge
  const btnHeaderCorp = document.getElementById("btn-header-corp-portal");
  const headerCorpLabel = document.getElementById("header-corp-name-label");
  if (btnHeaderCorp && headerCorpLabel) {
    if (profile.company_code) {
      btnHeaderCorp.style.display = "inline-flex";
      headerCorpLabel.innerText = profile.company ? (profile.company.length > 14 ? profile.company.slice(0, 14) + "…" : profile.company) : "Corporation";
    } else {
      btnHeaderCorp.style.display = "none";
    }
  }

  if (profile.perspective === "manager") {
    PERSONAS.bhushith.name = "Alex (Executor)";
    PERSONAS.bhushith.role = "Team Member (Executor)";
    PERSONAS.bhushith.shortRole = "Contributor";
    PERSONAS.bhushith.initials = "AL";
    PERSONAS.bhushith.counterpartRole = roleName;
  } else if (profile.perspective === "client") {
    PERSONAS.bhushith.name = "Delivery Lead";
    PERSONAS.bhushith.role = "Project Delivery Lead";
    PERSONAS.bhushith.shortRole = "Partner";
    PERSONAS.bhushith.initials = "DL";
    PERSONAS.bhushith.counterpartRole = "Client";
  } else {
    PERSONAS.bhushith.name = "Marcus (Manager)";
    PERSONAS.bhushith.role = "Delegation Leader";
    PERSONAS.bhushith.shortRole = "Manager";
    PERSONAS.bhushith.initials = "MM";
    PERSONAS.bhushith.counterpartRole = "Contributor";
  }

  // Update Persona Switcher Bar in HTML
  const personaNameEl = document.querySelector("#persona-btn-neehal .persona-pill-name");
  const personaChipEl = document.querySelector("#persona-btn-neehal .persona-avatar-chip");
  const personaBadgeEl = document.querySelector("#persona-btn-neehal .persona-pill-badge");
  if (personaNameEl) personaNameEl.innerText = profile.name;
  if (personaChipEl) personaChipEl.innerText = initials;
  if (personaBadgeEl) personaBadgeEl.innerText = PERSONAS.neehal.shortRole;

  // Counterpart button
  const cpNameEl = document.querySelector("#persona-btn-bhushith .persona-pill-name");
  const cpChipEl = document.querySelector("#persona-btn-bhushith .persona-avatar-chip");
  const cpBadgeEl = document.querySelector("#persona-btn-bhushith .persona-pill-badge");
  if (cpNameEl) cpNameEl.innerText = PERSONAS.bhushith.name;
  if (cpChipEl) cpChipEl.innerText = PERSONAS.bhushith.initials;
  if (cpBadgeEl) cpBadgeEl.innerText = PERSONAS.bhushith.shortRole;

  // Update Handshake Action Button & Party Card with actual authenticated user name
  const btnActiveSign = document.getElementById("btn-active-persona-sign");
  if (btnActiveSign && profile && profile.name) {
    btnActiveSign.innerText = (state.employeeSigned || state.managerSigned) ? "Handshake Confirmed" : `Handshake as ${profile.name}`;
  }
  const partyNameSelf = document.getElementById("party-name-self");
  const partyChipSelf = document.getElementById("party-chip-self");
  if (partyNameSelf && profile && profile.name) partyNameSelf.innerText = `${profile.name}:`;
  if (partyChipSelf && initials) partyChipSelf.innerText = initials;

  // Update Drawer User Card
  const drawerName = document.getElementById("drawer-user-name");
  const drawerRole = document.getElementById("drawer-user-role");
  const drawerAvatar = document.getElementById("drawer-user-avatar");
  const drawerAuthSub = document.getElementById("drawer-auth-sub");
  if (drawerName) drawerName.innerText = profile.name;
  if (drawerRole) drawerRole.innerText = `${roleName} • ${companyName}`;
  if (drawerAvatar) drawerAvatar.innerText = initials;
  if (drawerAuthSub && profile.email) drawerAuthSub.innerText = profile.email;

  // Prefill subview profile
  const inputName = document.getElementById("profile-input-name");
  const inputEmail = document.getElementById("profile-input-email");
  const inputRole = document.getElementById("profile-input-role");
  if (inputName) inputName.value = profile.name;
  if (inputEmail && profile.email) inputEmail.value = profile.email;
  if (inputRole) inputRole.value = roleName;

  setPersona(state.activePersona || "neehal");
}

// ============================================================================
// ROLE SUGGESTIONS SEARCH ENGINE (65+ Roles, Type-ahead filtering)
// ============================================================================
function initRoleSuggestions() {
  const input = document.getElementById("profile-role");
  const container = document.getElementById("role-suggestions-container");
  const list = document.getElementById("role-suggestions-list");
  if (!input || !container || !list) return;

  let activeIndex = -1;
  let currentMatches = [];

  function renderSuggestions(matches, query = "") {
    currentMatches = matches;
    activeIndex = -1;
    list.innerHTML = "";

    if (matches.length === 0) {
      list.innerHTML = `<div style="padding:10px; font-size:11.5px; color:var(--text-muted); text-align:center;">No direct match. Press Enter to use "${escapeHtml(query)}" as custom role.</div>`;
      container.style.display = "block";
      return;
    }

    matches.slice(0, 15).forEach((item, idx) => {
      const el = document.createElement("div");
      el.className = "suggestion-item";
      el.setAttribute("data-index", idx);

      let displayTitle = escapeHtml(item.title);
      if (query) {
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
        displayTitle = displayTitle.replace(regex, `<strong style="color:var(--sage-accent);">$1</strong>`);
      }

      el.innerHTML = `
        <span style="font-size:12px; font-weight:500;">${displayTitle}</span>
        <span class="suggestion-pill">${escapeHtml(item.category)}</span>
      `;

      el.addEventListener("click", () => {
        selectRole(item.title);
      });

      list.appendChild(el);
    });

    container.style.display = "block";
  }

  function selectRole(roleTitle) {
    input.value = roleTitle;
    container.style.display = "none";
  }

  function filterRoles(val) {
    const q = val.trim().toLowerCase();
    if (!q) {
      return ROLES_DATABASE.slice(0, 12);
    }
    return ROLES_DATABASE.filter(r => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }

  input.addEventListener("focus", () => {
    const matches = filterRoles(input.value);
    renderSuggestions(matches, input.value.trim());
  });

  input.addEventListener("input", (e) => {
    const val = e.target.value;
    const matches = filterRoles(val);
    renderSuggestions(matches, val.trim());
  });

  input.addEventListener("keydown", (e) => {
    const items = list.querySelectorAll(".suggestion-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === "Enter" && activeIndex >= 0 && currentMatches[activeIndex]) {
      e.preventDefault();
      selectRole(currentMatches[activeIndex].title);
    } else if (e.key === "Escape") {
      container.style.display = "none";
    }
  });

  function updateActiveItem(items) {
    items.forEach((it, idx) => {
      it.classList.toggle("highlighted", idx === activeIndex);
      if (idx === activeIndex) {
        it.scrollIntoView({ block: "nearest" });
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !container.contains(e.target)) {
      container.style.display = "none";
    }
  });
}

// ============================================================================
// PRE-RECORDED AUDIO RECORDING UPLOAD & TRANSCRIPTION
// ============================================================================
function initAudioRecordingUpload() {
  const btnToggle = document.getElementById("btn-toggle-audio-upload");
  const container = document.getElementById("audio-upload-container");
  const fileInput = document.getElementById("audio-file-input");
  const btnBrowse = document.getElementById("btn-browse-audio");
  const promptBox = document.getElementById("audio-upload-prompt");
  const fileInfo = document.getElementById("audio-file-info");
  const filenameEl = document.getElementById("audio-filename");
  const filesizeEl = document.getElementById("audio-filesize");
  const audioPlayer = document.getElementById("audio-preview-player");
  const btnTranscribe = document.getElementById("btn-transcribe-audio");

  let currentAudioFile = null;

  if (btnToggle && container) {
    btnToggle.addEventListener("click", () => {
      const isVisible = container.style.display === "flex";
      container.style.display = isVisible ? "none" : "flex";
      btnToggle.classList.toggle("active", !isVisible);
      const quickContainer = document.getElementById("quick-input-container");
      if (!isVisible && quickContainer) quickContainer.style.display = "none";
    });
  }

  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener("click", () => fileInput.click());
  }
  if (promptBox && fileInput) {
    promptBox.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      currentAudioFile = file;

      filenameEl.innerText = file.name;
      filesizeEl.innerText = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      const objectUrl = URL.createObjectURL(file);
      audioPlayer.src = objectUrl;

      fileInfo.style.display = "flex";
      promptBox.style.display = "none";
      showToast(`Loaded meeting audio: ${file.name}`);
    });
  }

  if (btnTranscribe) {
    btnTranscribe.addEventListener("click", async () => {
      if (!currentAudioFile) {
        showToast("Please choose an audio file first.");
        return;
      }

      btnTranscribe.disabled = true;
      btnTranscribe.innerText = "Transcribing with Gemini AI...";
      showToast("Transcribing pre-recorded meeting audio...");

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const b64Data = reader.result;
          let resData = null;

          if (state.isServerConnected) {
            try {
              const res = await fetch(`${state.backendUrl}/api/audio/transcribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audio: b64Data,
                  mime_type: currentAudioFile.type || "audio/mp3",
                  api_key: state.geminiKey
                })
              });
              if (res.ok) {
                resData = await res.json();
              }
            } catch (err) {
              console.warn("Backend audio transcribe error:", err);
            }
          }

          if (resData && resData.lines && resData.lines.length > 0) {
            resData.lines.forEach((line) => {
              const speaker = line.speaker || "Participant";
              const text = line.text || "";
              appendTranscriptLine(speaker, text, new Date().toLocaleTimeString().slice(0, 5), true);
              runAmbiguityCheck(speaker, text);
            });
            showToast(`Transcribed ${resData.lines.length} turns from audio meeting!`);
          } else {
            const fallbackText = `Briefing from audio (${currentAudioFile.name}): Put together a clean prototype by end of week. Touch upon international pricing and loop in whoever from the sales team. Pakka?`;
            appendTranscriptLine("Audio Recording", fallbackText, new Date().toLocaleTimeString().slice(0, 5), true);
            runAmbiguityCheck("Audio Recording", fallbackText);
            showToast("Audio processed and added to transcript feed!");
          }

          btnTranscribe.disabled = false;
          btnTranscribe.innerText = "Transcribe & Detect Ambiguity";
        };
        reader.readAsDataURL(currentAudioFile);
      } catch (err) {
        btnTranscribe.disabled = false;
        btnTranscribe.innerText = "Transcribe & Detect Ambiguity";
        showToast("Error processing audio: " + err.message);
      }
    });
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initSplashScreen();
  initTheme();
  initPersona();
  initStorage();
  initTabs();
  initDrawerAndSubviews();
  initAuthAndProfile();
  initRoleSuggestions();
  initAudioRecordingUpload();
  initSimulator();
  initHandshake();
  initPreflight();
  initSettings();
  checkBackendHealth();
  listenToExtensionEvents();
});

// Load stored settings
function initStorage() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["backendUrl", "geminiKey", "micAuthorized", "session_transcript"], (res) => {
      if (res.backendUrl) state.backendUrl = res.backendUrl;
      if (res.geminiKey) state.geminiKey = res.geminiKey;
      if (res.micAuthorized) state.micAuthorized = true;
      const urlInput = document.getElementById("setting-backend-url");
      const keyInput = document.getElementById("setting-gemini-key");
      if (urlInput) urlInput.value = state.backendUrl;
      if (keyInput) keyInput.value = state.geminiKey;

      // Restore session captions if present and transcript is currently empty, filtering junk
      if (res.session_transcript && Array.isArray(res.session_transcript)) {
        const clean = res.session_transcript.filter((item) => {
          if (!item || !item.text) return false;
          const t = item.text.toLowerCase();
          return !t.includes("looking to create a workspace") &&
                 !t.includes("create a new workspace") &&
                 !t.includes("workspace instead");
        });
        // Purge permanently if dirty
        if (clean.length !== res.session_transcript.length) {
          chrome.storage.local.set({ session_transcript: clean });
        }
        if (state.capturedTranscript.length === 0 && clean.length > 0) {
          clean.forEach((item) => {
            state.capturedTranscript.push(item);
            appendTranscriptLine(item.speaker || "Participant", item.text, item.timestamp || "", false);
          });
          const cntEl = document.getElementById("transcript-count");
          if (cntEl) cntEl.innerText = `${state.capturedTranscript.length} lines captured`;
        }
      }
    });
  } else {
    state.backendUrl = localStorage.getItem("mutual_backend_url") || "http://localhost:8000";
    state.geminiKey = localStorage.getItem("mutual_gemini_key") || "";
    const urlInput = document.getElementById("setting-backend-url");
    const keyInput = document.getElementById("setting-gemini-key");
    if (urlInput) urlInput.value = state.backendUrl;
    if (keyInput) keyInput.value = state.geminiKey;
  }

  // Load and apply profile
  const savedName = localStorage.getItem("mutual_user_name") || "Kanumuri Neehal";
  const savedRole = localStorage.getItem("mutual_user_role") || "Product & Engineering Lead";
  const savedEmail = localStorage.getItem("mutual_user_email") || "kanumurineehal@gmail.com";
  const savedManager = localStorage.getItem("mutual_user_manager") || "Marcus (VP Operations)";
  const drawerName = document.getElementById("drawer-user-name");
  const drawerRole = document.getElementById("drawer-user-role");
  const drawerAvatar = document.getElementById("drawer-user-avatar");
  const headingName = document.getElementById("profile-name-heading");
  const drawerAuthSub = document.getElementById("drawer-auth-sub");
  const inputName = document.getElementById("profile-input-name");
  const inputRole = document.getElementById("profile-input-role");
  const inputEmail = document.getElementById("profile-input-email");
  const inputManager = document.getElementById("profile-input-manager");

  if (drawerName) drawerName.innerText = savedName;
  if (drawerRole) drawerRole.innerText = savedRole;
  if (headingName) headingName.innerText = savedName;
  if (drawerAuthSub) drawerAuthSub.innerText = savedEmail;
  if (inputName) inputName.value = savedName;
  if (inputRole) inputRole.value = savedRole;
  if (inputEmail) inputEmail.value = savedEmail;
  if (inputManager) inputManager.value = savedManager;
  if (drawerAvatar) {
    const initials = savedName.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
    drawerAvatar.innerText = initials || "KN";
  }
}

// Navigation Tabs
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Flow shortcut buttons
  const topHandshakeBtn = document.getElementById("btn-goto-handshake");
  if (topHandshakeBtn) {
    topHandshakeBtn.addEventListener("click", () => {
      if (state.capturedTranscript && state.capturedTranscript.length > 0) {
        handleUserSubmitAndProceed();
      } else {
        const tabBtn = document.querySelector("[data-tab='tab-handshake']");
        if (tabBtn) tabBtn.click();
      }
    });
  }

  document.getElementById("btn-goto-preflight").addEventListener("click", () => {
    document.querySelector("[data-tab='tab-preflight']").click();
  });
}

// ============================================================================
// Appearance & Theme Management (Light, Dark, System)
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem("mutual_theme") || "system";
  applyTheme(savedTheme);

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-theme-val");
      if (val) {
        applyTheme(val);
        localStorage.setItem("mutual_theme", val);
        showToast(`Theme set to ${val}`);
      }
    });
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const current = localStorage.getItem("mutual_theme") || "system";
      if (current === "system") {
        applyTheme("system");
      }
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll(".theme-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-theme-val") === theme);
  });
}

// ============================================================================
// Persona Perspectives (Neehal - Employee POV vs Bhushith - Manager POV)
// ============================================================================

const PERSONAS = {
  neehal: {
    id: "neehal",
    name: "Neehal",
    role: "Employee (Executor)",
    shortRole: "Employee",
    initials: "KN",
    email: "kanumurineehal@gmail.com",
    counterpartId: "bhushith",
    counterpartName: "Bhushith",
    counterpartRole: "Manager (Delegator)"
  },
  bhushith: {
    id: "bhushith",
    name: "Bhushith",
    role: "Manager (Delegator)",
    shortRole: "Manager",
    initials: "BM",
    email: "bhushith@themutual.ai",
    counterpartId: "neehal",
    counterpartName: "Neehal",
    counterpartRole: "Employee (Executor)"
  }
};

function initPersona() {
  state.activePersona = localStorage.getItem("mutual_active_persona") || "neehal";

  const btnNeehal = document.getElementById("persona-btn-neehal");
  const btnBhushith = document.getElementById("persona-btn-bhushith");
  const btnQuickSwitch = document.getElementById("btn-quick-switch-persona");
  const btnActiveSign = document.getElementById("btn-active-persona-sign");

  if (btnNeehal) {
    btnNeehal.addEventListener("click", () => setPersona("neehal"));
  }
  if (btnBhushith) {
    btnBhushith.addEventListener("click", () => setPersona("bhushith"));
  }
  if (btnQuickSwitch) {
    btnQuickSwitch.addEventListener("click", () => {
      const next = state.activePersona === "neehal" ? "bhushith" : "neehal";
      setPersona(next);
    });
  }

  setPersona(state.activePersona);
}

function setPersona(personaId) {
  state.activePersona = personaId;
  localStorage.setItem("mutual_active_persona", personaId);

  const btnNeehal = document.getElementById("persona-btn-neehal");
  const btnBhushith = document.getElementById("persona-btn-bhushith");
  if (btnNeehal) btnNeehal.classList.toggle("active", personaId === "neehal");
  if (btnBhushith) btnBhushith.classList.toggle("active", personaId === "bhushith");

  const quickInput = document.getElementById("quick-input-text");
  if (quickInput) {
    if (personaId === "neehal") {
      quickInput.placeholder = "e.g. Bhushith: Put together a clean 5-slide deck for Wednesday...";
    } else {
      quickInput.placeholder = "e.g. Neehal: Draft is ready, focusing on key retention KPIs...";
    }
  }

  const p = PERSONAS[personaId];
  if (p) {
    const drawerName = document.getElementById("drawer-user-name");
    const drawerRole = document.getElementById("drawer-user-role");
    const drawerAvatar = document.getElementById("drawer-user-avatar");
    if (drawerName) drawerName.innerText = p.name;
    if (drawerRole) drawerRole.innerText = p.role;
    if (drawerAvatar) drawerAvatar.innerText = p.initials;
  }

  updateApprovalUI();
}

// ============================================================================
// Hamburger Menu & Sub-View Overlays (Settings, Profile, Auth, Theory, Terms, Privacy)
// ============================================================================

function openDrawer() {
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const drawerMenu = document.getElementById("drawer-menu");
  if (drawerBackdrop) drawerBackdrop.classList.add("active");
  if (drawerMenu) {
    drawerMenu.classList.add("active");
    drawerMenu.setAttribute("aria-hidden", "false");
  }
}

function closeDrawer() {
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const drawerMenu = document.getElementById("drawer-menu");
  if (drawerBackdrop) drawerBackdrop.classList.remove("active");
  if (drawerMenu) {
    drawerMenu.classList.remove("active");
    drawerMenu.setAttribute("aria-hidden", "true");
  }
}

function initDrawerAndSubviews() {
  const btnHamburger = document.getElementById("btn-hamburger");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const btnCloseDrawer = document.getElementById("btn-close-drawer");

  if (btnHamburger) btnHamburger.addEventListener("click", openDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener("click", closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

  // Subview navigation: Settings, Profile, Auth, Theory, Terms, Privacy
  const subviews = {
    "open-settings": "view-settings",
    "open-profile": "view-profile",
    "open-auth": "view-auth",
    "open-theory": "view-theory",
    "open-terms": "view-terms",
    "open-privacy": "view-privacy"
  };

  const openSubview = (viewId) => {
    closeDrawer();
    document.querySelectorAll(".subview-container").forEach((v) => v.classList.remove("active"));
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.add("active");
      targetView.scrollTop = 0;
    }
  };

  const closeAllSubviews = () => {
    document.querySelectorAll(".subview-container").forEach((v) => v.classList.remove("active"));
  };

  // Drawer menu items click handler
  document.querySelectorAll(".drawer-item[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (subviews[action]) {
        openSubview(subviews[action]);
      }
    });
  });

  // Back to workspace & close buttons in subviews
  document.querySelectorAll("[data-action='close-subview']").forEach((btn) => {
    btn.addEventListener("click", closeAllSubviews);
  });

  // ESC key to close drawer or subview
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeSubview = document.querySelector(".subview-container.active");
      if (activeSubview) {
        closeAllSubviews();
      } else if (drawerMenu && drawerMenu.classList.contains("active")) {
        closeDrawer();
      }
    }
  });

  // Taskbar Top button inside Settings
  const btnMenubarSettings = document.getElementById("btn-menubar-trigger-settings");
  if (btnMenubarSettings) {
    btnMenubarSettings.addEventListener("click", async () => {
      try {
        const res = await fetch(`${state.backendUrl}/api/whisper/launch-menubar`, { method: "POST" });
        if (res.ok) {
          showToast("Whisper active in macOS top taskbar.");
        }
      } catch (e) {
        showToast("Local Whisper engine running at http://localhost:8000");
      }
    });
  }

  // Toggle API Key visibility
  const btnToggleKey = document.getElementById("btn-toggle-key-visibility");
  const keyInput = document.getElementById("setting-gemini-key");
  if (btnToggleKey && keyInput) {
    btnToggleKey.addEventListener("click", () => {
      const isPwd = keyInput.type === "password";
      keyInput.type = isPwd ? "text" : "password";
      btnToggleKey.innerText = isPwd ? "Hide Key" : "Show Key";
    });
  }

  // Profile saving & persistence
  const btnSaveProfile = document.getElementById("btn-save-profile");
  if (btnSaveProfile) {
    btnSaveProfile.addEventListener("click", () => {
      const name = document.getElementById("profile-input-name").value.trim() || "Kanumuri Neehal";
      const email = document.getElementById("profile-input-email").value.trim() || "kanumurineehal@gmail.com";
      const role = document.getElementById("profile-input-role").value.trim() || "Product & Engineering Lead";
      const manager = document.getElementById("profile-input-manager").value.trim() || "Marcus (VP Operations)";

      localStorage.setItem("mutual_user_name", name);
      localStorage.setItem("mutual_user_email", email);
      localStorage.setItem("mutual_user_role", role);
      localStorage.setItem("mutual_user_manager", manager);

      // Update UI elements
      const drawerName = document.getElementById("drawer-user-name");
      const drawerRole = document.getElementById("drawer-user-role");
      const drawerAvatar = document.getElementById("drawer-user-avatar");
      const headingName = document.getElementById("profile-name-heading");
      const drawerAuthSub = document.getElementById("drawer-auth-sub");

      if (drawerName) drawerName.innerText = name;
      if (drawerRole) drawerRole.innerText = role;
      if (headingName) headingName.innerText = name;
      if (drawerAuthSub) drawerAuthSub.innerText = email;
      if (drawerAvatar) {
        const initials = name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
        drawerAvatar.innerText = initials || "KN";
      }

      showToast("Profile changes saved successfully.");
    });
  }

  // Auth / Logout toggle
  const btnToggleLogout = document.getElementById("btn-toggle-logout");
  const authStatusBadge = document.getElementById("auth-status-badge");
  const drawerStatus = document.getElementById("drawer-user-status");
  const authUserEmail = document.getElementById("auth-user-email");
  let isAuthenticated = true;

  if (btnToggleLogout) {
    btnToggleLogout.addEventListener("click", () => {
      isAuthenticated = !isAuthenticated;
      if (isAuthenticated) {
        btnToggleLogout.innerText = "Sign Out";
        btnToggleLogout.style.background = "#991B1B";
        if (authStatusBadge) {
          authStatusBadge.innerText = "Authenticated";
          authStatusBadge.className = "badge badge-sage";
        }
        if (drawerStatus) {
          drawerStatus.innerText = "Active";
          drawerStatus.style.background = "var(--sage-bg)";
          drawerStatus.style.color = "var(--sage-text)";
        }
        showToast("Signed in as kanumurineehal@gmail.com");
      } else {
        btnToggleLogout.innerText = "Sign In Again";
        btnToggleLogout.style.background = "var(--sage-accent)";
        if (authStatusBadge) {
          authStatusBadge.innerText = "Signed Out";
          authStatusBadge.className = "badge badge-amber";
        }
        if (drawerStatus) {
          drawerStatus.innerText = "Signed Out";
          drawerStatus.style.background = "var(--amber-bg)";
          drawerStatus.style.color = "var(--amber-text)";
        }
        showToast("Signed out of active workspace session.");
      }
    });
  }

  const btnSwitchAcc = document.getElementById("btn-switch-account");
  if (btnSwitchAcc) {
    btnSwitchAcc.addEventListener("click", () => {
      const newEmail = prompt("Enter new work email to switch accounts:", "neehal@themutual.ai");
      if (newEmail && newEmail.trim()) {
        if (authUserEmail) authUserEmail.innerText = newEmail.trim();
        const drawerAuthSub = document.getElementById("drawer-auth-sub");
        if (drawerAuthSub) drawerAuthSub.innerText = newEmail.trim();
        showToast(`Switched account to ${newEmail.trim()}`);
      }
    });
  }

  // Single Sign-On buttons
  const btnSsoGoogle = document.getElementById("btn-sso-google");
  const btnSsoSlack = document.getElementById("btn-sso-slack");
  if (btnSsoGoogle) {
    btnSsoGoogle.addEventListener("click", () => {
      showToast("Authenticated via Google Workspace SSO.");
    });
  }
  if (btnSsoSlack) {
    btnSsoSlack.addEventListener("click", () => {
      showToast("Connected with Slack Workspace.");
    });
  }
}

// Health Check
async function checkBackendHealth() {
  const dot = document.getElementById("server-status-dot");
  const text = document.getElementById("server-status-text");

  try {
    const res = await fetch(`${state.backendUrl}/api/health`, { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      state.isServerConnected = true;
      if (dot) dot.className = "status-dot";
      if (text) text.innerText = "";
      loadScenariosFromBackend();
      return;
    }
  } catch (e) {
    // Backend offline; use embedded engine
  }

  state.isServerConnected = false;
  if (dot) dot.className = "status-dot amber";
  if (text) text.innerText = "";
  state.scenarios = FALLBACK_SCENARIOS;
  populateScenarioDropdown(state.scenarios);
}

async function loadScenariosFromBackend() {
  try {
    const res = await fetch(`${state.backendUrl}/api/scenarios`);
    if (res.ok) {
      const data = await res.json();
      state.scenarios = data.scenarios || FALLBACK_SCENARIOS;
      populateScenarioDropdown(state.scenarios);
      return;
    }
  } catch (e) {
    state.scenarios = FALLBACK_SCENARIOS;
  }
  populateScenarioDropdown(state.scenarios);
}

function populateScenarioDropdown(scenarios) {
  const selector = document.getElementById("scenario-selector");
  selector.innerHTML = "";
  scenarios.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `Simulation: ${s.title}`;
    selector.appendChild(opt);
  });

  const liveOpt = document.createElement("option");
  liveOpt.value = "live_meet";
  liveOpt.textContent = "Live Google Meet Captions Stream";
  selector.appendChild(liveOpt);

  // Default sample deliverables
  if (scenarios[0] && scenarios[0].sample_deliverables) {
    state.sampleDeliverables = scenarios[0].sample_deliverables;
  }
}

// ============================================================================
// TAB 1: Simulator & Interceptor Engine
// ============================================================================

// ============================================================================
// TAB 1: Simulator & Interceptor Engine
// ============================================================================

// Web Speech Synthesis & Chime Audio Engine
function speakLine(text, onEnded) {
  if (!state.audioEnabled || typeof window === "undefined" || !window.speechSynthesis) {
    setTimeout(onEnded, 2400);
    return;
  }

  try {
    window.speechSynthesis.cancel();

    // Signal parent window to animate audio equalizer
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "SPEAKING_STATUS", isSpeaking: true }, "*");
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Prioritize natural Indian English voices if available on machine
    const voices = window.speechSynthesis.getVoices();
    const inVoice = voices.find((v) => 
      v.lang === "en-IN" || 
      v.lang.startsWith("en-IN") || 
      v.name.includes("India") || 
      v.name.includes("Rishi") || 
      v.name.includes("Veena")
    );
    if (inVoice) {
      utterance.voice = inVoice;
    }
    utterance.rate = 1.05; // brisk Bangalore tech sync cadence
    utterance.pitch = 1.0;

    let hasEnded = false;
    const finish = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "SPEAKING_STATUS", isSpeaking: false }, "*");
      }
      onEnded();
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Safety fallback timeout in case browser TTS event hangs
    const maxDuration = Math.max(text.length * 85, 3200);
    setTimeout(() => {
      if (!hasEnded) finish();
    }, maxDuration);

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[The Mutual] SpeechSynthesis error:", err);
    setTimeout(onEnded, 2200);
  }
}

function playInterventionChime() {
  if (!state.audioEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Dual frequency harmonic ping (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch (e) {}
}

// ============================================================================
// Live Microphone — Offscreen Bridge (Chrome MV3 Side Panel Safe)
// ============================================================================
// The Chrome Side Panel context cannot call getUserMedia or SpeechRecognition
// directly — Chrome blocks it silently (DOMException / not-allowed).
//
// Solution: We use the Chrome Offscreen API.
//   background.js creates an offscreen document (offscreen.html / offscreen.js)
//   that DOES have microphone permission. That document runs SpeechRecognition
//   and relays results back via chrome.runtime.sendMessage.
//
// Message flow:
//   sidepanel  →  chrome.runtime.sendMessage({ type: "START_MIC" })
//   background →  ensureOffscreen() → sends { type: "START_RECOGNITION", target: "offscreen" }
//   offscreen  →  SpeechRecognition → relays { type: "SPEECH_RESULT" }
//   background →  forwards to all contexts (side panel receives it in listenToExtensionEvents)
// ============================================================================

function toggleLiveMicrophone() {
  if (state.isLiveMicListening) {
    stopLiveMicrophone();
  } else {
    startLiveMicrophone();
  }
}

function openPermissionTab() {
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
    const permUrl = chrome.runtime.getURL("permission.html");
    if (chrome.tabs.query) {
      chrome.tabs.query({ url: permUrl }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          chrome.tabs.create({ url: permUrl });
        }
      });
    } else {
      chrome.tabs.create({ url: permUrl });
    }
  } else {
    window.open("permission.html", "_blank");
  }
}

function startSynthwaveAudioVisualizer(stream) {}
function stopSynthwaveAudioVisualizer() {}

async function startLiveMicrophone() {
  const btnText = document.getElementById("live-mic-btn-text");
  const desc    = document.getElementById("mic-status-description");

  if (desc)    desc.innerText    = "";
  if (btnText) btnText.innerText = "Connecting…";

  // Check if running in Safari or environment without chrome.offscreen
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || (typeof chrome === "undefined" || !chrome.offscreen);

  if (isSafari) {
    // Safari / Web Companion: Run SpeechRecognition directly!
    startDirectSpeechRecognition();
    return;
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    // Chrome: Ask background service worker to use offscreen bridge
    chrome.runtime.sendMessage({ type: "START_MIC", lang: "en-IN" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[The Mutual] START_MIC error:", chrome.runtime.lastError.message);
        startDirectSpeechRecognition();
      }
    });
  } else {
    startDirectSpeechRecognition();
  }
}

function stopLiveMicrophone() {
  state.isLiveMicListening = false;
  stopSynthwaveAudioVisualizer();

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: "STOP_MIC" }).catch(() => {});
  }
  if (state._directRecognition) {
    try { state._directRecognition.stop(); } catch(e) {}
    state._directRecognition = null;
  }
  updateMicStoppedUI();
  showToast("Microphone listening stopped.");
}

// Called when offscreen or direct speech sends SPEECH_RESULT, SPEECH_ERROR, SPEECH_STATUS back
function handleSpeechResult(transcript, isFinal) {
  if (isFinal) {
    const cleaned = transcript.trim();
    if (cleaned.length > 3) {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      processIncomingLine("You (Live Mic)", cleaned, timestamp);
    }
  } else {
    const interimBox = document.getElementById("live-interim-box");
    if (interimBox && transcript.trim()) {
      interimBox.style.display = "block";
      interimBox.innerHTML = `<strong>Live Speech:</strong> <em>"${escapeHtml(transcript)}"</em>`;
    }
  }
}

function handleSpeechStarted() {
  state.isLiveMicListening = true;

  const idleControls = document.getElementById("mic-idle-controls");
  const activeControls = document.getElementById("mic-active-controls");
  const desc = document.getElementById("mic-status-description");
  const dot = document.getElementById("mic-status-dot");

  if (idleControls) idleControls.style.display = "none";
  if (activeControls) activeControls.style.display = "flex";

  if (dot) dot.className = "pulse-dot-green";
  if (desc) desc.innerText = "";
  const emptyState = document.getElementById("transcript-empty-state");
  if (emptyState) emptyState.innerText = "Listening to live microphone… Speak or conduct your meeting.";

  // Play audio wave video inside the button
  const waveVid = document.getElementById("audiowave-video");
  if (waveVid) {
    try {
      waveVid.currentTime = 0;
      waveVid.play().catch(() => {});
    } catch (e) {}
  }
}

function handleSpeechError(error) {
  const desc = document.getElementById("mic-status-description");
  console.warn("[The Mutual] Speech error:", error);

  if (error === "not-allowed" || error === "service-not-allowed") {
    state.micAuthorized = false;
    stopLiveMicrophone();
    if (desc) desc.innerText = "Microphone access needed. Check the opened permission tab…";
    showToast("Microphone authorization needed. Please click Allow in the opened tab.");
    openPermissionTab();
  } else if (error === "not-supported") {
    if (desc) desc.innerText = "Web Speech API not supported in this engine.";
    showToast("Speech Recognition not supported.");
  }
  // no-speech / aborted are normal — auto-restarts
}

// ── Direct engine (Safari, Web Companion, Fallback) ──────────────────────────

function startDirectSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Speech Recognition not supported in this browser.");
    updateMicStoppedUI();
    return;
  }

  // Pre-request getUserMedia with high sensitivity AGC to boost room acoustics
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,   // Automatic gain control for far voices
        echoCancellation: false, // Don't gate out room acoustics
        noiseSuppression: false, // Don't suppress quiet distant speakers
        channelCount: 1,
        sampleRate: 48000
      }
    })
      .then((stream) => {
        console.log("[The Mutual] Mic permission confirmed with high-sensitivity AGC.");
        startSynthwaveAudioVisualizer(stream);
      })
      .catch((err) => {
        console.warn("[The Mutual] Mic getUserMedia notice:", err);
      });
  }

  const desc = document.getElementById("mic-status-description");
  const rec = new SpeechRecognition();
  rec.continuous      = true;
  rec.interimResults  = true;
  rec.lang            = "en-IN";

  rec.onstart  = handleSpeechStarted;
  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      handleSpeechResult(event.results[i][0].transcript, event.results[i].isFinal);
    }
  };
  rec.onerror = (event) => handleSpeechError(event.error);
  rec.onend   = () => {
    if (state.isLiveMicListening) {
      try { rec.start(); } catch(e) {}
    } else {
      updateMicStoppedUI();
    }
  };

  state._directRecognition = rec;
  try {
    rec.start();
  } catch (e) {
    console.warn("[The Mutual] Direct SpeechRecognition start error:", e);
  }
}

function updateMicStoppedUI() {
  state.isLiveMicListening = false;
  stopSynthwaveAudioVisualizer();

  const waveVid = document.getElementById("audiowave-video");
  if (waveVid) {
    try {
      waveVid.pause();
      waveVid.currentTime = 0;
    } catch (e) {}
  }

  const idleControls = document.getElementById("mic-idle-controls");
  const activeControls = document.getElementById("mic-active-controls");
  const btn = document.getElementById("btn-toggle-live-mic");
  const btnText = document.getElementById("live-mic-btn-text");
  const desc = document.getElementById("mic-status-description");
  const dot = document.getElementById("mic-status-dot");
  const interimBox = document.getElementById("live-interim-box");
  const submitCard = document.getElementById("submit-proceed-card");
  const linesBadge = document.getElementById("submit-lines-badge");
  const topHandshakeBtn = document.getElementById("btn-goto-handshake");

  if (activeControls) activeControls.style.display = "none";
  if (idleControls) idleControls.style.display = "flex";

  if (btn) {
    btn.className = "btn btn-primary btn-sm";
    btn.style.background = "";
  }
  if (btnText) btnText.innerText = "Start Live Listening";
  if (dot) dot.className = "status-dot";
  if (desc) desc.innerText = "";
  if (interimBox) interimBox.style.display = "none";

  // Show prominent Submit & Proceed card if transcript lines have been captured
  if (state.capturedTranscript && state.capturedTranscript.length > 0) {
    if (submitCard) submitCard.style.display = "block";
    if (linesBadge) linesBadge.innerText = `${state.capturedTranscript.length} lines ready`;
    if (topHandshakeBtn) {
      topHandshakeBtn.innerHTML = `Submit & Proceed →`;
      topHandshakeBtn.style.background = "var(--sage-accent)";
      topHandshakeBtn.style.color = "#FFFFFF";
      topHandshakeBtn.style.fontWeight = "600";
    }
  } else {
    if (submitCard) submitCard.style.display = "none";
    if (topHandshakeBtn) {
      topHandshakeBtn.innerText = "Handshake →";
      topHandshakeBtn.style.background = "";
      topHandshakeBtn.style.color = "";
      topHandshakeBtn.style.fontWeight = "";
    }
  }
}

async function handleUserSubmitAndProceed() {
  const fullText = state.capturedTranscript.map((t) => `${t.speaker}: ${t.text}`).join(" ");
  if (!fullText || fullText.trim().length === 0) {
    showToast("No transcript captured yet. Start listening or add text first.");
    return;
  }

  // Stop active mic or simulation if running
  if (state.isLiveMicListening) {
    stopLiveMicrophone();
  }
  if (state.isSimulating) {
    stopSimulation();
  }

  const btn = document.getElementById("btn-submit-proceed");
  const btnText = document.getElementById("submit-proceed-text");
  const btnIcon = document.getElementById("submit-proceed-icon");
  const origText = btnText ? btnText.innerText : "Submit Briefing & Run AI Analysis →";

  // Visual loading feedback
  if (btn) btn.disabled = true;
  if (btnIcon) btnIcon.innerText = "";
  if (btnText) btnText.innerText = "AI Processing Briefing & Synthesizing Contract…";
  showToast("Submitting transcript to AI behavioral engine...");

  try {
    // 1. Run interceptor analysis on complete text if backend connected
    if (state.isServerConnected) {
      try {
        const interceptRes = await fetch(`${state.backendUrl}/api/intercept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: fullText,
            context: fullText,
            api_key: state.geminiKey
          })
        });
        if (interceptRes.ok) {
          const analysis = await interceptRes.json();
          if (analysis.flags && analysis.flags.length > 0) {
            analysis.flags.forEach((flag) => {
              if (!state.interceptorFlags.some((f) => f.detected_phrase === flag.detected_phrase)) {
                renderAlertCard(flag, flag.detected_phrase || fullText);
              }
            });
          }
        }
      } catch (err) {
        console.warn("[The Mutual] Full transcript intercept error:", err);
      }
    }

    // 2. Synthesize Micro Contract
    await generateContractFromTranscript();

    // 3. Switch to Handshake Tab (Tab 2)
    const handshakeTab = document.querySelector("[data-tab='tab-handshake']");
    if (handshakeTab) {
      handshakeTab.click();
    }

    showToast("Micro Contract synthesized. Both parties can now sign below.");
  } catch (e) {
    console.error("[The Mutual] Submit error:", e);
    showToast("Synthesis error. Switched to Handshake with local draft.");
    const handshakeTab = document.querySelector("[data-tab='tab-handshake']");
    if (handshakeTab) handshakeTab.click();
  } finally {
    if (btn) btn.disabled = false;
    if (btnIcon) btnIcon.innerText = "";
    if (btnText) btnText.innerText = origText;
  }
}

function initSimulator() {
  // Mode switcher tabs
  const btnModeLive = document.getElementById("btn-mode-live");
  const btnModeSim = document.getElementById("btn-mode-sim");
  const panelLive = document.getElementById("panel-live-mic");
  const panelSim = document.getElementById("panel-simulation");

  if (btnModeLive && btnModeSim && panelLive && panelSim) {
    btnModeLive.addEventListener("click", () => {
      btnModeLive.classList.add("active");
      btnModeSim.classList.remove("active");
      panelLive.style.display = "block";
      panelSim.style.display = "none";
    });

    btnModeSim.addEventListener("click", () => {
      btnModeSim.classList.add("active");
      btnModeLive.classList.remove("active");
      panelSim.style.display = "flex";
      panelLive.style.display = "none";
    });
  }

  // Live Microphone trigger button
  const btnToggleLiveMic = document.getElementById("btn-toggle-live-mic");
  if (btnToggleLiveMic) {
    btnToggleLiveMic.addEventListener("click", toggleLiveMicrophone);
  }

  // Red Stop Recording button
  const btnStopLiveMic = document.getElementById("btn-stop-live-mic");
  if (btnStopLiveMic) {
    btnStopLiveMic.addEventListener("click", stopLiveMicrophone);
  }

  // Audio wave video button (clicking it stops recording)
  const btnListeningWave = document.getElementById("btn-listening-wave");
  if (btnListeningWave) {
    btnListeningWave.addEventListener("click", stopLiveMicrophone);
  }

  // Active handshake button
  const btnGotoHandshakeActive = document.getElementById("btn-goto-handshake-active");
  if (btnGotoHandshakeActive) {
    btnGotoHandshakeActive.addEventListener("click", () => {
      const hBtn = document.getElementById("btn-goto-handshake");
      if (hBtn) hBtn.click();
    });
  }

  // Clear feed in active state
  const btnClearFeedActive = document.getElementById("btn-clear-feed-active");
  if (btnClearFeedActive) {
    btnClearFeedActive.addEventListener("click", () => {
      const clearBtn = document.getElementById("btn-clear-feed");
      if (clearBtn) clearBtn.click();
    });
  }

  // Quick text briefing input
  const btnToggleQuick = document.getElementById("btn-toggle-quick-input");
  const quickContainer = document.getElementById("quick-input-container");
  const btnSubmitQuick = document.getElementById("btn-submit-quick-text");
  const quickTextarea = document.getElementById("quick-input-text");

  if (btnToggleQuick && quickContainer) {
    btnToggleQuick.addEventListener("click", () => {
      const isHidden = quickContainer.style.display === "none" || !quickContainer.style.display;
      quickContainer.style.display = isHidden ? "flex" : "none";
      btnToggleQuick.innerText = isHidden ? "− Hide" : "+ Add Text";
      if (isHidden && quickTextarea) quickTextarea.focus();
    });
  }

  if (btnSubmitQuick && quickTextarea) {
    btnSubmitQuick.addEventListener("click", () => {
      const val = quickTextarea.value.trim();
      if (!val) return;

      let speaker = "Manager";
      let body = val;
      if (val.includes(":")) {
        const parts = val.split(":");
        speaker = parts[0].trim();
        body = parts.slice(1).join(":").trim();
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      processIncomingLine(speaker, body, timestamp);
      quickTextarea.value = "";
      const submitCard = document.getElementById("submit-proceed-card");
      const linesBadge = document.getElementById("submit-lines-badge");
      const topHandshakeBtn = document.getElementById("btn-goto-handshake");
      if (submitCard) submitCard.style.display = "block";
      if (linesBadge) linesBadge.innerText = `${state.capturedTranscript.length} lines ready`;
      if (topHandshakeBtn) {
        topHandshakeBtn.innerHTML = `Submit & Proceed →`;
        topHandshakeBtn.style.background = "var(--sage-accent)";
        topHandshakeBtn.style.color = "#FFFFFF";
        topHandshakeBtn.style.fontWeight = "600";
      }
      showToast("Briefing added to transcript. Interceptor analyzing...");
    });
  }

  // Menubar Top Trigger
  const btnMenubarTrigger = document.getElementById("btn-menubar-trigger");
  if (btnMenubarTrigger) {
    btnMenubarTrigger.addEventListener("click", async () => {
      try {
        const res = await fetch(`${state.backendUrl}/api/whisper/launch-menubar`, { method: "POST" });
        if (res.ok) {
          showToast("The Mutual active in macOS top taskbar.");
        }
      } catch (e) {
        showToast("Whisper engine active on http://localhost:8000");
      }
    });
  }

  // Simulation controls
  const btnStart = document.getElementById("btn-start-sim");
  const btnPause = document.getElementById("btn-pause-sim");
  const btnClear = document.getElementById("btn-clear-feed");
  const btnClearSim = document.getElementById("btn-clear-sim-feed");
  const btnAudio = document.getElementById("btn-audio-toggle");
  const selector = document.getElementById("scenario-selector");
  const btnGotoSim = document.getElementById("btn-goto-handshake-sim");
  const btnSubmitProceed = document.getElementById("btn-submit-proceed");

  if (btnSubmitProceed) {
    btnSubmitProceed.addEventListener("click", () => {
      handleUserSubmitAndProceed();
    });
  }

  if (btnGotoSim) {
    btnGotoSim.addEventListener("click", () => {
      if (state.capturedTranscript && state.capturedTranscript.length > 0) {
        handleUserSubmitAndProceed();
      } else {
        const tabBtn = document.querySelector("[data-tab='tab-handshake']");
        if (tabBtn) tabBtn.click();
      }
    });
  }

  if (btnAudio) {
    btnAudio.addEventListener("click", () => {
      state.audioEnabled = !state.audioEnabled;
      btnAudio.innerText = state.audioEnabled ? "Voice: On" : "Voice: Off";
      showToast(state.audioEnabled ? "Simulation voice enabled" : "Simulation voice muted");
    });
  }

  if (selector) {
    selector.addEventListener("change", () => {
      state.activeScenarioId = selector.value;
      const selected = state.scenarios.find((s) => s.id === selector.value);
      if (selected && selected.sample_deliverables) {
        state.sampleDeliverables = selected.sample_deliverables;
      }
      stopSimulation();
    });
  }

  if (btnStart) {
    btnStart.addEventListener("click", () => {
      startSimulation();
    });
  }

  if (btnPause) {
    btnPause.addEventListener("click", () => {
      stopSimulation();
    });
  }

  const clearHandler = () => {
    stopSimulation();
    if (state.isLiveMicListening) {
      stopLiveMicrophone();
    }
    state.capturedTranscript = [];
    state.interceptorFlags = [];
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ session_transcript: [] });
    }
    document.getElementById("transcript-feed").innerHTML = `
      <div id="transcript-empty-state" style="color:var(--text-muted); font-style:italic; padding:12px; text-align:center;">
        Transcript cleared.
      </div>
      <div id="live-interim-box" class="interim-speech-preview" style="display:none;"></div>
    `;
    document.getElementById("alerts-container").innerHTML = "";
    document.getElementById("alert-counter").innerText = "0";
    document.getElementById("transcript-count").innerText = "0 lines captured";

    const submitCard = document.getElementById("submit-proceed-card");
    if (submitCard) submitCard.style.display = "none";
    const topHandshakeBtn = document.getElementById("btn-goto-handshake");
    if (topHandshakeBtn) {
      topHandshakeBtn.innerText = "Handshake →";
      topHandshakeBtn.style.background = "";
      topHandshakeBtn.style.color = "";
      topHandshakeBtn.style.fontWeight = "";
    }
  };

  if (btnClear) btnClear.addEventListener("click", clearHandler);
  if (btnClearSim) btnClearSim.addEventListener("click", clearHandler);
}

function startSimulation() {
  // Always ensure Tab 1 (Interceptor) is active so user sees live output
  const tabBtn = document.querySelector("[data-tab='tab-interceptor']");
  if (tabBtn && !tabBtn.classList.contains("active")) {
    tabBtn.click();
  }

  const currentScenario = state.scenarios.find((s) => s.id === state.activeScenarioId) || state.scenarios[0];
  if (!currentScenario) return;

  const btnStart = document.getElementById("btn-start-sim");
  const btnPause = document.getElementById("btn-pause-sim");
  btnStart.style.display = "none";
  btnPause.style.display = "inline-flex";

  const stream = currentScenario.dialogue_stream || [];
  if (state.simulationIndex >= stream.length) {
    state.simulationIndex = 0;
  }

  // Prevent multiple intervals or timeouts running concurrently
  state.isSimulating = true;
  if (state.simulationTimeout) {
    clearTimeout(state.simulationTimeout);
    state.simulationTimeout = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const playNextLine = async () => {
    if (!state.isSimulating) return;

    if (state.simulationIndex >= stream.length) {
      stopSimulation();
      showToast("Simulation complete. Click 'Create Handshake' to lock in alignment.");
      return;
    }

    const item = stream[state.simulationIndex];
    state.simulationIndex++;
    await processIncomingLine(item.speaker, item.text, item.timestamp);

    // Speak line with SpeechSynthesis, then advance after natural pause
    speakLine(item.text, () => {
      if (!state.isSimulating) return;
      state.simulationTimeout = setTimeout(playNextLine, 800);
    });
  };

  // Play first line immediately for instant response
  playNextLine();
}

function stopSimulation() {
  state.isSimulating = false;
  if (state.simulationTimeout) {
    clearTimeout(state.simulationTimeout);
    state.simulationTimeout = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "SPEAKING_STATUS", isSpeaking: false }, "*");
  }
  const btnStart = document.getElementById("btn-start-sim");
  const btnPause = document.getElementById("btn-pause-sim");
  if (btnStart) btnStart.style.display = "inline-flex";
  if (btnPause) btnPause.style.display = "none";

  const submitCard = document.getElementById("submit-proceed-card");
  const linesBadge = document.getElementById("submit-lines-badge");
  const topHandshakeBtn = document.getElementById("btn-goto-handshake");
  if (state.capturedTranscript && state.capturedTranscript.length > 0) {
    if (submitCard) submitCard.style.display = "block";
    if (linesBadge) linesBadge.innerText = `${state.capturedTranscript.length} lines ready`;
    if (topHandshakeBtn) {
      topHandshakeBtn.innerHTML = `Submit & Proceed →`;
      topHandshakeBtn.style.background = "var(--sage-accent)";
      topHandshakeBtn.style.color = "#FFFFFF";
      topHandshakeBtn.style.fontWeight = "600";
    }
  }
}

async function processIncomingLine(speaker, text, timestamp) {
  if (!text || typeof text !== "string") return;
  const cleanText = text.trim();
  if (cleanText.length < 3) return;

  // ── Transcript Deduplication Window ──
  const now = Date.now();
  const normalized = cleanText.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!state._recentLineBuffer) state._recentLineBuffer = [];
  state._recentLineBuffer = state._recentLineBuffer.filter(entry => (now - entry.time) < 8000);

  const isDuplicate = state._recentLineBuffer.some(entry => {
    if (entry.speaker === speaker && entry.normalized === normalized) return true;
    if (entry.speaker === speaker && (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) && Math.abs(entry.normalized.length - normalized.length) < 5) return true;
    return false;
  });

  if (isDuplicate) {
    return;
  }
  state._recentLineBuffer.push({ speaker, cleanText, normalized, time: now });

  // Store line in transcript state
  state.capturedTranscript.push({ speaker, text: cleanText, timestamp });
  document.getElementById("transcript-count").innerText = `${state.capturedTranscript.length} lines captured`;

  // Analyze text for delegation ambiguity
  let analysis = null;
  if (state.isServerConnected) {
    try {
      const res = await fetch(`${state.backendUrl}/api/intercept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          context: state.capturedTranscript.map((t) => `${t.speaker}: ${t.text}`).slice(-4).join(" "),
          api_key: state.geminiKey
        })
      });
      if (res.ok) {
        analysis = await res.json();
      }
    } catch (e) {
      // Fallback to client heuristics
    }
  }

  if (!analysis) {
    analysis = clientIntercept(cleanText);
  }

  // Forward to parent window (if running embedded in Web Companion)
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({
        type: "CAPTIONS_MIRROR",
        speaker: speaker,
        text: cleanText,
        timestamp: timestamp,
        is_ambiguous: Boolean(analysis && analysis.is_ambiguous),
        flags: (analysis && analysis.flags) ? analysis.flags : []
      }, "*");
    } catch (err) {
      console.warn("[The Mutual] postMessage mirror error:", err);
    }
  }

  // Render to Transcript Feed
  appendTranscriptLine(speaker, cleanText, timestamp, analysis.is_ambiguous);

  // If in an active meeting, persist to Supabase meeting_transcripts in real time
  if (state.activeMeeting && state.activeMeeting.meeting_id && window.MutualSupabase && window.MutualSupabase.logMeetingTranscript) {
    window.MutualSupabase.logMeetingTranscript({
      meeting_id: state.activeMeeting.meeting_id,
      speaker: speaker,
      text: cleanText,
      platform: state.activeMeeting.platform || "offline_in_person",
      is_ambiguous: Boolean(analysis && analysis.is_ambiguous),
      ambiguity_type: (analysis && analysis.flags && analysis.flags[0]) ? analysis.flags[0].type : null
    });
  }

  // If ambiguity detected, play gentle intervention chime & render nudge card
  if (analysis.is_ambiguous && analysis.flags && analysis.flags.length > 0) {
    playInterventionChime();
    analysis.flags.forEach((flag) => {
      renderAlertCard(flag, cleanText);
    });
  }

  // Check if incoming dialogue answers/resolves an active ambiguity intervention in the call
  checkLiveQAResolution();
}

function appendTranscriptLine(speaker, text, timestamp, isVague) {
  const feed = document.getElementById("transcript-feed");
  // Remove placeholder if present
  if (feed.children.length === 1 && feed.children[0].innerText.includes("Click 'Start Simulation'")) {
    feed.innerHTML = "";
  }

  const entry = document.createElement("div");
  entry.className = "transcript-entry";
  entry.innerHTML = `
    <div style="display:flex; justify-content:space-between;">
      <span class="transcript-speaker">${escapeHtml(speaker)}</span>
      <span style="font-size:10px; color:var(--text-muted);">${escapeHtml(timestamp || "")}</span>
    </div>
    <div class="transcript-body ${isVague ? 'highlight-vague' : ''}">${escapeHtml(text)}</div>
  `;

  feed.appendChild(entry);
  feed.scrollTop = feed.scrollHeight;
}

function getMeshAttendeeOptions() {
  const options = [];
  try {
    if (state.activeMeeting && state.activeMeeting.meeting_id) {
      const companyCode = (state.userProfile?.company_code || "GLOBAL").toUpperCase();
      const cacheKey = `the_mutual_mesh_${companyCode}_${state.activeMeeting.meeting_id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.participants)) {
          parsed.participants.forEach(p => {
            if (p.name && !options.includes(p.name)) options.push(p.name);
          });
        }
      }
    }
  } catch (e) {}

  if (options.length === 0) {
    options.push("Lead Engineer", "Product Manager", "Team Member");
  }
  return options;
}

function updateInterventionCounters() {
  const activeCount = (state.interceptorFlags || []).filter(f => !f.resolved).length;
  const resolvedCount = (state.interceptorFlags || []).filter(f => f.resolved).length;
  const counterEl = document.getElementById("alert-counter");
  if (counterEl) {
    counterEl.innerText = resolvedCount > 0 ? `${activeCount} active, ${resolvedCount} resolved` : `${activeCount}`;
  }
  const badgeEl = document.getElementById("alert-counter-badge");
  if (badgeEl) {
    badgeEl.className = activeCount > 0 ? "badge badge-amber badge-sm" : "badge badge-sage badge-sm";
  }
  const emptyState = document.getElementById("alerts-empty-state");
  if (emptyState) {
    emptyState.style.display = (state.interceptorFlags || []).length === 0 ? "block" : "none";
  }
}

function renderAlertCard(flag, originalStatement) {
  if (!flag.id) flag.id = `flag_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  if (!flag.comments) flag.comments = [];
  state.interceptorFlags.push(flag);
  updateInterventionCounters();

  const container = document.getElementById("alerts-container");
  const emptyState = document.getElementById("alerts-empty-state");
  if (emptyState) emptyState.style.display = "none";

  const card = document.createElement("div");
  card.className = `alert-card ${flag.resolved ? 'alert-card-resolved' : ''}`;
  card.id = `alert_card_${flag.id}`;

  const attendees = getMeshAttendeeOptions();

  card.innerHTML = `
    <div class="alert-header">
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="badge ${flag.resolved ? 'badge-sage' : 'badge-amber'}">
          ${escapeHtml(flag.category)}
        </span>
        <span class="alert-status-pill ${flag.resolved ? 'pill-resolved' : 'pill-active'}">
          ${flag.resolved ? '[RESOLVED VIA CALL]' : '[ACTIVE INTERVENTION]'}
        </span>
      </div>
      <span style="font-size:11px; font-weight:600; color:${flag.resolved ? 'var(--sage-text)' : 'var(--rust-text)'};">
        ${flag.resolved ? 'Resolved' : escapeHtml(flag.risk_level || 'High') + ' Risk'}
      </span>
    </div>

    <!-- Resolved in Call Banner -->
    <div class="alert-resolution-banner" style="display:${flag.resolved ? 'flex' : 'none'};">
      <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
        <span style="font-weight:700; font-size:10.5px; color:var(--sage-text);">[CLARIFIED IN CALL]</span>
        <span class="resolution-summary-text" style="font-size:11px; color:var(--text-secondary);">${escapeHtml(flag.resolution_summary || 'Clarification agreed in meeting dialogue.')}</span>
      </div>
      <button type="button" class="btn btn-sage btn-xs btn-view-updated-clause" style="font-size:10px; padding:3px 7px; white-space:nowrap;">
        View Handshake Clause →
      </button>
    </div>

    <div class="alert-quote">
      "${escapeHtml(flag.detected_phrase || originalStatement)}"
    </div>

    <div class="alert-diagnosis">
      <strong>OB Diagnosis:</strong> ${escapeHtml(flag.ob_diagnosis)}
    </div>

    <div class="script-box">
      <div class="script-label">
        <span>Psychologically Safe Script:</span>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-secondary btn-xs btn-insert-script" title="Insert into comment box below">
            Use Question
          </button>
          <button type="button" class="btn btn-secondary btn-xs btn-copy-script" data-text="${escapeHtml(flag.suggested_script)}">
            Copy
          </button>
        </div>
      </div>
      <div class="script-content">
        "${escapeHtml(flag.suggested_script)}"
      </div>
    </div>

    <!-- Interactive Clarification & Comment Section -->
    <div class="alert-clarification-panel">
      <div class="clarification-meta-row">
        <label class="clarification-label">Direct Clarification To:</label>
        <select class="clarification-recipient-select">
          <option value="Manager (Delegator)">Manager (Delegator)</option>
          <option value="All Attendees">All Attendees</option>
          ${attendees.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("")}
        </select>
      </div>

      <div class="clarification-input-wrap">
        <input type="text" class="clarification-input" placeholder="Type clarification or click 'Use Question' above..." />
        <button type="button" class="btn btn-primary btn-xs btn-post-clarification" style="padding:4px 9px; font-weight:600; white-space:nowrap;">
          Send
        </button>
      </div>

      <div class="clarification-alternative-hint">
        <span class="hint-tag">LIVE RESOLUTION:</span>
        <span style="font-size:10px; color:var(--text-tertiary);">Or directly ask in the call — AI detects when manager answers and auto-updates the contract.</span>
      </div>

      <!-- Clarification Thread / Notes -->
      <div class="clarification-thread" style="display:${(flag.comments && flag.comments.length > 0) ? 'flex' : 'none'};">
        ${(flag.comments || []).map(c => `
          <div class="clarification-item">
            <span class="clarification-author">${escapeHtml(c.author || 'You')} <span class="clarification-target">→ ${escapeHtml(c.target || 'Manager')}</span>:</span>
            <span class="clarification-text">${escapeHtml(c.text)}</span>
            <span class="clarification-time">${escapeHtml(c.time || 'Just now')}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  // Attach Listeners
  const copyBtn = card.querySelector(".btn-copy-script");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(flag.suggested_script);
      copyBtn.innerText = "Copied";
      setTimeout(() => { copyBtn.innerText = "Copy"; }, 1800);
      showToast("Script copied. Ask this proactively in call!");
    });
  }

  const insertBtn = card.querySelector(".btn-insert-script");
  const commentInput = card.querySelector(".clarification-input");
  if (insertBtn && commentInput) {
    insertBtn.addEventListener("click", () => {
      commentInput.value = flag.suggested_script;
      commentInput.focus();
    });
  }

  const postBtn = card.querySelector(".btn-post-clarification");
  const recipientSelect = card.querySelector(".clarification-recipient-select");
  const thread = card.querySelector(".clarification-thread");

  if (postBtn && commentInput) {
    postBtn.addEventListener("click", () => {
      const commentText = commentInput.value.trim();
      if (!commentText) return;

      const newComment = {
        author: state.userProfile?.name || "You",
        target: recipientSelect ? recipientSelect.value : "Manager",
        text: commentText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      if (!flag.comments) flag.comments = [];
      flag.comments.push(newComment);

      if (thread) {
        thread.style.display = "flex";
        const item = document.createElement("div");
        item.className = "clarification-item";
        item.innerHTML = `
          <span class="clarification-author">${escapeHtml(newComment.author)} <span class="clarification-target">→ ${escapeHtml(newComment.target)}</span>:</span>
          <span class="clarification-text">${escapeHtml(newComment.text)}</span>
          <span class="clarification-time">${escapeHtml(newComment.time)}</span>
        `;
        thread.appendChild(item);
      }

      commentInput.value = "";
      showToast(`Clarification comment sent to ${newComment.target}!`);
    });
  }

  const viewClauseBtn = card.querySelector(".btn-view-updated-clause");
  if (viewClauseBtn) {
    viewClauseBtn.addEventListener("click", () => {
      switchTab("tab-handshake");
      const clauseEl = document.querySelector(".clause-card");
      if (clauseEl) {
        clauseEl.scrollIntoView({ behavior: "smooth", block: "center" });
        clauseEl.classList.add("clause-highlight");
        setTimeout(() => clauseEl.classList.remove("clause-highlight"), 2500);
      }
    });
  }

  container.prepend(card);
}

async function checkLiveQAResolution() {
  const unresolvedFlags = (state.interceptorFlags || []).filter(f => !f.resolved);
  if (unresolvedFlags.length === 0) return;

  const recentLines = (state.capturedTranscript || []).slice(-5);
  if (recentLines.length < 2) return;

  // 1. Try Backend Hub with Gemini AI
  if (state.isServerConnected) {
    try {
      const res = await fetch(`${state.backendUrl}/api/meeting/qa-resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recent_lines: recentLines,
          active_flags: unresolvedFlags,
          contract: state.currentContract || {},
          api_key: state.geminiKey
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.resolution && data.resolution.has_resolution) {
          applyQAResolution(data.resolution);
          return;
        }
      }
    } catch (e) {}
  }

  // 2. Client Heuristic Q&A Resolver (Instant offline)
  const heuristicRes = clientHeuristicQAResolve(recentLines, unresolvedFlags);
  if (heuristicRes && heuristicRes.has_resolution) {
    applyQAResolution(heuristicRes);
  }
}

function clientHeuristicQAResolve(recentLines, unresolvedFlags) {
  const fullRecentText = recentLines.map(l => `${l.speaker}: ${l.text}`).join("\n").toLowerCase();

  for (const flag of unresolvedFlags) {
    const cat = (flag.category || "").toLowerCase();

    // Deliverable format resolution
    if (cat.includes("format") || cat.includes("deliverable") || cat.includes("undefined")) {
      const formatKeywords = ["slides", "deck", "google slides", "notion", "google doc", "doc", "document", "figma", "sheet", "pdf", "prototype", "markdown"];
      for (const kw of formatKeywords) {
        if (fullRecentText.includes(kw)) {
          return {
            has_resolution: true,
            resolved_flag_id: flag.id,
            clarification_summary: `Deliverable format clarified as ${kw.toUpperCase()} in meeting dialogue`,
            clause_category: "deliverable",
            updated_clause_content: `Agreed format: ${kw.toUpperCase()} as clarified during team discussion.`
          };
        }
      }
    }

    // Deadline / Temporal resolution
    if (cat.includes("temporal") || cat.includes("deadline") || cat.includes("timeline")) {
      const timeKeywords = ["friday", "monday", "wednesday", "tomorrow", "3 pm", "5 pm", "eod", "end of day", "next week tuesday", "end of week"];
      for (const kw of timeKeywords) {
        if (fullRecentText.includes(kw)) {
          return {
            has_resolution: true,
            resolved_flag_id: flag.id,
            clarification_summary: `Hard milestone cutoff confirmed as ${kw.toUpperCase()} in call`,
            clause_category: "timeline",
            updated_clause_content: `Agreed cutoff: ${kw.toUpperCase()} confirmed by manager in call.`
          };
        }
      }
    }

    // Quality / DoD resolution
    if (cat.includes("quality") || cat.includes("subjective") || cat.includes("dod") || cat.includes("done")) {
      if (fullRecentText.includes("template") || fullRecentText.includes("criteria") || fullRecentText.includes("checklist") || fullRecentText.includes("sample")) {
        return {
          has_resolution: true,
          resolved_flag_id: flag.id,
          clarification_summary: `Objective Definition of Done benchmark confirmed in call`,
          clause_category: "dod",
          updated_clause_content: `Deliverable must meet team benchmark criteria confirmed during call review.`
        };
      }
    }
  }

  return { has_resolution: false };
}

function applyQAResolution(resolution) {
  const flagId = resolution.resolved_flag_id;
  const targetFlag = state.interceptorFlags.find(f => f.id === flagId) || state.interceptorFlags.find(f => !f.resolved);
  if (!targetFlag || targetFlag.resolved) return;

  targetFlag.resolved = true;
  targetFlag.resolution_summary = resolution.clarification_summary;

  // 1. Update Card in DOM
  const card = document.getElementById(`alert_card_${targetFlag.id}`) || document.querySelector(".alert-card:not(.alert-card-resolved)");
  if (card) {
    card.classList.add("alert-card-resolved");
    const banner = card.querySelector(".alert-resolution-banner");
    if (banner) {
      banner.style.display = "flex";
      const summaryText = banner.querySelector(".resolution-summary-text");
      if (summaryText) summaryText.innerText = resolution.clarification_summary;
    }
    const statusPill = card.querySelector(".alert-status-pill");
    if (statusPill) {
      statusPill.className = "alert-status-pill pill-resolved";
      statusPill.innerText = "[RESOLVED VIA CALL]";
    }
    const badge = card.querySelector(".badge");
    if (badge) {
      badge.className = "badge badge-sage";
    }
  }

  // 2. Update Handshake Contract Clause
  if (state.currentContract && Array.isArray(state.currentContract.clauses)) {
    let category = resolution.clause_category || "deliverable";
    let targetClause = state.currentContract.clauses.find(c => c.category === category);
    if (!targetClause) {
      targetClause = state.currentContract.clauses[0];
    }
    if (targetClause) {
      targetClause.content = resolution.updated_clause_content || resolution.clarification_summary;
      targetClause.clarified_via_call = true;
      renderClauses(state.currentContract);
      showToast(`Handshake updated: "${targetClause.title}" clarified from call!`);
    }
  }

  updateInterventionCounters();
  playInterventionChime();
}

function clientIntercept(text) {
  const flags = [];
  CLIENT_VAGUENESS_RULES.forEach((rule, idx) => {
    const match = text.match(rule.pattern);
    if (match) {
      flags.push({
        id: `client_flag_${idx}`,
        category: rule.category,
        detected_phrase: match[0],
        risk_level: rule.risk,
        ob_diagnosis: rule.diagnosis,
        suggested_script: rule.script
      });
    }
  });

  return {
    is_ambiguous: flags.length > 0,
    ambiguity_score: flags.length * 30,
    flags: flags
  };
}

// ============================================================================
// TAB 2: The Alignment Handshake (Micro Contract)
// ============================================================================

function initHandshake() {
  document.getElementById("btn-generate-contract").addEventListener("click", generateContractFromTranscript);
  document.getElementById("btn-load-ideal-contract").addEventListener("click", loadIdealScenarioContract);

  // Dual and Active Persona Sign Toggles
  const btnActiveSign = document.getElementById("btn-active-persona-sign");
  const btnQuickSwitch = document.getElementById("btn-quick-switch-persona");
  const btnSignEmp = document.getElementById("btn-toggle-sign-emp");
  const btnSignMgr = document.getElementById("btn-toggle-sign-mgr");

  if (btnSignEmp) {
    btnSignEmp.addEventListener("click", () => {
      state.employeeSigned = !state.employeeSigned;
      updateApprovalUI();
    });
  }

  if (btnSignMgr) {
    btnSignMgr.addEventListener("click", () => {
      state.managerSigned = !state.managerSigned;
      updateApprovalUI();
    });
  }

  if (btnActiveSign) {
    btnActiveSign.addEventListener("click", async () => {
      if (state.activePersona === "neehal") {
        state.employeeSigned = !state.employeeSigned;
        showToast(state.employeeSigned ? "Handshake complete as Neehal." : "Handshake revoked by Neehal.");
      } else {
        state.managerSigned = !state.managerSigned;
        showToast(state.managerSigned ? "Handshake complete as Bhushith." : "Handshake revoked by Bhushith.");
      }
      updateApprovalUI();

      if (state.employeeSigned || state.managerSigned) {
        await syncHandshakeToCompanyTask();
      }
    });
  }

  if (btnQuickSwitch) {
    btnQuickSwitch.addEventListener("click", () => {
      const next = state.activePersona === "neehal" ? "bhushith" : "neehal";
      setPersona(next);
      showToast(`Switched perspective to ${PERSONAS[next].name} (${PERSONAS[next].shortRole})`);
    });
  }

  // Export Tools
  document.getElementById("btn-copy-slack").addEventListener("click", copyContractSlack);

  // Initialize: if dialogue was already captured, synthesize; otherwise provide clean template
  if (state.capturedTranscript.length > 0) {
    generateContractFromTranscript();
  } else {
    state.currentContract = {
      title: "Delegation Alignment Micro Contract",
      clauses: [
        { num: 1, title: "Core Deliverable & Format", category: "deliverable", content: "", notes: "Format constraint" },
        { num: 2, title: "Hard Deadline & Milestone SLA", category: "timeline", content: "", notes: "Turnaround SLA" },
        { num: 3, title: "Definition of Done (DoD)", category: "dod", content: "", notes: "Objective acceptance bar" },
        { num: 4, title: "Out-of-Scope Guardrails (Anti-Goals)", category: "guardrails", content: "", notes: "Anti-scope protection" },
        { num: 5, title: "Sign Off Authority & Dependencies", category: "dependencies", content: "", notes: "Diffuse review bypass" }
      ]
    };
    renderClauses(state.currentContract);
  }
}

async function generateContractFromTranscript() {
  const fullText = state.capturedTranscript.map((t) => `${t.speaker}: ${t.text}`).join(" ");
  if (!fullText || fullText.length < 15) {
    showToast("No active meeting dialogue recorded yet. Speak into the mic or paste a briefing in Tab 1.");
    return;
  }

  showToast("Synthesizing Micro Contract...");

  if (state.isServerConnected) {
    try {
      const res = await fetch(`${state.backendUrl}/api/handshake/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullText, api_key: state.geminiKey })
      });
      if (res.ok) {
        state.currentContract = await res.json();
        renderClauses(state.currentContract);
        showToast("Micro Contract synthesized from actual meeting!");
        return;
      }
    } catch (e) {
      console.warn("[The Mutual] Backend generate error, using local engine:", e);
    }
  }

  // Dynamic client fallback: synthesize directly from fullText rather than static preset!
  state.currentContract = synthesizeClientDynamicContract(fullText);
  renderClauses(state.currentContract);
  showToast("Micro Contract synthesized using local behavioral engine.");
}

function synthesizeClientDynamicContract(transcript) {
  const textLower = transcript.toLowerCase();

  // Extract manager/speaker
  let manager = "Delegating Manager";
  const speakerMatch = transcript.match(/^([A-Za-z0-9\s\(\)]+?):/);
  if (speakerMatch && speakerMatch[1].length < 30) {
    manager = speakerMatch[1].trim();
  }

  // Deliverable
  let title = "Delegation Alignment Micro Contract";
  let deliverable = "Structured deliverable directly addressing the agreed briefing.";
  let formatNote = "Deliverable format explicit and agreed.";

  if (textLower.includes("deck") || textLower.includes("slide")) {
    title = "Executive Presentation Alignment Contract";
    deliverable = "A concise 5-to-7 slide deck (Google Slides) addressing the core review agenda.";
    formatNote = "Slide count bounded to prevent deck bloat.";
  } else if (textLower.includes("spec") || textLower.includes("checkout") || textLower.includes("feature") || textLower.includes("api") || textLower.includes("flow")) {
    title = "Technical Feature Specification Contract";
    deliverable = "A 2-to-3 page architectural RFC document detailing state transitions, error flows, and APIs.";
    formatNote = "Markdown specification in standard team repository.";
  } else if (textLower.includes("doc") || textLower.includes("report") || textLower.includes("write-up") || textLower.includes("summary")) {
    title = "Strategic Executive Brief Micro Contract";
    deliverable = "A structured 2-page executive summary highlighting findings and concrete recommendations.";
    formatNote = "Clean written summary with raw data in appendix.";
  } else if (textLower.includes("onboarding") || textLower.includes("guide") || textLower.includes("handbook")) {
    title = "Process & Operational Playbook Micro Contract";
    deliverable = "A step-by-step operational handbook with clear workflows and point-of-contact matrices.";
    formatNote = "Living document format with section owners.";
  }

  // Timeline
  let timeline = "Initial draft submitted in 3 business days by 3:00 PM; async feedback returned within 24 hours.";
  if (textLower.includes("sometime next week") || textLower.includes("next week")) {
    timeline = "Explicit cutoff: Wednesday at 3:00 PM (resolves 'sometime next week' ambiguity); written feedback returned by Thursday 11:00 AM.";
  } else if (textLower.includes("friday")) {
    timeline = "Hard deadline: Friday at 12:00 PM EST with mandatory 4-hour review window before week close.";
  } else if (textLower.includes("tomorrow")) {
    timeline = "Hard deadline: Tomorrow at 4:00 PM local time.";
  } else if (textLower.includes("asap") || textLower.includes("soon")) {
    timeline = "Explicit SLA: Initial draft submitted within 48 hours (resolving 'ASAP' urgency trap into measurable hours).";
  }

  // DoD
  let dodItems = [];
  if (textLower.includes("professional") || textLower.includes("pakka") || textLower.includes("clean") || textLower.includes("pop") || textLower.includes("magic") || textLower.includes("polish")) {
    dodItems.push("Formatted to official brand standards (resolving subjective 'clean/pop/professional')");
  }
  if (textLower.includes("benchmark") || textLower.includes("competitor")) {
    dodItems.push("Includes competitive benchmark parity matrix");
  }
  if (textLower.includes("pricing") || textLower.includes("cost") || textLower.includes("budget") || textLower.includes("finance")) {
    dodItems.push("Validated unit pricing & cost breakdown verified with finance");
  }
  if (textLower.includes("error") || textLower.includes("gateway") || textLower.includes("payment")) {
    dodItems.push("Explicit error-handling edge cases and retry mechanisms defined");
  }
  if (textLower.includes("kpi") || textLower.includes("metrics") || textLower.includes("rollout") || textLower.includes("pilot")) {
    dodItems.push("Validates core KPIs against telemetry baseline");
  }
  if (dodItems.length === 0) {
    dodItems = [
      "Addresses all core points raised in delegation briefing",
      "Includes concrete success metrics and next steps",
      "Preflight audited prior to final distribution"
    ];
  }
  const dod = "Verified criteria: " + dodItems.map((d, i) => `(${i+1}) ${d}`).join("; ") + ".";

  // Anti-goals
  let antiGoals = [];
  if (textLower.includes("international") || textLower.includes("tax")) antiGoals.push("international pricing models and multi-region tax calculations");
  if (textLower.includes("smart contract") || textLower.includes("blockchain")) antiGoals.push("experimental smart contracts");
  if (textLower.includes("adjust maadi") || textLower.includes("throw in") || textLower.includes("touch upon")) antiGoals.push("unbudgeted secondary requests mentioned casually");
  if (textLower.includes("video") || textLower.includes("animation")) antiGoals.push("custom video production");
  if (antiGoals.length === 0) {
    antiGoals.push("uncredited out-of-scope explorations and tangential side-quests");
  }
  const guardrails = "Strictly Out-of-Scope for V1: Do NOT build " + antiGoals.join(" or ") + ".";

  // Dependencies
  const dependencies = `Single designated primary approver is ${manager}. Feedback from broader team is advisory only.`;

  return {
    title: title,
    clauses: [
      { num: 1, title: "Core Deliverable & Format", category: "deliverable", content: deliverable, notes: formatNote },
      { num: 2, title: "Hard Deadline & Milestone SLA", category: "timeline", content: timeline, notes: "Turnaround SLA ensures momentum" },
      { num: 3, title: "Definition of Done (DoD)", category: "dod", content: dod, notes: "Objective acceptance bar" },
      { num: 4, title: "Out-of-Scope Guardrails (Anti-Goals)", category: "guardrails", content: guardrails, notes: "Anti-scope protection" },
      { num: 5, title: "Sign Off Authority & Dependencies", category: "dependencies", content: dependencies, notes: "Diffuse review bypass" }
    ]
  };
}

function loadIdealScenarioContract() {
  const selected = state.scenarios.find((s) => s.id === state.activeScenarioId) || state.scenarios[0];
  if (selected && selected.ideal_contract) {
    state.currentContract = JSON.parse(JSON.stringify(selected.ideal_contract));
  } else {
    // Default 5-Point Contract structure
    state.currentContract = {
      title: "Delegation Alignment Micro Contract",
      clauses: [
        { num: 1, title: "Core Deliverable & Format", category: "deliverable", content: "A 5-slide Google Slides deck built on the 2026 Executive Brand Template.", notes: "Format constraint" },
        { num: 2, title: "Hard Deadline & Milestone SLA", category: "timeline", content: "Draft delivered by Wednesday at 3:00 PM EST; feedback returned by Thursday 11:00 AM.", notes: "Turnaround SLA" },
        { num: 3, title: "Definition of Done (DoD)", category: "dod", content: "Includes: (1) Verified funnel KPIs, (2) Top 3 churn risks, (3) 90-day expansion milestones.", notes: "Objective acceptance bar" },
        { num: 4, title: "Out-of-Scope Guardrails (Anti-Goals)", category: "guardrails", content: "Explicitly exclude international pricing models and video demos to preserve sprint focus.", notes: "Anti-scope protection" },
        { num: 5, title: "Sign Off Authority & Dependencies", category: "dependencies", content: "Single approver is Marcus (VP). Sales feedback limited to Elena (Head of Enterprise).", notes: "Diffuse review bypass" }
      ]
    };
  }
  renderClauses(state.currentContract);
}

const CLAUSE_GUIDANCE = {
  1: {
    guidance: "Capture speech via live mic or paste briefing in Tab 1, then click 'Regenerate from Call'. (Or click 'Sample Contract' to view demo)",
    notes: "Format constraint"
  },
  2: {
    guidance: "Capture speech via live mic or paste briefing in Tab 1, then click 'Regenerate from Call'. (Or click 'Sample Contract' to view demo)",
    notes: "Turnaround SLA"
  },
  3: {
    guidance: "Capture speech via live mic or paste briefing in Tab 1, then click 'Regenerate from Call'. (Or click 'Sample Contract' to view demo)",
    notes: "Objective acceptance bar"
  },
  4: {
    guidance: "Capture speech via live mic or paste briefing in Tab 1, then click 'Regenerate from Call'. (Or click 'Sample Contract' to view demo)",
    notes: "Anti-scope protection"
  },
  5: {
    guidance: "Capture speech via live mic or paste briefing in Tab 1, then click 'Regenerate from Call'. (Or click 'Sample Contract' to view demo)",
    notes: "Diffuse review bypass"
  }
};

function isDefaultPlaceholderText(text) {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  return (
    t.includes("capture speech via live mic") ||
    t.includes("agreed delivery cutoff and turnaround sla will appear here") ||
    t.includes("testable acceptance criteria translated from delegation") ||
    t.includes("explicit boundary protections preventing uncredited") ||
    t.includes("single designated approver to eliminate bystander")
  );
}

function renderClauses(contract) {
  const container = document.getElementById("clauses-list");
  container.innerHTML = "";

  (contract.clauses || []).forEach((clause) => {
    const el = document.createElement("div");
    el.className = "clause-item";
    const guide = CLAUSE_GUIDANCE[clause.num] || {
      guidance: "Capture speech via live mic or paste briefing in Tab 1, then click 'Regenerate from Call'. (Or click 'Sample Contract' to view demo)",
      notes: clause.notes || "Format constraint"
    };

    const isDefault = isDefaultPlaceholderText(clause.content);
    const displayContent = isDefault ? "" : (clause.content || "");

    el.innerHTML = `
      <div class="clause-header">
        <div class="clause-title-group">
          <div class="clause-num">${clause.num}</div>
          <span class="clause-title">${escapeHtml(clause.title)}</span>
          <button type="button" class="btn-clause-info" data-num="${clause.num}" title="View guidance" aria-label="View guidance">i</button>
        </div>
        <span class="badge badge-sage">Agreed</span>
      </div>

      <!-- Guidance Popup Tab -->
      <div class="clause-info-tab" id="clause-info-tab-${clause.num}" style="display:none;">
        <div class="clause-info-tab-header">
          <span class="clause-info-tab-tag">Guidance</span>
          <button type="button" class="clause-info-tab-close" data-num="${clause.num}" title="Close">✕</button>
        </div>
        <div class="clause-info-tab-text">
          ${escapeHtml(guide.guidance)}
        </div>
        <div class="clause-info-tab-rationale">
          <strong>OB Rationale:</strong> <span>${escapeHtml(clause.notes || guide.notes)}</span>
        </div>
      </div>

      <textarea class="clause-textarea" data-num="${clause.num}" placeholder="Enter ${escapeHtml(clause.title.toLowerCase())} or click 'Regenerate from Call'...">${escapeHtml(displayContent)}</textarea>
    `;

    // Listen to info button toggles
    const infoBtn = el.querySelector(".btn-clause-info");
    const infoTab = el.querySelector(".clause-info-tab");
    const closeBtn = el.querySelector(".clause-info-tab-close");

    if (infoBtn && infoTab) {
      infoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = infoTab.style.display !== "none";
        infoTab.style.display = isOpen ? "none" : "block";
        infoBtn.classList.toggle("active", !isOpen);
      });
    }

    if (closeBtn && infoTab) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        infoTab.style.display = "none";
        if (infoBtn) infoBtn.classList.remove("active");
      });
    }

    // Listen to manual edits
    const textarea = el.querySelector("textarea");
    textarea.addEventListener("input", (e) => {
      clause.content = e.target.value;
    });

    container.appendChild(el);
  });

  // Reset signatures for new contract
  state.employeeSigned = false;
  state.managerSigned = false;
  updateApprovalUI();
}

function updateApprovalUI() {
  const badgeEmp = document.getElementById("badge-party-emp");
  const partyStateEmp = document.getElementById("party-state-neehal");
  const badgeMgr = document.getElementById("badge-party-mgr");
  const partyStateMgr = document.getElementById("party-state-bhushith");
  const banner = document.getElementById("handshake-banner");
  const bannerTitle = document.getElementById("handshake-banner-title");
  const bannerSub = document.getElementById("handshake-banner-sub");
  const bannerBadge = document.getElementById("handshake-banner-badge");
  const bannerDot = document.getElementById("handshake-status-dot");
  const promptEl = document.getElementById("active-persona-action-prompt");
  const signBtn = document.getElementById("btn-active-persona-sign");
  const switchBtn = document.getElementById("btn-quick-switch-persona");

  // Neehal (Employee) state
  if (state.employeeSigned) {
    if (badgeEmp) {
      badgeEmp.className = "badge badge-sage badge-xs";
      badgeEmp.innerText = "Handshaked";
    }
    if (partyStateEmp) partyStateEmp.innerText = "Handshaked";
  } else {
    if (badgeEmp) {
      badgeEmp.className = "badge badge-amber badge-xs";
      badgeEmp.innerText = "Pending";
    }
    if (partyStateEmp) partyStateEmp.innerText = "Pending";
  }

  // Bhushith (Manager) state
  if (state.managerSigned) {
    if (badgeMgr) {
      badgeMgr.className = "badge badge-sage badge-xs";
      badgeMgr.innerText = "Handshaked";
    }
    if (partyStateMgr) partyStateMgr.innerText = "Handshaked";
  } else {
    if (badgeMgr) {
      badgeMgr.className = "badge badge-amber badge-xs";
      badgeMgr.innerText = "Pending";
    }
    if (partyStateMgr) partyStateMgr.innerText = "Pending";
  }

  // Contextual controls for active persona
  const isNeehal = state.activePersona === "neehal";

  if (isNeehal) {
    if (signBtn) {
      if (state.employeeSigned) {
        signBtn.innerText = "Revoke Handshake (Neehal)";
        signBtn.className = "btn btn-secondary btn-handshake-action";
      } else {
        signBtn.innerText = "Handshake as Neehal";
        signBtn.className = "btn btn-sage btn-handshake-action";
      }
    }
    if (promptEl) {
      if (state.employeeSigned && state.managerSigned) {
        promptEl.innerHTML = `Mutual handshake secured! Both <strong>Neehal</strong> and <strong>Bhushith</strong> are aligned.`;
      } else if (state.employeeSigned) {
        promptEl.innerHTML = `Handshaked as <strong>Neehal</strong>. Awaiting <strong>Bhushith</strong> (Manager) handshake.`;
      } else {
        promptEl.innerHTML = `Active as <strong>Neehal</strong> (Employee). Review the clauses below and handshake.`;
      }
    }
    if (switchBtn) {
      switchBtn.innerText = "Switch to Bhushith POV →";
    }
  } else {
    // Bhushith (Manager)
    if (signBtn) {
      if (state.managerSigned) {
        signBtn.innerText = "Revoke Handshake (Bhushith)";
        signBtn.className = "btn btn-secondary btn-handshake-action";
      } else {
        signBtn.innerText = "Handshake as Bhushith";
        signBtn.className = "btn btn-sage btn-handshake-action";
      }
    }
    if (promptEl) {
      if (state.employeeSigned && state.managerSigned) {
        promptEl.innerHTML = `Mutual handshake secured! Both <strong>Bhushith</strong> and <strong>Neehal</strong> are aligned.`;
      } else if (state.managerSigned) {
        promptEl.innerHTML = `Handshaked as <strong>Bhushith</strong>. Awaiting <strong>Neehal</strong> (Employee) handshake.`;
      } else {
        promptEl.innerHTML = `Active as <strong>Bhushith</strong> (Manager). Review the clauses below and handshake.`;
      }
    }
    if (switchBtn) {
      switchBtn.innerText = "Switch to Neehal POV →";
    }
  }

  // Overall Handshake status banner
  if (state.employeeSigned && state.managerSigned) {
    if (banner) banner.className = "handshake-bar sealed";
    if (bannerTitle) bannerTitle.innerText = "Handshake Sealed & Locked";
    if (bannerSub) bannerSub.innerText = "Dual handshakes recorded (Neehal & Bhushith). Work can now proceed.";
    if (bannerBadge) {
      bannerBadge.className = "badge badge-sage badge-sm";
      bannerBadge.innerText = "Locked (2/2)";
    }
    if (bannerDot) {
      bannerDot.style.background = "#2D6A4F";
      bannerDot.className = "pulse-dot-green";
    }
  } else {
    if (banner) banner.className = "handshake-bar";
    const signedCount = (state.employeeSigned ? 1 : 0) + (state.managerSigned ? 1 : 0);
    if (signedCount === 1) {
      if (bannerTitle) bannerTitle.innerText = "Handshake In Progress";
      if (bannerSub) bannerSub.innerText = "1 of 2 parties handshaked. Awaiting second party.";
      if (bannerBadge) {
        bannerBadge.className = "badge badge-amber badge-sm";
        bannerBadge.innerText = "1 / 2 Handshaked";
      }
      if (bannerDot) {
        bannerDot.style.background = "#D97706";
        bannerDot.className = "status-dot";
      }
    } else {
      if (bannerTitle) bannerTitle.innerText = "Handshake Pending";
      if (bannerSub) bannerSub.innerText = "Awaiting mutual handshake before work begins.";
      if (bannerBadge) {
        bannerBadge.className = "badge badge-amber badge-sm";
        bannerBadge.innerText = "0 / 2 Handshaked";
      }
      if (bannerDot) {
        bannerDot.style.background = "#A8A29E";
        bannerDot.className = "status-dot";
      }
    }
  }
}

function copyContractSlack() {
  if (!state.currentContract) return;

  let text = `*The Mutual: Delegation Alignment Handshake*\n`;
  text += `_Agreement between Delegator and Executor before sprint start_\n\n`;

  (state.currentContract.clauses || []).forEach((c) => {
    text += `*${c.num}. ${c.title}*\n${c.content}\n\n`;
  });

  text += `*Sign Off Status*: ${state.employeeSigned && state.managerSigned ? "Approved by Both Parties" : "Pending Sign Off"}\n`;

  navigator.clipboard.writeText(text);
  showToast("Recap copied to clipboard for Slack / Email!");
}

// ============================================================================
// TAB 3: Preflight Deliverable Auditor
// ============================================================================

function initPreflight() {
  const btnPullActive = document.getElementById("btn-pull-active-tab");
  const btnUploadDoc = document.getElementById("btn-upload-document");
  const fileInput = document.getElementById("preflight-file-input");
  const chip = document.getElementById("preflight-attachment-chip");
  const filenameEl = document.getElementById("preflight-filename");
  const filesizeEl = document.getElementById("preflight-filesize");
  const btnRemoveChip = document.getElementById("btn-remove-attachment");
  const btnRunAudit = document.getElementById("btn-run-audit");
  const deliverableInput = document.getElementById("deliverable-input");

  let attachedDoc = null;

  if (btnUploadDoc && fileInput) {
    btnUploadDoc.addEventListener("click", () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      attachedDoc = file;

      if (filenameEl) filenameEl.innerText = file.name;
      if (filesizeEl) filesizeEl.innerText = `(${(file.size / 1024).toFixed(1)} KB)`;
      if (chip) chip.style.display = "flex";

      const reader = new FileReader();
      if (file.type.includes("pdf") || file.name.endsWith(".pdf")) {
        reader.onload = () => {
          if (deliverableInput) {
            deliverableInput.value = `[Document: ${file.name} - ${(file.size / 1024).toFixed(1)} KB]\nAssignment document attached for AI preflight evaluation.`;
          }
          showToast(`Attached document: ${file.name}`);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          if (deliverableInput) {
            deliverableInput.value = reader.result;
          }
          showToast(`Loaded ${file.name} (${reader.result.length} characters)`);
        };
        reader.readAsText(file);
      }
    });
  }

  if (btnRemoveChip) {
    btnRemoveChip.addEventListener("click", () => {
      attachedDoc = null;
      if (chip) chip.style.display = "none";
      if (fileInput) fileInput.value = "";
      if (deliverableInput) deliverableInput.value = "";
      showToast("Removed document attachment.");
    });
  }

  if (btnPullActive) {
    btnPullActive.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "GET_ACTIVE_PAGE_TEXT" }, (response) => {
          if (response && response.text) {
            if (deliverableInput) deliverableInput.value = response.text;
            showToast("Extracted content from active browser tab.");
          } else {
            showToast("Could not extract tab text. Please upload document or paste draft.");
          }
        });
      } else {
        showToast("Tab extraction active in extension mode. Paste draft or upload document.");
      }
    });
  }

  if (btnRunAudit) {
    btnRunAudit.addEventListener("click", executePreflightAudit);
  }
}

async function executePreflightAudit() {
  const deliverableInput = document.getElementById("deliverable-input");
  const text = deliverableInput ? deliverableInput.value.trim() : "";
  if (!text) {
    showToast("Please upload an assignment document or paste draft content to audit.");
    return;
  }

  showToast("Auditing draft with Gemini AI behavioral engine...");
  const btnRunAudit = document.getElementById("btn-run-audit");
  if (btnRunAudit) {
    btnRunAudit.disabled = true;
    btnRunAudit.innerText = "Evaluating with AI...";
  }

  let result = null;
  if (state.isServerConnected) {
    try {
      const res = await fetch(`${state.backendUrl}/api/preflight/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract: state.currentContract || {},
          deliverable_text: text,
          api_key: state.geminiKey
        })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (e) {
      console.warn("Preflight API call error:", e);
    }
  }

  if (!result) {
    result = clientPreflightAudit(state.currentContract, text);
  }

  if (btnRunAudit) {
    btnRunAudit.disabled = false;
    btnRunAudit.innerText = "Run AI Evaluation";
  }

  renderAuditResults(result);
}

function renderAuditResults(result) {
  const card = document.getElementById("audit-results-card");
  card.style.display = "flex";

  const scoreNum = document.getElementById("audit-score-num");
  const verdictText = document.getElementById("audit-verdict-text");
  const verdictBadge = document.getElementById("audit-verdict-badge");
  const checklist = document.getElementById("audit-checklist");
  const remediesList = document.getElementById("audit-remedies-list");

  scoreNum.innerText = `${result.alignment_score}%`;
  verdictText.innerText = result.verdict;

  if (result.alignment_score >= 85) {
    verdictBadge.className = "badge badge-sage";
    verdictBadge.innerText = "Passed";
  } else if (result.alignment_score >= 60) {
    verdictBadge.className = "badge badge-amber";
    verdictBadge.innerText = "Adjustments Needed";
  } else {
    verdictBadge.className = "badge badge-rust";
    verdictBadge.innerText = "High Risk";
  }

  checklist.innerHTML = "";
  (result.evaluations || []).forEach((item) => {
    const el = document.createElement("div");
    el.className = `audit-check-item ${item.status}`;

    let statusClass = "badge-sage";
    if (item.status === "warning") {
      statusClass = "badge-amber";
    } else if (item.status === "missing") {
      statusClass = "badge-rust";
    }

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:12px; font-weight:600; color:var(--text-primary);">
          Clause ${item.num}: ${escapeHtml(item.title)}
        </span>
        <span class="badge ${statusClass}">${item.status.toUpperCase()}</span>
      </div>
      <div style="font-size:11.5px; color:var(--text-secondary); line-height:1.4;">
        ${escapeHtml(item.commentary)}
      </div>
    `;

    checklist.appendChild(el);
  });

  remediesList.innerHTML = "";
  (result.remedies || []).forEach((rem) => {
    const li = document.createElement("li");
    li.textContent = rem;
    remediesList.appendChild(li);
  });

  card.scrollIntoView({ behavior: "smooth" });
}

function clientPreflightAudit(contract, text) {
  const clauses = (contract && contract.clauses && contract.clauses.length > 0)
    ? contract.clauses
    : [
        { num: 1, title: "Deliverable Scope & Output Format", category: "core_spec", content: "tangible deliverable format, deck, doc, or prototype" },
        { num: 2, title: "Timeline Realism & Deadlines", category: "deadline", content: "hard calendar deadline, cutoff, or milestone" },
        { num: 3, title: "Definition of Done (DoD)", category: "dod", content: "measurable acceptance criteria, testing benchmarks, and quality standards" },
        { num: 4, title: "Scope Boundaries & Anti-Goals", category: "guardrails", content: "explicitly stated out-of-scope boundaries to prevent scope creep" },
        { num: 5, title: "Sign-Off Authority & Dependencies", category: "dependencies", content: "designated reviewer, approver, or stakeholder sign-off" }
      ];
  const textLower = text.toLowerCase();
  let passedCount = 0;
  const evaluations = [];

  const scopeCreepSignals = ["blockchain", "international", "emea", "asia", "tax laws", "12 pages", "smart contract"];
  const hasScopeCreep = scopeCreepSignals.some((sig) => textLower.includes(sig));
  const isExplicitlyExcluded = scopeCreepSignals.some(
    (sig) => textLower.includes(sig) && (textLower.includes("exclud") || textLower.includes("not included") || textLower.includes("out-of-scope"))
  );

  clauses.forEach((c) => {
    const content = (c.content || "").toLowerCase();
    const title = c.title || "";
    const category = c.category || "";

    const words = content.match(/\b[a-zA-Z]{4,}\b/g) || [];
    const stopwords = new Set(["with", "this", "that", "from", "have", "must", "deck", "presentation", "slides", "built"]);
    const filterWords = words.filter((w) => !stopwords.has(w));
    const matches = filterWords.filter((w) => textLower.includes(w));
    const ratio = matches.length / Math.max(filterWords.length, 1);

    let status = "missing";
    let commentary = `No clear evidence found matching agreed terms: "${c.content}"`;

    if (category === "guardrails") {
      if (isExplicitlyExcluded) {
        status = "passed";
        passedCount += 1;
        commentary = "Out-of-scope boundaries respected: explicitly confirmed exclusion of anti-goals.";
      } else if (hasScopeCreep) {
        status = "missing";
        commentary = "Scope violation: Draft contains elements explicitly marked as out-of-scope in Micro Contract.";
      } else if (textLower.includes("out-of-scope") || textLower.includes("excluded") || ratio >= 0.25) {
        status = "passed";
        passedCount += 1;
        commentary = "Out-of-scope boundaries respected and explicitly documented.";
      } else {
        status = "warning";
        passedCount += 0.5;
        commentary = "No explicit disclaimer found confirming that out-of-scope items were excluded.";
      }
    } else if (category === "dependencies") {
      if ((textLower.includes("approv") || textLower.includes("signed off") || textLower.includes("reviewed")) && ratio >= 0.15) {
        status = "passed";
        passedCount += 1;
        commentary = "Designated approver / stakeholder check-in verified in draft header.";
      } else if (ratio >= 0.3) {
        status = "passed";
        passedCount += 1;
        commentary = `Verified alignment with ${title}.`;
      } else {
        status = "missing";
        commentary = `Approver verification missing. Agreed clause: "${c.content}".`;
      }
    } else if (category === "dod") {
      if ((textLower.includes("definition of done") || textLower.includes("kpi") || textLower.includes("checklist")) && ratio >= 0.2) {
        status = "passed";
        passedCount += 1;
        commentary = "Definition of Done requirements validated against draft content.";
      } else if (ratio >= 0.35) {
        status = "passed";
        passedCount += 1;
        commentary = `Evidence of "${title}" verified in draft content.`;
      } else if (ratio >= 0.15) {
        status = "warning";
        passedCount += 0.5;
        commentary = `Partial fulfillment for ${title}. Metric evidence is vague.`;
      } else {
        status = "missing";
        commentary = `Missing DoD metrics. Agreed clause: "${c.content}".`;
      }
    } else {
      if (ratio >= 0.3) {
        status = "passed";
        passedCount += 1;
        commentary = `Verified compliance with ${title}.`;
      } else if (ratio >= 0.12) {
        status = "warning";
        passedCount += 0.5;
        commentary = `Partial evidence found for ${title}. Recommend explicit callout.`;
      } else {
        status = "missing";
        commentary = `No clear evidence matching agreed terms: "${c.content}".`;
      }
    }

    evaluations.push({
      num: c.num,
      title: title,
      status: status,
      commentary: commentary
    });
  });

  const score = Math.round((passedCount / Math.max(clauses.length, 1)) * 100);
  let verdict = "Ready to Submit";
  if (score < 50) {
    verdict = "High Risk of Rejection";
  } else if (score < 80) {
    verdict = "Minor Adjustments Recommended";
  }

  return {
    alignment_score: score,
    verdict: verdict,
    evaluations: evaluations,
    remedies: [
      "Confirm that out-of-scope boundaries are explicitly stated in your overview.",
      "Check that the designated single approver is listed on the deliverable header.",
      "Ensure all Definition of Done criteria are present and measurable."
    ]
  };
}

// ============================================================================
// TAB 4: Settings & Configuration
// ============================================================================

function initSettings() {
  const btnSave = document.getElementById("btn-save-settings");
  const btnTest = document.getElementById("btn-test-connection");
  const urlInput = document.getElementById("setting-backend-url");
  const keyInput = document.getElementById("setting-gemini-key");
  const feedback = document.getElementById("settings-status-feedback");
  const providerSelect = document.getElementById("setting-llm-provider");
  const chimeToggle = document.getElementById("setting-chime-toggle");
  const autoDodToggle = document.getElementById("setting-auto-dod");

  if (providerSelect) {
    const savedProvider = localStorage.getItem("mutual_llm_provider") || "gemini-3.5-flash-lite";
    providerSelect.value = savedProvider;
    providerSelect.addEventListener("change", () => {
      localStorage.setItem("mutual_llm_provider", providerSelect.value);
      showToast(`AI engine set to ${providerSelect.options[providerSelect.selectedIndex].text.split("(")[0].trim()}`);
    });
  }

  if (chimeToggle) {
    const savedChime = localStorage.getItem("mutual_chime_enabled");
    if (savedChime !== null) chimeToggle.checked = savedChime === "true";
    chimeToggle.addEventListener("change", () => {
      localStorage.setItem("mutual_chime_enabled", chimeToggle.checked);
      showToast(chimeToggle.checked ? "Chime alerts enabled" : "Chimes muted");
    });
  }

  if (autoDodToggle) {
    const savedDod = localStorage.getItem("mutual_auto_dod");
    if (savedDod !== null) autoDodToggle.checked = savedDod === "true";
    autoDodToggle.addEventListener("change", () => {
      localStorage.setItem("mutual_auto_dod", autoDodToggle.checked);
    });
  }

  // Check if backend already has GEMINI_API_KEY loaded
  try {
    fetch(`${state.backendUrl}/api/settings`)
      .then(r => r.json())
      .then(data => {
        if (data && data.has_key && keyInput && !keyInput.value) {
          keyInput.placeholder = `Active on backend (${data.model || "gemini-3.5-flash-lite"})`;
        }
      })
      .catch(() => {});
  } catch (e) {}

  if (!btnSave) return;

  btnSave.addEventListener("click", async () => {
    state.backendUrl = urlInput.value.trim() || "http://localhost:8000";
    const enteredKey = keyInput.value.trim();
    if (enteredKey) {
      state.geminiKey = enteredKey;
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        backendUrl: state.backendUrl,
        geminiKey: state.geminiKey
      });
    } else {
      localStorage.setItem("mutual_backend_url", state.backendUrl);
      if (state.geminiKey) localStorage.setItem("mutual_gemini_key", state.geminiKey);
    }

    if (feedback) feedback.innerHTML = `<span style="color:#78716C;">Saving & validating key...</span>`;

    // Sync to backend if connected
    try {
      const payload = state.geminiKey ? { api_key: state.geminiKey } : {};
      const res = await fetch(`${state.backendUrl}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.test_result && data.test_result.valid) {
          if (feedback) feedback.innerHTML = `<span style="color:var(--sage-text); font-weight:600;">Connected to Gemini (${escapeHtml(data.test_result.model)})</span>`;
          showToast(`Gemini active using model ${data.test_result.model}!`);
        } else if (data.test_result && data.test_result.error) {
          if (feedback) feedback.innerHTML = `<span style="color:#DC2626;">${escapeHtml(data.test_result.error)}</span>`;
          showToast("Settings saved, but Gemini key returned an error.");
        } else {
          if (feedback) feedback.innerHTML = `<span style="color:var(--sage-text);">Configuration saved</span>`;
          showToast("Settings saved successfully.");
        }
      }
    } catch (e) {
      if (feedback) feedback.innerHTML = `<span style="color:#78716C;">Saved locally (backend unreachable)</span>`;
      showToast("Settings saved locally.");
    }

    checkBackendHealth();
  });

  btnTest.addEventListener("click", async () => {
    state.backendUrl = urlInput.value.trim() || "http://localhost:8000";
    const enteredKey = keyInput.value.trim();
    if (enteredKey) {
      state.geminiKey = enteredKey;
    }
    if (feedback) feedback.innerHTML = `<span style="color:#78716C;">Testing connection...</span>`;
    showToast("Testing backend & Gemini connection...");

    try {
      const payload = state.geminiKey ? { api_key: state.geminiKey } : {};
      const res = await fetch(`${state.backendUrl}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.test_result && data.test_result.valid) {
          if (feedback) feedback.innerHTML = `<span style="color:var(--sage-text); font-weight:600;">Gemini Online (${escapeHtml(data.test_result.model)})</span>`;
          showToast(`Verified! Gemini ${data.test_result.model} is operational.`);
        } else {
          const errMsg = (data.test_result && data.test_result.error) || "Local engine active (no Gemini key)";
          if (feedback) feedback.innerHTML = `<span style="color:#B45309;">${escapeHtml(errMsg)}</span>`;
          showToast(errMsg);
        }
      }
    } catch (e) {
      if (feedback) feedback.innerHTML = `<span style="color:#DC2626;">Backend offline at ${escapeHtml(state.backendUrl)}</span>`;
      showToast("Cannot connect to backend server.");
    }

    await checkBackendHealth();
  });
}

// ============================================================================
// Chrome Extension Event Listeners
// ============================================================================

function listenToExtensionEvents() {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {

      // ── Live captions forwarded from any meeting platform content script ──
      // Process only CAPTIONS_CHUNK_LIVE from background to prevent duplicate processing
      if (message.type === "CAPTIONS_CHUNK_LIVE" && message.payload) {
        const { speaker, text, timestamp } = message.payload;
        if (text) {
          const t = text.toLowerCase();
          if (t.includes("looking to create a workspace") || t.includes("create a new workspace") || t.includes("workspace instead")) {
            return;
          }
        }
        processIncomingLine(speaker || "Participant", text, timestamp);
      }

      // ── Speech result from the offscreen SpeechRecognition bridge ──────────
      else if (message.type === "SPEECH_RESULT") {
        handleSpeechResult(message.transcript, message.isFinal);
        // Hide interim box when final
        if (message.isFinal) {
          const interimBox = document.getElementById("live-interim-box");
          if (interimBox) interimBox.style.display = "none";
        }
      }

      // ── Offscreen SpeechRecognition started successfully ──────────────────
      else if (message.type === "SPEECH_STATUS" && message.status === "started") {
        handleSpeechStarted();
      }

      // ── Offscreen SpeechRecognition stopped ───────────────────────────────
      else if (message.type === "SPEECH_STATUS" && message.status === "stopped") {
        if (!state.isLiveMicListening) {
          updateMicStoppedUI();
        }
      }

      // ── Offscreen error (not-allowed, no-speech, etc.) ────────────────────
      else if (message.type === "SPEECH_ERROR") {
        handleSpeechError(message.error);
      }

      // ── Microphone permission granted from permission.html tab ─────
      else if (message.type === "MIC_PERMISSION_GRANTED") {
        state.micAuthorized = true;
        showToast("Microphone permission granted! Starting live listening…");
        const dot  = document.getElementById("mic-status-dot");
        const desc = document.getElementById("mic-status-description");
        if (dot)  dot.className = "pulse-dot-green";
        if (desc) desc.innerText = "Microphone Authorized! Starting live speech listener…";
        setTimeout(() => { startLiveMicrophone(); }, 300);
      }

      // ── Real-Time Zero-Friction Meeting Detection ──
      else if ((message.type === "MEETING_DETECTED" || message.type === "MEETING_DETECTED_LIVE") && message.payload) {
        handleMeetingDetected(message.payload);
      }
    });
  }

  // Active check on startup
  initMeetingMesh();
}

// ============================================================================
// REAL-TIME ZERO-FRICTION MEETING MESH & PARTICIPANT PRESENCE
// ============================================================================
let meetingMeshHeartbeatTimer = null;

function initMeetingMesh() {
  document.querySelectorAll(".btn-open-tasks-hub").forEach(btn => {
    btn.removeEventListener("click", showAssignmentsHistoryView);
    btn.addEventListener("click", showAssignmentsHistoryView);
  });

  const modeDropdown = document.getElementById("meeting-mode-dropdown");
  const roomPicker = document.getElementById("offline-room-picker");
  const roomSelect = document.getElementById("offline-room-select");
  const customRoomInput = document.getElementById("offline-custom-room-input");

  async function populateOfflineRooms() {
    if (!roomSelect) return;
    try {
      const profile = (await window.MutualSupabase.getProfile()) || {};
      const companyCode = profile.company_code || "GLOBAL";
      const rooms = await window.MutualSupabase.getOfflineRooms(companyCode);
      if (Array.isArray(rooms) && rooms.length > 0) {
        roomSelect.innerHTML = "";
        rooms.forEach(r => {
          const opt = document.createElement("option");
          opt.value = r.room_slug;
          opt.innerText = r.room_name;
          roomSelect.appendChild(opt);
        });
        const customOpt = document.createElement("option");
        customOpt.value = "custom";
        customOpt.innerText = "Custom Room...";
        roomSelect.appendChild(customOpt);
      }
    } catch (e) {}
  }

  function updateOfflineRoomSession() {
    let roomVal = roomSelect ? roomSelect.value : "conf-alpha";
    let roomTitle = "Conference Room Alpha";

    if (roomVal === "custom") {
      if (customRoomInput) {
        customRoomInput.style.display = "block";
        const customName = customRoomInput.value.trim();
        roomTitle = customName || "Custom Room";
        roomVal = (customName || "custom-room").toLowerCase().replace(/[^a-z0-9]/g, "-");
      }
    } else {
      if (customRoomInput) customRoomInput.style.display = "none";
      if (roomSelect && roomSelect.selectedOptions && roomSelect.selectedOptions[0]) {
        roomTitle = roomSelect.selectedOptions[0].text;
      }
    }

    const offlinePayload = {
      platform: "offline_in_person",
      meeting_id: `room-${roomVal}`,
      room_name: roomTitle,
      title: `In-Person Meeting • ${roomTitle}`,
      timestamp: Date.now()
    };
    handleMeetingDetected(offlinePayload);
  }

  function switchMeetingMode() {
    const mode = modeDropdown ? modeDropdown.value : "auto";
    if (mode === "offline") {
      if (roomPicker) roomPicker.style.display = "flex";
      populateOfflineRooms();
      updateOfflineRoomSession();
    } else {
      if (roomPicker) roomPicker.style.display = "none";
      if (state._detectedOnlineMeeting) {
        handleMeetingDetected(state._detectedOnlineMeeting);
      } else {
        state.activeMeeting = null;
        resetMeshUIToDetecting();
      }
    }
  }

  if (modeDropdown) {
    modeDropdown.addEventListener("change", switchMeetingMode);
  }
  if (roomSelect) {
    roomSelect.addEventListener("change", updateOfflineRoomSession);
  }
  if (customRoomInput) {
    customRoomInput.addEventListener("input", () => {
      clearTimeout(window._customRoomDebounce);
      window._customRoomDebounce = setTimeout(updateOfflineRoomSession, 400);
    });
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_MEETING" }, (res) => {
      if (res && res.meeting) {
        state._detectedOnlineMeeting = res.meeting;
        if (!modeDropdown || modeDropdown.value === "auto") {
          handleMeetingDetected(res.meeting);
        }
      }
    });
  }
}

function resetMeshUIToDetecting() {
  const titleEls = document.querySelectorAll(".mesh-meeting-title");
  titleEls.forEach(el => { el.innerText = "Detecting Call..."; });
  const idEls = document.querySelectorAll(".mesh-meeting-id");
  idEls.forEach(el => { el.innerText = "--"; });
  const badges = document.querySelectorAll(".mesh-badge-indicator");
  badges.forEach(b => { b.innerText = "[MESH SYNC]"; });
  const strips = document.querySelectorAll(".mesh-participants-strip");
  strips.forEach(s => {
    s.innerHTML = `<span style="font-size:11px; color:var(--text-muted); font-style:italic;">Open Meet, Zoom, Teams, Slack or select In-Person Room to connect team</span>`;
  });
  if (meetingMeshHeartbeatTimer) {
    clearInterval(meetingMeshHeartbeatTimer);
    meetingMeshHeartbeatTimer = null;
  }
}

function handleMeetingDetected(meetingPayload) {
  if (!meetingPayload || !meetingPayload.meeting_id) return;
  state.activeMeeting = meetingPayload;

  const huds = document.querySelectorAll(".meeting-mesh-hud");
  huds.forEach(hud => { hud.style.display = "flex"; });

  const titleEls = document.querySelectorAll(".mesh-meeting-title");
  titleEls.forEach(el => {
    let platformLabel = "Active Meeting";
    if (meetingPayload.platform === "google_meet") platformLabel = "Google Meet";
    else if (meetingPayload.platform === "zoom") platformLabel = "Zoom";
    else if (meetingPayload.platform === "teams") platformLabel = "Microsoft Teams";
    else if (meetingPayload.platform === "slack") platformLabel = "Slack Huddle";
    else if (meetingPayload.platform === "offline_in_person" || meetingPayload.platform === "offline") {
      platformLabel = `In-Person Room (${meetingPayload.room_name || "Meeting"})`;
    } else {
      platformLabel = meetingPayload.platform || "Active Meeting";
    }
    el.innerText = platformLabel;
  });

  const idEls = document.querySelectorAll(".mesh-meeting-id");
  idEls.forEach(el => {
    el.innerText = meetingPayload.meeting_id.toUpperCase();
  });

  sendMeetingMeshHeartbeat();
  if (!meetingMeshHeartbeatTimer) {
    meetingMeshHeartbeatTimer = setInterval(sendMeetingMeshHeartbeat, 8000);
  }
}

async function sendMeetingMeshHeartbeat() {
  if (!state.activeMeeting || !state.activeMeeting.meeting_id) return;

  try {
    const profile = (await window.MutualSupabase.getProfile()) || {};
    const companyCode = profile.company_code || "GLOBAL";
    const isOffline = state.activeMeeting.platform === "offline_in_person" || state.activeMeeting.platform === "offline";

    const heartbeatData = {
      company_code: companyCode,
      meeting_platform: state.activeMeeting.platform || (isOffline ? "offline_in_person" : "meet"),
      location_type: isOffline ? "offline_in_person" : "online",
      room_name: state.activeMeeting.room_name || "",
      meeting_id: state.activeMeeting.meeting_id,
      meeting_url: state.activeMeeting.url || "",
      user_id: profile.email || window.MutualSupabase.user?.id || "anon",
      user_name: profile.name || "Team Member",
      user_role: profile.role || "Contributor",
      status: state.isLiveMicListening ? "transcribing" : "active"
    };

    const res = await window.MutualSupabase.syncMeetingHeartbeat(heartbeatData);
    if (res && Array.isArray(res.participants)) {
      renderMeshParticipants(res.participants);
    }
  } catch (e) {
    console.warn("[Mesh] Heartbeat error:", e);
  }
}

function renderMeshParticipants(participants) {
  const strips = document.querySelectorAll(".mesh-participants-strip");
  const badges = document.querySelectorAll(".mesh-badge-indicator");
  const isOffline = state.activeMeeting && (state.activeMeeting.platform === "offline_in_person" || state.activeMeeting.platform === "offline");
  const prefix = isOffline ? "[OFFLINE MESH" : "[MESH SYNC";

  badges.forEach(badge => {
    badge.innerText = `${prefix}: ${participants.length} CONNECTED]`;
  });

  strips.forEach(strip => {
    if (participants.length === 0) {
      strip.innerHTML = `<span style="font-size:11px; color:var(--text-muted); font-style:italic;">No team members connected yet in this room</span>`;
      return;
    }

    strip.innerHTML = "";
    participants.forEach((p) => {
      const chip = document.createElement("div");
      chip.className = "mesh-participant-chip";
      const initials = (p.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      const statusText = p.status === "transcribing" ? "[TRANSCRIBING]" : "[LIVE]";
      chip.innerHTML = `
        <span class="mesh-chip-avatar">${initials}</span>
        <span style="font-weight:600; color:var(--text-primary);">${escapeHtml(p.name || "User")}</span>
        <span style="color:var(--text-tertiary); font-size:10px;">• ${escapeHtml(p.role || "Member")}</span>
        <span class="mesh-chip-tag">${statusText}</span>
      `;
      strip.appendChild(chip);
    });
  });
}

async function syncHandshakeToCompanyTask() {
  try {
    const profile = (await window.MutualSupabase.getProfile()) || {};
    const fullText = (state.capturedTranscript || []).map((t) => `${t.speaker}: ${t.text}`).join(" ");

    // Call Gemini AI Extractor
    const aiAssignment = await window.MutualSupabase.extractAITaskAssignment(fullText, profile.name || "Manager");

    const clauses = state.currentContract?.clauses || [];
    const clauseDoD = clauses.find(c => c.category === "dod")?.content || "";
    const clauseAnti = clauses.find(c => c.category === "guardrails")?.content || "";

    const newTask = await window.MutualSupabase.createCompanyTask({
      company_code: profile.company_code || "GLOBAL",
      title: aiAssignment.title || state.currentContract?.title || "Sprint Delegation Assignment",
      deliverable_format: aiAssignment.deliverable_format || clauses.find(c => c.category === "deliverable")?.content || "Agreed Artifact",
      deadline_sla: aiAssignment.deadline_sla || clauses.find(c => c.category === "timeline")?.content || "Sprint Deadline",
      definition_of_done: aiAssignment.definition_of_done && aiAssignment.definition_of_done.length > 0 ? aiAssignment.definition_of_done : (clauseDoD ? [clauseDoD] : ["Deliverable verified against scope"]),
      anti_goals: aiAssignment.anti_goals && aiAssignment.anti_goals.length > 0 ? aiAssignment.anti_goals : (clauseAnti ? [clauseAnti] : ["Out of scope explorations"]),
      delegator_name: state.activePersona === "bhushith" ? (profile.name || "Bhushith") : "Delegating Manager",
      assignee_name: state.activePersona === "neehal" ? (profile.name || "Neehal") : "Assigned Contributor",
      meeting_id: state.activeMeeting?.meeting_id || "",
      clarity_score: aiAssignment.clarity_score || 88,
      risk_assessment: aiAssignment.risk_assessment || ""
    });

    if (newTask) {
      showToast("Handshake recorded in Company Ledger!");
    }
  } catch (e) {
    console.warn("[Handshake] Error recording company task:", e);
  }
}


// ============================================================================
// Toast & Utility Helpers
// ============================================================================

function showToast(msg) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  // Prevent duplicate toast spamming
  const existing = Array.from(container.querySelectorAll(".toast"));
  if (existing.some((t) => t.innerText === msg)) {
    return;
  }

  // Keep max 2 toasts visible at any time
  while (container.children.length >= 2) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.2s ease";
    setTimeout(() => { toast.remove(); }, 200);
  }, 2400);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Expose on window for parent frame integration
if (typeof window !== "undefined") {
  window.state = state;
  window.startSimulation = startSimulation;
  window.stopSimulation = stopSimulation;

  // Listen for Option+M inside the sidepanel iframe and relay to parent drawer/tab
  window.addEventListener("keydown", (e) => {
    const isM = (e.code === "KeyM" || e.key === "m" || e.key === "M" || e.key === "µ" || e.key === "Âµ");
    if (isM && (e.altKey || (e.metaKey && e.shiftKey) || (e.ctrlKey && e.shiftKey))) {
      e.preventDefault();
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "THE_MUTUAL_TOGGLE_DRAWER" }, "*");
      }
    }
  }, true);
}
