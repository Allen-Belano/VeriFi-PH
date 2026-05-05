import CredibilityScore from './CredibilityScore';
import LegalInsight from './LegalInsight';

function highlightPhrase(text, phrase) {
  if (!phrase) {
    return text;
  }

  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.split(regex);
}

function DetailModal({ post, onClose }) {
  if (!post) {
    return null;
  }

  const metrics = post.platformMetrics || {};

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-fadeUp sm:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {post.platform?.toUpperCase() || 'Social Post'} Analysis
            </p>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {post.user}
              {metrics.isVerified && <span className="ml-2 text-blue-600">✓</span>}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </header>

        <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {post.content}
        </p>

        {post.sourceUrl ? (
          <a
            href={post.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-4 inline-flex rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
          >
            View original link
          </a>
        ) : null}

        <div className="grid gap-3">
          <CredibilityScore score={post.credibilityScore} reason={post.reason} />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              📊 Real Platform Metrics
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Likes:</span>
                <span className="font-semibold text-slate-900">{metrics.likes || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Comments:</span>
                <span className="font-semibold text-slate-900">{metrics.comments || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Shares:</span>
                <span className="font-semibold text-slate-900">{metrics.shares || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Engagement:</span>
                <span className="font-semibold text-slate-900">{metrics.totalEngagement || 0}</span>
              </div>
              {metrics.retweets !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Retweets:</span>
                  <span className="font-semibold text-slate-900">{metrics.retweets || 0}</span>
                </div>
              )}
              {metrics.replies !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Replies:</span>
                  <span className="font-semibold text-slate-900">{metrics.replies || 0}</span>
                </div>
              )}
            </div>
            {metrics.isVerified && (
              <p className="mt-3 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                ✓ Verified Account
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              🔍 Fact Check
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              Verdict:{' '}
              <span className="font-semibold text-slate-900">{post.factCheck}</span>
            </p>
          </div>

          <LegalInsight
            law={post.law}
            explanation={post.lawExplanation}
            riskLevel={post.riskLevel}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-display text-base font-semibold text-slate-900">
              💬 Analysis
            </h3>
            <p className="mt-2 text-sm text-slate-700">{post.explanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailModal;
