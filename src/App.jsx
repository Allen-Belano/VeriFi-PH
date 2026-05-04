import { useEffect, useMemo, useState, useRef } from 'react';
import Feed from './components/Feed';
import DetailModal from './components/DetailModal';
import ShareWarningModal from './components/ShareWarningModal';
import LivePostForm from './components/LivePostForm';
import { io } from 'socket.io-client';

function App() {
  const [posts, setPosts] = useState([]);
  const socketRef = useRef(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [shareWarningPost, setShareWarningPost] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const flaggedCount = useMemo(() => posts.filter((post) => post.isFlagged).length, [posts]);

  useEffect(() => {
    if (!statusText) return undefined;
    const timeout = setTimeout(() => setStatusText(''), 2500);
    return () => clearTimeout(timeout);
  }, [statusText]);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
    socketRef.current = io(backendUrl);

    socketRef.current.on('connect', () => {
      console.log('Connected to backend', socketRef.current.id);
    });

    socketRef.current.on('init_posts', (initialPosts) => {
      if (Array.isArray(initialPosts)) {
        setPosts(initialPosts.slice(0, 100));
      }
    });

    socketRef.current.on('new_post', (post) => {
      setPosts((prev) => [post, ...prev].slice(0, 100));
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const verifyPostLink = async (url) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
    setIsVerifying(true);
    try {
      const res = await fetch(`${backendUrl}/verify-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Unable to verify link');
      }

      setStatusText('Link verified successfully. Analysis has been added to the feed.');
      return { ok: true, post: payload };
    } catch (err) {
      const isNetworkError = err instanceof TypeError && /failed to fetch/i.test(err.message || '');
      const message = isNetworkError
        ? 'Cannot reach verifier backend at http://localhost:4000. Start it with: npm run dev-backend'
        : err?.message || 'Unable to verify this link right now.';
      setStatusText(message);
      return { ok: false, error: message };
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePostClick = (post) => {
    if (!post.isFlagged) {
      return;
    }

    setSelectedPost(post);
  };

  const completeShare = (post) => {
    console.log('Shared', { postId: post.id, user: post.user });
    setStatusText(`Post from ${post.user} was shared.`);
  };

  const handleShareClick = (post) => {
    if (post.isFlagged) {
      setShareWarningPost(post);
      return;
    }

    completeShare(post);
  };

  const handleShareAnyway = () => {
    if (!shareWarningPost) {
      return;
    }

    completeShare(shareWarningPost);
    setShareWarningPost(null);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-sky-200/85 via-cyan-50/90 to-emerald-100/85 p-6 shadow-card backdrop-blur md:p-8">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-red-500/15 blur-2xl" />
        <div className="absolute -bottom-10 left-1/4 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
        <p className="font-display text-xs uppercase tracking-[0.28em] text-sky-900/75">
          Link Verification System
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
          VeriFi-PH
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-700 sm:text-base">
          Paste a public post URL from social media and get an instant credibility
          assessment with fact-check hints, legal context, and share warnings.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs sm:text-sm">
          <span className="rounded-full border border-emerald-600/25 bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
            Safe Posts: {posts.length - flaggedCount}
          </span>
          <span className="rounded-full border border-red-600/25 bg-red-100 px-3 py-1 font-medium text-red-700">
            Flagged Posts: {flaggedCount}
          </span>
          <span className="rounded-full border border-sky-700/20 bg-sky-100 px-3 py-1 font-medium text-sky-800">
            Think Before You Share
          </span>
        </div>
      </section>

      <LivePostForm onVerifyLink={verifyPostLink} isVerifying={isVerifying} />

      {statusText ? (
        <div className="mt-4 rounded-xl border border-emerald-400/50 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-fadeUp">
          {statusText}
        </div>
      ) : null}

      <Feed
        posts={posts}
        onPostClick={handlePostClick}
        onShareClick={handleShareClick}
      />

      <DetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      <ShareWarningModal
        post={shareWarningPost}
        onClose={() => setShareWarningPost(null)}
        onShareAnyway={handleShareAnyway}
      />
    </main>
  );
}

export default App;
