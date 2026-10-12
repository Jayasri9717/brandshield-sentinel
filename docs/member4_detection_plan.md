# Member 4 — Detection and Risk Scoring Plan

## 1. Authoritative Project Structure

The `core/` directory is the authoritative location for detection
and agent modules.

## 2. Detection Modules

- core/detection/similarity.py
- core/detection/homoglyph.py
- core/detection/image_hash.py
- core/detection/dns_check.py

## 3. Agent Modules

- core/agents/lookalike_agent.py
- core/agents/scoring_agent.py

## 4. Data Loading

- core/data/loader.py

## 5. Tests

Existing tests:
- tests/test_similarity.py
- tests/test_social_agent.py
- tests/test_integration.py

Any additional detection tests must be created and verified
before being included in the project plan.

## 6. Import Convention

Use imports from the `core` package where appropriate.

Do not use backend.app.detection, backend.app.agents,
or backend.app.data as module paths.

## 7. Integration Requirements

- Keep detection logic inside core/.
- Let the FastAPI backend import the core modules.
- Coordinate module interfaces with the backend developer.
- Test imports and detection behavior before merging changes.
- Document any changes to module paths.