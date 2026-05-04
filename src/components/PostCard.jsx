import FlagBadge from './FlagBadge';

function PostCard({ post, onPostClick, onShareClick }) {
  const safeTone = post.credibilityScore >= 60;
  const metrics = post.platformMetrics || {};

  return (
    <article
      onClick={() => onPostClick(post)}
      className={[
        'rounded-2xl border bg-white/95 p-4 shadow-card transition duration-200 sm:p-5',
        post.isFlagged
          ? 'cursor-pointer border-red-300 hover:-translate-y-0.5 hover:shadow-xl'
          : 'border-emerald-200 hover:border-emerald-300',
      ].join(' ')}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-slate-900 sm:text-lg">
            {post.user}
            {metrics.isVerified && <span className="ml-1 text-blue-600">✓</span>}
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {post.platform?.toUpperCase() || 'Social'} Post
          </p>
        </div>
        {post.isFlagged ? (
          <FlagBadge />
        ) : (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              safeTone
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {safeTone ? 'High Credibility' : 'Moderate Credibility'}
          </span>
        )}
      </header>

      <p className="text-sm leading-relaxed text-slate-700 sm:text-[15px]">{post.content}</p>

      {post.sourceUrl ? (
        <a
          href={post.sourceUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-3 inline-block text-xs font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800"
        >
          Open source post
        </a>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        {metrics.likes !== undefined && (
          <span className="text-xs font-semibold text-slate-600">
            👍 {metrics.likes > 0 ? `${metrics.likes} likes` : 'No likes'}
          </span>
        )}
        {metrics.comments !== undefined && (
          <span className="text-xs font-semibold text-slate-600">
            💬 {metrics.comments > 0 ? `${metrics.comments} comments` : 'No comments'}
          </span>
        )}
        {metrics.shares !== undefined && (
          <span className="text-xs font-semibold text-slate-600">
            📤 {metrics.shares > 0 ? `${metrics.shares} shares` : 'No shares'}
          </span>
        )}
        {metrics.retweets !== undefined && (
          <span className="text-xs font-semibold text-slate-600">
            🔄 {metrics.retweets > 0 ? `${metrics.retweets} retweets` : 'No retweets'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`text-xs font-semibold ${
            post.credibilityScore >= 60
              ? 'text-emerald-700'
              : post.credibilityScore >= 40
                ? 'text-amber-700'
                : 'text-red-700'
          }`}
        >
          Credibility: {post.credibilityScore}/100
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onShareClick(post);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold text-white transition sm:text-sm ${
            post.isFlagged
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          Share
        </button>
      </div>
    </article>
  );
}

export default PostCard;
