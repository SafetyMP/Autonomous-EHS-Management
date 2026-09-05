# Factory overlay

Community contributors and coding agents: start at [AGENTS.md](../AGENTS.md). The following site-contract and corporate-handoff text is the factory overlay (moved verbatim from the former AGENTS.md lead).

# Site contract

## Gates


| Command | Purpose |
|---|---|
| `./scripts/verify.sh` | Functional and static acceptance |
| `./scripts/adversarial.sh` | Authorized local adversarial probes |

Record `verification_scripts` as site-relative `scripts/harness` (exactly `verify.sh` and `adversarial.sh`). Optional wrappers may remain at `scripts/verify.sh` / `scripts/adversarial.sh` for humans; they are outside the digest boundary.

The corporate handoff fixes scope. The site manager assigns ADRs; site specialists write;
the root orchestrator dispatches nondelegating workers and runs gate commands; operations
excellence reviews immutable root-produced evidence. Work in isolated roots, never edit
corporate approval state, and never self-approve. A site role cannot return work to
corporate design; that boundary requires an explicit user rework authorization.

Site id: `ehs`. Prior Cursor Harness v4 is under `_archives/harness-v4/`.
