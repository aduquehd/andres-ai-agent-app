"use client";

import { Loader2, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  getModelConfig,
  HttpError,
  resetModelConfig,
  testModelConfig,
  updateModelConfig,
  type ModelConfig,
  type ModelConfigPayload,
  type ModelConfigTestResult,
  type ModelEffort,
} from "@/lib/admin-api";
import { formatDateTime } from "@/lib/format";

const MODEL_SUGGESTIONS = [
  "anthropic:claude-sonnet-5-5",
  "anthropic:claude-opus-5-5",
  "anthropic:claude-haiku-5-5",
  "anthropic:claude-fable-5-1",
  "anthropic:claude-sonnet-4-6",
];

const EFFORTS: ModelEffort[] = ["low", "medium", "high", "xhigh", "max"];

// The last test, or the last save the API refused, keyed by the exact values it
// ran with, so editing a field hides a result that no longer applies.
type LastTest = { key: string; action: "test" | "save"; result: ModelConfigTestResult };

function savedPayload(config: ModelConfig): ModelConfigPayload {
  return {
    model: config.model,
    effort: config.effort,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
  };
}

const HINT_CLASS =
  "mt-2 text-[0.66rem] tracking-[0.18em] uppercase font-mono text-[color:var(--admin-text-muted)]";

