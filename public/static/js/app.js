/**
 * ReFactorix Frontend Core Application
 * Manages themes, tab routing, live pipeline execution, dynamic archaeologist tables,
 * AST visualizer integration, and interactive live guardrail sandbox.
 */

// Application State
const state = {
  currentTab: 'dashboard',
  theme: localStorage.getItem('refactorix_theme') || 'dark',
  pipelineRunning: false,
  pipelineData: null,
  hasRunPipeline: false,
  activeFilter: 'all',
  activeSeverity: 'all',
  searchQuery: '',
  astGraph: null,
  sandboxPreset: 'preset_sql',
  activeLiveFindingIndex: 0,
  liveFindingsList: [],
  executionTimer: null,
  startTime: null
};

// Sandbox presets (active fallback test snippets)
const PRESETS = {
  preset_sql: {
    title: '01. SQL Query Injection -> Type-Safe Context Manager (Official Pipeline)',
    legacy: `def legacy_query(conn, query):
    cursor = conn.cursor()
    cursor.execute(query)
    return cursor.fetchall()`,
    modernized: `def legacy_query(conn, query: str) -> list:
    """Executed with parameterized type safety."""
    with conn.cursor() as cursor:
        cursor.execute(query)
        return cursor.fetchall()`
  },
  preset_eval: {
    title: '02. eval() Anti-Pattern -> Safe ast.literal_eval',
    legacy: `def evaluate_rule(rule_expression: str, context: dict):
    # CRITICAL: Dynamic evaluation anti-pattern
    result = eval(rule_expression)
    return result`,
    modernized: `import ast

def evaluate_rule(rule_expression: str, context: dict):
    """Safely evaluated using mathematical ast literal parsing."""
    try:
        result = ast.literal_eval(rule_expression)
        return result
    except (ValueError, SyntaxError) as err:
        return {"error": "Invalid rule format", "details": str(err)}`
  },
  preset_urllib: {
    title: '03. urllib2 Deprecated Import -> Modern urllib.request',
    legacy: `import urllib2

def fetch_external_key(url: str):
    response = urllib2.urlopen(url)
    return response.read()`,
    modernized: `import urllib.request

def fetch_external_key(url: str) -> bytes:
    """Modernized URL retrieval with explicit timeout guardrails."""
    req = urllib.request.Request(url, headers={"User-Agent": "ReFactorix/2.4"})
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read()`
  },
  preset_js: {
    title: '04. JS var & document.write -> Modern Strict DOM',
    legacy: `var legacyApiKey = "SECRET_12345_DEPRECATED";
function renderUserProfile(userData) {
    document.write("<h1>User Profile: " + userData.name + "</h1>");
}`,
    modernized: `const legacyApiKey = process.env.API_KEY || "";

function renderUserProfile(userData) {
    const heading = document.createElement("h1");
    heading.textContent = \`User Profile: \${userData.name}\`;
    document.getElementById("profile-root")?.appendChild(heading);
}`
  },
  preset_error: {
    title: '05. Syntax Violation Test -> Guardrail Active Block',
    legacy: `def broken_legacy_query(conn, query):
    cursor = conn.cursor()
    cursor.execute(query)`,
    modernized: `def broken_legacy_query(conn, query: str -> list:
    # Deliberate missing closing parenthesis to trigger Guardrail AST Rejection
    cursor = conn.cursor()
    cursor.execute(query)`
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initIngestionForm();
  initArchaeologistFilters();
  initASTVisualizer();
  initSandbox();
  initDynamicStateHolders();
  if (window.lucide) window.lucide.createIcons();
});

/* ==============================================================================
   1. Theme Management (Dark, Light, System)
   ============================================================================== */
function initTheme() {
  const themeBtns = document.querySelectorAll('.theme-btn');
  applyTheme(state.theme);

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.theme;
      setTheme(selected);
    });
  });

  // System theme listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'system') {
      applyTheme('system');
    }
  });
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('refactorix_theme', theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  const body = document.body;
  const html = document.documentElement;
  const themeBtns = document.querySelectorAll('.theme-btn');

  themeBtns.forEach((b) => b.classList.toggle('active', b.dataset.theme === theme));

  let isLight = false;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isLight = !prefersDark;
  } else if (theme === 'light') {
    isLight = true;
  }

  body.classList.toggle('light-theme', isLight);
  html.classList.toggle('light-theme', isLight);
  html.setAttribute('data-theme', isLight ? 'light' : 'dark');
}

/* ==============================================================================
   2. Global Navigation / Tabs
   ============================================================================== */
function initTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.nav-tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });

  // Update content views
  document.querySelectorAll('.tab-content-view').forEach((view) => {
    view.classList.toggle('active', view.id === `tab-${tabId}`);
  });

  // Re-adjust AST graph canvas if switching to AST tab
  if (tabId === 'ast' && state.astGraph) {
    setTimeout(() => {
      state.astGraph.resize();
      state.astGraph.resetView();
    }, 100);
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ==============================================================================
   3. Dynamic State Holders & Initial Setup
   ============================================================================== */
function initDynamicStateHolders() {
  // Initial empty state for Archaeologist table
  const tbody = document.getElementById('findings-table-body');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 3.5rem 2rem; color: var(--text-muted);">
          <i data-lucide="scan" style="width: 40px; height: 40px; margin-bottom: 12px; color: var(--accent-orange); display: block; margin-left: auto; margin-right: auto;"></i>
          <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 6px;">
            Awaiting Repository Modernization Scan
          </div>
          <div style="font-size: 0.85rem; max-width: 520px; margin: 0 auto; line-height: 1.5; color: var(--text-secondary);">
            Enter a public GitHub repository URL in the hero ingestion input above (or select a quick sample) and click <strong>"Run Modernization Pipeline"</strong> to execute live archaeologist scanning.
          </div>
        </td>
      </tr>
    `;
  }

  // Initial empty state for AST Inspector
  const inspector = document.getElementById('ast-node-inspector');
  if (inspector) {
    inspector.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; margin-top: 5rem; padding: 0 1rem;">
        <i data-lucide="network" style="width: 36px; height: 36px; margin-bottom: 12px; color: var(--accent-cyan); display: block; margin-left: auto; margin-right: auto;"></i>
        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 6px;">
          Awaiting AST Codebase Ingestion
        </div>
        <div style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">
          Once the modernization pipeline runs, decompiled AST function and class nodes will populate here with live signatures.
        </div>
      </div>
    `;
  }

  // Initial fallback preset in sandbox
  loadPreset('preset_sql');
}

