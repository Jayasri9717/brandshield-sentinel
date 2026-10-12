"""Generate look-alike domain candidates and check liveness."""
from core.agents.base_agent import BaseAgent, AgentResult
from core.models.schemas import Detection
from core.detection.dns_check import domain_resolves, http_status, brand_on_page


class LookalikeAgent(BaseAgent):
    def generate_candidates(self, base: str) -> list:
        base = base.lower().replace(" ", "")
        candidates = []

        # Character swaps
        for i in range(len(base) - 1):
            swapped = base[:i] + base[i+1] + base[i] + base[i+2:]
            candidates.append({"domain": swapped + ".com", "type": "char_swap"})

        # Homoglyphs
        homoglyphs = {"a": "а", "e": "е", "o": "о", "p": "р", "c": "с"}
        for char, rep in homoglyphs.items():
            if char in base:
                candidates.append({
                    "domain": base.replace(char, rep, 1) + ".com",
                    "type": "homoglyph",
                })

        # Added words
        for word in ["support", "help", "official", "login", "verify"]:
            candidates.append({
                "domain": f"{base}-{word}.com",
                "type": "word_addition",
            })

        # TLD swaps
        for tld in [".co", ".net", ".org", ".info"]:
            candidates.append({"domain": base + tld, "type": "tld_swap"})

        return candidates

    def detect(self, _=None) -> AgentResult:
        candidates = self.generate_candidates(self.brand.brand_name)
        detections = []

        for c in candidates:
            domain = c["domain"]
            if not domain_resolves(domain):
                continue
            status = http_status(f"http://{domain}")
            if status is None or status >= 400:
                continue

            on_page = brand_on_page(f"http://{domain}", self.brand.brand_name)
            risk = 0.4 + (0.3 if status == 200 else 0) + (0.3 if on_page else 0)
            if c["type"] == "homoglyph":
                risk += 0.1

            det = Detection(
                source="lookalike",
                brand_name=self.brand.brand_name,
                identifier=domain,
                model_score=min(risk, 1.0),
                rule_score=0.5,
                evidence=[
                    f"Permutation: {c['type']}",
                    f"HTTP status: {status}",
                    f"Brand mentioned on page: {on_page}",
                ],
                raw_data=c,
            )
            detections.append(det)

        return AgentResult(
            detections=detections,
            summary=f"Found {len(detections)} live look-alike domains",
        )
