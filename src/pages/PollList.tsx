// ✅ Already imported packages
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../app/supabase";
import PollCard from "../components/PollCard";
import { useDebounce } from "../hooks/useDebounce";
import toast from "react-hot-toast";

// ✅ Poll type
export type Poll = {
  id: string;
  question: string;
  options: string[];
  settings: any;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

const PAGE_SIZE = 10;

// ✅ Component start
const PollList = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "active" | "ended" | "mine" | "oldest" | "votes" | "no_expiry"
  >("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  // ✅ Get user ID once for "mine" filter
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) console.error(error);
      else setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // ✅ Fetch polls
  const fetchPolls = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("polls")
        .select("*", { count: "exact" })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const now = new Date().toISOString();

      // 🔀 Filters & Sorting
      switch (filter) {
        case "active":
          query = query
            .or(`ends_at.gte.${now},ends_at.is.null`)
            .order("created_at", { ascending: false });
          break;
        case "ended":
          query = query
            .not("ends_at", "is", null)
            .lte("ends_at", now)
            .order("ends_at", { ascending: false });
          break;
        case "mine":
          if (userId) {
            query = query
              .eq("created_by", userId)
              .order("created_at", { ascending: false });
          } else {
            toast.error("Login required to view your polls");
            setPolls([]);
            setLoading(false);
            return;
          }
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "votes":
          query = query.order("options", {
            ascending: false,
            foreignTable: undefined, // explicitly tell Supabase it's on the same table
          });
          break;
        case "no_expiry":
          query = query
            .is("ends_at", null)
            .order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      if (debouncedSearch.trim()) {
        query = query.ilike("question", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPolls(data || []);
    } catch (err: any) {
      toast.error("Failed to load polls.");
      console.error("Poll fetch error:", err.message || err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, page, userId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // ✅ Real-time insert listener
  useEffect(() => {
    const channel = supabase
      .channel("realtime-polls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "polls" },
        (payload) => {
          const newPoll = payload.new as Poll;
          if (page === 1 && search.trim() === "" && filter === "all") {
            setPolls((prev) => {
              const exists = prev.some((p) => p.id === newPoll.id);
              if (exists) return prev;
              return [newPoll, ...prev.slice(0, PAGE_SIZE - 1)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      const cleanup = async () => {
        await supabase.removeChannel(channel);
      };
      cleanup();
    };
  }, [page, search, filter]);

  return (
    <div className="max-w-3xl mx-auto p-4 bg-background-light dark:bg-background-dark">
      <h1 className="text-2xl font-bold mb-4 dark:text-gray-200">
        Public Polls
      </h1>

      {/* Search & Filter UI */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 justify-center ">
        <input
          type="text"
          placeholder="Search polls..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="border px-3 py-2 rounded w-full sm:w-auto dark:bg-gray-800 dark:text-gray-100"
        />

        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Ended", value: "ended" },
            { label: "My Polls", value: "mine" },
            { label: "Oldest", value: "oldest" },
            { label: "Votes", value: "votes" },
            { label: "No Expiry", value: "no_expiry" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => {
                setPage(1);
                setFilter(value as any);
              }}
              className={`px-3 py-1 rounded-full border text-sm transition-all
        ${
          filter === value
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-700 dark:text-gray-200"
        }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Polls */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      ) : polls.length === 0 ? (
        <p className="text-gray-500 text-center mt-10 dark:text-gray-200 dark:bg-gray-800 ">
          No polls found.
        </p>
      ) : (
        <div className="space-y-4 dark:bg-gray-800">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          Previous
        </button>
        <span className="dark:text-gray-200 dark:bg-gray-800">Page {page}</span>
        <button
          disabled={polls.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PollList;
