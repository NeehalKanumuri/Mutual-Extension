"""
The Mutual - Preset OB Meeting Scenarios & Evaluation Data
Enables 1-click live simulation and interactive testing.
"""

SCENARIOS = [
    {
        "id": "scenario_executive_deck",
        "title": "The Bangalore Executive Sync (Bellandur Tech Park)",
        "role": "Marcus (VP Operations) delegating to Product Lead",
        "description": "Quintessential Bangalore tech park delegation: high power-distance, casual colloquialisms ('do one thing', 'pakka', 'sometime next week only'), and creeping scope.",
        "dialogue_stream": [
            {
                "speaker": "Marcus (VP)",
                "timestamp": "00:04",
                "text": "Hey boss, thanks for jumping on a quick sync. What's the scene with our Q4 pilot rollout?"
            },
            {
                "speaker": "Marcus (VP)",
                "timestamp": "00:12",
                "text": "Do one thing: sometime next week only, put together a clean deck for the leadership review."
            },
            {
                "speaker": "Marcus (VP)",
                "timestamp": "00:21",
                "text": "Make sure it looks pakka professional, give it some proper polish so it pops, boss."
            },
            {
                "speaker": "Marcus (VP)",
                "timestamp": "00:30",
                "text": "Also, just touch upon international pricing and throw in a few competitor benchmarks if you can, adjust maadi."
            },
            {
                "speaker": "Marcus (VP)",
                "timestamp": "00:41",
                "text": "Loop in whoever from the Outer Ring Road sales team needs to see it, and ping me off-line once it's in good shape. Pakka?"
            }
        ],
        "full_transcript": (
            "Marcus (VP): Hey boss, thanks for jumping on a quick sync. What's the scene with our Q4 pilot rollout? "
            "Do one thing: sometime next week only, put together a clean deck for the leadership review. "
            "Make sure it looks pakka professional, give it some proper polish so it pops, boss. "
            "Also, just touch upon international pricing and throw in a few competitor benchmarks if you can, adjust maadi. "
            "Loop in whoever from the Outer Ring Road sales team needs to see it, and ping me off-line once it's in good shape. Pakka?"
        ),
        "ideal_contract": {
            "title": "Q4 Pilot Rollout Executive Deck - Alignment Contract",
            "clauses": [
                {
                    "num": 1,
                    "title": "Core Deliverable & Format",
                    "category": "deliverable",
                    "content": "A 5-slide Google Slides presentation formatted according to the 2026 Executive Brand Template.",
                    "notes": "No docs or spreadsheets; clean executive slide summary."
                },
                {
                    "num": 2,
                    "title": "Hard Deadline & Milestone SLA",
                    "category": "timeline",
                    "content": "Draft delivered by Wednesday at 3:00 PM EST. Marcus to provide written comments within 24 hours.",
                    "notes": "Final deck locked by Friday at 11:00 AM EST."
                },
                {
                    "num": 3,
                    "title": "Definition of Done (DoD)",
                    "category": "dod",
                    "content": "Includes: (1) Pilot KPI funnel metrics, (2) Top 3 churn risks, (3) Next 90-day expansion roadmap.",
                    "notes": "Verified against raw telemetry data."
                },
                {
                    "num": 4,
                    "title": "Out-of-Scope Guardrails (Anti-Goals)",
                    "category": "guardrails",
                    "content": "Explicitly EXCLUDE international pricing models and video demos to prevent scope ballooning.",
                    "notes": "Deferred to Phase 2 review."
                },
                {
                    "num": 5,
                    "title": "Sign-Off Authority & Dependencies",
                    "category": "dependencies",
                    "content": "Sole approval required from Marcus (VP). Sales feedback limited to Elena (Head of Enterprise) by Tuesday EOD.",
                    "notes": "Eliminates diffuse bystander reviews."
                }
            ]
        },
        "sample_deliverables": {
            "strong": (
                "# Q4 Pilot Rollout Executive Presentation\n\n"
                "**Format**: 5-Slide Google Slides deck built on Executive Brand Template 2026.\n"
                "**Status**: Draft for Wednesday 3:00 PM Review | Designated Approver: Marcus (VP)\n\n"
                "### Summary of Contents & Definition of Done:\n"
                "1. **Slide 1 - Executive Summary**: Core pilot KPIs and 42% retention uplift across Cohort A.\n"
                "2. **Slide 2 - Top 3 Churn Risks**: Granular breakdown of enterprise onboarding friction points.\n"
                "3. **Slide 3 - 90-Day Expansion Roadmap**: Concrete milestone timeline with resource allocation.\n"
                "4. **Slide 4 - Key Domestic Competitor Benchmarks**: 3-point parity comparison chart.\n"
                "5. **Slide 5 - Immediate Decision Framework**: Budget sign-off request.\n\n"
                "### Out-of-Scope Boundaries:\n"
                "*Note: As agreed in our delegation handshake, international pricing modeling and live video captures have been excluded from this deck to maintain executive focus on domestic Q4 outcomes.*\n\n"
                "### Approvals & Feedback:\n"
                "Elena (Head of Enterprise Sales) has reviewed and signed off on Slide 4 data points."
            ),
            "flawed": (
                "# Some Thoughts on Q4\n\n"
                "Here is a quick draft of what we discussed.\n"
                "We looked at churn and it seems okay. We also added 12 pages on international EMEA pricing strategies "
                "and spent 3 days researching Asian market tax laws. Still waiting to hear from everyone on the sales team "
                "to see if they like the colors."
            )
        }
    },
    {
        "id": "scenario_feature_spec",
        "title": "The Undefined Feature Spec (Engineering Misalignment)",
        "role": "Product Manager delegating to Tech Lead",
        "description": "Vague scope boundaries ('touch on payment options') resulting in over-engineered architectures.",
        "dialogue_stream": [
            {
                "speaker": "Rhea (PM)",
                "timestamp": "00:03",
                "text": "Hey team, we need a spec for the refreshed customer checkout flow."
            },
            {
                "speaker": "Rhea (PM)",
                "timestamp": "00:11",
                "text": "Send me something whenever you get a chance, maybe a quick write-up."
            },
            {
                "speaker": "Rhea (PM)",
                "timestamp": "00:19",
                "text": "Just touch on payment gateway options and do your magic on the error handling."
            },
            {
                "speaker": "Rhea (PM)",
                "timestamp": "00:28",
                "text": "Check with the team to make sure everyone is cool with it before Friday."
            }
        ],
        "full_transcript": (
            "Rhea (PM): Hey team, we need a spec for the refreshed customer checkout flow. "
            "Send me something whenever you get a chance, maybe a quick write-up. "
            "Just touch on payment gateway options and do your magic on the error handling. "
            "Check with the team to make sure everyone is cool with it before Friday."
        ),
        "ideal_contract": {
            "title": "Checkout Flow Architecture Spec - Alignment Contract",
            "clauses": [
                {
                    "num": 1,
                    "title": "Core Deliverable & Format",
                    "category": "deliverable",
                    "content": "A 2-page Notion RFC document detailing the checkout sequence and API endpoints.",
                    "notes": "Standard RFC template with sequence diagrams."
                },
                {
                    "num": 2,
                    "title": "Hard Deadline & Milestone SLA",
                    "category": "timeline",
                    "content": "RFC published for comments by Thursday 12:00 PM; feedback window closes Friday 4:00 PM.",
                    "notes": "No asynchronous feedback accepted after window closes."
                },
                {
                    "num": 3,
                    "title": "Definition of Done (DoD)",
                    "category": "dod",
                    "content": "Defines Stripe vs Adyen comparison, retry logic for 402 card failures, and latency SLAs under 250ms.",
                    "notes": "Passes engineering architecture council checklist."
                },
                {
                    "num": 4,
                    "title": "Out-of-Scope Guardrails (Anti-Goals)",
                    "category": "guardrails",
                    "content": "Crypto wallet integration and multi-currency tax calculation are explicitly out of scope for V1.",
                    "notes": "Scheduled for Q2 evaluation."
                },
                {
                    "num": 5,
                    "title": "Sign-Off Authority & Dependencies",
                    "category": "dependencies",
                    "content": "Approval required from Rhea (PM) and Dave (Staff Architect). Security review required only if PII touched.",
                    "notes": "Closes diffuse review loop."
                }
            ]
        },
        "sample_deliverables": {
            "strong": (
                "# RFC-402: Refreshed Customer Checkout Flow Architecture\n\n"
                "**Author**: Tech Lead | **Primary Approvers**: Rhea (PM), Dave (Staff Architect)\n"
                "**Review Cutoff**: Friday 4:00 PM EST\n\n"
                "## 1. Scope & Deliverable Format\n"
                "2-Page architectural specification covering API interaction and state machine transitions.\n\n"
                "## 2. Definition of Done Checklist\n"
                "- [x] Payment Gateway Evaluation: Comprehensive matrix between Stripe Elements and Adyen Drop-in.\n"
                "- [x] Robust Error Handling: Automated exponential backoff for HTTP 402/503 errors.\n"
                "- [x] Latency Benchmark: Architecture verified to maintain < 250ms roundtrip payload.\n\n"
                "## 3. Explicit Anti-Goals (Out of Scope)\n"
                "Cryptocurrency settlement and cross-border currency conversions are strictly excluded for V1 as agreed in the Micro-Contract."
            ),
            "flawed": (
                "Here's the checkout stuff. We built a full blockchain smart contract prototype because we felt like exploring it. "
                "Didn't write down error handling yet. Let us know what you think sometime."
            )
        }
    }
]
