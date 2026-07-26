---
name: site-delivery
description: Delivers an approved corporate handoff through ADR-scoped implementation and independent site verification.
---

# Site delivery

1. Verify the handoff digest.
2. Have the readonly site manager return bounded ADR packets.
3. The root orchestrator launches site specialists in isolated roots.
4. Integrate and run `scripts/harness/verify.sh`.
5. Record `verification_scripts` as site-relative `scripts/harness` (only
   `verify.sh` and `adversarial.sh`). Do not bind the whole `scripts/` tree.
6. Ask operations excellence to review fresh evidence.
7. Return failures to the owning ADR; never bypass retries or self-approve.
