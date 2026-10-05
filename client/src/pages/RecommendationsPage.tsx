import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchRecommendations, generateAiSummary, generateRecommendations } from "../api/workRequirements";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import type { AiSummary, Recommendation, ScoreBreakdown } from "../types";
import { errorMessage, formatLabel } from "../utils/format";

const SCORE_MAX: Record<keyof ScoreBreakdown, number> = {
  category: 30,
  location: 20,
  rating: 20,
  compliance: 20,
  status: 10,
};

export function RecommendationsPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summary, setSummary] = useState<AiSummary | null>(null);

  const recommendations = useQuery({
    queryKey: ["recommendations", id],
    queryFn: () => fetchRecommendations(id),
    enabled: Boolean(id),
  });

  const generate = useMutation({
    mutationFn: () => generateRecommendations(id),
    onSuccess: (result) => {
      queryClient.setQueryData(["recommendations", id], result);
      queryClient.invalidateQueries({ queryKey: ["requirement", id] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSummary(null);
      setExpanded(result.recommendations[0]?.id ?? null);
    },
  });

  const summarise = useMutation({
    mutationFn: () => generateAiSummary(id),
    onSuccess: (result) => setSummary(result),
  });

  if (recommendations.isLoading) return <LoadingState label="Loading recommendations" />;
  if (recommendations.isError) return <ErrorState message={errorMessage(recommendations.error)} onRetry={() => recommendations.refetch()} />;

  const rows = recommendations.data?.recommendations ?? [];
  const leader = rows[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/work-requirements/${id}`} className="text-sm font-semibold text-accent">
            Back to requirement
          </Link>
          <h2 className="mt-2 text-2xl font-semibold">Ranked vendors</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Scores are calculated from category, location, rating, compliance, and status. The same vendor data always produces the same order.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={generate.isPending} onClick={() => generate.mutate()}>
            Generate recommendations
          </Button>
          <Button loading={summarise.isPending} disabled={rows.length === 0} onClick={() => summarise.mutate()}>
            Generate AI summary
          </Button>
        </div>
      </div>

      {generate.isError ? <ErrorState message={errorMessage(generate.error)} /> : null}
      {summarise.isError ? <ErrorState message={errorMessage(summarise.error)} /> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Generate recommendations to score every active vendor against this requirement. Inactive and suspended vendors are left out."
          action={
            <Button loading={generate.isPending} onClick={() => generate.mutate()}>
              Generate recommendations
            </Button>
          }
        />
      ) : (
        <>
          {leader ? (
            <Card className="border-accent/30 bg-teal-50/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Why vendor #{leader.rank} was selected</p>
              <p className="mt-2 text-lg font-semibold">
                {leader.vendor.name} scored {leader.score}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{leader.reasons.join(". ")}.</p>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              {rows.map((row) => (
                <RecommendationCard
                  key={row.id}
                  row={row}
                  open={expanded === row.id}
                  onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                />
              ))}
            </div>
            <SummaryPanel summary={summary} pending={summarise.isPending} />
          </div>
        </>
      )}
    </div>
  );
}

function RecommendationCard({ row, open, onToggle }: { row: Recommendation; open: boolean; onToggle: () => void }) {
  return (
    <Card className={row.rank === 1 ? "border-copper/40" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${row.rank === 1 ? "bg-copper text-white" : "bg-paper text-ink"}`}>
            {row.rank}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{row.vendor.name}</h3>
              <Badge value={row.recommendationLevel} />
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {row.vendor.category} · {row.vendor.city}, {row.vendor.state} · Rating {row.vendor.rating.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tracking-tight">{row.score}</p>
          <p className="text-xs uppercase tracking-wide text-ink-soft">of 100</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        <Metric label="Category" value={`${row.breakdown.category}/30`} />
        <Metric label="Location" value={`${row.breakdown.location}/20`} />
        <Metric label="Rating" value={`${row.breakdown.rating}/20`} />
        <Metric label="Compliance" value={`${row.breakdown.compliance}/20`} />
        <Metric label="Status" value={`${row.breakdown.status}/10`} />
      </dl>
      <button type="button" className="mt-4 text-sm font-semibold text-accent" onClick={onToggle}>
        {open ? "Hide score breakdown" : "Why this score"}
      </button>
      {open ? (
        <div className="mt-4 grid gap-4 border-t border-line pt-4 lg:grid-cols-2">
          <div className="space-y-3">
            {(Object.keys(SCORE_MAX) as Array<keyof ScoreBreakdown>).map((key) => (
              <ScoreBar key={key} label={formatLabel(key)} value={row.breakdown[key]} max={SCORE_MAX[key]} />
            ))}
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold">Reasons</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                {row.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Warnings</h4>
              {row.warnings.length === 0 ? (
                <p className="mt-2 text-ink-soft">No warnings were recorded.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-warn">
                  {row.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>
          {value} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-paper">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SummaryPanel({ summary, pending }: { summary: AiSummary | null; pending: boolean }) {
  return (
    <Card className="h-fit">
      <h3 className="font-semibold">Recommendation summary</h3>
      {pending ? <p className="mt-3 text-sm text-ink-soft">Writing the summary from the stored scores...</p> : null}
      {!pending && !summary ? (
        <p className="mt-3 text-sm text-ink-soft">
          Generate a summary after the ranking exists. It explains the stored result and does not change scores.
        </p>
      ) : null}
      {summary ? (
        <div className="mt-4 space-y-4 text-sm">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${summary.generatedBy === "openai" ? "bg-teal-50 text-accent-strong" : "bg-amber-50 text-warn"}`}>
            {summary.generatedBy === "openai" ? "AI generated" : "Deterministic fallback"}
          </span>
          <p className="leading-6">{summary.summary}</p>
          <SummaryList title="Strengths" items={summary.strengths} />
          <SummaryList title="Risks" items={summary.risks} />
          <SummaryList title="Trade-offs" items={summary.tradeoffs} />
          <div>
            <h4 className="font-semibold">Operational recommendation</h4>
            <p className="mt-1 leading-6 text-ink-soft">{summary.recommendation}</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-ink-soft">None recorded.</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
