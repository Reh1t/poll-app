import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../app/supabase";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";

const COLORS = ["#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#EAB308"];

const PollResultPage = () => {
  const { id: pollId } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("bar");
  const [viewersCount, setViewersCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPollAndUser = async () => {
      const [{ data: pollData }, { data: authData }] = await Promise.all([
        supabase.from("polls").select("*").eq("id", pollId).single(),
        supabase.auth.getUser(),
      ]);
      setPoll(pollData);
      setUser(authData?.user ?? null);
      setLoading(false);
    };
    fetchPollAndUser();
  }, [pollId]);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase
      .from("votes")
      .select("selected_options")
      .eq("poll_id", pollId);
    setVotes(data || []);
  }, [pollId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

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
        (payload) => {
          console.log("🔄 Real-time vote update:", payload);
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, fetchVotes]);

  useEffect(() => {
    if (!poll) return;
    const counts: Record<string, number> = {};
    poll.options.forEach((opt: string) => (counts[opt] = 0));
    votes.forEach((vote) => {
      vote.selected_options.forEach((opt: string) => {
        if (counts[opt] !== undefined) counts[opt] += 1;
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
        if (status === "SUBSCRIBED") {
          await channel.track({});
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, user]);

  if (loading) return <div className="p-4">Loading results...</div>;
  if (!poll) return <div className="p-4">Poll not found</div>;

  const totalVotes = votes.reduce(
    (acc, v) => acc + v.selected_options.length,
    0
  );

  const handleRefresh = () => fetchVotes();
  const handleBack = () => navigate("/");

  const chartData: { name: string; value: number }[] = poll.options.map(
    (option: string) => ({
      name: option,
      value: voteCounts[option] || 0,
    })
  );

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
    const csvRows = chartData.map((item) => {
      const percent =
        totalVotes > 0
          ? ((item.value / totalVotes) * 100).toFixed(2) + "%"
          : "0%";
      return `${item.name},${item.value},${percent}`;
    });
    const csv = csvHeader + csvRows.join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `poll_${pollId}_results.csv`;
    link.click();
  };

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
            onClick={() => setViewMode(mode)}
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
          poll.options.map((option: string, idx: number) => {
            const count = voteCounts[option] || 0;
            const percent =
              totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(2) : "0.00";
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
                  <span>{option}</span>
                  <motion.span
                    key={count}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.4 }}
                  >
                    {percent}% ({count} vote{count !== 1 && "s"})
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
                isAnimationActive={true}
                animationDuration={600}
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                dataKey="value"
              >
                {chartData.map((_, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}

        {viewMode === "list" && (
          <ul className="space-y-2">
            {chartData.map((item, idx) => {
              const percent =
                totalVotes > 0
                  ? ((Number(item.value) / totalVotes) * 100).toFixed(2)
                  : "0.00";
              return (
                <li
                  key={idx}
                  className="flex justify-between border px-3 py-2 rounded text-sm"
                >
                  <span>{item.name}</span>
                  <motion.span
                    key={item.value}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.4 }}
                  >
                    {item.value} vote{item.value !== 1 && "s"} ({percent}%)
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
          onClick={handleRefresh}
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
