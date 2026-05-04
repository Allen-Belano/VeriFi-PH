function ShareWarningModal({ post, onClose, onShareAnyway }) {
  if (!post) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl animate-fadeUp sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-red-600">
          Safety Prompt
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-slate-900">
          ⚠ Think Before You Share
        </h2>
        <p className="mt-3 text-sm text-slate-700">
          This post has low credibility and may be misleading.
        </p>
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-slate-700">
          {post.content}
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onShareAnyway}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Share Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareWarningModal;