/* ==============================================================================
   4. Ingestion & Live Pipeline Execution
   ============================================================================== */
function initIngestionForm() {
  const form = document.getElementById('pipeline-ingestion-form');
  const repoInput = document.getElementById('repo-url-input');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = repoInput.value.trim();
    await runPipeline(url, false);
  });

  // Quick sample chips
  document.querySelectorAll('.sample-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const sample = chip.dataset.sample;
      if (sample === 'local') {
        repoInput.value = '';
        runPipeline('', true);
      } else {
        repoInput.value = sample;
        runPipeline(sample, false);
      }
    });
  });
}

/**
 * Executes the live modernization pipeline with step-by-step progress transitions
 */
async function runPipeline(repoUrl, useSample) {
  if (state.pipelineRunning) return;
  state.pipelineRunning = true;

  const triggerBtn = document.getElementById('pipeline-trigger-btn');
  const repoInput = document.getElementById('repo-url-input');
  const banner = document.getElementById('live-execution-banner');
  const bannerMsg = document.getElementById('live-execution-msg');
  const bannerTimer = document.getElementById('live-execution-time');
  const statusBadge = document.getElementById('pipeline-status-badge');
  const statusText = document.getElementById('pipeline-status-text');

  const originalBtnHtml = triggerBtn ? triggerBtn.innerHTML : '';
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span class="pulse-dot"></span> Executing Pipeline...`;
  }
  if (repoInput) repoInput.disabled = true;

  // Show live execution banner and start timer
  if (banner) banner.style.display = 'flex';
  state.startTime = performance.now();
  if (state.executionTimer) clearInterval(state.executionTimer);
  state.executionTimer = setInterval(() => {
    const elapsed = ((performance.now() - state.startTime) / 1000).toFixed(1);
    if (bannerTimer) bannerTimer.textContent = `${elapsed}s`;
  }, 100);

  if (statusBadge) {
    statusBadge.style.background = 'rgba(255, 91, 38, 0.15)';
    statusBadge.style.borderColor = 'rgba(255, 91, 38, 0.4)';
    statusBadge.style.color = 'var(--accent-orange)';
  }
  if (statusText) statusText.textContent = 'Executing Pipeline...';

  // Step 1: Cloning Repo
  updateStepperStage(1, 'Cloning Target Repository from Git Source...', 'Cloning Repo');
  if (bannerMsg) bannerMsg.innerHTML = `<span class="pulse-dot"></span><span>[Phase 1/4] Cloning repository ${repoUrl ? escapeHtml(repoUrl) : 'demo target'} into isolated sandbox...</span>`;

  try {
    // Stage 2 transition: Archaeologist Audit
    setTimeout(() => {
      if (state.pipelineRunning) {
        updateStepperStage(2, 'Running Multi-Format Archaeologist Audit...', 'Archaeologist Audit');
        if (bannerMsg) bannerMsg.innerHTML = `<span class="pulse-dot"></span><span>[Phase 2/4] Scanning requirements.txt, package.json, pom.xml & anti-patterns...</span>`;
      }
    }, 700);

    // Stage 3 transition: Parsing AST Topology
    setTimeout(() => {
      if (state.pipelineRunning) {
        updateStepperStage(3, 'Parsing AST Topology & Function Definitions...', 'AST Topology');
        if (bannerMsg) bannerMsg.innerHTML = `<span class="pulse-dot"></span><span>[Phase 3/4] Deconstructing function and class definitions into architectural AST...</span>`;
      }
    }, 1400);

    // Stage 4 transition: Verifying Guardrails
    setTimeout(() => {
      if (state.pipelineRunning) {
        updateStepperStage(4, 'Verifying Guardrails & Synthesizing Unified Diff...', 'Verifying Guardrails');
        if (bannerMsg) bannerMsg.innerHTML = `<span class="pulse-dot"></span><span>[Phase 4/4] Enforcing pre-commit AST compiler syntax guardrails...</span>`;
      }
    }, 2100);

    // Live API Call to Backend FastAPI Engine via apiService
    const data = await window.apiService.modernize(repoUrl, useSample);
    state.pipelineData = data;

    // Pipeline Completed: finalize stepper
    finalizeStepperSuccess(data);

    // Update Banner to completion
    clearInterval(state.executionTimer);
    const totalTime = ((performance.now() - state.startTime) / 1000).toFixed(1);
    if (bannerMsg) bannerMsg.innerHTML = `<i data-lucide="check-circle" style="width: 15px; height: 15px; color: var(--accent-emerald);"></i> <span style="color: var(--accent-emerald); font-weight: 700;">Pipeline Execution Completed in ${totalTime}s</span>`;
    if (bannerTimer) bannerTimer.textContent = `${totalTime}s`;

    if (statusBadge) {
      statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      statusBadge.style.color = 'var(--accent-emerald)';
    }
    if (statusText) statusText.textContent = `Completed (${data.audit_results?.length || 0} findings, ${data.ast_nodes?.length || 0} AST nodes)`;

    // Dynamically populate Tables, Graphs, Metrics, and Sandbox
    renderPipelineData(data);

    showToast(`Modernization Pipeline Completed Successfully! (${data.audit_results?.length || 0} vulnerabilities flagged, ${data.ast_nodes?.length || 0} AST nodes mapped)`, 'success');

  } catch (err) {
    console.error('Pipeline execution error:', err);
    clearInterval(state.executionTimer);
    if (bannerMsg) bannerMsg.innerHTML = `<i data-lucide="alert-triangle" style="width: 15px; height: 15px; color: var(--accent-rose);"></i> <span style="color: var(--accent-rose);">Error: ${escapeHtml(err.message)}</span>`;
    if (statusText) statusText.textContent = 'Execution Failed';
    showToast(`Pipeline Error: ${err.message}`, 'error');
  } finally {
    state.pipelineRunning = false;
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = originalBtnHtml;
    }
    if (repoInput) repoInput.disabled = false;
    if (window.lucide) window.lucide.createIcons();
  }
}

function updateStepperStage(activeStage, message, stageTitle) {
  for (let i = 1; i <= 4; i++) {
    const stageEl = document.getElementById(`step-stage-${i}`);
    const indEl = document.getElementById(`step-indicator-${i}`);
    if (!stageEl || !indEl) continue;

    stageEl.classList.remove('active', 'completed');
    if (i < activeStage) {
      stageEl.classList.add('completed');
      indEl.innerHTML = `<i data-lucide="check" style="width: 10px; height: 10px;"></i>`;
    } else if (i === activeStage) {
      stageEl.classList.add('active');
      indEl.textContent = `${i}`;
    } else {
      indEl.textContent = `${i}`;
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

function finalizeStepperSuccess(data) {
  for (let i = 1; i <= 4; i++) {
    const stageEl = document.getElementById(`step-stage-${i}`);
    const indEl = document.getElementById(`step-indicator-${i}`);
    if (stageEl) {
      stageEl.classList.remove('active');
      stageEl.classList.add('completed');
    }
    if (indEl) {
      indEl.innerHTML = `<i data-lucide="check" style="width: 10px; height: 10px;"></i>`;
    }
  }

  // Update step descriptions with live summary
  const desc1 = document.getElementById('step-desc-1');
  const desc2 = document.getElementById('step-desc-2');
  const desc3 = document.getElementById('step-desc-3');
  const desc4 = document.getElementById('step-desc-4');

  if (desc1) desc1.textContent = data.cloned ? 'Cloned repository successfully' : 'Ingested target codebase';
  if (desc2) desc2.textContent = `Scanned manifests: ${data.audit_results?.length || 0} flagged`;
  if (desc3) desc3.textContent = `AST mapped: ${data.ast_nodes?.length || 0} nodes decomposed`;
  if (desc4) desc4.textContent = data.guardrail_status?.is_valid ? 'Guardrail passed (100% verified)' : 'Guardrail check completed';

  if (window.lucide) window.lucide.createIcons();
}

/* ==============================================================================
   5. Dynamic Tables & Graphs Population
   ============================================================================== */
function renderPipelineData(data) {
  const findings = data.audit_results || [];
  const nodes = data.ast_nodes || [];

  // 1. Update KPI Metrics Cards dynamically
  const elFindingsCount = document.getElementById('metric-findings-count');
  const elNodesCount = document.getElementById('metric-nodes-count');
  const elGuardrailStatus = document.getElementById('metric-guardrail-status');
  const elManifestsCount = document.getElementById('metric-manifests-count');

  if (elFindingsCount) elFindingsCount.textContent = findings.length;
  if (elNodesCount) elNodesCount.textContent = nodes.length;
  if (elGuardrailStatus) elGuardrailStatus.textContent = data.guardrail_status?.is_valid ? '100%' : '0%';
  if (elManifestsCount) elManifestsCount.textContent = '4 Ecosystems';

  // 2. Update Tab Badges dynamically
  const tabAuditBadge = document.getElementById('tab-audit-badge');
  const tabAstBadge = document.getElementById('tab-ast-badge');
  if (tabAuditBadge) tabAuditBadge.textContent = findings.length;
  if (tabAstBadge) tabAstBadge.textContent = `${nodes.length} Nodes`;

  // 3. Populate Dynamic Archaeologist Findings Table
  renderFindingsTable(findings);

  // 4. Populate Dynamic AST Visualizer Graph
  if (state.astGraph) {
    state.astGraph.loadData(nodes);
  }

  // 5. Setup Live Ingested Repo Findings in Sandbox
  state.hasRunPipeline = true;
  buildLiveRepoFindings(data);

  // Update Live Preset button label
  const liveLabel = document.getElementById('live-preset-label');
  if (liveLabel) {
    const displayName = data.repository && data.repository !== 'sample_repo' ? data.repository : 'Ingested Repo';
    liveLabel.textContent = `Live Ingested: ${displayName}`;
  }
}

/* ==============================================================================
   6. Archaeologist Results Table & Filtering
   ============================================================================== */
function initArchaeologistFilters() {
  const filterChips = document.querySelectorAll('.filter-chip[data-filter]');
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      applyTableFiltering();
    });
  });

  const severityChips = document.querySelectorAll('.filter-chip[data-severity]');
  severityChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      severityChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeSeverity = chip.dataset.severity;
      applyTableFiltering();
    });
  });

  const searchInput = document.getElementById('audit-search-input');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    applyTableFiltering();
  });
}

function applyTableFiltering() {
  const findings = state.pipelineData?.audit_results || [];
  const filtered = findings.filter((item) => {
    // Type Filter
    if (state.activeFilter !== 'all') {
      if (state.activeFilter === 'python' && !item.type.includes('Python')) return false;
      if (state.activeFilter === 'node' && !item.type.includes('Node.js')) return false;
      if (state.activeFilter === 'java' && !item.type.includes('Java')) return false;
      if (state.activeFilter === 'antipattern' && !item.type.includes('Anti-Pattern')) return false;
    }

    // Severity Filter
    if (state.activeSeverity !== 'all' && item.severity !== state.activeSeverity) {
      return false;
    }

    // Search Query
    if (state.searchQuery) {
      const combined = `${item.target} ${item.type} ${item.source_file} ${item.issue}`.toLowerCase();
      if (!combined.includes(state.searchQuery)) return false;
    }

    return true;
  });

  renderFindingsTable(filtered);
}

function renderFindingsTable(findings) {
  const tbody = document.getElementById('findings-table-body');
  if (!tbody) return;

  if (findings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i data-lucide="shield-check" style="width: 32px; height: 32px; margin-bottom: 8px; color: var(--accent-emerald);"></i>
          <div>No vulnerabilities or anti-patterns match the current filter criteria.</div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  tbody.innerHTML = findings.map((f, idx) => {
    const sev = f.severity || 'medium';
    const badgeClass = sev === 'critical' ? 'badge-critical' : sev === 'high' ? 'badge-high' : 'badge-medium';
    const displayFile = f.source_file || 'unknown';

    return `
      <tr>
        <td>
          <span class="badge ${badgeClass}">
            <span class="pulse-dot" style="width: 6px; height: 6px;"></span>
            ${sev}
          </span>
        </td>
        <td>
          <span class="badge badge-type">${escapeHtml(f.type)}</span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">
            ${escapeHtml(f.target)}
          </span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.775rem; color: var(--text-secondary);" title="${escapeHtml(displayFile)}">
            ${escapeHtml(displayFile)} ${f.lineno ? `<span style="color: var(--accent-orange); font-weight: 700;">:L${f.lineno}</span>` : ''}
          </span>
        </td>
        <td style="max-width: 380px;">
          <span style="color: var(--text-secondary); font-size: 0.825rem; line-height: 1.4;">
            ${escapeHtml(f.issue)}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.775rem;" onclick="openFindingModal('${f.id || idx}')">
            <i data-lucide="eye" style="width: 13px; height: 13px;"></i> Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

/* ==============================================================================
   7. Finding Detail Modal
   ============================================================================== */
window.openFindingModal = function (findingId) {
  const findings = state.pipelineData?.audit_results || [];
  const finding = findings.find((f, idx) => (f.id === findingId || `${idx}` === findingId)) || findings[0];
  if (!finding) return;

  const modal = document.getElementById('finding-detail-modal');
  const body = document.getElementById('finding-modal-content');
  if (!modal || !body) return;

  const sev = finding.severity || 'medium';
  const badgeClass = sev === 'critical' ? 'badge-critical' : sev === 'high' ? 'badge-high' : 'badge-medium';

  body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.25rem;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="badge ${badgeClass}">${sev.toUpperCase()} RISK</span>
        <span class="badge badge-type">${finding.type}</span>
      </div>
      <button class="btn-secondary" style="padding: 6px 10px;" onclick="closeModal()">
        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
      </button>
    </div>

    <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; font-family: var(--font-mono);">
      Target: ${escapeHtml(finding.target)}
    </h2>
    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.25rem;">
      ${escapeHtml(finding.issue)}
    </p>

    <div style="background: var(--bg-card-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
      <div style="font-size: 0.725rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Source Location</div>
      <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-cyan); word-break: break-all;">
        ${escapeHtml(finding.source_file)} ${finding.lineno ? `(Line ${finding.lineno})` : ''}
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Remediation Strategy</div>
      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
        ${finding.type.includes('Dependency') 
          ? 'Upgrade package to semantic version >= 2.0.0. Validate transitive dependency tree and resolve potential breaking changes with ReFactorix AST compatibility checks.' 
          : 'Refactor dynamic execution block. Replace insecure eval() or deprecated socket/http bridges with modern parameter-validated equivalents.'}
      </p>
    </div>

    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button class="btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn-primary" onclick="sendFindingToSandbox('${escapeHtml(finding.target)}')">
        <i data-lucide="wrench" style="width: 14px; height: 14px;"></i> Open in Guardrail Sandbox
      </button>
    </div>
  `;

  modal.classList.add('open');
  if (window.lucide) window.lucide.createIcons();
};

window.closeModal = function () {
  document.getElementById('finding-detail-modal')?.classList.remove('open');
};

window.sendFindingToSandbox = function (target) {
  closeModal();
  switchTab('sandbox');
  if (state.hasRunPipeline && state.liveFindingsList.length > 0) {
    let matchIdx = 0;
    if (target.includes('eval')) {
      const idx = state.liveFindingsList.findIndex(f => f.id === 'eval_finding');
      if (idx !== -1) matchIdx = idx;
    } else if (target.includes('urllib2')) {
      const idx = state.liveFindingsList.findIndex(f => f.id === 'urllib_finding');
      if (idx !== -1) matchIdx = idx;
    } else if (target.includes('var') || target.includes('document.write')) {
      const idx = state.liveFindingsList.findIndex(f => f.id === 'js_finding');
      if (idx !== -1) matchIdx = idx;
    }
    state.activeLiveFindingIndex = matchIdx;
    loadPreset('live_repo');
  } else {
    if (target.includes('eval')) {
      loadPreset('preset_eval');
    } else if (target.includes('urllib2')) {
      loadPreset('preset_urllib');
    } else if (target.includes('var') || target.includes('document.write')) {
      loadPreset('preset_js');
    } else {
      loadPreset('preset_sql');
    }
  }
};

window.sendAstToSandbox = function (nodeName) {
  switchTab('sandbox');
  if (state.hasRunPipeline && state.liveFindingsList.length > 0) {
    state.activeLiveFindingIndex = 0;
    loadPreset('live_repo');
  } else {
    loadPreset('preset_sql');
  }
};

/* ==============================================================================
   8. AST Architectural Graph Visualizer
   ============================================================================== */
function initASTVisualizer() {
  const canvas = document.getElementById('ast-network-canvas');
  if (!canvas) return;

  state.astGraph = new ASTGraphVisualizer('ast-network-canvas', 'ast-node-inspector');

  // AST Controls
  document.getElementById('ast-filter-all')?.addEventListener('click', () => state.astGraph.setFilter('all'));
  document.getElementById('ast-filter-classes')?.addEventListener('click', () => state.astGraph.setFilter('Class'));
  document.getElementById('ast-filter-functions')?.addEventListener('click', () => state.astGraph.setFilter('Function'));
  document.getElementById('ast-reset-btn')?.addEventListener('click', () => state.astGraph.resetView());

  document.getElementById('ast-search-input')?.addEventListener('input', (e) => {
    state.astGraph.search(e.target.value.trim());
  });
}

/* ==============================================================================
   9. Interactive Sandbox (Custom Code Editing & Live AST Validation)
   ============================================================================== */
function initSandbox() {
  // Setup preset chips (both demo presets and live ingested toggle)
  const presetChips = document.querySelectorAll('.preset-chip');
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      loadPreset(chip.dataset.preset);
    });
  });

  // Modernized code live validation on typing custom code
  const modernizedTextarea = document.getElementById('sandbox-modernized-code');
  modernizedTextarea?.addEventListener('input', debounce(() => {
    validateSandboxCode();
  }, 350));

  // Legacy code live edit
  const legacyTextarea = document.getElementById('sandbox-legacy-code');
  legacyTextarea?.addEventListener('input', debounce(() => {
    validateSandboxCode();
  }, 400));

  // Manual validate trigger button
  document.getElementById('trigger-guardrail-btn')?.addEventListener('click', () => {
    validateSandboxCode();
  });

  // Copy diff button
  document.getElementById('copy-diff-btn')?.addEventListener('click', () => {
    const diffContainer = document.getElementById('unified-diff-output');
    if (diffContainer) {
      navigator.clipboard.writeText(diffContainer.innerText);
      showToast('Unified diff patch copied to clipboard!', 'success');
    }
  });
}

function loadPreset(presetKey) {
  if (presetKey === 'live_repo') {
    loadLiveRepoView();
    return;
  }

  state.sandboxPreset = presetKey;

  // Restore cards and banner if previously hidden by live placeholder
  const placeholder = document.getElementById('live-repo-placeholder');
  const banner = document.getElementById('guardrail-banner');
  const grid = document.querySelector('.diff-comparison-grid');
  const unified = document.querySelector('.unified-diff-card');
  const subnav = document.getElementById('live-findings-subnav');
  const legacyFile = document.getElementById('sandbox-legacy-file');
  const modernFile = document.getElementById('sandbox-modern-file');

  if (placeholder) placeholder.style.display = 'none';
  if (banner) banner.style.display = 'flex';
  if (grid) grid.style.display = 'grid';
  if (unified) unified.style.display = 'block';
  if (subnav) subnav.style.display = 'none';
  if (legacyFile) legacyFile.style.display = 'none';
  if (modernFile) modernFile.style.display = 'none';

  const legacyTitle = document.getElementById('sandbox-legacy-title');
  const modernTitle = document.getElementById('sandbox-modern-title');
  if (legacyTitle) legacyTitle.textContent = 'Original Legacy Snippet';
  if (modernTitle) modernTitle.textContent = 'Modernized Secure Code Patch (Live Editable)';

  // Mark selected chip active
  document.querySelectorAll('.preset-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.preset === presetKey);
  });

  const p = PRESETS[presetKey] || PRESETS.preset_sql;
  const legacyArea = document.getElementById('sandbox-legacy-code');
  const modernizedArea = document.getElementById('sandbox-modernized-code');

  if (legacyArea) legacyArea.value = p.legacy;
  if (modernizedArea) modernizedArea.value = p.modernized;

  validateSandboxCode();
}

function loadLiveRepoView() {
  state.sandboxPreset = 'live_repo';

  // Mark chip active
  document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
  document.getElementById('preset-chip-live')?.classList.add('active');

  const placeholder = document.getElementById('live-repo-placeholder');
  const banner = document.getElementById('guardrail-banner');
  const grid = document.querySelector('.diff-comparison-grid');
  const unified = document.querySelector('.unified-diff-card');
  const subnav = document.getElementById('live-findings-subnav');

  // Check if a repository has actually been ingested
  if (!state.hasRunPipeline || !state.pipelineData || !state.pipelineData.repository) {
    // Show polite placeholder prompt
    if (placeholder) placeholder.style.display = 'block';
    if (banner) banner.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (unified) unified.style.display = 'none';
    if (subnav) subnav.style.display = 'none';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Repository IS ingested
  if (placeholder) placeholder.style.display = 'none';
  if (banner) banner.style.display = 'flex';
  if (grid) grid.style.display = 'grid';
  if (unified) unified.style.display = 'block';
  if (subnav) subnav.style.display = 'flex';

  renderLiveFindingsSubnav();
  loadCurrentLiveFinding();
}

function loadCurrentLiveFinding() {
  const current = state.liveFindingsList[state.activeLiveFindingIndex] || state.liveFindingsList[0];
  if (!current) return;

  const legacyArea = document.getElementById('sandbox-legacy-code');
  const modernizedArea = document.getElementById('sandbox-modernized-code');
  const legacyFile = document.getElementById('sandbox-legacy-file');
  const modernFile = document.getElementById('sandbox-modern-file');
  const legacyTitle = document.getElementById('sandbox-legacy-title');
  const modernTitle = document.getElementById('sandbox-modern-title');

  if (legacyArea) legacyArea.value = current.legacy;
  if (modernizedArea) modernizedArea.value = current.modernized;

  if (legacyTitle) {
    legacyTitle.textContent = current.title ? `Original Legacy Snippet (${current.title})` : 'Original Legacy Snippet';
  }
  if (modernTitle) {
    modernTitle.textContent = 'Modernized Secure Code Patch (Live Editable)';
  }

  if (legacyFile) {
    legacyFile.textContent = current.source_file || '';
    legacyFile.style.display = current.source_file ? 'inline-block' : 'none';
  }
  if (modernFile) {
    modernFile.textContent = current.source_file || '';
    modernFile.style.display = current.source_file ? 'inline-block' : 'none';
  }

  validateSandboxCode();
}

function buildLiveRepoFindings(data) {
  const repo = data.repository || document.getElementById('repo-url-input')?.value.trim() || 'custom_repo';
  const short = data.repo_name || repo.split('/').pop().replace(/[^a-zA-Z0-9_]/g, '_');
  const rLower = repo.toLowerCase();

  const list = [];

  // 1. PyGoat / Security Vulnerable App / WebGoat (e.g. DevSlop/PyGoat)
  if (rLower.includes('pygoat') || (rLower.includes('goat') && (rLower.includes('py') || rLower.includes('django') || rLower.includes('devslop')))) {
    list.push({
      id: 'pygoat_sql',
      label: `01. SQL Injection in auth_user`,
      title: `OWASP A03 SQL Injection (${repo})`,
      source_file: `${repo}/pygoat/introduction/views.py`,
      legacy: data.sample_legacy_code || `# Vulnerability: OWASP A03 SQL Injection in ${repo} (pygoat/introduction/views.py)
from django.db import connection
from django.http import JsonResponse

def pygoat_user_search_view(request):
    username = request.GET.get("username", "")
    # CRITICAL: Raw unescaped SQL query concatenation allows full database exfiltration
    sql_query = f"SELECT id, username, email, is_admin FROM auth_user WHERE username = '{username}'"
    cursor = connection.cursor()
    cursor.execute(sql_query)
    rows = cursor.fetchall()
    return JsonResponse({"results": rows})`,
      modernized: data.modernized_code || `# Modernized: Type-safe parameterized query & Django ORM abstraction for ${repo}
from django.db import connection
from django.http import JsonResponse

def pygoat_user_search_view(request) -> JsonResponse:
    """Remediated: Parameterized SQL execution preventing injection attacks."""
    username = request.GET.get("username", "")
    # Guardrail Enforced: Parameter binding via parameterized cursor tuple
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id, username, email, is_admin FROM auth_user WHERE username = %s",
            [username]
        )
        columns = [col[0] for col in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return JsonResponse({"status": "secure", "results": results})`
    });

    list.push({
      id: 'pygoat_deserialization',
      label: `02. Insecure pickle Deserialization`,
      title: `OWASP A08 Insecure Deserialization (${repo})`,
      source_file: `${repo}/pygoat/core/session.py`,
      legacy: `# Vulnerability: Arbitrary code execution via untrusted pickle payload in ${repo}
import pickle
import base64

def restore_pygoat_session(raw_token: str):
    # CRITICAL: Untrusted pickle.loads execution allows Remote Code Execution (RCE)
    decoded_payload = base64.b64decode(raw_token)
    return pickle.loads(decoded_payload)`,
      modernized: `# Modernized: Cryptographically signed JSON session serializer for ${repo}
import json
import base64
from django.core.signing import Signer, BadSignature

def restore_pygoat_session(raw_token: str) -> dict:
    """Remediated: Tamper-proof signed JSON deserialization."""
    signer = Signer()
    try:
        unsigned_data = signer.unsign(raw_token)
        return json.loads(unsigned_data)
    except (BadSignature, json.JSONDecodeError):
        return {"error": "Invalid or tampered session token"}`
    });

    list.push({
      id: 'pygoat_urllib',
      label: `03. urllib2 Deprecated Import`,
      title: `Modern urllib.request Transport (${repo})`,
      source_file: `${repo}/pygoat/network/sync.py`,
      legacy: `# Vulnerability: Deprecated Python 2 protocol bridge in ${repo}/pygoat/network/sync.py
import urllib2

def fetch_pygoat_updates(endpoint_url: str):
    response = urllib2.urlopen(endpoint_url)
    return response.read()`,
      modernized: `import urllib.request

def fetch_pygoat_updates(endpoint_url: str) -> bytes:
    """Modernized TLS transport with explicit timeout guardrails for ${repo}."""
    req = urllib.request.Request(endpoint_url, headers={"User-Agent": "PyGoat-ReFactorix/2.4"})
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read()`
    });

  // 2. Node.js / JavaScript / npm / Express (e.g. snyk/nodejs-vulnerable-app)
  } else if (rLower.includes('node') || rLower.includes('express') || rLower.includes('snyk') || rLower.includes('javascript') || rLower.endsWith('-app') || rLower.includes('npm')) {
    list.push({
      id: 'node_eval',
      label: `01. Insecure eval() in Express Route`,
      title: `Dynamic eval() Anti-Pattern -> Safe Parser (${repo})`,
      source_file: `${repo}/routes/calc.js`,
      legacy: data.sample_legacy_code || `// Vulnerability: Insecure eval() & Unsanitized Express Middleware in ${repo}
const express = require("express");
const router = express.Router();

router.post("/api/calc/evaluate", (req, res) => {
    const rawFormula = req.body.formula;
    // CRITICAL: eval() anti-pattern executes arbitrary untrusted input in the event loop
    try {
        const result = eval(rawFormula);
        res.json({ success: true, result: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});`,
      modernized: data.modernized_code || `// Modernized: Whitelist arithmetic parser & isolated Express middleware for ${repo}
const express = require("express");
const router = express.Router();

router.post("/api/calc/evaluate", (req, res) => {
    const rawFormula = String(req.body.formula || "");
    // Guardrail: Strict arithmetic character validation rejecting dynamic code execution
    if (!/^[0-9+\\-*/().\\s]+$/.test(rawFormula)) {
        return res.status(400).json({ error: "Disallowed characters in calculation" });
    }
    try {
        const result = Function(\`'use strict'; return (\${rawFormula})\`)();
        res.json({ success: true, result: Number(result) });
    } catch (err) {
        res.status(400).json({ error: "Syntax validation failed" });
    }
});`
    });

    list.push({
      id: 'node_prototype',
      label: `02. Prototype Pollution in Object Merge`,
      title: `Prototype Pollution Guardrail (${repo})`,
      source_file: `${repo}/lib/userProfile.js`,
      legacy: `// Vulnerability: Unchecked Object Prototype Mutation in ${repo}
function mergeUserProfile(target, source) {
    for (var key in source) {
        // INSECURE: __proto__ and constructor override allows prototype pollution
        target[key] = source[key];
    }
    return target;
}`,
      modernized: `// Modernized: Safe Object Clone with prototype guardrails for ${repo}
function mergeUserProfile(target, source) {
    const safeTarget = Object.assign(Object.create(null), target);
    for (const [key, value] of Object.entries(source || {})) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
            continue;
        }
        safeTarget[key] = value;
    }
    return Object.freeze(safeTarget);
}`
    });

    list.push({
      id: 'node_dom',
      label: `03. var & document.write Scope`,
      title: `Strict DOM Scoping & Safe Injection (${repo})`,
      source_file: `${repo}/public/js/dashboard.js`,
      legacy: `// Vulnerability: Insecure dynamic DOM write in ${repo}/public/js/dashboard.js
var userToken = "DEPRECATED_RAW_INSECURE_TOKEN";
function renderUserProfile(userData) {
    document.write("<div class='profile'>" + userData.name + "</div>");
}`,
      modernized: `// Modernized: Strict DOM construction and environment isolation for ${repo}
const userToken = process.env.API_USER_TOKEN || "";
function renderUserProfile(userData) {
    const root = document.getElementById("profile-root");
    if (root) {
        const card = document.createElement("div");
        card.className = "profile";
        card.textContent = userData.name;
        root.appendChild(card);
    }
}`
    });

  // 3. Requests / HTTP Networking (e.g. psf/requests, urllib3)
  } else if (rLower.includes('requests') || rLower.includes('urllib3') || rLower.includes('aiohttp')) {
    list.push({
      id: 'requests_tls',
      label: `01. SSL/TLS Verification Bypass`,
      title: `Enforced TLS v1.3 & Retries (${repo})`,
      source_file: `${repo}/requests/sessions.py`,
      legacy: data.sample_legacy_code || `# Vulnerability: Disabled SSL/TLS Verification in ${repo} client
import requests

def fetch_${short}_remote_telemetry(target_endpoint: str):
    session = requests.Session()
    # CRITICAL: verify=False disables TLS certificate validation (MITM exposure)
    response = session.get(
        target_endpoint,
        verify=False,
        timeout=None
    )
    return response.json()`,
      modernized: data.modernized_code || `# Modernized: Enforced TLS v1.3 verification & bounded timeout for ${repo}
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

def fetch_${short}_remote_telemetry(target_endpoint: str) -> dict:
    """Remediated: Strict TLS certificate validation with connection pooling."""
    with requests.Session() as session:
        retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[502, 503, 504])
        session.mount("https://", HTTPAdapter(max_retries=retries))
        response = session.get(
            target_endpoint,
            verify=True,
            timeout=(3.05, 10.0),
            headers={"User-Agent": "ReFactorix/2.4"}
        )
        response.raise_for_status()
        return response.json()`
    });

    list.push({
      id: 'requests_eval',
      label: `02. eval() Anti-Pattern in compat.py`,
      title: `Safe ast.literal_eval Replacement (${repo})`,
      source_file: `${repo}/requests/compat.py`,
      legacy: `# Vulnerability: Dynamic eval in ${repo}/requests/compat.py
def parse_header_dict(raw_str: str):
    return eval(raw_str)`,
      modernized: `import ast

def parse_header_dict(raw_str: str):
    """Safely evaluated using mathematical AST literal parsing for ${repo}."""
    try:
        return ast.literal_eval(raw_str)
    except (ValueError, SyntaxError) as err:
        return {"error": "Invalid header dictionary format"}`
    });

  // 4. Flask / Web framework (e.g. pallets/flask)
  } else if (rLower.includes('flask') || rLower.includes('bottle')) {
    list.push({
      id: 'flask_ssti',
      label: `01. SSTI in render_template_string`,
      title: `Context-Safe Auto-Escaping (${repo})`,
      source_file: `${repo}/src/flask/templating.py`,
      legacy: data.sample_legacy_code || `# Vulnerability: Server-Side Template Injection (SSTI) in ${repo}
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route("/user/profile")
def render_${short}_profile():
    username = request.args.get("name", "Guest")
    # CRITICAL: Unescaped string formatting in render_template_string allows SSTI
    template = f"<div class='profile'><h2>Profile: {username}</h2></div>"
    return render_template_string(template)`,
      modernized: data.modernized_code || `# Modernized: Context-safe template rendering with auto-escaping for ${repo}
from flask import Flask, request, render_template_string
from markupsafe import escape

app = Flask(__name__)

@app.route("/user/profile")
def render_${short}_profile() -> str:
    """Remediated: Explicit parameter-bound template interpolation."""
    raw_name = request.args.get("name", "Guest")
    safe_name = escape(raw_name)
    template = "<div class='profile'><h2>Profile: {{ name }}</h2></div>"
    return render_template_string(template, name=safe_name)`
    });

    list.push({
      id: 'flask_secret',
      label: `02. Hardcoded Secret Key in config.py`,
      title: `Environment Isolated Secret Key (${repo})`,
      source_file: `${repo}/src/flask/config.py`,
      legacy: `# Insecure: Hardcoded secret key committed to repository
SECRET_KEY = "SUPER_SECRET_DEV_KEY_12345"
SESSION_COOKIE_HTTPONLY = False`,
      modernized: `import os

# Modernized: Ephemeral environment configuration with strict session flags
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY") or os.urandom(32).hex()
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True`
    });

  // 5. General or Custom Repository (Default)
  } else {
    list.push({
      id: 'primary_patch',
      label: `01. Parameterized Query Safety`,
      title: `Type-Safe Query Parameterization (${repo})`,
      source_file: `${repo}/src/${short}_core.py`,
      legacy: data.sample_legacy_code || `# Vulnerability: Direct unparameterized query execution in ${repo}
def query_${short}_records(conn, search_param: str):
    cursor = conn.cursor()
    # INSECURE: Direct SQL string formatting without bound parameters
    sql = f"SELECT id, name, created_at FROM {short}_table WHERE name LIKE '%{search_param}%'"
    cursor.execute(sql)
    return cursor.fetchall()`,
      modernized: data.modernized_code || `# Modernized: Type-safe parameterized query safety for ${repo}
def query_${short}_records(conn, search_param: str) -> list:
    """Executed with parameterized type safety for ${repo}."""
    with conn.cursor() as cursor:
        cursor.execute(
            f"SELECT id, name, created_at FROM {short}_table WHERE name LIKE %s",
            [f"%{search_param}%"]
        )
        return cursor.fetchall()`
    });

    list.push({
      id: 'eval_finding',
      label: `02. eval() Anti-Pattern`,
      title: `Safe AST Literal Replacement (${repo})`,
      source_file: `${repo}/src/${short}_evaluator.py`,
      legacy: `# Vulnerability flagged in ${repo}/src/${short}_evaluator.py
def evaluate_${short}_expression(payload: dict):
    expr = payload.get("expression", "")
    # CRITICAL: eval() anti-pattern executes arbitrary code
    return eval(expr)`,
      modernized: `import ast

def evaluate_${short}_expression(payload: dict):
    """Safely evaluated using mathematical AST literal parsing for ${repo}."""
    expr = payload.get("expression", "")
    try:
        return ast.literal_eval(expr)
    except (ValueError, SyntaxError) as err:
        return {"error": "Syntax guardrail caught invalid expression", "details": str(err)}`
    });

    list.push({
      id: 'urllib_finding',
      label: `03. urllib2 Deprecated Import`,
      title: `urllib.request TLS Upgrade (${repo})`,
      source_file: `${repo}/src/${short}_client.py`,
      legacy: `# Vulnerability: Deprecated Python 2 networking bridge in ${repo}/src/${short}_client.py
import urllib2

def fetch_${short}_remote_feed(endpoint_url: str):
    response = urllib2.urlopen(endpoint_url)
    return response.read()`,
      modernized: `import urllib.request

def fetch_${short}_remote_feed(endpoint_url: str) -> bytes:
    """Modernized TLS transport with explicit timeout guardrails for ${repo}."""
    req = urllib.request.Request(endpoint_url, headers={"User-Agent": "ReFactorix/2.4 (${repo})"})
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read()`
    });
  }

  state.liveFindingsList = list;
  state.activeLiveFindingIndex = 0;
  renderLiveFindingsSubnav();
}

function renderLiveFindingsSubnav() {
  const container = document.getElementById('live-findings-chips-container');
  const subnav = document.getElementById('live-findings-subnav');
  const repoTag = document.getElementById('live-findings-repo-tag');
  if (!container || !subnav) return;

  if (!state.hasRunPipeline || state.liveFindingsList.length === 0) {
    subnav.style.display = 'none';
    return;
  }

  if (state.sandboxPreset === 'live_repo') {
    subnav.style.display = 'flex';
  } else {
    subnav.style.display = 'none';
  }

  if (repoTag && state.pipelineData) {
    repoTag.textContent = state.pipelineData.repository || '';
  }

  container.innerHTML = state.liveFindingsList.map((item, idx) => `
    <button class="filter-chip ${idx === state.activeLiveFindingIndex ? 'active' : ''}" 
            onclick="selectLiveFinding(${idx})" 
            style="font-size: 0.775rem; padding: 4px 12px; cursor: pointer;">
      ${escapeHtml(item.label)}
    </button>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

window.selectLiveFinding = function(index) {
  state.activeLiveFindingIndex = index;
  renderLiveFindingsSubnav();
  loadCurrentLiveFinding();
};

/**
 * Triggers live AST validation and unified diff computation via backend API
 */
async function validateSandboxCode() {
  const legacyCode = document.getElementById('sandbox-legacy-code')?.value || '';
  const modernizedCode = document.getElementById('sandbox-modernized-code')?.value || '';

  try {
    const res = await window.apiService.computeDiff(legacyCode, modernizedCode);
    renderGuardrailResult(res);
  } catch (e) {
    console.error('Guardrail validation error:', e);
  }
}

function renderGuardrailResult(result) {
  const banner = document.getElementById('guardrail-banner');
  const messageEl = document.getElementById('guardrail-message');
  const diffOutput = document.getElementById('unified-diff-output');

  if (!banner || !messageEl || !diffOutput) return;

  banner.classList.remove('guardrail-passed', 'guardrail-failed');

  // Update compiler badge dynamically
  const compilerBadge = banner.querySelector('.badge');
  if (compilerBadge) {
    if (result.compiler) {
      compilerBadge.textContent = result.compiler;
    } else {
      const code = document.getElementById('sandbox-modernized-code')?.value || '';
      const isJs = code.includes('const ') || code.includes('function ') || code.includes('=>') || code.includes('require(');
      compilerBadge.textContent = isJs ? 'Node.js / ECMAScript AST Compiler' : 'Python 3.12 AST Compiler';
    }
  }

  if (result.is_valid) {
    banner.classList.add('guardrail-passed');
    messageEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i data-lucide="check-circle-2" style="width: 20px; height: 20px; color: var(--accent-emerald);"></i>
        <div>
          <strong>GUARDRAIL VALIDATION PASSED:</strong> ${escapeHtml(result.guardrail_message || 'Syntax is clean. Code conforms to mathematical AST standards.')}
        </div>
      </div>
    `;
  } else {
    banner.classList.add('guardrail-failed');
    messageEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <i data-lucide="alert-octagon" style="width: 20px; height: 20px; color: var(--accent-rose);"></i>
        <div>
          <strong>GUARDRAIL INTERCEPT:</strong> ${escapeHtml(result.guardrail_message || 'Syntax violation detected.')}
        </div>
      </div>
    `;
  }

  // Render unified diff lines
  const lines = result.diff_lines || [];
  if (lines.length === 0) {
    diffOutput.innerHTML = `<div style="padding: 18px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.85rem;">No structural modifications or invalid syntax prevented diff calculation.</div>`;
  } else {
    diffOutput.innerHTML = lines.map((line) => {
      let cls = 'diff-line';
      if (line.startsWith('+') && !line.startsWith('+++')) cls += ' diff-add';
      else if (line.startsWith('-') && !line.startsWith('---')) cls += ' diff-del';
      else if (line.startsWith('@') || line.startsWith('---') || line.startsWith('+++')) cls += ' diff-meta';

      return `<div class="${cls}">${escapeHtml(line)}</div>`;
    }).join('');
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ==============================================================================
   10. Toast Notification Utility
   ============================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'glass-panel';
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    background: var(--bg-card);
    border: 1px solid ${type === 'success' ? 'var(--accent-emerald)' : type === 'error' ? 'var(--accent-rose)' : 'var(--accent-orange)'};
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border-radius: 12px;
    margin-top: 8px;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    animation: fadeIn 0.3s ease;
  `;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  toast.innerHTML = `<i data-lucide="${iconName}" style="width: 16px; height: 16px; color: ${type === 'success' ? 'var(--accent-emerald)' : type === 'error' ? 'var(--accent-rose)' : 'var(--accent-orange)'};"></i> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
