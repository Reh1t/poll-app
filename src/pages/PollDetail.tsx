import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../app/supabase";
import toast from "react-hot-toast";

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

  const voteKey = `poll_${pollId}_voted`;

  useEffect(() => {
    const fetchPoll = async () => {
      const [{ data: pollData }, { data: user }] = await Promise.all([
        supabase.from("polls").select("*").eq("id", pollId).single(),
        supabase.auth.getUser(),
      ]);

      setPoll(pollData);
      setUserId(user?.user?.id || null);

      // Check if already voted
      if (user?.user?.id) {
        const { data: existingVote } = await supabase
          .from("votes")
          .select("id")
          .eq("poll_id", pollId)
          .eq("user_id", user.user.id)
          .single();

        if (existingVote) {
          setHasVoted(true);
        }
      } else {
        const voted = localStorage.getItem(voteKey) === "true";
        setHasVoted(voted);
      }

      setLoading(false);
    };

    fetchPoll();
  }, [pollId, voteKey]);

  // 👥 Live Viewer Count
  useEffect(() => {
    if (!pollId) return;

    const anonId = localStorage.getItem("anon_id") || crypto.randomUUID();
    localStorage.setItem("anon_id", anonId);
    const presenceKey = userId || anonId;

    const channel = supabase.channel(`presence-poll-${pollId}`, {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewersCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({});
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, userId]);

  const handleChange = (option: string) => {
    if (poll?.settings?.allowMultiple) {
      setSelected((prev) =>
        prev.includes(option)
          ? prev.filter((o) => o !== option)
          : [...prev, option]
      );
    } else {
      setSelected([option]);
    }
  };

  const markVoted = () => localStorage.setItem(voteKey, "true");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pollId || selected.length === 0) {
      toast.error("Select an option");
      return;
    }

    if (hasVoted && !poll?.settings?.allowVoteChange) {
      toast.error("You've already voted on this poll.");
      return;
    }

    const { error } = await supabase.from("votes").upsert(
      {
        poll_id: pollId,
        user_id: userId,
        selected_options: selected,
      },
      {
        onConflict: "poll_id,user_id",
      }
    );

    if (error) {
      console.error(error);
      toast.error("Something went wrong.");
    } else {
      if (!userId) markVoted();
      toast.success("Vote submitted!");
      navigate(`/poll/${pollId}/results`);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!poll) return <div className="p-4">Poll not found</div>;

  const isExpired = poll.ends_at
    ? new Date(poll.ends_at).getTime() < new Date().getTime()
    : false;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{poll.question}</h1>

      <div className="text-sm text-gray-500 mb-4">
        👀 {viewersCount} {viewersCount === 1 ? "person is" : "people are"}{" "}
        viewing this poll
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white shadow-lg rounded-xl p-6 space-y-4 border border-gray-200"
      >
        {isExpired && (
          <div className="text-sm text-red-600 bg-red-100 px-3 py-1 inline-block rounded mt-2 mb-4">
            This poll has expired. You can no longer vote.
          </div>
        )}

        <div className="space-y-3">
          {poll.options.map((option, idx) => (
            <label
              key={idx}
              className="flex items-center space-x-3 cursor-not-allowed"
            >
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
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          {!isExpired && (
            <button
              type="submit"
              className="inline-flex items-center text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Submit
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PollDetail;
