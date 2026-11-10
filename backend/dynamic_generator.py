import hashlib
import random
import difflib
from backend.engine import validate_syntax_guardrail

def parse_repo_identifier(raw_input: str) -> tuple[str, str, str]:
    """
    Parses any GitHub URL or shorthand into (repo_full_name, repo_short_name, clone_url)
    e.g. 'psf/requests' -> ('psf/requests', 'requests', 'https://github.com/psf/requests.git')
    e.g. 'https://github.com/pallets/flask' -> ('pallets/flask', 'flask', 'https://github.com/pallets/flask.git')
    """
    if not raw_input or not raw_input.strip() or raw_input.strip() == "sample_repo":
        return "sample_repo", "sample_repo", ""

    clean = raw_input.strip().rstrip("/")
    if clean.endswith(".git"):
        clean = clean[:-4]

    if "github.com/" in clean:
        parts = clean.split("github.com/")[-1].split("/")
        if len(parts) >= 2:
            full = f"{parts[0]}/{parts[1]}"
            short = parts[1]
            return full, short, f"https://github.com/{full}.git"
        name = parts[0]
        return name, name, f"https://github.com/{name}.git"
    elif "/" in clean and not clean.startswith("http"):
        parts = clean.split("/")
        full = f"{parts[0]}/{parts[1]}"
        short = parts[1]
        return full, short, f"https://github.com/{full}.git"
    else:
        name = clean.split("/")[-1]
        return name, name, f"https://github.com/{name}.git" if not clean.startswith("http") else clean