export default function ModelConfigPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState<ModelEffort | null>(null);
  const [maxTokens, setMaxTokens] = useState("");
  const [temperature, setTemperature] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [lastTest, setLastTest] = useState<LastTest | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function show(next: ModelConfig) {
    setConfig(next);
    setModel(next.model);
    setEffort(next.effort);
    setMaxTokens(next.max_tokens?.toString() ?? "");
    setTemperature(next.temperature?.toString() ?? "");
    setLastTest(null);
  }

  useEffect(() => {
    let cancelled = false;
    getModelConfig()
      .then((loaded) => {
        if (!cancelled) show(loaded);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function payload(): ModelConfigPayload {
    return {
      model,
      effort,
      max_tokens: maxTokens.trim() === "" ? null : Number(maxTokens),
      temperature: temperature.trim() === "" ? null : Number(temperature),
    };
  }

  const current = JSON.stringify(payload());
  const shown = lastTest?.key === current ? lastTest : null;
  const testResult = shown?.result ?? null;
  // Saving an unchanged form would only spend a test turn, and on the API
  // default it would pin AGENT_MODEL's current value in the database.
  const unchanged = config !== null && current === JSON.stringify(savedPayload(config));
  // Fields stay read-only while a save or test is in flight, so its response
  // never overwrites or mislabels an edit made in the meantime.
  const locked = busy !== null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sent = payload();
    setBusy("save");
    try {
      show(await updateModelConfig(sent));
      toast.success("Model config saved. It applies to the next message.");
    } catch (err) {
      const error = err instanceof Error ? err.message : "Save failed";
      if (err instanceof HttpError && (err.status === 400 || err.status === 422)) {
        // The API refused the config itself. Keep its full error on the page.
        setLastTest({ key: JSON.stringify(sent), action: "save", result: { ok: false, error } });
        toast.error("Model config not saved");
      } else {
        toast.error(error);
      }
    } finally {
      setBusy(null);
    }
  }

  async function onTest() {
    if (!formRef.current?.reportValidity()) return;
    const tested = payload();
    const key = JSON.stringify(tested);
    setBusy("test");
    setLastTest(null);
    try {
      setLastTest({ key, action: "test", result: await testModelConfig(tested) });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Test failed";
      setLastTest({ key, action: "test", result: { ok: false, error } });
    } finally {
      setBusy(null);
    }
  }

  async function onReset() {
    try {
      show(await resetModelConfig());
      toast.success("Model config reset to the API default");
      setConfirmReset(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="admin-eyebrow">Agent</div>
        <h1 className="admin-mono text-2xl font-semibold text-[color:var(--admin-text)]">
          Model Config
        </h1>
        <p className="text-sm text-[color:var(--admin-text-dim)] max-w-2xl pt-1">
          The model and request settings the chat agent uses. Saved changes apply to the next
          message, with no deploy.
        </p>
      </div>

      <div className="admin-panel max-w-3xl p-6">
        {loadError ? (
          <p className="admin-mono text-sm text-[color:var(--admin-danger)]">{loadError}</p>
        ) : !config ? (
          <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-[color:var(--admin-accent)]" />
        ) : (
          <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {config.source === "database" ? (
                <>
                  <span className="admin-badge admin-badge-success">Saved in admin</span>
                  <span className="admin-meta">updated {formatDateTime(config.updated_at)}</span>
                </>
              ) : (
                <>
                  <span className="admin-badge">API default</span>
                  <span className="admin-meta">
                    nothing saved, using AGENT_MODEL ({config.default_model})
                  </span>
                </>
              )}
            </div>

            <div>
              <label htmlFor="mc-model" className="admin-label">Model</label>
              <input
                id="mc-model"
                type="text"
                list="mc-model-suggestions"
                value={model}
                onChange={(e) => setModel(e.target.value.trim())}
                disabled={locked}
                required
                maxLength={200}
                pattern="[\w.\/\-]+:\S+"
                title="provider:model-id, for example anthropic:claude-sonnet-5-5"
                spellCheck={false}
                autoComplete="off"
                className="admin-input"
              />
              <datalist id="mc-model-suggestions">
                {MODEL_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <p className={HINT_CLASS}>{"// provider:model-id. saving runs a test turn first"}</p>
            </div>

            <div>
              <span id="mc-effort-label" className="admin-label">Effort</span>
              <div role="group" aria-labelledby="mc-effort-label" className="flex flex-wrap gap-2">
                {[null, ...EFFORTS].map((level) => (
                  <button
                    key={level ?? "default"}
                    type="button"
                    onClick={() => setEffort(level)}
                    disabled={locked}
                    aria-pressed={effort === level}
                    className={`admin-btn ${effort === level ? "admin-btn-primary" : ""}`}
                  >
                    {level ?? "default"}
                  </button>
                ))}
              </div>
              <p className={HINT_CLASS}>
                {"// anthropic models only. default leaves the level to the model"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="mc-max-tokens" className="admin-label">Max output tokens</label>
                <input
                  id="mc-max-tokens"
                  type="number"
                  min={1}
                  max={128000}
                  step={1}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  disabled={locked}
                  placeholder={`default (${config.default_max_tokens})`}
                  className="admin-input"
                />
                <p className={HINT_CLASS}>{"// thinking counts toward it"}</p>
              </div>
              <div>
                <label htmlFor="mc-temperature" className="admin-label">Temperature</label>
                <input
                  id="mc-temperature"
                  type="number"
                  min={0}
                  max={2}
                  step="any"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  disabled={locked}
                  placeholder="default"
                  className="admin-input"
                />
                <p className={HINT_CLASS}>{"// not taken by claude opus 4.7+ or any 5.x model"}</p>
              </div>
            </div>

            {testResult ? (
              <div role="status" className="space-y-2 border-t border-[color:var(--admin-border)] pt-5">
                {testResult.ok ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="admin-badge admin-badge-success">Test passed</span>
                      <span className="admin-meta">
                        {testResult.model} · {testResult.latency_ms} ms · {testResult.input_tokens}{" "}
                        in / {testResult.output_tokens} out
                      </span>
                    </div>
                    <p className="text-sm text-[color:var(--admin-text-dim)] whitespace-pre-wrap">
                      {testResult.output}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="admin-badge admin-badge-danger">
                      {shown?.action === "save" ? "Not saved" : "Test failed"}
                    </span>
                    <p className="admin-mono text-xs text-[color:var(--admin-danger)] whitespace-pre-wrap break-words">
                      {testResult.error}
                    </p>
                  </>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 -mx-6 px-6 pt-4 border-t border-[color:var(--admin-border)]">
              <div>
                {config.source === "database" ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => setConfirmReset(true)}
                    disabled={locked}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to default
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={onTest}
                  disabled={locked}
                >
                  {busy === "test" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {busy === "test" ? "Testing…" : "Test"}
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={locked || unchanged}
                >
                  {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {busy === "save" ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset model config?"
        description={`The agent goes back to the API's AGENT_MODEL setting (${config?.default_model ?? ""}) with default request settings.`}
        confirmLabel="Reset"
        variant="destructive"
        onConfirm={onReset}
      />
    </div>
  );
}
