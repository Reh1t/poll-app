import { useCallback, useEffect, useState } from "react";
import { supabase } from "../app/supabase";
import PollCard from "../components/PollCard";
import { useDebounce } from "../hooks/useDebounce";

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

const PollList = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | ended | mine
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 500);

  const fetchPolls = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("polls")
      .select("*", { count: "exact" })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      .order("created_at", { ascending: false });

    if (debouncedSearch.trim() !== "") {
      query = query.ilike("question", `%${debouncedSearch}%`);
    }

    if (filter === "active") {
      const now = new Date().toISOString();
      query = query.or(`ends_at.gte.${now},ends_at.is.null`);
    } else if (filter === "ended") {
      const now = new Date().toISOString();
      query = query.not("ends_at", "is", null).lte("ends_at", now);
    } else if (filter === "mine") {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;

    if (!error) {
      setPolls(data || []);
    } else {
      console.error(error);
    }

    setLoading(false);
  }, [page, debouncedSearch, filter]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls, page, debouncedSearch, filter]);

  // ✅ Realtime: new poll insertion
  useEffect(() => {
    const channel = supabase
      .channel("realtime-polls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "polls",
        },
        (payload) => {
          const newPoll = payload.new as Poll;

          // Only show in list if on first page and not searching or filtering
          if (page === 1 && search.trim() === "" && filter === "all") {
            setPolls((prev) => {
              const alreadyExists = prev.some((p) => p.id === newPoll.id);
              if (alreadyExists) return prev;
              return [newPoll, ...prev.slice(0, PAGE_SIZE - 1)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, search, filter]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Public Polls</h1>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search polls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-full sm:w-auto"
        />

        <select
          value={filter}
          onChange={(e) => {
            setPage(1);
            setFilter(e.target.value);
          }}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
          <option value="mine">My Polls</option>
        </select>
      </div>

      {/* Polls */}
      {loading ? (
        <p>Loading...</p>
      ) : polls.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">No polls found.</p>
      ) : (
        <div className="space-y-4">
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
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={polls.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PollList;
