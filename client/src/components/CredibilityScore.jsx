function CredibilityScore({ score, reason }) {
  const scoreTone =
    score >= 80
      ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
      : score >= 50
        ? 'text-amber-700 bg-amber-100 border-amber-200'
        : 'text-red-700 bg-red-100 border-red-200';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-display text-base font-semibold text-slate-900">
        📊 Credibility Score
      </h3>
      <div className="mt-3 flex items-center gap-3">
        <span className={`rounded-lg border px-3 py-1 text-sm font-bold ${scoreTone}`}>
          {score}/100
        </span>
        <p className="text-sm text-slate-600">{reason}</p>
      </div>
    </div>
  );
}

export default CredibilityScore;
