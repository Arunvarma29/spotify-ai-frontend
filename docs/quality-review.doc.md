# Quality review — screen document

**Screen 6 of 7** · **Route:** `/quality` · **File:** `apps/memory-console/app/quality/page.tsx`

**Requirement — `abc.md:344`:** *"Quality review: Golden-set runs, failure
clusters, multilingual cases, contradiction cases, and side-by-side
memory-enabled comparisons."*

---

## Call flow

1. **`useEffect`** on load → **`get<QualityRuns>("/quality/runs")`** — `lib/api.ts`
   → `/api/backend/quality/runs` on the console's own server, which checks the
   login pass and forwards it.
   → **Backend `GET /quality/runs`** →
   - **`db.golden_runs()`** → **PostgreSQL** `golden_run`, every run newest first
   - **`db.golden_cases()`** → **PostgreSQL** `golden_case_result`, the newest
     run's cases
   - **`db.experiment_status()`** → **PostgreSQL** `experiment_cohort`, the
     memory-enabled / memory-disabled split

2. **`setData()`** — the screen then derives its views in the browser from that
   response: release gates, failure clusters, multilingual cases, contradiction
   cases, and whether the current account may start a run.

3. An allowlisted quality admin can click **Run golden set**. The console sends
   `POST /api/backend/quality/runs` → the backend authorizes the subject against
   `QUALITY_ADMIN_SUBJECTS`, rejects overlapping runs, and starts the runner in
   a background thread. The screen polls `GET /quality/runs` until it completes.
   The command-line `python scripts/run_golden_set.py` remains available too.

---

## Where the cases come from

`data/golden-sets/pilot_golden_set.json` in the backend repository. Twelve
cases across the six categories `abc.md:148` names:

| Category | Cases |
|---|---|
| Explicit preference | 2 |
| Temporal change | 2 — one correction, one expiry |
| Contradiction | 3 — including surface eligibility |
| Multilingual | 2 — Spanish and Hindi intents against English memories |
| Sparse history | 2 — no history, and low-confidence-only |
| Malicious stored text | 2 — an injection attempt and a fence-breakout attempt |

Each case carries the five expectations `abc.md:295` requires: the expected
graph state, the retrieved top memories, the prohibited memories, the context
budget, and the correction or deletion outcome. Every subject is synthetic and
belongs to the golden set alone, created and cleared by the runner, so a run
never touches the demo subjects.

---

## The three release gates

`abc.md:361`: *"No launch if cross-subject leakage is observed, deletion
propagation is incomplete, provenance falls below threshold, or personalized
output materially underperforms the memory-disabled baseline."*

So the top card is a gate, not a report. Each measure says plainly whether it
clears.

| Measure | Target | Why |
|---|---|---|
| **Provenance completeness** | ≥ 1.00 | `abc.md:361`. Every context item must carry its source class and the reason it was chosen. |
| **Precision at the top** | ≥ 0.90 | `abc.md:82` — *"precision at the top of the retrieved set, not just retrieval recall. One wrong memory can be more damaging than three missing ones."* |
| **Contradiction rate** | ≤ 0.00 | `abc.md:153`. How often a contradiction case was handled wrongly. |

A leaked prohibited memory fails its case outright, for the same reason
`abc.md:82` gives: one wrong memory is worse than three missing ones.

---

## The golden set found a real bug

On its first run, `contradiction_01_exclusion_wins` failed.

Creating a `candidate_preference` about country music with 0.5 confidence
**silently superseded** a stated `exclusion` about country music. The exclusion
was closed, only the guess survived, and because a candidate preference is not
eligible on the player surface, the listener would then have been answered with
no memory at all — and played the one thing they had ruled out.

The cause was in the backend's `memory/graph.py`: `OPPOSING` contained
`("candidate_preference", "exclusion")`, which let an inferred memory close a
stated one. `abc.md:49` says a candidate preference becomes durable *"only after
explicit confirmation or repeated supporting evidence"*, so it cannot outrank
something the listener said outright.

Fixed by refusing any supersession where the new memory is inferred and the
existing one is stated. The reverse still works: a stated exclusion does close a
guess. Two regression tests now cover both directions, and the run is 12/12.

That is what a golden set is for, and it is the reason this screen exists.

---

## What is shown, against the requirement

| Asked for | Where |
|---|---|
| Golden-set runs | The latest run, its three gates, and every earlier run beneath |
| Failure clusters | Cases grouped by category, failures listed with their reason |
| Multilingual cases | Their own card, with the locale and how many expected memories were found |
| Contradiction cases | Their own card, with whether anything prohibited leaked |
| Side-by-side memory-enabled comparisons | The cohort card: how many subjects are answered with memory and how many without |

---

## The memory-disabled baseline

`abc.md:146` asks for *"memory-enabled and memory-disabled experiments under
consistent cohort allocation"*. Consistent means a subject keeps its cohort, so
the allocation is stored in `experiment_cohort` rather than decided per request.

A subject in the memory-disabled arm gets an explicit no-memory package from
`POST /v1/context/compose`, taking the same path as any other fallback rather
than a special case — which is what makes it a fair baseline.

`user_003` is allocated to that arm. Log in as `user_003` (locally, with
`DEMO_PASSWORD`) and open **Context preview** to see it.

---

## Functions

| Function | File | Why it exists |
|---|---|---|
| `QualityReviewPage()` | `app/quality/page.tsx` | The screen; holds the one response everything is derived from. |
| `clusters` | same | Cases grouped by category, so a pattern shows rather than a list of individual failures. |
| `GATES` | same | The three release measures, each with its target and the requirement line behind it. |
| `CATEGORY_LABEL` | same | The six `abc.md:148` categories in plain words. |
| `get()` | `lib/api.ts` | The one call this screen makes. |

### In the backend

| Function | File | Why it exists |
|---|---|---|
| `main()` | `scripts/run_golden_set.py` | Runs every case and records the run. |
| `prepare()` | same | Seeds a case's memories and applies any correction or expiry it asks for first. |
| `wait_for_index()` | same | Waits for embeddings, because a memory is in the graph a moment before it is searchable. |
| `score()` | same | Checks all five expectations of `abc.md:295` against the context package, which is what actually reaches a model. |
| `clear_subject()` | same | Clears the synthetic subject before and after, so a run is repeatable. |
| `db.golden_runs()`, `db.golden_cases()` | `memory/db.py` | The reads behind this screen. |
| `POST /quality/runs` | `memory/api.py` | Starts a background evaluation only for allowlisted subjects. |
| `QUALITY_ADMIN_SUBJECTS` | Render environment | Comma-separated subject IDs allowed to start runs; empty disables the button. |

---

## Running it

```bash
python scripts/run_golden_set.py
```

Takes about a minute. Exits non-zero if any case fails, so it can gate a build.
Each run resets only synthetic golden-test subjects; use a staging database
when possible.
