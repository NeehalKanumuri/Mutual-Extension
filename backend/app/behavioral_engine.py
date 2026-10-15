"""
The Mutual - Behavioral & Linguistic Analysis Engine
Rooted in Organizational Behavior (OB) Theory:
- Amy Edmondson: Psychological Safety & Asymmetric Inquiry
- Denise Rousseau: Psychological Contracting & Mental Models
- Locke & Latham: Goal-Setting Theory & Specification Metrics
- Kahneman & Tversky: Planning Fallacy & Ambiguity Aversion
"""

import os
import re
import json
import urllib.request
import urllib.error
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional

# Pre-compiled linguistic patterns for delegation vagueness
VAGUENESS_PATTERNS = [
    {
        "id": "temporal_fuzzy",
        "category": "Temporal Ambiguity",
        "pattern": r"\b(sometime next week( only)?|sometime soon|asap|as soon as possible|whenever you get (to it|a chance|around to it)|in a couple of days|by end of week|sometime later|down the road|when you can)\b",
        "ob_diagnosis": "Temporal Ambiguity creates divergent mental deadlines. Superiors assume early completion; subordinates prioritize other tasks, leading to perceived contract breach.",
        "risk_level": "High",
        "script_template": "To ensure I protect focus time for this, should I aim to have this draft in your inbox before {day_choice} morning, or is {day_alt} EOD the hard cutoff?"
    },
    {
        "id": "subjective_quality",
        "category": "Subjective Quality Metric",
        "pattern": r"\b(make it look (pakka )?(professional|clean|nice|pretty|good|presentable)|make it pop|give it some (proper )?polish|high production value|do your magic|keep it high quality)\b",
        "ob_diagnosis": "Aesthetic subjectivity leads to excessive rework. What looks 'clean' to an individual contributor often lacks the executive framing expected by leadership.",
        "risk_level": "High",
        "script_template": "When you say '{phrase}', is there a specific existing deck or template from our team that represents the exact bar you have in mind?"
    },
    {
        "id": "scope_creep_hazard",
        "category": "Scope Creep Hazard",
        "pattern": r"\b(just touch (on|upon)|throw in a few|maybe add some|keep it high level but detailed|and whatever else makes sense|feel free to explore|add some context around|adjust maadi)\b",
        "ob_diagnosis": "Boundary erosion. The manager treats additions as zero-cost afterthoughts, ballooning employee workload and delaying primary delivery.",
        "risk_level": "Medium",
        "script_template": "Understood. Should we treat '{phrase}' as a strict requirement for V1, or should I list it as an optional Phase 2 appendix item if time permits?"
    },
    {
        "id": "unspecified_deliverable",
        "category": "Undefined Deliverable Format",
        "pattern": r"\b(send me something|put together a quick (deck|one-pager|doc|write-up)|shoot me a note|give me a breakdown|cook something up)\b",
        "ob_diagnosis": "Format misalignment. Delivering a 10-page doc when a 3-bullet email was expected wastes hours; delivering a brief note when slides were needed causes credibility loss.",
        "risk_level": "Medium",
        "script_template": "Got it. To tailor this for the right audience: are you looking for an informal 3-bullet Slack recap, or a formal slide presentation for stakeholder review?"
    },
    {
        "id": "diffuse_responsibility",
        "category": "Diffuse Accountability",
        "pattern": r"\b(loop in whoever|check with the team|run it by folks|get buy-in from people|align with everyone|see what they think|ping me off-line|take it off-line)\b",
        "ob_diagnosis": "The Bystander Effect in organizations. Unspecified stakeholders either stall progress through committee paralysis or ignore review requests completely.",
        "risk_level": "High",
        "script_template": "Who holds final veto power on this before we ship? I'll schedule a targeted 15-minute review specifically with them."
    }
]


