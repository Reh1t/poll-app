import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../app/supabase";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";

type Poll = {
  id: string;
  question: string;
  options: string[];
  created_by: string;
  settings: {
    allowMultiple: boolean;
    allowVoteChange?: boolean;
  };
  ends_at?: string | null;
};

const PollDetail = () => {
  const { id: pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [showQR, setShowQR] = useState(false);

  const voteKey = `poll_${pollId}_voted`;
  const isExpired = poll?.ends_at
    ? new Date(poll.ends_at).getTime() < new Date().getTime()
    : false;
  const pollUrl = `${window.location.origin}/poll/${pollId}`;

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const [{ data: pollData }, { data: user }] = await Promise.all([
          supabase.from("polls").select("*").eq("id", pollId).single(),
          supabase.auth.getUser(),
        ]);

        setPoll(pollData);
        const uid = user?.user?.id || null;
        setUserId(uid);

        if (uid) {
          const { data: existingVote } = await supabase
            .from("votes")
            .select("id")
            .eq("poll_id", pollId)
            .eq("user_id", uid)
            .maybeSingle();

          if (existingVote) setHasVoted(true);
        } else {
          setHasVoted(localStorage.getItem(voteKey) === "true");
        }
      } catch (err) {
        toast.error("Failed to load poll.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [pollId, voteKey]);

  useEffect(() => {
    if (!pollId) return;

    const anonId = localStorage.getItem("anon_id") || crypto.randomUUID();
    localStorage.setItem("anon_id", anonId);
    const presenceKey = userId || anonId;

    const channel = supabase.channel(`presence-poll-${pollId}`, {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewersCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({});
      });

    return () => {
      const cleanup = async () => {
        await supabase.removeChannel(channel);
      };
      cleanup();
    };
  }, [pollId, userId]);

  const handleChange = (option: string) => {
    setSelected((prev) =>
      poll?.settings?.allowMultiple
        ? prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
        : [option]
    );
  };

  const markVoted = () => localStorage.setItem(voteKey, "true");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pollId || selected.length === 0) {
      toast.error("Please select an option");
      return;
    }

    if (hasVoted && !poll?.settings?.allowVoteChange) {
      toast.error("You’ve already voted and vote change isn’t allowed.");
      return;
    }

    try {
      const { error } = await supabase.from("votes").upsert(
        {
          poll_id: pollId,
          user_id: userId,
          selected_options: selected,
        },
        { onConflict: "poll_id,user_id" }
      );

      if (error) throw error;

      if (!userId) markVoted();

      toast.success("Vote submitted!");
      navigate(`/poll/${pollId}/results`);
    } catch (err) {
      toast.error("Error submitting vote");
      console.error(err);
    }
  };

  const handleCopyLinkAndShowQR = () => {
    navigator.clipboard.writeText(pollUrl);
    toast.success("Poll link copied!");
    setShowQR(true);
  };

  // 🔄 Skeleton UI while loading
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 animate-pulse space-y-4">
        <div className="h-6 bg-gray-300 rounded w-2/3"></div>
        <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-5 bg-gray-200 rounded w-full"></div>
        ))}
        <div className="flex justify-between mt-4">
          <div className="h-8 bg-gray-300 w-24 rounded"></div>
          <div className="h-8 bg-gray-400 w-32 rounded"></div>
        </div>
      </div>
    );
  }

  if (!poll) return <div className="p-4">Poll not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">{poll.question}</h1>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <div>
          👀 {viewersCount} {viewersCount === 1 ? "person is" : "people are"}{" "}
          viewing this poll
        </div>
        <button
          onClick={handleCopyLinkAndShowQR}
          className="text-sm px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          Share Poll
        </button>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center relative w-72">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-3">Scan to Vote</h2>
            <div className="flex justify-center items-center">
            <QRCodeCanvas value={pollUrl} size={180}  />
            </div>
            <p className="mt-3 text-xs text-gray-500 break-words">{pollUrl}</p>
          </div>
        </div>
      )}

      {/* Voting Form */}
      <form
        onSubmit={onSubmit}
        className="bg-white shadow-lg rounded-xl p-6 space-y-4 border border-gray-200"
      >
        {isExpired && (
          <div className="text-sm text-red-600 bg-red-100 px-3 py-1 inline-block rounded mb-4">
            This poll has expired. You can no longer vote.
          </div>
        )}

        <div className="space-y-3">
          {poll.options.map((option, idx) => (
            <label key={idx} className="flex items-center space-x-3">
              <input
                type={poll.settings?.allowMultiple ? "checkbox" : "radio"}
                name="option"
                value={option}
                checked={selected.includes(option)}
                onChange={() => handleChange(option)}
                disabled={isExpired}
                className="h-4 w-4 text-blue-600 border-gray-300 disabled:cursor-not-allowed"
              />
              <span
                className={`text-gray-700 ${
                  isExpired ? "text-opacity-50" : ""
                }`}
              >
                {option}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center text-sm px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition"
          >
            ← Back
          </button>

          {!isExpired && (
            <button
              type="submit"
              className="inline-flex items-center text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Submit →
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PollDetail;
