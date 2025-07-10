import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../app/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";

const COLORS = ["#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#EAB308"];

type Poll = {
  id: string;
  question: string;
  options: string[];
  created_by: string | null;
};

type Vote = {
  selected_options: string[];
};

const PollResultPage = () => {
  const { id: pollId } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"bar" | "pie" | "list">("bar");
  const [viewersCount, setViewersCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchPollAndUser = useCallback(async () => {
    setLoading(true);
    const [{ data: pollData }, { data: authData }] = await Promise.all([
      supabase.from("polls").select("*").eq("id", pollId).single(),
      supabase.auth.getUser(),
    ]);
    setPoll(pollData);
    setUser(authData?.user ?? null);
    setLoading(false);
  }, [pollId]);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase
      .from("votes")
      .select("selected_options")
      .eq("poll_id", pollId);
    setVotes(data || []);
  }, [pollId]);

  useEffect(() => {
    fetchPollAndUser();
    fetchVotes();
  }, [fetchPollAndUser, fetchVotes]);

  useEffect(() => {
    if (!pollId) return;
    const channel = supabase
      .channel(`poll-${pollId}-votes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `poll_id=eq.${pollId}`,
        },
        fetchVotes
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, fetchVotes]);

  useEffect(() => {
    if (!poll) return;
    const counts: Record<string, number> = {};
    poll.options.forEach((opt) => (counts[opt] = 0));
    votes.forEach((vote) => {
      vote.selected_options.forEach((opt) => {
        if (counts[opt] !== undefined) counts[opt]++;
      });
    });
    setVoteCounts(counts);
  }, [votes, poll]);

  useEffect(() => {
    if (!pollId) return;
    const anonId = localStorage.getItem("anon_id") || crypto.randomUUID();
    localStorage.setItem("anon_id", anonId);
    const presenceKey = user?.id || anonId;

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
      supabase.removeChannel(channel);
    };
  }, [pollId, user]);

  const totalVotes = votes.reduce(
    (acc, v) => acc + v.selected_options.length,
    0
  );

  const chartData =
    poll?.options.map((option) => ({
      name: option,
      value: voteCounts[option] || 0,
    })) || [];

  const handleExportImage = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement("a");
    link.download = `poll_${pollId}_${viewMode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExportCSV = () => {
    const csvHeader = "Option,Votes,Percent\n";
    const csvRows = chartData.map(({ name, value }) => {
      const percent =
        totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(2) + "%" : "0%";
      return `${name},${value},${percent}`;
    });
    const blob = new Blob([csvHeader + csvRows.join("\n")], {
      type: "text/csv",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `poll_${pollId}_results.csv`;
    link.click();
  };

  const handleBack = () => navigate("/");

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 animate-pulse">
        <div className="h-6 w-3/4 bg-gray-300 rounded" />
        <div className="h-4 w-1/3 bg-gray-200 rounded" />
        <div className="flex justify-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-20 h-8 bg-gray-300 rounded" />
          ))}
        </div>
        <div className="h-48 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-300 mx-auto rounded" />
        <div className="flex justify-center gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-24 h-8 bg-gray-300 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!poll) return <div className="p-4 text-red-500">Poll not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">{poll.question}</h1>

      <div className="text-sm text-gray-500 mb-2">
        👀 {viewersCount} {viewersCount === 1 ? "person is" : "people are"}{" "}
        viewing this poll
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-4 gap-2">
        {["bar", "pie", "list"].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as typeof viewMode)}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <div ref={chartRef} className="space-y-6 transition-all">
        {viewMode === "bar" &&
          chartData.map(({ name, value }, idx) => {
            const percent =
              totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(2) : "0.00";
            const barColors = [
              "bg-green-500",
              "bg-orange-400",
              "bg-purple-500",
              "bg-red-400",
              "bg-yellow-400",
            ];
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm text-gray-700 mb-1">
                  <span>{name}</span>
                  <motion.span
                    key={value}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.4 }}
                  >
                    {percent}% ({value} vote{value !== 1 && "s"})
                  </motion.span>
                </div>
                <div className="w-full bg-gray-200 h-4 rounded">
                  <motion.div
                    layout
                    className={`h-4 ${
                      barColors[idx % barColors.length]
                    } rounded`}
                    style={{ width: `${percent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            );
          })}

        {viewMode === "pie" && (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}

        {viewMode === "list" && (
          <ul className="space-y-2">
            {chartData.map(({ name, value }, idx) => {
              const percent =
                totalVotes > 0
                  ? ((value / totalVotes) * 100).toFixed(2)
                  : "0.00";
              return (
                <li
                  key={idx}
                  className="flex justify-between border px-3 py-2 rounded text-sm"
                >
                  <span>{name}</span>
                  <motion.span
                    key={value}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.4 }}
                  >
                    {value} vote{value !== 1 && "s"} ({percent}%)
                  </motion.span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="text-sm text-gray-500 mt-4 text-center">
        {totalVotes} total vote{totalVotes !== 1 && "s"}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={fetchVotes}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
        >
          Refresh Results
        </button>
        <button
          onClick={handleExportImage}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
        >
          Export Image
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          Export CSV
        </button>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-sm rounded"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PollResultPage;
