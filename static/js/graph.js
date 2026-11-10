/**
 * ReFactorix AST Interactive Force-Directed Graph Engine
 * Renders node-based relationship maps for classes and functions
 */

class ASTGraphVisualizer {
  constructor(canvasId, inspectorId) {
    this.canvas = document.getElementById(canvasId);
    this.inspector = document.getElementById(inspectorId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.links = [];
    this.selectedNode = null;
    this.hoveredNode = null;

    // Camera transform
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.draggedNode = null;
    this.lastMouse = { x: 0, y: 0 };

    this.filterType = 'all'; // 'all', 'Class', 'Function'
    this.searchTerm = '';
    this.physicsActive = true;

    this.initCanvas();
    this.setupEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initCanvas() {
    const parent = this.canvas.parentElement;
    this.width = this.canvas.width = parent.offsetWidth;
    this.height = this.canvas.height = parent.offsetHeight;
    this.panX = this.width / 2;
    this.panY = this.height / 2;
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = this.canvas.width = parent.offsetWidth;
    this.height = this.canvas.height = parent.offsetHeight;
  }

  loadData(rawAstNodes) {
    this.nodes = [];
    this.links = [];

    if (!rawAstNodes || rawAstNodes.length === 0) {
      return;
    }

    // Map files into cluster hubs
    const fileHubs = new Map();
    const classNodes = new Map();

    rawAstNodes.forEach((item, idx) => {
      const fileKey = item.file || 'main.py';
      const shortFile = fileKey.split(/[\\/]/).pop();

      if (!fileHubs.has(fileKey)) {
        const hub = {
          id: `file_${fileHubs.size}`,
          name: shortFile,
          fullName: fileKey,
          type: 'File',
          x: (Math.random() - 0.5) * 300,
          y: (Math.random() - 0.5) * 300,
          vx: 0,
          vy: 0,
          radius: 18,
          color: '#64748B',
          glow: 'rgba(100, 116, 139, 0.4)'
        };
        fileHubs.set(fileKey, hub);
        this.nodes.push(hub);
      }

      const isClass = item.type === 'Class';
      const node = {
        id: `ast_${idx}`,
        name: item.name,
        type: item.type,
        file: item.file,
        lineno: item.lineno,
        x: (Math.random() - 0.5) * 450,
        y: (Math.random() - 0.5) * 450,
        vx: 0,
        vy: 0,
        radius: isClass ? 15 : 10,
        color: isClass ? '#FF5B26' : '#00F2FE',
        glow: isClass ? 'rgba(255, 91, 38, 0.6)' : 'rgba(0, 242, 254, 0.5)'
      };

      this.nodes.push(node);

      if (isClass) {
        classNodes.set(`${fileKey}::${item.name}`, node);
      }

      // Link node to file hub
      this.links.push({
        source: node,
        target: fileHubs.get(fileKey),
        length: isClass ? 80 : 120
      });
    });

    // Interconnect some functions to classes
    this.nodes.forEach((n) => {
      if (n.type === 'Function') {
        // Find if there's a class in the same file
        for (let [k, cNode] of classNodes.entries()) {
          if (cNode.file === n.file) {
            this.links.push({
              source: n,
              target: cNode,
              length: 60
            });
            break;
          }
        }
      }
    });

    if (this.nodes.length > 0) {
      this.selectNode(this.nodes[0]);
    }
  }

  setupEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getCanvasPos(e);
      const clicked = this.findNodeAt(pos.x, pos.y);

      if (clicked) {
        this.draggedNode = clicked;
        this.selectNode(clicked);
      } else {
        this.isDragging = true;
      }
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };

      if (this.draggedNode) {
        this.draggedNode.x += dx / this.scale;
        this.draggedNode.y += dy / this.scale;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
      } else if (this.isDragging) {
        this.panX += dx;
        this.panY += dy;
      } else {
        const pos = this.getCanvasPos(e);
        this.hoveredNode = this.findNodeAt(pos.x, pos.y);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.draggedNode = null;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.scale = Math.min(Math.max(this.scale * zoomFactor, 0.3), 3.5);
    });
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    return {
      x: (mouseX - this.panX) / this.scale,
      y: (mouseY - this.panY) / this.scale
    };
  }

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (!this.isNodeVisible(n)) continue;
      const dx = n.x - x;
      const dy = n.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 6) {
        return n;
      }
    }
    return null;
  }

  isNodeVisible(node) {
    if (this.filterType !== 'all') {
      if (this.filterType === 'Class' && node.type !== 'Class') return false;
      if (this.filterType === 'Function' && node.type !== 'Function') return false;
    }
    if (this.searchTerm) {
      return node.name.toLowerCase().includes(this.searchTerm.toLowerCase());
    }
    return true;
  }

  selectNode(node) {
    this.selectedNode = node;
    this.renderInspector(node);
  }

  renderInspector(node) {
    if (!this.inspector || !node) return;

    const isLight = document.body.classList.contains('light-theme');
    const badgeColor = node.type === 'Class' ? 'var(--accent-orange)' : node.type === 'Function' ? 'var(--accent-cyan)' : 'var(--text-muted)';

    this.inspector.innerHTML = `
      <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: ${badgeColor}; letter-spacing: 0.08em;">
            AST ${node.type} Node
          </span>
          <span class="badge badge-medium">Verified</span>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); font-family: var(--font-mono); word-break: break-all;">
          ${node.name}
        </h3>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;">
        <div>
          <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Source File</div>
          <div style="color: var(--text-secondary); font-family: var(--font-mono); word-break: break-all; margin-top: 2px;">
            ${node.file || 'sample_repo/legacy_service.py'}
          </div>
        </div>

        ${node.lineno ? `
        <div>
          <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">AST Line Location</div>
          <div style="color: var(--text-primary); font-weight: 700; margin-top: 2px;">
            Line ${node.lineno}
          </div>
        </div>
        ` : ''}

        <div>
          <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Structural Assessment</div>
          <p style="color: var(--text-secondary); font-size: 0.8rem; line-height: 1.5; margin-top: 4px;">
            Decompiled via Python 3.12 ast parser. Mapped into dependency topology. Ready for deterministic guardrail refactoring.
          </p>
        </div>

        <div style="margin-top: 1rem; padding: 12px; background: var(--bg-card-elevated); border-radius: 12px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">NODE CODE SIGNATURE</div>
          <pre style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-cyan); overflow-x: auto;"><code>${node.type === 'Class' ? `class ${node.name}:` : `def ${node.name}(*args, **kwargs):`}
    """AST Block definition"""
    ...</code></pre>
        </div>

        <button class="btn-primary" style="margin-top: 0.5rem; width: 100%; font-size: 0.85rem; padding: 10px;" onclick="window.sendAstToSandbox('${node.name}')">
          <i data-lucide="play" style="width: 14px; height: 14px;"></i> Inspect in Sandbox
        </button>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const isLight = document.body.classList.contains('light-theme');

    if (this.nodes.length === 0) {
      // Draw elegant awaiting state
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = isLight ? '#0F172A' : 'rgba(248, 250, 252, 0.9)';
      this.ctx.font = "600 14px 'Plus Jakarta Sans', sans-serif";
      this.ctx.fillText('Awaiting AST Codebase Ingestion...', this.width / 2, this.height / 2 - 10);
      this.ctx.fillStyle = isLight ? '#334155' : 'rgba(148, 163, 184, 0.8)';
      this.ctx.font = "400 12px 'JetBrains Mono', monospace";
      this.ctx.fillText('Submit a public repository URL or sample above to generate live AST graph', this.width / 2, this.height / 2 + 15);
      this.ctx.restore();
      requestAnimationFrame(this.animate);
      return;
    }

    // Run simple force simulation
    if (this.physicsActive) {
      this.updatePhysics();
    }

    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);

    // Draw Links
    this.links.forEach((l) => {
      if (!this.isNodeVisible(l.source) || !this.isNodeVisible(l.target)) return;

      this.ctx.beginPath();
      this.ctx.moveTo(l.source.x, l.source.y);
      this.ctx.lineTo(l.target.x, l.target.y);
      this.ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    // Draw Nodes
    this.nodes.forEach((n) => {
      if (!this.isNodeVisible(n)) return;

      const isSelected = this.selectedNode === n;
      const isHovered = this.hoveredNode === n;

      this.ctx.save();

      // Glow effect for selected/hovered nodes
      if (isSelected || isHovered) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = n.color;
      }

      this.ctx.beginPath();
      if (n.type === 'Class') {
        // Draw diamond / hexagon for classes
        const s = n.radius * 1.3;
        this.ctx.moveTo(n.x, n.y - s);
        this.ctx.lineTo(n.x + s, n.y);
        this.ctx.lineTo(n.x, n.y + s);
        this.ctx.lineTo(n.x - s, n.y);
        this.ctx.closePath();
      } else {
        // Circle for functions & files
        this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      }

      this.ctx.fillStyle = n.color;
      this.ctx.fill();

      if (isSelected) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = isLight ? '#0F172A' : '#FFFFFF';
        this.ctx.stroke();
      }

      this.ctx.restore();

      // Label text
      this.ctx.font = `${Math.max(10, 11)}px 'JetBrains Mono', monospace`;
      this.ctx.fillStyle = isSelected
        ? (isLight ? '#0F172A' : '#FFFFFF')
        : (isLight ? '#0F172A' : 'rgba(248, 250, 252, 0.85)');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(n.name, n.x, n.y + n.radius + 14);
    });

    this.ctx.restore();
    requestAnimationFrame(this.animate);
  }

  updatePhysics() {
    const kRepel = 2500;
    const damping = 0.88;

    // Repulsion between nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 300) {
          const force = kRepel / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // Spring attraction along links
    this.links.forEach((l) => {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - l.length;
      const force = displacement * 0.04;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      l.source.vx += fx;
      l.source.vy += fy;
      l.target.vx -= fx;
      l.target.vy -= fy;
    });

    // Center gravity
    this.nodes.forEach((n) => {
      if (n === this.draggedNode) return;
      n.vx += -n.x * 0.005;
      n.vy += -n.y * 0.005;

      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    });
  }

  setFilter(type) {
    this.filterType = type;
  }

  search(term) {
    this.searchTerm = term;
    if (term) {
      const match = this.nodes.find((n) => n.name.toLowerCase().includes(term.toLowerCase()));
      if (match) {
        this.selectNode(match);
      }
    }
  }

  resetView() {
    this.scale = 1;
    this.panX = this.width / 2;
    this.panY = this.height / 2;
  }
}

window.ASTGraphVisualizer = ASTGraphVisualizer;

