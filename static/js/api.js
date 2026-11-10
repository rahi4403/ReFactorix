/**
 * ReFactorix API Service Client
 * Directly connects the frontend to the Python FastAPI backend engine.
 */

const API_CONFIG = {
  // Live FastAPI backend URL (defaults to current origin or http://localhost:8000)
  BASE_URL: (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file')) 
    ? window.location.origin 
    : 'http://localhost:8000',
  ENDPOINTS: {
    MODERNIZE: '/api/modernize',
    PIPELINE_RUN: '/api/pipeline/run',
    STATUS: '/api/status',
    GUARDRAIL: '/api/guardrail/validate',
    DIFF: '/api/diff',
    AUDIT: '/api/audit',
    AST: '/api/ast'
  }
};

const apiService = {
  /**
   * Triggers the full autonomous modernization pipeline on a public GitHub repo or local target.
   * Calls fetch('http://localhost:8000/api/modernize', { method: 'POST', body: JSON.stringify({ repoUrl }) })
   * @param {string} repoUrl - Public GitHub repository URL (or empty for local demo target)
   * @param {boolean} useSample - Force demo target if true
   */
  async modernize(repoUrl, useSample = false) {
    const payload = {
      repoUrl: repoUrl || '',
      repo_url: repoUrl || '',
      use_sample: Boolean(useSample)
    };

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MODERNIZE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Modernization pipeline failed [HTTP ${response.status}]: ${errText}`);
    }

    return await response.json();
  },

  /**
   * Validates Python syntax using the backend AST safety guardrail.
   * @param {string} code - Python code string to parse and validate
   */
  async validateGuardrail(code) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GUARDRAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code || '' })
    });

    if (!response.ok) {
      throw new Error(`Guardrail check failed: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Computes unified RFC diff and validates modernized code syntax.
   * @param {string} originalCode
   * @param {string} modernizedCode
   */
  async computeDiff(originalCode, modernizedCode) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DIFF}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_code: originalCode || '',
        modernized_code: modernizedCode || ''
      })
    });

    if (!response.ok) {
      throw new Error(`Diff computation failed: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Fetches backend health and active directory status.
   */
  async getStatus() {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STATUS}`);
    return await response.json();
  }
};

window.apiService = apiService;
window.API_CONFIG = API_CONFIG;

