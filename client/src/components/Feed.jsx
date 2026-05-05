import PostCard from './PostCard';

function Feed({ posts, onPostClick, onShareClick }) {
  if (!posts.length) {
    return (
      <section className="mt-6 rounded-2xl border border-white/20 bg-white/90 p-6 text-center shadow-card sm:mt-8">
        <p className="font-display text-lg font-semibold text-slate-900">No verified posts yet</p>
        <p className="mt-1 text-sm text-slate-600">
          Paste a public post link above to start generating credibility analysis.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 grid gap-4 sm:mt-8">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-fadeUp"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <PostCard
            post={post}
            onPostClick={onPostClick}
            onShareClick={onShareClick}
          />
        </div>
      ))}
    </section>
  );
}

export default Feed;
