"""
Legacy Core Service - Financial Transaction Processor
Includes deprecated modules, dynamic evaluation anti-patterns, and database connections.
"""

import os
import sys
# Legacy anti-pattern: urllib2 and CGIHTTPServer
try:
    import urllib2
except ImportError:
    pass

try:
    import CGIHTTPServer
except ImportError:
    pass


class DatabaseConnector:
    """Manages raw database cursors and legacy query execution."""

    def __init__(self, connection_string: str):
        self.conn_str = connection_string
        self.is_connected = False

    def connect(self):
        self.is_connected = True
        return self

    def legacy_query(conn, query):
        """Vulnerable raw execution without parameterized type validation."""
        cursor = conn.cursor()
        cursor.execute(query)
        return cursor.fetchall()

    def close(self):
        self.is_connected = False


class LegacyAuthService:
    """Authentication gateway with insecure dynamic code execution."""

    def __init__(self, secret_key: str):
        self.secret_key = secret_key

    def verify_token(self, token: str) -> bool:
        return len(token) > 16

    def evaluate_rule(self, rule_expression: str, context: dict):
        # Severe anti-pattern: eval()
        result = eval(rule_expression)
        return result

    def get_public_key(self, url: str):
        # Legacy pattern: urllib2
        response = urllib2.urlopen(url)
        return response.read()


def process_payment_batch(records: list):
    """Processes batch payloads with procedural loops."""
    processed = []
    for item in records:
        if item.get("status") == "pending":
            item["status"] = "settled"
            processed.append(item)
    return processed


def compute_risk_score(account_id: str, balance: float):
    """Calculates risk metric based on legacy thresholds."""
    if balance < 0:
        return 99.9
    return max(5.0, 100.0 - (balance / 1000.0))