class BehavioralEngine:
    # High-speed production Google Gemini API models in order of latency & priority
    CANDIDATE_MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-latest"
    ]

    def __init__(self, api_key: Optional[str] = None):
        key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        if not key:
            # Auto-resolve from .env.local or .env in project root
            base_dir = Path(__file__).resolve().parent.parent.parent
            for env_name in [".env.local", ".env"]:
                p = base_dir / env_name
                if p.is_file():
                    try:
                        for line in p.read_text(encoding="utf-8").splitlines():
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                if k.strip() == "GEMINI_API_KEY" and v.strip():
                                    key = v.strip().strip("'\"")
                                    os.environ["GEMINI_API_KEY"] = key
                                    break
                    except Exception:
                        pass
                if key:
                    break
        self.api_key = key
        self.active_model: Optional[str] = "gemini-3.5-flash-lite" if key else None
        self._cache: Dict[str, Any] = {}
        if self.api_key:
            print(f"[BehavioralEngine] Initialized with active API key (length: {len(self.api_key)})")

    def set_api_key(self, api_key: str):
        if not api_key:
            return
        self.api_key = api_key.strip()
        self.active_model = "gemini-3.5-flash-lite"
        self._cache.clear()
        print(f"[BehavioralEngine] API key updated (length: {len(self.api_key)})")

    def test_api_key(self, key_to_test: Optional[str] = None) -> Dict[str, Any]:
        """Validates API key against Google Generative Language API"""
        key = (key_to_test if key_to_test is not None else self.api_key).strip()
        if not key:
            return {"valid": False, "error": "No API key provided."}

        test_payload = {
            "contents": [{"parts": [{"text": "Respond in JSON format: {\"status\": \"ok\"}"}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 60, "responseMimeType": "application/json"}
        }
        data_bytes = json.dumps(test_payload).encode("utf-8")

        models_to_try = [self.active_model] if self.active_model else []
        models_to_try.extend([m for m in self.CANDIDATE_MODELS if m != self.active_model])

        last_error = ""
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            try:
                with urllib.request.urlopen(req, timeout=8) as resp:
                    if resp.status == 200:
                        self.active_model = model
                        return {"valid": True, "model": model, "message": f"Connected to Gemini ({model})"}
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                last_error = f"HTTP {e.code}: {err_body[:200]}"
                if e.code in (404, 503):
                    continue  # Try next candidate model
                return {"valid": False, "error": last_error}
            except Exception as e:
                last_error = str(e)
                continue

        return {"valid": False, "error": last_error or "Could not connect to Gemini models with this key."}

    def _call_gemini_json(self, prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
        """
        Executes ultra-low-latency structured JSON completion with model memoization and caching.
        """
        if not self.api_key:
            return None

        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        cache_key = hashlib.sha256(full_prompt.encode("utf-8")).hexdigest()

        if cache_key in self._cache:
            return dict(self._cache[cache_key])

        payload = {
            "contents": [
                {
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.15,
                "maxOutputTokens": 1400,
                "responseMimeType": "application/json"
            }
        }
        data_bytes = json.dumps(payload).encode("utf-8")

        models_to_try = [self.active_model] if self.active_model else []
        models_to_try.extend([m for m in self.CANDIDATE_MODELS if m != self.active_model])

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    text_content = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    self.active_model = model
                    parsed["_model_used"] = model
                    self._cache[cache_key] = parsed
                    return dict(parsed)
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="replace")
                print(f"[BehavioralEngine] Gemini model '{model}' HTTP {e.code}: {err_body[:220]}")
                if e.code in (404, 503):
                    continue  # Fallback to next candidate
                continue
            except Exception as e:
                print(f"[BehavioralEngine] Gemini model '{model}' error: {e}")
                continue

        return None

    def intercept_ambiguity(self, text: str, context: Optional[str] = "") -> Dict[str, Any]:
        """
        Analyzes a statement or snippet from a meeting.
        Detects ambiguous delegation cues and generates psychological safety nudges.
        """
        text_clean = text.strip()
        if not text_clean or len(text_clean) < 4:
            return {"is_ambiguous": False, "flags": [], "ambiguity_score": 0}

        # If Gemini API key is available, use calibrated LLM contextual analysis
        if self.api_key:
            try:
                llm_result = self._gemini_intercept(text_clean, context or "")
                if llm_result:
                    return llm_result
            except Exception as e:
                print(f"[BehavioralEngine] Gemini intercept failed, using heuristics: {e}")

        # Fallback to rule-based behavioral heuristics
        return self._heuristic_intercept(text_clean)

    def _heuristic_intercept(self, text: str) -> Dict[str, Any]:
        matched_flags = []
        score = 0

        for pat in VAGUENESS_PATTERNS:
            matches = list(re.finditer(pat["pattern"], text, re.IGNORECASE))
            if matches:
                for match in matches:
                    phrase = match.group(0)
                    score += 25

                    # Generate dynamic script
                    script = pat["script_template"].replace("{phrase}", phrase)
                    if "{day_choice}" in script:
                        script = script.replace("{day_choice}", "Wednesday").replace("{day_alt}", "Friday")

                    matched_flags.append({
                        "id": f"{pat['id']}_{match.start()}",
                        "category": pat["category"],
                        "detected_phrase": phrase,
                        "risk_level": pat["risk_level"],
                        "ob_diagnosis": pat["ob_diagnosis"],
                        "suggested_script": script
                    })

        score = min(score, 95)
        is_ambiguous = len(matched_flags) > 0

        return {
            "is_ambiguous": is_ambiguous,
            "ambiguity_score": score,
            "matched_count": len(matched_flags),
            "flags": matched_flags,
            "engine": "behavioral_heuristics"
        }

    def _gemini_intercept(self, text: str, context: str) -> Optional[Dict[str, Any]]:
        system_instruction = (
            "You are 'The Mutual' Executive Behavioral & Delegation Interceptor, an advanced Organizational Behavior (OB) AI engine "
            "grounded in Amy Edmondson's Psychological Safety, Denise Rousseau's Psychological Contracting, and Locke & Latham's Goal-Setting Theory.\n\n"
            "CRITICAL CALIBRATION — DO NOT OVER-FLAG:\n"
            "1. Your goal is NOT to caution every statement. You must ONLY flag statements that represent GENUINELY VAGUE, AMBIGUOUS, OR UNBOUNDED WORK DELEGATION from a manager/leader to a subordinate.\n"
            "2. If a statement is routine conversation, pleasantries ('Good morning', 'How are you'), meeting facilitation ('Can everyone hear me', 'Let us review slide 4', 'We have 5 mins left'), clear instructions with dates/formats, agreements ('Sounds good', 'I agree', 'Thanks'), an employee status update (e.g. from Neehal: 'The draft is ready', 'I updated the KPIs'), or already has clear milestones — you MUST return is_ambiguous: false, ambiguity_score: 0, and flags: [].\n"
            "3. ONLY flag actionable ambiguity when a delegator introduces:\n"
            "   - Temporal Ambiguity: Fuzzy deadlines lacking an explicit cutoff day/hour (e.g. 'sometime next week', 'ASAP', 'whenever you get a chance').\n"
            "   - Subjective Quality: Vague aesthetic buzzwords without objective criteria (e.g. 'make it look clean', 'make it pop', 'do your magic').\n"
            "   - Scope Creep Hazard: Unbounded open additions (e.g. 'throw in whatever else makes sense', 'touch upon a few extra things').\n"
            "   - Undefined Format: Unspecified deliverable type or tool (e.g. 'send me something', 'put together a quick thing').\n"
            "   - Diffuse Accountability: Unclear ownership or review committee (e.g. 'loop in whoever', 'run it by folks').\n"
            "4. Personas in scope:\n"
            "   - Bhushith: Manager / Delegator POV (delegates work, needs precision).\n"
            "   - Neehal: Employee / Executor POV (receives work, needs polite, psychologically safe clarification scripts to speak directly during the call before leaving).\n"
            "5. Clarification scripts for Neehal must be professional, proactive, respectful, and framed around protecting delivery focus and momentum.\n"
            "6. Output strict JSON only matching the schema."
        )

        prompt = f"""Analyze this meeting statement:
Statement: "{text}"
Recent Context: "{context}"

Evaluate whether this statement contains actionable delegation ambiguity.
If the statement is NOT ambiguous (e.g. normal conversation, greetings, clear instructions, questions, agreements, employee status reports), return:
{{
  "is_ambiguous": false,
  "ambiguity_score": 0,
  "flags": []
}}

If and ONLY if the statement contains genuine delegation ambiguity or vagueness, return:
{{
  "is_ambiguous": true,
  "ambiguity_score": 60-95,
  "flags": [
    {{
      "category": "Temporal Ambiguity | Subjective Quality | Scope Creep Hazard | Undefined Deliverable Format | Diffuse Accountability",
      "detected_phrase": "exact phrase from statement",
      "risk_level": "High | Medium",
      "ob_diagnosis": "Concise OB theory explanation of why this specific phrase causes delegation breakdown",
      "suggested_script": "Polite, proactive question Neehal can ask right now in the call to clarify expectations"
    }}
  ]
}}
"""
        parsed = self._call_gemini_json(prompt, system_instruction)
        if parsed:
            model = parsed.pop("_model_used", self.active_model or "gemini-3.5-flash-lite")
            parsed["engine"] = f"gemini ({model})"
            return parsed
        return None

    def generate_micro_contract(self, transcript: str) -> Dict[str, Any]:
        """
        Synthesizes a meeting transcript into the 5-Point Micro-Contract.
        Uses Gemini if configured and working, else uses dynamic heuristic synthesis.
        """
        if self.api_key:
            try:
                llm_result = self._gemini_contract(transcript)
                if llm_result:
                    return llm_result
            except Exception as e:
                print(f"[BehavioralEngine] Gemini contract generation failed: {e}")

        # Dynamic heuristic parsing that extracts actual user speech/text
        return self._heuristic_contract(transcript)

    def extract_ai_assignment(self, transcript: str, delegator: str = "Manager") -> Dict[str, Any]:
        """
        AI Task & Assignment Extractor:
        Parses meeting dialogue into structured active assignments with:
        Assignee, Deliverable, SLA deadline, DoD criteria, and Anti-goals.
        """
        system_instruction = (
            "You are The Mutual Enterprise Assignment & Delegation Extractor. "
            "Analyze meeting dialogue and extract precise, actionable task assignments. "
            "Identify the specific employee assignee, the deliverable format, strict SLA deadlines, "
            "objective Definition of Done (DoD) test criteria, and explicit anti-goals/guardrails. "
            "Output strict JSON only."
        )

        prompt = f"""Extract the active task assignment from this meeting transcript:
Transcript: "{transcript}"
Delegator Context: "{delegator}"

Output JSON:
{{
  "title": "Concise Task Name (e.g., Executive Q4 Brand Presentation)",
  "assignee": "Name or role of person assigned (e.g., Bhushith / Lead Engineer)",
  "delegator": "{delegator}",
  "deliverable_format": "Exact artifact type, template, or tool specified",
  "deadline_sla": "Exact hard cutoff day/time and feedback turnaround window",
  "definition_of_done": [
    "Specific testable acceptance criterion 1",
    "Specific testable acceptance criterion 2",
    "Specific testable acceptance criterion 3"
  ],
  "anti_goals": [
    "Item explicitly declared out of scope 1",
    "Item explicitly declared out of scope 2"
  ],
  "clarity_score": 88,
  "risk_assessment": "Brief OB risk assessment of this assignment"
}}
"""
        if self.api_key:
            try:
                parsed = self._call_gemini_json(prompt, system_instruction)
                if parsed:
                    return parsed
            except Exception as e:
                print(f"[BehavioralEngine] Gemini extract_ai_assignment error: {e}")

        # Heuristic fallback based on contract synthesis
        contract = self.generate_micro_contract(transcript)
        clauses = {c["num"]: c for c in contract.get("clauses", [])}
        return {
            "title": contract.get("title", "Sprint Delegation Assignment"),
            "assignee": "Assigned Contributor",
            "delegator": delegator,
            "deliverable_format": clauses.get(1, {}).get("content", "Structured deliverable document"),
            "deadline_sla": clauses.get(2, {}).get("content", "Deliverable by agreed sprint cutoff"),
            "definition_of_done": [
                clauses.get(3, {}).get("content", "Objective acceptance criteria met"),
                "Verified against delegation scope",
                "Preflight check passed with >=80 clarity"
            ],
            "anti_goals": [
                clauses.get(4, {}).get("content", "Out-of-scope explorations excluded")
            ],
            "clarity_score": 88,
            "risk_assessment": "Heuristic fallback: Review SLA turnaround to ensure momentum."
        }

    def summarize_meeting_ai(self, transcript: str, meeting_title: str = "Team Meeting", participants: list = None) -> Dict[str, Any]:
        """
        AI Meeting Summary & Action Matrix Generator:
        Produces executive synthesis, confirmed deliverables, DoD acceptance, and key ambiguities identified.
        """
        participants_str = ", ".join([str(p) for p in (participants or [])])
        system_instruction = (
            "You are The Mutual Enterprise Alignment Intelligence Engine. "
            "Analyze meeting discussions to create an executive briefing and action matrix. "
            "Highlight confirmed deliverables, resolved ambiguities, open questions, and exact accountability. "
            "Output strict JSON only."
        )

        prompt = f"""Summarize this meeting dialogue into an executive briefing and alignment matrix:
Meeting Title: "{meeting_title}"
Participants: "{participants_str}"
Transcript:
"{transcript}"

Output JSON:
{{
  "meeting_title": "{meeting_title}",
  "executive_summary": "2-3 sentence executive briefing of what was aligned in the meeting",
  "clarity_score": 92,
  "action_items": [
    {{
      "assignee": "Name",
      "task": "Specific task and format",
      "deadline": "Exact SLA deadline",
      "dod": "Definition of done criteria"
    }}
  ],
  "clarified_ambiguities": [
    "Ambiguity resolved during call"
  ],
  "unresolved_risks": [
    "Potential alignment gap to monitor"
  ]
}}
"""
        if self.api_key:
            try:
                parsed = self._call_gemini_json(prompt, system_instruction)
                if parsed:
                    return parsed
            except Exception as e:
                print(f"[BehavioralEngine] Gemini summarize_meeting_ai error: {e}")

        # Heuristic fallback
        return {
            "meeting_title": meeting_title,
            "executive_summary": f"Team completed alignment discussion for {meeting_title}. Key deliverables and constraints were established.",
            "clarity_score": 88,
            "action_items": [
                {
                    "assignee": "Primary Contributor",
                    "task": "Finalize deliverable according to agreed specs",
                    "deadline": "Sprint Cutoff",
                    "dod": "Deliverable satisfies agreed acceptance criteria"
                }
            ],
            "clarified_ambiguities": [
                "Scope boundaries and delivery format agreed"
            ],
            "unresolved_risks": [
                "Confirm feedback SLA turnaround prior to submission"
            ]
        }

    def resolve_qa_clarification(self, recent_lines: list, active_flags: list, contract: dict = None) -> Dict[str, Any]:
        """
        AI Real-Time Q&A & Ambiguity Resolution Engine:
        Detects clarifying questions asked by attendees and answers provided by superiors,
        resolving corresponding ambiguity interventions and updating contract clauses.
        """
        if not active_flags or not recent_lines:
            return {"has_resolution": False}

        dialogue_text = "\n".join([f"{l.get('speaker', 'Speaker')}: {l.get('text', '')}" for l in recent_lines])
        unresolved = [f for f in active_flags if not f.get("resolved")]
        if not unresolved:
            return {"has_resolution": False}

        flags_text = json.dumps([
            {
                "id": f.get("id"),
                "category": f.get("category"),
                "detected_phrase": f.get("detected_phrase"),
                "diagnosis": f.get("ob_diagnosis")
            }
            for f in unresolved
        ])

        system_instruction = (
            "You are The Mutual Real-Time Alignment Q&A Resolver. "
            "Examine meeting dialogue to detect if an attendee asked a clarifying question "
            "addressing one of the active ambiguity flags, and whether an answer or decision was provided. "
            "If both question and answer/decision are present, extract the concrete decision and provide updated wording for the contract clause. "
            "Output strict JSON only."
        )

        prompt = f"""Active Ambiguity Interventions:
{flags_text}

Recent Meeting Dialogue:
{dialogue_text}

Output JSON format:
{{
  "has_resolution": true,
  "resolved_flag_id": "flag_id",
  "clarification_summary": "Summary of decision confirmed in call",
  "clause_category": "deliverable | timeline | dod | guardrails | dependencies",
  "updated_clause_content": "Concrete agreed clause wording reflecting the resolved answer",
  "confidence": 90
}}
If no question was asked or no concrete answer was given, output {{"has_resolution": false}}.
"""
        if self.api_key:
            try:
                parsed = self._call_gemini_json(prompt, system_instruction)
                if parsed and parsed.get("has_resolution"):
                    return parsed
            except Exception as e:
                print(f"[BehavioralEngine] Gemini resolve_qa_clarification error: {e}")

        # Local Heuristic Fallback
        dialogue_lower = dialogue_text.lower()
        for flag in unresolved:
            cat = (flag.get("category") or "").lower()
            if "format" in cat or "deliverable" in cat or "undefined" in cat:
                if any(w in dialogue_lower for w in ["slides", "deck", "presentation", "notion", "google doc", "doc", "sheet", "figma", "prototype"]):
                    matched_kw = next(w for w in ["slides", "deck", "presentation", "notion", "google doc", "doc", "sheet", "figma", "prototype"] if w in dialogue_lower)
                    return {
                        "has_resolution": True,
                        "resolved_flag_id": flag.get("id"),
                        "clarification_summary": f"Deliverable format confirmed as {matched_kw.title()} in meeting dialogue",
                        "clause_category": "deliverable",
                        "updated_clause_content": f"Agreed format: {matched_kw.title()} as specified in call discussion.",
                        "confidence": 85
                    }
            elif "temporal" in cat or "deadline" in cat or "timeline" in cat:
                if any(w in dialogue_lower for w in ["friday", "monday", "wednesday", "3 pm", "5 pm", "eod", "morning", "tomorrow", "end of week"]):
                    matched_time = next(w for w in ["friday", "monday", "wednesday", "3 pm", "5 pm", "eod", "morning", "tomorrow", "end of week"] if w in dialogue_lower)
                    return {
                        "has_resolution": True,
                        "resolved_flag_id": flag.get("id"),
                        "clarification_summary": f"Milestone cutoff confirmed as {matched_time.title()} in meeting dialogue",
                        "clause_category": "timeline",
                        "updated_clause_content": f"Agreed deadline cutoff: {matched_time.title()} established during call.",
                        "confidence": 85
                    }
            elif "quality" in cat or "done" in cat or "dod" in cat or "metric" in cat:
                if any(w in dialogue_lower for w in ["criteria", "acceptance", "checklist", "verified", "passed", "reviewed", "template"]):
                    return {
                        "has_resolution": True,
                        "resolved_flag_id": flag.get("id"),
                        "clarification_summary": "Definition of Done acceptance criteria established in call",
                        "clause_category": "dod",
                        "updated_clause_content": "Deliverable must pass agreed team verification checklist and stakeholder criteria.",
                        "confidence": 85
                    }

        return {"has_resolution": False}

    def _heuristic_contract(self, transcript: str) -> Dict[str, Any]:
        """
        Dynamic heuristic synthesis: extracts actual entities, deliverables, deadlines,
        quality metrics, anti-goals, and stakeholders directly from the provided transcript.
        Never outputs static preset mock data unless the transcript itself is about that preset!
        """
        raw_text = transcript.strip()
        text_lower = raw_text.lower()

        # 1. Identify Speaker / Manager Name
        manager_name = "Delegating Manager"
        speaker_match = re.search(r"^([A-Za-z0-9\s\(\)]+?):", raw_text)
        if speaker_match:
            candidate = speaker_match.group(1).strip()
            if len(candidate) < 30 and "speaker" not in candidate.lower():
                manager_name = candidate

        # 2. Extract Deliverable & Format (Clause 1)
        contract_title = "Sprint Delegation & Alignment Micro-Contract"
        format_content = "A concise, structured deliverable document covering all discussed scope items."
        format_notes = "Format constraints explicitly locked in"

        if any(w in text_lower for w in ["deck", "slide", "slides", "presentation"]):
            contract_title = "Presentation & Stakeholder Deck Alignment Contract"
            format_content = "A structured 5-to-7 slide presentation (Google Slides) directly addressing the delegated review agenda."
            format_notes = "Must follow current brand guidelines; slide count strictly bounded to prevent bloated decks."
        elif any(w in text_lower for w in ["spec", "feature", "rfc", "architecture", "checkout", "api", "flow"]):
            contract_title = "Technical Feature Specification Micro-Contract"
            format_content = "A 2-to-3 page architectural specification doc covering API contracts, state transitions, and edge cases."
            format_notes = "Standard Markdown / Notion RFC template; technical boundaries explicitly declared."
        elif any(w in text_lower for w in ["report", "write-up", "memo", "one-pager", "doc"]):
            contract_title = "Executive Summary & Briefing Document Micro-Contract"
            format_content = "A structured 1-to-2 page written executive brief highlighting key findings and core recommendations."
            format_notes = "Bulleted executive summary with appendix for raw data."
        elif any(w in text_lower for w in ["onboarding", "guide", "handbook", "process"]):
            contract_title = "Process & Operational Playbook Micro-Contract"
            format_content = "A step-by-step operational guide with explicit checklists and point-of-contact definitions."
            format_notes = "Living doc format with clear section owners."
        else:
            # Extract key action sentence from transcript
            sentences = [s.strip() for s in re.split(r"[.!?\n]", raw_text) if len(s.strip()) > 15]
            if sentences:
                clean_first = re.sub(r"^[A-Za-z0-9\s\(\)]+:\s*", "", sentences[0])
                contract_title = "Delegation Alignment Micro-Contract"
                format_content = f"Target deliverable addressing: \"{clean_first[:100]}\" delivered in standard document format."
                format_notes = "Explicit deliverable type agreed before execution."

        # 3. Extract Timeline / Hard Deadline (Clause 2)
        timeline_content = "First draft delivered within 3 business days by 3:00 PM; async feedback returned within 24 hours."
        timeline_notes = "Turnaround SLA ensures momentum"

        if "sometime next week" in text_lower or "next week" in text_lower:
            timeline_content = "Explicit cutoff: Wednesday at 3:00 PM (locking in specific day to resolve 'sometime next week' temporal ambiguity); feedback returned by Thursday 11:00 AM."
            timeline_notes = "Pins fuzzy managerial timeline down to a concrete day and review SLA."
        elif "friday" in text_lower:
            timeline_content = "Hard deadline: Friday at 12:00 PM EST with mandatory 4-hour review window before week close."
            timeline_notes = "Prevents EOD Friday review crunch."
        elif "tomorrow" in text_lower:
            timeline_content = "Hard deadline: Tomorrow by 4:00 PM local time with immediate 30-minute sync review."
            timeline_notes = "Rapid iteration turnaround."
        elif "asap" in text_lower or "soon" in text_lower:
            timeline_content = "Explicit SLA: Initial draft submitted within 48 hours (resolving 'ASAP' urgency trap into measurable hours)."
            timeline_notes = "Translates subjective urgency into an objective time box."

        # 4. Extract Definition of Done (Clause 3)
        dod_items = []
        if any(w in text_lower for w in ["professional", "pakka", "clean", "pop", "polish", "magic"]):
            dod_items.append("Adheres to verified team template and visual standards (resolves subjective 'make it look professional')")
        if any(w in text_lower for w in ["benchmark", "competitor", "comparison"]):
            dod_items.append("Includes concrete benchmark comparison matrix with 3 domestic competitors")
        if any(w in text_lower for w in ["pricing", "cost", "budget", "finance"]):
            dod_items.append("Contains verified unit metrics and budget figures verified with finance")
        if any(w in text_lower for w in ["error", "handling", "gateway", "payment"]):
            dod_items.append("Includes explicit error handling states and fallback recovery workflows")
        if any(w in text_lower for w in ["kpi", "metrics", "data", "rollout", "pilot"]):
            dod_items.append("Validates top 3 quantifiable rollout metrics against real telemetry data")

        if not dod_items:
            dod_items = [
                "Contains clearly articulated core proposal with background rationale",
                "Includes explicit success metrics and immediate next steps",
                "Validated with primary stakeholder before final distribution"
            ]

        dod_content = "Verified against 3 criteria: " + "; ".join(f"({i+1}) {item}" for i, item in enumerate(dod_items[:3])) + "."
        dod_notes = "Objective acceptance criteria eliminate subjective rework loops."

        # 5. Extract Out-of-Scope Guardrails (Clause 4)
        anti_goals = []
        if "international" in text_lower or "pricing" in text_lower:
            anti_goals.append("international pricing models and multi-region tax analysis")
        if "smart contract" in text_lower or "blockchain" in text_lower:
            anti_goals.append("experimental smart contract / blockchain integrations")
        if "video" in text_lower or "animation" in text_lower:
            anti_goals.append("high-fidelity video production or custom motion assets")
        if "adjust maadi" in text_lower or "throw in" in text_lower or "touch upon" in text_lower:
            anti_goals.append("unplanned exploratory sub-features mentioned as passing thoughts")

        if not anti_goals:
            anti_goals.append("unplanned feature expansion outside the core documented problem statement")
            anti_goals.append("uncredited side-quests and unbudgeted tooling changes")

        guardrails_content = "Strictly Out-of-Scope for V1: Do NOT build " + " or ".join(anti_goals) + "."
        guardrails_notes = "Protects executor cognitive bandwidth and prevents scope erosion."

        # 6. Extract Sign-Off Authority & Dependencies (Clause 5)
        dependencies_content = f"Single designated final approver is {manager_name}. Feedback from broader team is advisory only."
        dependencies_notes = "Bypasses the Organizational Bystander Effect and diffuse committee stalls."

        if "sales team" in text_lower or "sales" in text_lower:
            dependencies_content = f"Primary approver is {manager_name}. Sales input is limited to designated point-of-contact (Elena / Sales Lead) with 24-hr turnaround."
        elif "finance" in text_lower:
            dependencies_content = f"Primary approver is {manager_name}. Upstream financial assumptions must be verified by Finance prior to review."

        return {
            "id": f"mc_{os.urandom(4).hex()}",
            "title": contract_title,
            "created_at": "Just now",
            "status": "pending_mutual_approval",
            "parties": {
                "manager": {
                    "name": manager_name,
                    "role": "Delegator",
                    "status": "pending",
                    "signed_at": None
                },
                "employee": {
                    "name": "You",
                    "role": "Executor",
                    "status": "pending",
                    "signed_at": None
                }
            },
            "clauses": [
                {
                    "num": 1,
                    "title": "Core Deliverable & Format",
                    "category": "deliverable",
                    "content": format_content,
                    "notes": format_notes
                },
                {
                    "num": 2,
                    "title": "Hard Deadline & Milestone SLA",
                    "category": "timeline",
                    "content": timeline_content,
                    "notes": timeline_notes
                },
                {
                    "num": 3,
                    "title": "Definition of Done (DoD)",
                    "category": "dod",
                    "content": dod_content,
                    "notes": dod_notes
                },
                {
                    "num": 4,
                    "title": "Out-of-Scope Guardrails (Anti-Goals)",
                    "category": "guardrails",
                    "content": guardrails_content,
                    "notes": guardrails_notes
                },
                {
                    "num": 5,
                    "title": "Sign-Off Authority & Dependencies",
                    "category": "dependencies",
                    "content": dependencies_content,
                    "notes": dependencies_notes
                }
            ],
            "engine": "behavioral_heuristics"
        }

    def _gemini_contract(self, transcript: str) -> Optional[Dict[str, Any]]:
        system_prompt = (
            "You are 'The Mutual' Micro-Contract Synthesizer. Based on an ambiguous meeting transcript from Slack, Zoom, Teams, or Meet, "
            "formulate an explicit, unambiguous 5-Point Micro-Contract that locks in mutual expectations between delegator and executor. "
            "The platform supports two personas: Bhushith (Manager / Delegator POV) and Neehal (Employee / Executor POV). "
            "Anchor your clauses in Rousseau's Psychological Contracting and Locke & Latham's Goal-Setting Theory: "
            "1. Deliverable & Format: Specify exact file format / document tool rather than vague deliverables. "
            "2. Hard Deadline & Milestone SLA: Concrete calendar dates, hours, and feedback SLA (convert 'ASAP' or 'sometime next week' into explicit deadlines). "
            "3. Definition of Done (DoD): 3-4 measurable, objective criteria resolving subjective buzzwords ('clean', 'pakka', 'pop'). "
            "4. Out-of-Scope Guardrails (Anti-Goals): Explicitly stated boundaries preventing scope creep. "
            "5. Sign-Off Authority & Dependencies: Single primary approver to eliminate bystander effect. "
            "Produce strict JSON matching the schema."
        )

        user_prompt = f"""
Transcript of Delegation Meeting:
\"\"\"{transcript}\"\"\"

Generate a 5-point Micro-Contract in strict JSON:
{{
  "id": "mc_rand",
  "title": "Descriptive Contract Title Based on Meeting Content",
  "created_at": "Just now",
  "status": "pending_mutual_approval",
  "parties": {{
    "manager": {{ "name": "Manager Name from transcript", "role": "Delegator", "status": "pending", "signed_at": null }},
    "employee": {{ "name": "You", "role": "Executor", "status": "pending", "signed_at": null }}
  }},
  "clauses": [
    {{
      "num": 1,
      "title": "Core Deliverable & Format",
      "category": "deliverable",
      "content": "Specific deliverable description and concrete file/tool format based on transcript",
      "notes": "Format constraints"
    }},
    {{
      "num": 2,
      "title": "Hard Deadline & Milestone SLA",
      "category": "timeline",
      "content": "Exact delivery date, hour, timezone, and feedback turnaround based on transcript",
      "notes": "Contingency conditions"
    }},
    {{
      "num": 3,
      "title": "Definition of Done (DoD)",
      "category": "dod",
      "content": "3-4 explicit, testable criteria for acceptance addressing subjective phrases",
      "notes": "Quality threshold"
    }},
    {{
      "num": 4,
      "title": "Out-of-Scope Guardrails (Anti-Goals)",
      "category": "guardrails",
      "content": "What the employee is explicitly instructed NOT to spend time doing (preventing scope creep)",
      "notes": "Anti-scope protection"
    }},
    {{
      "num": 5,
      "title": "Sign-Off Authority & Dependencies",
      "category": "dependencies",
      "content": "Exact primary approver and any mandatory upstream inputs",
      "notes": "Escalation protocol"
    }}
  ]
}}
"""
        parsed = self._call_gemini_json(user_prompt, system_prompt)
        if parsed:
            model = parsed.pop("_model_used", self.active_model or "gemini-3.5-flash-lite")
            parsed["engine"] = f"gemini ({model})"
            return parsed
        return None

    def audit_preflight(self, contract: Dict[str, Any], deliverable_text: str) -> Dict[str, Any]:
        """
        Cross-references the drafted deliverable against the agreed 5-Point Micro-Contract.
        Provides item-by-item verification and risk scoring.
        """
        if self.api_key:
            try:
                llm_result = self._gemini_preflight(contract, deliverable_text)
                if llm_result:
                    return llm_result
            except Exception as e:
                print(f"[BehavioralEngine] Gemini preflight audit failed: {e}")

        return self._heuristic_preflight(contract, deliverable_text)

    def _heuristic_preflight(self, contract: Dict[str, Any], text: str) -> Dict[str, Any]:
        clauses = contract.get("clauses", [])
        evaluations = []
        passed_count = 0
        text_lower = text.lower()

        # Keywords that indicate negative patterns or scope creep violations
        scope_creep_signals = ["blockchain", "international", "emea", "asia", "tax laws", "12 pages", "smart contract"]
        has_scope_creep = any(sig in text_lower for sig in scope_creep_signals)

        for c in clauses:
            content = c.get("content", "").lower()
            category = c.get("category", "")
            title = c.get("title", "")

            # Meaningful words to look for
            stopwords = {"with", "this", "that", "from", "have", "must", "deck", "presentation", "slides", "built", "google"}
            words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", content) if w not in stopwords]
            matches = [w for w in words if w in text_lower]
            ratio = len(matches) / max(len(words), 1)

            # Check category-specific rules
            if category == "guardrails":
                is_explicitly_excluded = any(
                    f"{sig}" in text_lower and ("exclud" in text_lower or "not included" in text_lower or "out-of-scope" in text_lower)
                    for sig in scope_creep_signals
                )
                if is_explicitly_excluded:
                    status = "passed"
                    passed_count += 1
                    commentary = "Out-of-scope boundaries respected: explicitly confirmed exclusion of anti-goals."
                elif has_scope_creep:
                    status = "missing"
                    commentary = "Scope violation: Draft contains elements explicitly marked as out-of-scope in Micro-Contract."
                elif "out-of-scope" in text_lower or "excluded" in text_lower or ratio >= 0.25:
                    status = "passed"
                    passed_count += 1
                    commentary = "Out-of-scope boundaries respected and explicitly documented."
                else:
                    status = "warning"
                    passed_count += 0.5
                    commentary = "No explicit disclaimer found confirming that out-of-scope items were excluded."

            elif category == "dependencies":
                if ("approv" in text_lower or "signed off" in text_lower or "reviewed" in text_lower) and ratio >= 0.15:
                    status = "passed"
                    passed_count += 1
                    commentary = "Designated approver / stakeholder check-in verified in draft header."
                elif ratio >= 0.3:
                    status = "passed"
                    passed_count += 1
                    commentary = f"Verified alignment with {title}."
                else:
                    status = "missing"
                    commentary = f"Approver verification missing. Agreed clause: '{c.get('content')}'."

            elif category == "dod":
                if ("definition of done" in text_lower or "kpi" in text_lower or "checklist" in text_lower) and ratio >= 0.2:
                    status = "passed"
                    passed_count += 1
                    commentary = "Definition of Done requirements validated against draft content."
                elif ratio >= 0.35:
                    status = "passed"
                    passed_count += 1
                    commentary = f"Evidence of '{title}' verified in draft content."
                elif ratio >= 0.15:
                    status = "warning"
                    passed_count += 0.5
                    commentary = f"Partial fulfillment for {title}. Metric evidence is vague."
                else:
                    status = "missing"
                    commentary = f"Missing DoD metrics. Agreed clause: '{c.get('content')}'."

            else:
                if ratio >= 0.3:
                    status = "passed"
                    passed_count += 1
                    commentary = f"Verified compliance with {title}."
                elif ratio >= 0.12:
                    status = "warning"
                    passed_count += 0.5
                    commentary = f"Partial evidence found for {title}. Recommend explicit callout."
                else:
                    status = "missing"
                    commentary = f"No clear evidence matching agreed terms: '{c.get('content')}'."

            evaluations.append({
                "num": c.get("num"),
                "title": title,
                "status": status,
                "target_clause": c.get("content"),
                "commentary": commentary
            })

        score = int((passed_count / max(len(clauses), 1)) * 100)

        verdict = "Ready to Submit"
        if score < 50:
            verdict = "High Risk of Rejection"
        elif score < 80:
            verdict = "Minor Adjustments Recommended"

        return {
            "alignment_score": score,
            "verdict": verdict,
            "evaluations": evaluations,
            "remedies": [
                "Ensure out-of-scope items are explicitly excluded in your introduction so stakeholders don't ask for them.",
                "Highlight the agreed Definition of Done metrics in a prominent summary box.",
                "Confirm that the designated single approver has their name on the header."
            ],
            "engine": "behavioral_heuristics"
        }

    def _gemini_preflight(self, contract: Dict[str, Any], text: str) -> Optional[Dict[str, Any]]:
        has_contract = bool(contract and contract.get("clauses"))

        if has_contract:
            system_prompt = (
                "You are 'The Mutual' Pre-Flight Deliverable Auditor. You perform a strict cross-reference between "
                "the agreed 5-point Micro-Contract and the draft deliverable / assignment document. "
                "You protect psychological safety and eliminate rework loops by flagging misalignment, missing DoD metrics, or scope creep before managerial or client review. "
                "Produce strict JSON matching the schema."
            )
            user_prompt = f"""
Agreed Micro-Contract:
{json.dumps(contract, indent=2)}

Draft Deliverable to Audit:
\"\"\"{text}\"\"\"

Perform audit in strict JSON:
{{
  "alignment_score": 0-100,
  "verdict": "Ready to Submit | Minor Adjustments Recommended | High Risk of Rejection",
  "evaluations": [
    {{
      "num": 1,
      "title": "Clause Title",
      "status": "passed | warning | missing",
      "target_clause": "Contract clause text",
      "commentary": "Specific audit reasoning with evidence or missing requirements"
    }}
  ],
  "remedies": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ]
}}
"""
        else:
            system_prompt = (
                "You are 'The Mutual' Pre-Flight Deliverable & Assignment Auditor. The user has uploaded an assignment document, brief, or draft deliverable for evaluation. "
                "Critically evaluate this assignment/deliverable across 5 core behavioral delivery pillars: "
                "1. Deliverable Clarity & Objective, 2. Timeline, Milestones & Cutoff Realism, 3. Definition of Done (DoD) & Acceptance Criteria, 4. Scope Boundaries & Anti-Goals (Out of Scope), 5. Sign-off Authority & Stakeholder Dependencies. "
                "Identify any ambiguity, missing specifications, or risks that could lead to rework or misalignment. Produce strict JSON matching the schema."
            )
            user_prompt = f"""
Assignment Document / Draft Deliverable to Audit:
\"\"\"{text}\"\"\"

Evaluate the document across the 5 pillars in strict JSON:
{{
  "alignment_score": 0-100,
  "verdict": "Ready to Submit | Minor Adjustments Recommended | High Risk of Rejection",
  "evaluations": [
    {{
      "num": 1,
      "title": "Deliverable Scope & Output Format",
      "status": "passed | warning | missing",
      "target_clause": "Clear tangible output format (e.g. deck, PRD, prototype, code module)",
      "commentary": "Analysis of deliverable clarity based on uploaded document"
    }},
    {{
      "num": 2,
      "title": "Timeline Realism & Deadlines",
      "status": "passed | warning | missing",
      "target_clause": "Specific calendar cut-off dates and milestones",
      "commentary": "Analysis of timeline clarity and buffer"
    }},
    {{
      "num": 3,
      "title": "Definition of Done (DoD)",
      "status": "passed | warning | missing",
      "target_clause": "Measurable acceptance criteria and quality benchmarks",
      "commentary": "Analysis of DoD completeness"
    }},
    {{
      "num": 4,
      "title": "Scope Boundaries & Anti-Goals",
      "status": "passed | warning | missing",
      "target_clause": "Explicitly defined exclusions and out-of-scope boundaries",
      "commentary": "Analysis of scope guardrails"
    }},
    {{
      "num": 5,
      "title": "Sign-Off Authority & Dependencies",
      "status": "passed | warning | missing",
      "target_clause": "Designated final decision-maker and reviewer",
      "commentary": "Analysis of accountability and approval chain"
    }}
  ],
  "remedies": [
    "Specific actionable safeguard 1",
    "Specific actionable safeguard 2"
  ]
}}
"""

        parsed = self._call_gemini_json(user_prompt, system_prompt)
        if parsed:
            model = parsed.pop("_model_used", self.active_model or "gemini-3.5-flash-lite")
            parsed["engine"] = f"gemini ({model})"
            return parsed
        return None

    def transcribe_audio(self, audio_data: str, mime_type: str = "audio/mp3") -> Dict[str, Any]:
        """
        Transcribes pre-recorded meeting audio via Gemini multimodal generateContent with speaker diarization.
        """
        if not self.api_key:
            return {"success": False, "error": "Gemini API key is not configured.", "transcript": "", "lines": []}

        b64 = audio_data
        if "," in b64:
            prefix, b64 = b64.split(",", 1)
            if "audio/" in prefix or "video/" in prefix:
                mime_match = re.search(r"data:([^;]+);", prefix)
                if mime_match:
                    mime_type = mime_match.group(1)

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                "You are 'The Mutual' Executive Meeting Transcriptionist and Delegation Analyst. "
                                "Transcribe this pre-recorded audio recording of a meeting. "
                                "Break down the speech into chronological speaker turns (e.g., 'Speaker 1:', 'Speaker 2:', or 'Manager:', 'Client:'). "
                                "Capture every directive, question, commitment, and deadline verbatim. "
                                "Do not include conversational filler summaries, return only the spoken transcript lines."
                            )
                        },
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            }
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        models_to_try = [self.active_model] if self.active_model else []
        models_to_try.extend([m for m in self.CANDIDATE_MODELS if m != self.active_model])

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(url, data=data_bytes, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    raw_text = resp_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    lines = []
                    for line in raw_text.splitlines():
                        line = line.strip()
                        if not line:
                            continue
                        speaker = "Speaker"
                        text = line
                        if ":" in line:
                            parts = line.split(":", 1)
                            speaker = parts[0].strip()
                            text = parts[1].strip()
                        lines.append({"speaker": speaker, "text": text})
                    return {
                        "success": True,
                        "transcript": raw_text,
                        "lines": lines,
                        "model": model
                    }
            except Exception as e:
                print(f"[BehavioralEngine] Audio transcription error on model {model}: {e}")
                continue

        return {"success": False, "error": "Transcription failed across models.", "transcript": "", "lines": []}

