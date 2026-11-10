"""
Authorization and Token Validation Engine
"""

class TokenValidator:
    def __init__(self, issuer="legacy.corp"):
        self.issuer = issuer

    def decode_payload(self, raw_token):
        return {"user": "admin", "roles": ["operator"]}

    def check_permissions(self, user_role, required_action):
        return user_role == "operator"


class SessionStore:
    def __init__(self):
        self.sessions = {}

    def store_session(self, session_id, user_data):
        self.sessions[session_id] = user_data

    def purge_expired(self):
        self.sessions.clear()