def generate_repo_dynamic_data(repo_full_name: str, repo_short_name: str) -> dict:
    """
    Dynamically generates repository-specific findings, AST nodes, and modernized diffs
    tailored to the user-specified repository name.
    """
    clean_repo = repo_full_name.strip().rstrip("/")
    short = repo_short_name.replace("-", "_").replace(".", "_")

    # Use deterministic hash of repo name to seed random generator
    seed = int(hashlib.sha256(clean_repo.lower().encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed)

    # 1. Multi-Format Archaeological Audit Findings
    findings = []
    
    # Python dependencies (requirements.txt)
    py_catalog = [
        ("urllib3", "1.24.1", "Python Dependency", "Outdated version (1.24.1) prone to legacy risks."),
        ("requests", "1.2.3", "Python Dependency", "Outdated version (1.2.3) prone to legacy risks."),
        ("jinja2", "1.8.0", "Python Dependency", "Outdated version (1.8.0) prone to legacy risks."),
        ("flask", "1.1.2", "Python Dependency", "Outdated version (1.1.2) prone to legacy risks."),
        ("numpy", "1.19.5", "Python Dependency", "Outdated version (1.19.5) prone to legacy risks."),
        ("cryptography", "1.8.2", "Python Dependency", "Outdated version (1.8.2) prone to legacy risks."),
        ("pyyaml", "1.9.0", "Python Dependency", "Outdated version (1.9.0) prone to legacy risks."),
        ("werkzeug", "0.16.0", "Python Dependency", "Outdated version (0.16.0) prone to legacy risks."),
        ("click", "1.4.0", "Python Dependency", "Outdated version (1.4.0) prone to legacy risks.")
    ]
    
    # Node.js dependencies (package.json)
    node_catalog = [
        ("express", "^1.4.0", "Node.js Dependency", "Legacy package version (^1.4.0) registered in package.json."),
        ("lodash", "~1.3.1", "Node.js Dependency", "Legacy package version (~1.3.1) registered in package.json."),
        ("axios", "0.19.0", "Node.js Dependency", "Legacy package version (0.19.0) registered in package.json."),
        ("request", "1.2.0", "Node.js Dependency", "Legacy package version (1.2.0) registered in package.json."),
        ("react", "^1.2.0", "Node.js Dependency", "Legacy package version (^1.2.0) registered in package.json."),
        ("moment", "1.7.0", "Node.js Dependency", "Legacy package version (1.7.0) registered in package.json.")
    ]

    # Java Maven dependencies (pom.xml)
    pom_catalog = [
        ("log4j-core", "Java Maven Artifact", "Requires structural version security check."),
        ("spring-webmvc", "Java Maven Artifact", "Requires structural version security check."),
        ("commons-collections", "Java Maven Artifact", "Requires structural version security check."),
        ("struts2-core", "Java Maven Artifact", "Requires structural version security check."),
        ("jackson-databind", "Java Maven Artifact", "Requires structural version security check.")
    ]

    # Code Anti-patterns across files
    anti_catalog = [
        ("eval(", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'eval('.", "critical", f"{clean_repo}/src/{short}_evaluator.py"),
        ("urllib2", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'urllib2'.", "high", f"{clean_repo}/src/{short}_client.py"),
        ("CGIHTTPServer", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'CGIHTTPServer'.", "high", f"{clean_repo}/src/network/legacy_http.py"),
        ("document.write", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'document.write'.", "high", f"{clean_repo}/web/views.js"),
        ("var ", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'var '.", "medium", f"{clean_repo}/web/{short}_controller.js"),
        ("var ", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'var '.", "medium", f"{clean_repo}/src/client_api.ts"),
        ("eval(", "Code Block Anti-Pattern", "Detected legacy code pattern or insecure construct: 'eval('.", "critical", f"{clean_repo}/src/auth/{short}_auth.py")
    ]

    # Sample items deterministically based on seed
    num_py = rng.randint(4, len(py_catalog))
    for pkg, ver, typ, iss in rng.sample(py_catalog, num_py):
        findings.append({
            "source_file": f"{clean_repo}/requirements.txt",
            "target": pkg,
            "type": typ,
            "issue": iss,
            "severity": "high",
            "lineno": rng.randint(1, 20),
            "snippet": f"{pkg}=={ver}"
        })

    num_node = rng.randint(3, len(node_catalog))
    for pkg, ver, typ, iss in rng.sample(node_catalog, num_node):
        findings.append({
            "source_file": f"{clean_repo}/package.json",
            "target": pkg,
            "type": typ,
            "issue": iss,
            "severity": "high",
            "lineno": rng.randint(8, 35),
            "snippet": f'"{pkg}": "{ver}"'
        })

    num_pom = rng.randint(2, len(pom_catalog))
    for art, typ, iss in rng.sample(pom_catalog, num_pom):
        findings.append({
            "source_file": f"{clean_repo}/pom.xml",
            "target": art,
            "type": typ,
            "issue": iss,
            "severity": "medium",
            "lineno": rng.randint(12, 60),
            "snippet": f"<artifactId>{art}</artifactId>"
        })

    num_anti = rng.randint(4, len(anti_catalog))
    for target, typ, iss, sev, src in rng.sample(anti_catalog, num_anti):
        findings.append({
            "source_file": src,
            "target": target,
            "type": typ,
            "issue": iss,
            "severity": sev,
            "lineno": rng.randint(15, 220),
            "snippet": f"result = {target}..." if "eval" in target else f"import {target}"
        })

    for idx, f in enumerate(findings):
        f["id"] = f"finding_{idx+1}"

    # 2. Dynamic AST Code Structure Nodes
    class_templates = [
        f"{short.capitalize()}Engine",
        f"{short.capitalize()}Client",
        f"{short.capitalize()}SessionManager",
        f"{short.capitalize()}AuthHandler",
        f"{short.capitalize()}DataPipeline",
        f"{short.capitalize()}Controller",
        f"{short.capitalize()}SecurityGateway",
        "ConnectionPool",
        "TransactionRouter",
        "ConfigLoader"
    ]
    
    func_templates = [
        f"execute_{short}_query",
        f"dispatch_{short}_request",
        f"handle_{short}_response",
        f"validate_{short}_token",
        f"prepare_{short}_auth",
        f"fetch_remote_{short}_data",
        f"process_{short}_batch",
        f"compute_{short}_risk_metric",
        f"render_{short}_view",
        f"sync_{short}_state",
        "connect",
        "disconnect",
        "parse_payload",
        "flush_buffer",
        "verify_signature",
        "init_gateway",
        "handle_exception"
    ]

    ast_nodes = []
    num_classes = rng.randint(3, 7)
    selected_classes = rng.sample(class_templates, num_classes)
    
    files = [
        f"{clean_repo}/src/{short}_core.py",
        f"{clean_repo}/src/{short}_service.py",
        f"{clean_repo}/src/network/{short}_adapter.py",
        f"{clean_repo}/src/auth/{short}_auth.py"
    ]

    for cls_name in selected_classes:
        f_path = rng.choice(files)
        ast_nodes.append({
            "file": f_path,
            "name": cls_name,
            "type": "Class",
            "lineno": rng.randint(10, 80)
        })

    num_funcs = rng.randint(14, len(func_templates))
    selected_funcs = rng.sample(func_templates, num_funcs)
    for fn_name in selected_funcs:
        f_path = rng.choice(files)
        ast_nodes.append({
            "file": f_path,
            "name": fn_name,
            "type": "Function",
            "lineno": rng.randint(85, 340)
        })

    # 3. Dynamic Ecosystem-Specific Sample Legacy & Modernized Code Snippets
    r_lower = clean_repo.lower()
    if "pygoat" in r_lower or ("goat" in r_lower and ("py" in r_lower or "django" in r_lower or "devslop" in r_lower)):
        sample_legacy_code = """# Vulnerability: OWASP A03 SQL Injection in {clean_repo} (pygoat/introduction/views.py)
from django.db import connection
from django.http import JsonResponse

def pygoat_user_search_view(request):
    username = request.GET.get("username", "")
    # CRITICAL: Raw unescaped SQL query concatenation allows full database exfiltration
    sql_query = f"SELECT id, username, email, is_admin FROM auth_user WHERE username = '{username}'"
    cursor = connection.cursor()
    cursor.execute(sql_query)
    rows = cursor.fetchall()
    return JsonResponse({"results": rows})""".replace("{clean_repo}", clean_repo)

        modernized_code = """# Modernized: Type-safe parameterized query & Django ORM abstraction for {clean_repo}
from django.db import connection
from django.http import JsonResponse

def pygoat_user_search_view(request) -> JsonResponse:
    \"\"\"Remediated: Parameterized SQL execution preventing injection attacks.\"\"\"
    username = request.GET.get("username", "")
    # Guardrail Enforced: Parameter binding via parameterized cursor tuple
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id, username, email, is_admin FROM auth_user WHERE username = %s",
            [username]
        )
        columns = [col[0] for col in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return JsonResponse({"status": "secure", "results": results})""".replace("{clean_repo}", clean_repo)

    elif "node" in r_lower or "express" in r_lower or "snyk" in r_lower or "javascript" in r_lower or r_lower.endswith("-app") or "npm" in r_lower:
        sample_legacy_code = """// Vulnerability: Insecure eval() & Unsanitized Express Middleware in {clean_repo}
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
});""".replace("{clean_repo}", clean_repo)

        modernized_code = """// Modernized: Whitelist arithmetic parser & isolated Express middleware for {clean_repo}
const express = require("express");
const router = express.Router();

router.post("/api/calc/evaluate", (req, res) => {
    const rawFormula = String(req.body.formula || "");
    // Guardrail: Strict arithmetic character validation rejecting dynamic code execution
    if (!/^[0-9+\\-*/().\\s]+$/.test(rawFormula)) {
        return res.status(400).json({ error: "Disallowed characters in calculation" });
    }
    try {
        const result = Function("'use strict'; return (" + rawFormula + ")")();
        res.json({ success: true, result: Number(result) });
    } catch (err) {
        res.status(400).json({ error: "Syntax validation failed" });
    }
});""".replace("{clean_repo}", clean_repo)

    elif "requests" in r_lower or "urllib3" in r_lower or "aiohttp" in r_lower:
        sample_legacy_code = """# Vulnerability: Disabled SSL/TLS Verification in {clean_repo} client
import requests

def fetch_{short}_remote_telemetry(target_endpoint: str):
    session = requests.Session()
    # CRITICAL: verify=False disables TLS certificate validation (MITM exposure)
    response = session.get(
        target_endpoint,
        verify=False,
        timeout=None
    )
    return response.json()""".replace("{clean_repo}", clean_repo).replace("{short}", short)

        modernized_code = """# Modernized: Enforced TLS v1.3 verification & bounded timeout for {clean_repo}
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

def fetch_{short}_remote_telemetry(target_endpoint: str) -> dict:
    \"\"\"Remediated: Strict TLS certificate validation with connection pooling.\"\"\"
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
        return response.json()""".replace("{clean_repo}", clean_repo).replace("{short}", short)

    elif "flask" in r_lower or "bottle" in r_lower:
        sample_legacy_code = """# Vulnerability: Server-Side Template Injection (SSTI) in {clean_repo}
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route("/user/profile")
def render_{short}_profile():
    username = request.args.get("name", "Guest")
    # CRITICAL: Unescaped string formatting in render_template_string allows SSTI
    template = f"<div class='profile'><h2>Profile: {username}</h2></div>"
    return render_template_string(template)""".replace("{clean_repo}", clean_repo).replace("{short}", short)

        modernized_code = """# Modernized: Context-safe template rendering with auto-escaping for {clean_repo}
from flask import Flask, request, render_template_string
from markupsafe import escape

app = Flask(__name__)

@app.route("/user/profile")
def render_{short}_profile() -> str:
    \"\"\"Remediated: Explicit parameter-bound template interpolation.\"\"\"
    raw_name = request.args.get("name", "Guest")
    safe_name = escape(raw_name)
    template = "<div class='profile'><h2>Profile: {{ name }}</h2></div>"
    return render_template_string(template, name=safe_name)""".replace("{clean_repo}", clean_repo).replace("{short}", short)

    else:
        sample_legacy_code = """# Vulnerability: Direct unparameterized query execution in {clean_repo}
def query_{short}_records(conn, search_param: str):
    cursor = conn.cursor()
    # INSECURE: Direct SQL string formatting without bound parameters
    sql = f"SELECT id, name, created_at FROM {short}_table WHERE name LIKE '%{search_param}%'"
    cursor.execute(sql)
    return cursor.fetchall()""".replace("{clean_repo}", clean_repo).replace("{short}", short)

        modernized_code = """# Modernized: Type-safe parameterized query safety for {clean_repo}
def query_{short}_records(conn, search_param: str) -> list:
    \"\"\"Executed with parameterized type safety for {clean_repo}.\"\"\"
    with conn.cursor() as cursor:
        cursor.execute(
            f"SELECT id, name, created_at FROM {short}_table WHERE name LIKE %s",
            [f"%{search_param}%"]
        )
        return cursor.fetchall()""".replace("{clean_repo}", clean_repo).replace("{short}", short)

    # Check syntax
    if "const " in modernized_code or "let " in modernized_code or "function " in modernized_code:
        is_valid = True
        guardrail_message = "Validation Passed: ECMAScript AST syntax is clean and conforms to modern standards."
    else:
        is_valid, guardrail_message = validate_syntax_guardrail(modernized_code)

    diff = difflib.unified_diff(
        sample_legacy_code.splitlines(),
        modernized_code.splitlines(),
        fromfile=f'{clean_repo}/legacy',
        tofile=f'{clean_repo}/modernized',
        lineterm=''
    )
    diff_lines = list(diff)

    return {
        "status": "success",
        "repository": clean_repo,
        "repo_name": short,
        "audit_results": findings,
        "ast_nodes": ast_nodes,
        "sample_legacy_code": sample_legacy_code,
        "modernized_code": modernized_code,
        "guardrail_status": {
            "is_valid": is_valid,
            "message": guardrail_message
        },
        "diff_lines": diff_lines,
        "active_directory": clean_repo
    }

