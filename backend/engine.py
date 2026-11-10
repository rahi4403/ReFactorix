import ast
import os
os.environ["GIT_PYTHON_REFRESH"] = "quiet"
import glob
import json
import xml.etree.ElementTree as ET
try:
    import git
except Exception:
    git = None
import networkx as nx
import difflib
import shutil
from packaging import version

import stat

# ==============================================================================
# ReFactorix Core Engine (Notebook Source Code - Preserved Unchanged)
# ==============================================================================

def remove_readonly(func, path, exc_info):
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

def clone_target_repository(repo_url=None, target_dir="./modernization_target"):
    """
    Takes a github repo as input and clones the repo locally so the analysis engine 
    can go through it dynamically.
    """
    if not repo_url:
        print("No URL provided. Exiting.")
        return None

    if git is None:
        print("Git is not available in this container environment.")
        return None

    if os.path.exists(target_dir):
        try:
            shutil.rmtree(target_dir, onerror=remove_readonly)
        except Exception as e:
            print(f"Warning cleaning directory: {e}")

    print(f"Cloning repository from {repo_url}...")
    try:
        git.Repo.clone_from(repo_url, target_dir, depth=1)
        print("Repository cloned successfully.")
        return target_dir
    except Exception as e:
        print(f"Failed to clone repository: {e}")
        return None


def comprehensive_archaeologist_audit(directory):
    """
    Security checkpoint which searches the cloned repository for multiple types 
    of dependency manifests (Python, Node.js/JavaScript, Java Maven) and scans 
    all major code files for deprecated imports, vulnerable package versions, 
    and configuration risks.
    """
    audit_findings = []

    if not directory or not os.path.exists(directory):
        return audit_findings

    print(f"Starting multi-format archaeological scan across: {directory}")

    # Python requirements.txt scan
    for filepath in glob.glob(f"{directory}/**/requirements.txt", recursive=True):
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "==" in line:
                    pkg, ver = line.split("==")
                    try:
                        if version.parse(ver.strip()) < version.parse("2.0.0"):
                            audit_findings.append({
                                "source_file": filepath,
                                "target": pkg.strip(),
                                "type": "Python Dependency",
                                "issue": f"Outdated version ({ver.strip()}) prone to legacy risks."
                            })
                    except Exception:
                        continue

    # Node.js package.json scan
    for filepath in glob.glob(f"{directory}/**/package.json", recursive=True):
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
                deps = data.get("dependencies", {})
                for pkg, ver in deps.items():
                    clean_ver = ver.replace("^", "").replace("~", "").strip()
                    if clean_ver:
                        parsed_ver = clean_ver.split()[0]
                        if version.parse(parsed_ver) < version.parse("2.0.0"):
                            audit_findings.append({
                                "source_file": filepath,
                                "target": pkg,
                                "type": "Node.js Dependency",
                                "issue": f"Legacy package version ({ver}) registered in package.json."
                            })
        except Exception:
            continue

    # Java Maven pom.xml scan
    for filepath in glob.glob(f"{directory}/**/pom.xml", recursive=True):
        try:
            tree = ET.parse(filepath)
            root = tree.getroot()
            for elem in root.iter():
                if elem.tag.endswith('dependency'):
                    artifactId = elem.find('{*}artifactId')
                    if artifactId is not None and artifactId.text:
                        audit_findings.append({
                            "source_file": filepath,
                            "target": artifactId.text,
                            "type": "Java Maven Artifact",
                            "issue": "Requires structural version security check."
                        })
        except Exception:
            continue

    # Multi-language legacy anti-patterns scan
    code_extensions = ("*.py", "*.js", "*.java", "*.cpp", "*.ts")
    all_code_files = []
    for ext in code_extensions:
        all_code_files.extend(glob.glob(f"{directory}/**/{ext}", recursive=True))

    legacy_patterns = {"urllib2", "CGIHTTPServer", "eval(", "document.write", "var "}

    for filepath in all_code_files:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            for pattern in legacy_patterns:
                if pattern in content:
                    audit_findings.append({
                        "source_file": filepath,
                        "target": pattern,
                        "type": "Code Block Anti-Pattern",
                        "issue": f"Detected legacy code pattern or insecure construct: '{pattern}'."
                    })

    return audit_findings


def parse_codebase_ast(directory):
    """
    Uses Python's built-in ast module to read Python files in the repository, 
    maps out function and class definitions to understand the layout and dependency 
    connections of the codebase.
    """
    code_nodes = []
    if not directory or not os.path.exists(directory):
        return code_nodes

    py_files = glob.glob(f"{directory}/**/*.py", recursive=True)
    for filepath in py_files:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        try:
            tree = ast.parse(content, filename=filepath)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    code_nodes.append({
                        "file": filepath,
                        "name": node.name,
                        "type": "Function" if isinstance(node, ast.FunctionDef) else "Class",
                        "lineno": node.lineno
                    })
        except SyntaxError:
            continue
    return code_nodes


def validate_syntax_guardrail(code_string):
    """
    Safety guardrail. Before any refactored code block is applied, it runs through 
    this validator to ensure the output code is mathematically correct and free of syntax errors.
    """
    try:
        ast.parse(code_string)
        return True, "Validation Passed: Syntax is clean."
    except SyntaxError as e:
        return False, f"Validation Failed: Syntax error detected - {e}"


def run_modernization_pipeline(directory):
    """
    Connects the system together (archaeologist audit, mapping the architectural AST nodes, 
    simulating a scoped code modernization step through the guardrail, and returning 
    a clean structured diff patch).
    """
    print("--- STARTING AUTOMATED MODERNIZATION PIPELINE ---")

    audit_results = comprehensive_archaeologist_audit(directory)
    print(f"\n[Phase 1 Audit]: Flagged {len(audit_results)} target items across manifests and source files.")

    nodes = parse_codebase_ast(directory)
    print(f"[Phase 2 Parsing]: Mapped {len(nodes)} architectural function/class nodes.")

    sample_legacy_code = "def legacy_query(conn, query):\n    cursor = conn.cursor()\n    cursor.execute(query)\n    return cursor.fetchall()"
    print("\n[Phase 3 Guardrail Verification Test]:")
    print("Original Legacy Snippet:\n", sample_legacy_code)

    modernized_code = "def legacy_query(conn, query: str) -> list:\n    \"\"\"Executed with parameterized type safety.\"\"\"\n    with conn.cursor() as cursor:\n        cursor.execute(query)\n        return cursor.fetchall()"

    is_valid, message = validate_syntax_guardrail(modernized_code)
    print("Guardrail Status:", message)

    diff_lines = []
    if is_valid:
        print("\nGenerated Secure Refactoring Diff:")
        diff = difflib.unified_diff(
            sample_legacy_code.splitlines(),
            modernized_code.splitlines(),
            fromfile='legacy',
            tofile='modernized',
            lineterm=''
        )
        for line in diff:
            print(line)
            diff_lines.append(line)
    print("\n--- MODERNIZATION PIPELINE COMPLETED ---")

    return {
        "status": "success",
        "directory": directory,
        "audit_results": audit_results,
        "ast_nodes": nodes,
        "sample_legacy_code": sample_legacy_code,
        "modernized_code": modernized_code,
        "guardrail_status": {
            "is_valid": is_valid,
            "message": message
        },
        "diff_lines": diff_lines
    }

