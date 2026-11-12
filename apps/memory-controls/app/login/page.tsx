"use client";

// Why this file exists
// ====================
//
// Where a listener logs in, or signs up the first time.
//
// Sign up takes a user id that nobody else has, and a password; the backend
// (POST /auth/signup) refuses an id that already exists, so one person cannot
// take over somebody else's. Signing up also switches memory on, which is the
// listener's consent. Country and age are optional and only shorten how long
// memories are kept.
//
// On success the pass goes into an httpOnly cookie on this app's server
// (app/api/auth/[action]/route.ts) and the listener lands on their own page.
//
// A pilot stand-in for Spotify's login - in a real deployment the listener is
// already logged in to Spotify and this page does not exist.

import { useState } from "react";
import { Button, Card, ErrorNote, inputClass } from "@/components/ui";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [subjectId, setSubjectId] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("");
  const [ageBand, setAgeBand] = useState("adult");
  const [problem, setProblem] = useState<{ code: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Log in or sign up, then go to the listener's own page.
  async function submit() {
    setBusy(true);
    setProblem(null);
    const body: Record<string, string> = {
      subject_id: subjectId.trim().toLowerCase(),
      password,
    };
    if (mode === "signup") {
      if (region.trim()) body.region = region.trim();
      body.age_band = ageBand;
    }

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (response?.ok) {
      window.location.href = "/";
      return;
    }

    const detail = response ? (await response.json().catch(() => ({}))).detail : null;
    setProblem({
      code: detail?.code ?? "REQUEST_FAILED",
      // A 422 from the backend is a list of field errors; say it plainly.
      message: Array.isArray(detail)
        ? "User id: 3-40 lower-case letters, digits or _. Password: at least 8 characters. Country: 2 letters."
        : detail?.message ?? "Something went wrong. Is the app's server running?",
    });
    setBusy(false);
  }

  return (
    <div className="login-screen">
      <section className="login-intro">
        <p className="eyebrow">Your memory · Your choice</p>
        <h2>Memory that stays in your hands.</h2>
        <p>
          Review what is remembered, correct anything that is wrong, or pause
          and remove memories whenever you choose.
        </p>
      </section>

      <div className="login-panel">
        <Card
          title={mode === "login" ? "Welcome back" : "Create your account"}
          hint={
            mode === "login"
              ? "Sign in to review and manage your memories."
              : "Choose a unique user id. You can change your memory settings at any time."
          }
        >
          <div className="flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="User ID"
              aria-label="User ID"
              autoComplete="username"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            />
            <input
              className={inputClass}
              type="password"
              placeholder={mode === "signup" ? "Password (at least 8 characters)" : "Password"}
              aria-label="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submit()}
            />

            {mode === "signup" && (
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="Country (optional)"
                  aria-label="Country"
                  maxLength={2}
                  value={region}
                  onChange={(event) => setRegion(event.target.value.toUpperCase())}
                />
                <select
                  className={inputClass}
                  aria-label="Age band"
                  value={ageBand}
                  onChange={(event) => setAgeBand(event.target.value)}
                >
                  <option value="adult">18 or older</option>
                  <option value="under_18">under 18</option>
                </select>
              </div>
            )}

            <Button onClick={submit} disabled={busy || !subjectId.trim() || !password}>
              {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </Button>

            <button
              type="button"
              className="rounded-lg py-2 text-left text-xs text-muted underline decoration-edge underline-offset-4 transition hover:text-ink"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setProblem(null);
              }}
            >
              {mode === "login" ? "New here? Create an account" : "Already registered? Log in"}
            </button>
          </div>
        </Card>

        {problem && <ErrorNote code={problem.code} message={problem.message} correlationId="" />}
      </div>
    </div>
  );
}
