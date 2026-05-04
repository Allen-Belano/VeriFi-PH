import { useState } from 'react';

function LivePostForm({ onVerifyLink, isVerifying }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please paste a post link to verify.');
      return;
    }

    setError('');
    const result = await onVerifyLink(trimmed);
    if (result?.ok) {
      setUrl('');
      return;
    }

    setError(result?.error || 'Link verification failed.');
  };

  return (
    <section className="mt-5 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-card sm:p-5">
      <h2 className="font-display text-lg font-semibold text-slate-900">Verify Post Link</h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste a public URL from Facebook, X/Twitter, Instagram, TikTok, YouTube, or any news/social page.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          placeholder="https://example.com/post/123"
          required
        />
        <button
          type="submit"
          disabled={isVerifying}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isVerifying ? 'Verifying...' : 'Verify Link'}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default LivePostForm;
