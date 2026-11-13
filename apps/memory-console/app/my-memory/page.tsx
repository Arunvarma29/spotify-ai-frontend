"use client";

import { useEffect, useState } from "react";
import { ApiFailure, del, get, patch, post } from "@/lib/api";
import type {
  ConsentState,
  DeletionAccepted,
  DeletionStatus,
  MemoryUpdated,
  RankedMemory,
  SearchResult,
} from "@/lib/types";
import { Badge, Button, Card, ErrorNote, inputClass } from "@/components/ui";

const IN_PLAIN_WORDS: Record<string, string> = {
  explicit_preference: "You told us this",
  exclusion: "You asked us not to",
  correction: "You corrected this",
  candidate_preference: "We noticed this",
  episode: "Something you did",
};

function weGuessed(memoryType: string): boolean {
  return memoryType === "candidate_preference" || memoryType === "episode";
}

export default function MyMemoryPage() {
  const [memories, setMemories] = useState<RankedMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removal, setRemoval] = useState<DeletionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<ConsentState | null>(null);

  async function load() {
    setLoading(true);
    setFailure(null);
    try {
      const found = await post<SearchResult>("/v1/memories/search", {
        intent: "everything you have told us",
        surface: "chat",
        limit: 50,
      });
      setMemories(found.results);
    } catch (error) {
      setFailure(error as ApiFailure);
    } finally {
      setLoading(false);
    }
  }

  async function loadConsent() {
    try {
      setConsent(await get<ConsentState>("/v1/consent"));
    } catch (error) {
      setFailure(error as ApiFailure);
    }
  }

  useEffect(() => {
    void load();
    void loadConsent();
  }, []);

  async function setConsentState(state: "granted" | "paused" | "denied") {
    setBusy(true);
    setFailure(null);
    try {
      const next = await patch<ConsentState>("/v1/consent", { state });
      setConsent(next);
      setNote(next.meaning);
      await load();
    } catch (error) {
      setFailure(error as ApiFailure);
    } finally {
      setBusy(false);
    }
  }

  async function saveCorrection(memory: RankedMemory) {
    setBusy(true);
    setFailure(null);
    try {
      const updated = await patch<MemoryUpdated>(`/v1/memories/${memory.memory_id}`, {
        operation: "correct",
        expected_version: 1,
        fact: draft,
        entities: [],
        confidence: 1.0,
      });
      setEditing(null);
      setNote("Saved. We will use your wording from now on.");
      await post("/v1/feedback", {
        kind: "correction",
        sentiment: "wrong",
        memory_id: updated.memory_id,
      }).catch(() => undefined);
      await load();
    } catch (error) {
      setFailure(error as ApiFailure);
    } finally {
      setBusy(false);
    }
  }

  async function sayItsWrong(memory: RankedMemory) {
    setBusy(true);
    setFailure(null);
    try {
      await post("/v1/feedback", {
        kind: "rejection",
        sentiment: "wrong",
        memory_id: memory.memory_id,
      });
      setNote("Thanks. We will stop leaning on that.");
    } catch (error) {
      setFailure(error as ApiFailure);
    } finally {
      setBusy(false);
    }
  }

  async function remove(memory: RankedMemory) {
    setBusy(true);
    setFailure(null);
    setRemoving(memory.memory_id);
    setRemoval(null);
    try {
      const accepted = await del<DeletionAccepted>(`/v1/memories/${memory.memory_id}`);
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const status = await get<DeletionStatus>(`/v1/deletions/${accepted.job_id}`);
        setRemoval(status);
        if (status.status !== "pending" && status.status !== "in_progress") break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await load();
    } catch (error) {
      setFailure(error as ApiFailure);
    } finally {
      setBusy(false);
    }
  }

  const stillThere = Object.entries(removal?.stores ?? []).filter(
    ([, state]) => !["deleted", "nothing_to_delete", "retained_by_policy"].includes(state),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <p className="eyebrow">Your personal space</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Your memory controls
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review, change, or remove what the assistant remembers about you.
        </p>
      </header>

      {note && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
          {note}
        </div>
      )}

      {failure && (
        <ErrorNote
          code={failure.code}
          message={failure.message}
          correlationId={failure.correlationId}
        />
      )}

      <Card
        title="What we remember"
        hint="Only things you have told us, or that we noticed and marked as a guess."
        right={
          <Button variant="ghost" onClick={load} disabled={loading || busy}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : memories.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet. As you use Spotify&apos;s AI features, anything worth
            remembering will appear here — and you can change or remove it.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {memories.map((memory) => (
              <li
                key={memory.memory_id}
                className="rounded-lg border border-edge bg-raised p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={weGuessed(memory.memory_type) ? "warn" : "good"}>
                    {IN_PLAIN_WORDS[memory.memory_type] ?? memory.memory_type}
                  </Badge>
                  {weGuessed(memory.memory_type) && (
                    <span className="text-[11px] text-faint">
                      a guess, not something you said
                    </span>
                  )}
                </div>

                {editing === memory.memory_id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      className={inputClass}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveCorrection(memory)}
                        disabled={busy || !draft.trim() || draft === memory.fact}
                      >
                        {busy ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-ink wrap-anywhere">{memory.fact}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(memory.memory_id);
                          setDraft(memory.fact);
                          setNote(null);
                        }}
                      >
                        Change the wording
                      </Button>
                      {weGuessed(memory.memory_type) && (
                        <Button
                          variant="ghost"
                          onClick={() => sayItsWrong(memory)}
                          disabled={busy}
                        >
                          That&apos;s not right
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => remove(memory)}
                        disabled={busy}
                      >
                        {removing === memory.memory_id && busy ? "Removing…" : "Remove"}
                      </Button>
                    </div>
                  </>
                )}

                {removing === memory.memory_id && removal && (
                  <div className="mt-3 rounded-lg border border-edge bg-base px-3 py-2">
                    {stillThere.length > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-bad">Not fully removed yet</p>
                        <p className="mt-1 text-xs text-muted">
                          We could not finish removing this everywhere. It may still be used.
                          Please try again in a moment.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-accent">Removed</p>
                        <p className="mt-1 text-xs text-muted">
                          Gone from everywhere we use it. A copy may remain in a backup until
                          that backup expires, but nothing will read it.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Pause or turn off memory"
        hint="Takes effect on your very next request. Nothing is deleted."
      >
        <div className="flex flex-col gap-3">
          {consent && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  consent.state === "granted"
                    ? "good"
                    : consent.state === "paused"
                      ? "warn"
                      : "bad"
                }
              >
                {consent.state === "granted"
                  ? "memory is on"
                  : consent.state === "paused"
                    ? "memory is paused"
                    : "memory is off"}
              </Badge>
              <span className="text-xs text-muted">{consent.meaning}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {consent?.state !== "granted" && (
              <Button onClick={() => setConsentState("granted")} disabled={busy}>
                Turn memory back on
              </Button>
            )}
            {consent?.state !== "paused" && (
              <Button
                variant="ghost"
                onClick={() => setConsentState("paused")}
                disabled={busy}
              >
                Pause memory
              </Button>
            )}
            {consent?.state !== "denied" && (
              <Button
                variant="ghost"
                onClick={() => setConsentState("denied")}
                disabled={busy}
              >
                Turn memory off
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-edge bg-base px-3 py-2">
            <p className="text-xs text-muted">
              <span className="font-semibold text-ink">Pausing is not deleting.</span>{" "}
              While paused, nothing you have told us is used — the assistant carries on
              without it — but nothing is removed either, so turning memory back on restores
              everything above.
            </p>
            <p className="mt-1.5 text-xs text-muted">
              To remove something for good, use <strong>Remove</strong> on it. That clears it
              from every store and tells you when each one is done.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
