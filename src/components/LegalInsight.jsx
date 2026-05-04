function LegalInsight({ law, explanation, riskLevel }) {
  const riskTone =
    riskLevel === 'High'
      ? 'bg-red-100 text-red-700 border-red-200'
      : riskLevel === 'Medium'
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-display text-base font-semibold text-slate-900">
        ⚖ Legal Insight
      </h3>
      <p className="mt-2 text-sm font-semibold text-slate-800">{law}</p>
      <p className="mt-1 text-sm text-slate-600">{explanation}</p>
      <span className={`mt-3 inline-flex rounded-lg border px-3 py-1 text-xs font-semibold ${riskTone}`}>
        Risk Level: {riskLevel}
      </span>
    </div>
  );
}

export default LegalInsight;
