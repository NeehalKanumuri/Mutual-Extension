"""
The Mutual - HTTP Server & REST API
Self-contained Python backend supporting both:
1. Chrome Extension API endpoints (with full CORS)
2. Standalone Interactive Web Companion at http://localhost:8000
"""

import os
import sys
import json
import mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.behavioral_engine import BehavioralEngine
from app.scenarios import SCENARIOS
from app.whisper_service import whisper_engine

# Load environment variable if exists
PORT = int(os.getenv("PORT", "8000"))
ROOT_DIR = Path(__file__).parent.parent.parent
WEB_DIR = ROOT_DIR / "web"
EXTENSION_DIR = ROOT_DIR / "extension"
SAFARI_DIR = ROOT_DIR / "safari-extension"
ENV_FILE_LOCAL = ROOT_DIR / ".env.local"
ENV_FILE = ROOT_DIR / ".env"

import time
import threading

engine = BehavioralEngine()

# Real-Time Multi-User Meeting Mesh & Company Tasks State
MEETING_LOCK = threading.Lock()
ACTIVE_MEETING_SESSIONS = {}   # session_key -> dict
ACTIVE_PARTICIPANTS = {}       # session_key -> dict of user_id -> participant
COMPANY_TASKS_LEDGER = {}      # company_code -> list of tasks
MEETING_HISTORY_LOG = {}       # company_code -> list of meeting summaries

def clean_stale_participants(session_key: str, max_age_seconds: float = 25.0):
    """Prunes participants who have not pinged in the last 25 seconds"""
    now = time.time()
    participants = ACTIVE_PARTICIPANTS.get(session_key, {})
    active = {}
    for uid, p in participants.items():
        if now - p.get("last_ping", 0) <= max_age_seconds:
            active[uid] = p
    ACTIVE_PARTICIPANTS[session_key] = active
    return list(active.values())


def load_env_file():
    """Reads GEMINI_API_KEY from .env.local and .env if present"""
    for file_path in [ENV_FILE_LOCAL, ENV_FILE]:
        if file_path.is_file():
            try:
                content = file_path.read_text(encoding="utf-8")
                for line in content.splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k == "GEMINI_API_KEY" and v:
                            os.environ["GEMINI_API_KEY"] = v
                            engine.set_api_key(v)
                            print(f"[Server] Loaded GEMINI_API_KEY from {file_path.name} (length: {len(v)})")
                            return
            except Exception as e:
                print(f"[Server] Failed to read {file_path.name}: {e}")

def save_api_key_to_env(api_key: str):
    """Persists GEMINI_API_KEY to both .env.local and .env for persistence across restarts"""
    if not api_key or not api_key.strip():
        return
    for file_path in [ENV_FILE_LOCAL, ENV_FILE]:
        try:
            lines = []
            if file_path.is_file():
                content = file_path.read_text(encoding="utf-8")
                for line in content.splitlines():
                    if not line.strip().startswith("GEMINI_API_KEY="):
                        lines.append(line)
            lines.append(f"GEMINI_API_KEY={api_key.strip()}")
            file_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            print(f"[Server] Successfully saved GEMINI_API_KEY to {file_path.name}")
        except Exception as e:
            print(f"[Server] Could not write to {file_path.name}: {e}")

# Initial load
load_env_file()


class MutualRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for Chrome Extension and local development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.send_header("Access-Control-Max-Age", "86400")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, status_code: int, data: dict):
        response_bytes = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode("utf-8")
            return json.loads(body)
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        import urllib.parse
        url_parts = urllib.parse.urlparse(self.path)
        url_path = urllib.parse.unquote(url_parts.path)
        query_params = urllib.parse.parse_qs(url_parts.query)

        # API Endpoints
        if url_path == "/api/health":
            self._send_json(200, {
                "status": "healthy",
                "app": "The Mutual - Behavioral Alignment Platform",
                "gemini_active": bool(engine.api_key),
                "model": (engine.active_model or "gemini-3.5-flash-lite") if engine.api_key else "Behavioral Heuristic Engine"
            })
            return

        elif url_path == "/api/scenarios":
            self._send_json(200, {
                "scenarios": SCENARIOS
            })
            return

        elif url_path == "/api/settings":
            self._send_json(200, {
                "gemini_active": bool(engine.api_key),
                "model": (engine.active_model or "gemini-3.5-flash-lite") if engine.api_key else "Behavioral Heuristic Engine",
                "has_key": bool(engine.api_key)
            })
            return

        elif url_path == "/api/whisper/status":
            self._send_json(200, whisper_engine.get_status())
            return

        elif url_path == "/api/meeting/participants":
            company_code = (query_params.get("company_code", [""])[0]).upper().strip()
            meeting_id = query_params.get("meeting_id", [""])[0].strip()
            platform = query_params.get("platform", ["meet"])[0].strip()
            session_key = f"{company_code}:{platform}:{meeting_id}"
            with MEETING_LOCK:
                active = clean_stale_participants(session_key)
                session = ACTIVE_MEETING_SESSIONS.get(session_key, {})
            self._send_json(200, {
                "success": True,
                "session_key": session_key,
                "session": session,
                "participants": active,
                "total_active": len(active)
            })
            return

        elif url_path == "/api/tasks":
            company_code = (query_params.get("company_code", [""])[0]).upper().strip()
            meeting_id = query_params.get("meeting_id", [""])[0].strip()
            status_filter = query_params.get("status", [""])[0].strip()
            with MEETING_LOCK:
                tasks = list(COMPANY_TASKS_LEDGER.get(company_code, []))
                if meeting_id:
                    tasks = [t for t in tasks if t.get("meeting_id") == meeting_id]
                if status_filter:
                    tasks = [t for t in tasks if t.get("status") == status_filter]
            self._send_json(200, {
                "success": True,
                "company_code": company_code,
                "tasks": tasks,
                "total": len(tasks)
            })
            return

        elif url_path == "/api/meetings/history":
            company_code = (query_params.get("company_code", [""])[0]).upper().strip()
            with MEETING_LOCK:
                history = list(MEETING_HISTORY_LOG.get(company_code, []))
            self._send_json(200, {
                "success": True,
                "company_code": company_code,
                "meetings": history,
                "total": len(history)
            })
            return


        # Serve Web Companion / Extension files
        target_file = None
        rel_path = url_path.lstrip("/")

        if url_path in ["/website", "/website/", "/landing", "/landing/"]:
            self.send_response(302)
            self.send_header("Location", "/The_Mutual_Website/")
            self.end_headers()
            return

        if rel_path.rstrip("/") == "The_Mutual_Website":
            target_file = ROOT_DIR / "The_Mutual_Website" / "index.html"
        elif url_path == "/" or url_path == "/index.html":
            target_file = WEB_DIR / "index.html"
        else:
            web_path = WEB_DIR / rel_path
            ext_path = EXTENSION_DIR / rel_path
            saf_path = SAFARI_DIR / rel_path
            root_path = ROOT_DIR / rel_path

            if web_path.is_file():
                target_file = web_path
            elif saf_path.is_file():
                target_file = saf_path
            elif ext_path.is_file():
                target_file = ext_path
            elif root_path.is_file():
                target_file = root_path
            elif root_path.is_dir() and (root_path / "index.html").is_file():
                target_file = root_path / "index.html"

        if target_file and target_file.is_file():
            self._serve_static_file(target_file)
        else:
            index_path = WEB_DIR / "index.html"
            if index_path.is_file():
                self._serve_static_file(index_path)
            else:
                self.send_error(404, "File not found")

    def _serve_static_file(self, file_path: Path):
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        try:
            file_size = file_path.stat().st_size
            range_header = self.headers.get("Range")

            if range_header and range_header.startswith("bytes="):
                # Handle Byte-Range requests (crucial for Safari/Chrome video streaming & scrubbing)
                byte_range = range_header[6:].split("-")
                start = int(byte_range[0]) if byte_range[0] else 0
                end = int(byte_range[1]) if byte_range[1] else file_size - 1
                if start >= file_size:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{file_size}")
                    self.end_headers()
                    return

                end = min(end, file_size - 1)
                chunk_len = end - start + 1

                with open(file_path, "rb") as f:
                    f.seek(start)
                    chunk = f.read(chunk_len)

                self.send_response(206)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(chunk_len))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                self.wfile.write(chunk)
            else:
                self.send_response(200)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Length", str(file_size))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                with open(file_path, "rb") as f:
                    self.wfile.write(f.read())
        except Exception as e:
            self.send_error(500, f"Error reading file: {e}")

    def do_POST(self):
        url_path = self.path.split("?")[0]

        try:
            body = self._read_json_body()
        except Exception as e:
            self._send_json(400, {"error": f"Invalid JSON payload: {e}"})
            return

        try:
            # Propagate client-provided API key dynamically if available
            client_api_key = body.get("api_key")
            if client_api_key and isinstance(client_api_key, str) and client_api_key.strip():
                if client_api_key.strip() != engine.api_key:
                    engine.set_api_key(client_api_key.strip())
                    save_api_key_to_env(client_api_key.strip())

            if url_path == "/api/intercept":
                text = body.get("text", "")
                context = body.get("context", "")
                result = engine.intercept_ambiguity(text, context)
                self._send_json(200, result)

            elif url_path == "/api/handshake/generate":
                transcript = body.get("transcript", "")
                result = engine.generate_micro_contract(transcript)
                self._send_json(200, result)

            elif url_path == "/api/preflight/audit":
                contract = body.get("contract", {})
                deliverable_text = body.get("deliverable_text", "")
                result = engine.audit_preflight(contract, deliverable_text)
                self._send_json(200, result)

            elif url_path == "/api/settings":
                api_key = (body.get("api_key") or "").strip()
                test_res = {}
                if api_key:
                    engine.set_api_key(api_key)
                    save_api_key_to_env(api_key)
                    test_res = engine.test_api_key(api_key)
                else:
                    # Do not clear server key if client simply omitted it; validate existing key
                    test_res = engine.test_api_key()

                model_reported = test_res.get("model", "gemini-3.5-flash-lite") if test_res.get("valid") else ("gemini-3.5-flash-lite" if engine.api_key else "Behavioral Heuristic Engine")
                self._send_json(200, {
                    "success": True,
                    "gemini_active": bool(engine.api_key),
                    "model": model_reported,
                    "test_result": test_res
                })

            elif url_path == "/api/audio/transcribe":
                audio_data = body.get("audio") or body.get("audio_data") or ""
                mime_type = body.get("mime_type") or "audio/mp3"
                if not audio_data:
                    self._send_json(400, {"success": False, "error": "No audio data provided"})
                else:
                    result = engine.transcribe_audio(audio_data, mime_type)
                    # If whisper fallback is needed when Gemini key is missing
                    if not result.get("success") and not engine.api_key:
                        result = whisper_engine.transcribe_audio_chunk(audio_data, None, "en")
                        result["lines"] = [{"speaker": "Speaker", "text": result.get("text", "")}]
                        result["success"] = True
                    self._send_json(200, result)

            elif url_path == "/api/whisper/transcribe":
                audio = body.get("audio")
                text_hint = body.get("text")
                lang = body.get("language", "en")
                result = whisper_engine.transcribe_audio_chunk(audio, text_hint, lang)
                self._send_json(200, result)

            elif url_path == "/api/whisper/launch-menubar":
                result = whisper_engine.launch_menubar_app()
                self._send_json(200, result)

            elif url_path == "/api/meeting/heartbeat":
                company_code = (body.get("company_code") or "GLOBAL").upper().strip()
                platform = body.get("meeting_platform") or body.get("platform") or "meet"
                meeting_id = (body.get("meeting_id") or "").strip()
                meeting_url = body.get("meeting_url") or ""
                room_name = body.get("room_name") or ""
                location_type = body.get("location_type") or ("offline_in_person" if "offline" in platform else "online")
                user_id = str(body.get("user_id") or body.get("user_email") or "anon")
                user_name = body.get("user_name") or "Team Member"
                user_role = body.get("user_role") or "Contributor"
                status = body.get("status") or "active"

                session_key = f"{company_code}:{platform}:{meeting_id}"
                now = time.time()

                with MEETING_LOCK:
                    if session_key not in ACTIVE_MEETING_SESSIONS:
                        ACTIVE_MEETING_SESSIONS[session_key] = {
                            "session_key": session_key,
                            "company_code": company_code,
                            "platform": platform,
                            "location_type": location_type,
                            "room_name": room_name,
                            "meeting_id": meeting_id,
                            "meeting_url": meeting_url,
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "last_active": now
                        }
                    else:
                        ACTIVE_MEETING_SESSIONS[session_key]["last_active"] = now
                        if meeting_url:
                            ACTIVE_MEETING_SESSIONS[session_key]["meeting_url"] = meeting_url
                        if room_name:
                            ACTIVE_MEETING_SESSIONS[session_key]["room_name"] = room_name

                    if session_key not in ACTIVE_PARTICIPANTS:
                        ACTIVE_PARTICIPANTS[session_key] = {}

                    prev_joined = ACTIVE_PARTICIPANTS[session_key].get(user_id, {}).get("connected_at")
                    ACTIVE_PARTICIPANTS[session_key][user_id] = {
                        "user_id": user_id,
                        "name": user_name,
                        "role": user_role,
                        "status": status,
                        "last_ping": now,
                        "connected_at": prev_joined or time.strftime("%H:%M:%S")
                    }

                    # Maintain Meeting History Log
                    if company_code not in MEETING_HISTORY_LOG:
                        MEETING_HISTORY_LOG[company_code] = []
                    existing_entry = next((m for m in MEETING_HISTORY_LOG[company_code] if m.get("session_key") == session_key), None)
                    current_active = clean_stale_participants(session_key)
                    if not existing_entry:
                        MEETING_HISTORY_LOG[company_code].append({
                            "session_key": session_key,
                            "platform": platform,
                            "location_type": location_type,
                            "room_name": room_name,
                            "meeting_id": meeting_id,
                            "meeting_url": meeting_url,
                            "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "last_active_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "peak_attendees": len(current_active),
                            "attendees": [p["name"] for p in current_active]
                        })
                    else:
                        existing_entry["last_active_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
                        existing_entry["peak_attendees"] = max(existing_entry["peak_attendees"], len(current_active))
                        if room_name and not existing_entry.get("room_name"):
                            existing_entry["room_name"] = room_name
                        for p in current_active:
                            if p["name"] not in existing_entry["attendees"]:
                                existing_entry["attendees"].append(p["name"])

                    session_data = ACTIVE_MEETING_SESSIONS[session_key]

                self._send_json(200, {
                    "success": True,
                    "session_key": session_key,
                    "session": session_data,
                    "participants": current_active,
                    "total_active": len(current_active)
                })

            elif url_path == "/api/tasks/create":
                company_code = (body.get("company_code") or "GLOBAL").upper().strip()
                title = body.get("title") or "Sprint Delegation Assignment"
                deliverable_format = body.get("deliverable_format") or ""
                deadline_sla = body.get("deadline_sla") or ""
                definition_of_done = body.get("definition_of_done") or []
                anti_goals = body.get("anti_goals") or []
                delegator_name = body.get("delegator_name") or "Manager"
                assignee_name = body.get("assignee_name") or "Team Member"
                meeting_id = body.get("meeting_id") or ""
                clarity_score = body.get("clarity_score", 88)
                risk_assessment = body.get("risk_assessment") or ""

                task_id = f"task_{int(time.time()*1000)}"
                task = {
                    "id": task_id,
                    "company_code": company_code,
                    "title": title,
                    "deliverable_format": deliverable_format,
                    "deadline_sla": deadline_sla,
                    "definition_of_done": definition_of_done,
                    "anti_goals": anti_goals,
                    "delegator_name": delegator_name,
                    "assignee_name": assignee_name,
                    "meeting_id": meeting_id,
                    "status": "in_progress",
                    "clarity_score": clarity_score,
                    "risk_assessment": risk_assessment,
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }

                with MEETING_LOCK:
                    if company_code not in COMPANY_TASKS_LEDGER:
                        COMPANY_TASKS_LEDGER[company_code] = []
                    COMPANY_TASKS_LEDGER[company_code].insert(0, task)

                self._send_json(200, {
                    "success": True,
                    "task": task
                })

            elif url_path == "/api/tasks/update":
                company_code = (body.get("company_code") or "GLOBAL").upper().strip()
                task_id = body.get("task_id") or ""
                updates = body.get("updates") or {}

                updated_task = None
                with MEETING_LOCK:
                    tasks = COMPANY_TASKS_LEDGER.get(company_code, [])
                    for t in tasks:
                        if t.get("id") == task_id:
                            t.update(updates)
                            updated_task = t
                            break

                if updated_task:
                    self._send_json(200, {"success": True, "task": updated_task})
                else:
                    self._send_json(404, {"success": False, "error": f"Task {task_id} not found"})

            elif url_path == "/api/tasks/ai-extract":
                transcript = body.get("transcript") or ""
                delegator = body.get("delegator") or "Manager"
                result = engine.extract_ai_assignment(transcript, delegator)
                self._send_json(200, {
                    "success": True,
                    "assignment": result
                })

            elif url_path == "/api/meeting/ai-summary":
                transcript = body.get("transcript") or ""
                meeting_title = body.get("title") or body.get("meeting_title") or "Team Meeting"
                participants = body.get("participants") or []
                result = engine.summarize_meeting_ai(transcript, meeting_title, participants)
                self._send_json(200, {
                    "success": True,
                    "summary": result
                })

            elif url_path == "/api/meeting/qa-resolve":
                recent_lines = body.get("recent_lines") or []
                active_flags = body.get("active_flags") or []
                contract = body.get("contract") or {}
                result = engine.resolve_qa_clarification(recent_lines, active_flags, contract)
                self._send_json(200, {
                    "success": True,
                    "resolution": result
                })

            else:
                self._send_json(404, {"error": f"Endpoint {url_path} not found"})


        except Exception as e:
            self._send_json(500, {"error": str(e)})


def run_server(port: int = PORT):
    server_address = ("0.0.0.0", port)
    httpd = ThreadingHTTPServer(server_address, MutualRequestHandler)
    print(f"=====================================================")
    print(f"  The Mutual — Behavioral Alignment Server Running")
    print(f"  Port: {port}")
    print(f"  Web Companion:  http://localhost:{port}")
    print(f"  API Health:     http://localhost:{port}/api/health")
    print(f"  Gemini Active:  {bool(engine.api_key)}")
    print(f"=====================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
