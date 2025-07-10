import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../app/supabase";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Poll {
  id: string;
  question: string;
  options: string[];
  created_at: string;
  created_by: string;
}

interface ProfileData {
  id: string;
  email: string;
  full_name?: string;
  dob?: string;
  created_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pollToDelete, setPollToDelete] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const pollsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, dob, created_at")
        .eq("id", user.id)
        .single();

      const { data: userPolls } = await supabase
        .from("polls")
        .select("*")
        .eq("created_by", user.id);

      setUser(
        profile || {
          id: user.id,
          email: user.email || "",
          created_at: user.created_at || new Date().toISOString(),
        }
      );
      setPolls(userPolls || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredPolls = useMemo(() => {
    let sorted = [...polls];
    if (sort === "recent") {
      sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    } else {
      sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    }

    let filtered = sorted.filter((p) =>
      p.question.toLowerCase().includes(search.toLowerCase())
    );

    if (filter === "short") {
      filtered = filtered.filter((p) => p.options.length <= 3);
    } else if (filter === "long") {
      filtered = filtered.filter((p) => p.options.length >= 4);
    }

    return filtered;
  }, [polls, sort, search, filter]);

  const totalPages = Math.ceil(filteredPolls.length / pollsPerPage);
  const startIndex = (currentPage - 1) * pollsPerPage;
  const paginatedPolls = filteredPolls.slice(
    startIndex,
    startIndex + pollsPerPage
  );

  const activityData = useMemo(() => {
    const counts: Record<string, number> = {};
    polls.forEach((poll) => {
      const day = format(new Date(poll.created_at), "MMM d");
      counts[day] = (counts[day] || 0) + 1;
    });
    return Object.entries(counts).map(([day, count]) => ({ day, count }));
  }, [polls]);

  const exportCSV = (poll: Poll) => {
    const csv = `Question,Options\n"${poll.question}","${poll.options.join(
      ", "
    )}"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${poll.question.replace(/\s+/g, "_")}.csv`;
    link.click();
  };

  const handleDelete = (pollId: string) => {
    setPollToDelete(pollId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!pollToDelete) return;
    await supabase.from("polls").delete().eq("id", pollToDelete);
    setPolls((prev) => prev.filter((p) => p.id !== pollToDelete));
    setPollToDelete(null);
    setShowConfirmModal(false);
  };

  const cancelDelete = () => {
    setPollToDelete(null);
    setShowConfirmModal(false);
  };

  return (
    <div className="p-4 min-h-screen bg-gray-100 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white shadow rounded p-6 flex flex-col items-center text-center">
          {loading ? (
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-24 w-24 rounded-full bg-gray-300 mx-auto" />
              <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto" />
              <div className="h-3 bg-gray-300 rounded w-2/3 mx-auto" />
            </div>
          ) : (
            <>
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user?.email}`}
                alt="avatar"
                className="w-24 h-24 rounded-full border"
              />
              <h2 className="text-xl font-semibold mt-3">
                {user?.full_name || "Anonymous User"}
              </h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-sm text-gray-500">
                Joined{" "}
                {user?.created_at
                  ? format(new Date(user.created_at), "PPP")
                  : "-"}
              </p>
              {user?.dob && (
                <p className="text-sm text-gray-500">
                  DOB: {format(new Date(user.dob), "PPP")}
                </p>
              )}
              <p className="text-sm mt-4 text-gray-500">
                Polls: {polls.length}
              </p>
              <p className="text-sm text-gray-500">
                Total Votes:{" "}
                {polls.reduce((acc, p) => acc + p.options.length, 0)}
              </p>
              <p className="text-sm text-gray-500">Achievements: 2</p>
            </>
          )}
        </div>

        {/* Right Section */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white shadow rounded p-6">
            <h2 className="text-xl font-bold mb-2">Activity Chart</h2>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={activityData}>
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white shadow rounded p-6">
            <h2 className="text-xl font-bold mb-4">Your Polls</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="text"
                placeholder="Search polls"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1 rounded border w-full sm:w-auto"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-2 py-1 rounded border"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest</option>
              </select>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2 py-1 rounded border"
              >
                <option value="all">All</option>
                <option value="short">Short (≤3 options)</option>
                <option value="long">Long (≥4 options)</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : paginatedPolls.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No polls found.</p>
            ) : (
              <div className="space-y-4">
                {paginatedPolls.map((poll) => (
                  <motion.div
                    key={poll.id}
                    onClick={() => navigate(`/poll/${poll.id}`)}
                    className="bg-gray-50 p-4 rounded shadow cursor-pointer hover:bg-gray-100 transition"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {poll.question}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Created: {format(new Date(poll.created_at), "PPP")} |
                          Options: {poll.options.length}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/poll/${poll.id}/results`);
                          }}
                          className="px-2 py-1 text-sm bg-purple-500 text-white rounded"
                        >
                          Results
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportCSV(poll);
                          }}
                          className="px-2 py-1 text-sm bg-blue-500 text-white rounded"
                        >
                          Export
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(poll.id);
                          }}
                          className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm px-2 py-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs mx-auto">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete this poll?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
