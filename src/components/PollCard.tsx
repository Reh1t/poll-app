import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../app/supabase";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import { Poll } from "../pages/PollList";

interface CreatorInfo {
  full_name?: string;
  avatar_url?: string;
}

const PollCard = ({ poll }: { poll: Poll }) => {
  const [voteCount, setVoteCount] = useState(0);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [showQR, setShowQR] = useState(false);

  const pollUrl = `${window.location.origin}/poll/${poll.id}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ count }, { data }] = await Promise.all([
          supabase
            .from("votes")
            .select("*", { count: "exact", head: true })
            .eq("poll_id", poll.id),
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", poll.created_by)
            .maybeSingle(),
        ]);

        if (typeof count === "number") setVoteCount(count);
        if (data) setCreator(data);
      } catch (err) {
        console.error("Error fetching poll data:", err);
      }
    };

    fetchData();
  }, [poll.id, poll.created_by]);

  const handleCopyLinkAndShowQR = () => {
    navigator.clipboard.writeText(pollUrl);
    toast.success("Poll link copied to clipboard!");
    setShowQR(true);
  };

  return (
    <>
      <div className="border rounded-lg shadow-sm bg-white hover:shadow-md transition p-4">
        {/* Top: Creator Info + Share */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <img
              src={
                creator?.avatar_url ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${poll.created_by}`
              }
              alt="creator-avatar"
              className="w-8 h-8 rounded-full object-cover border"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {creator?.full_name || "Unknown"}
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(poll.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyLinkAndShowQR}
            className="text-sm text-blue-600 hover:underline"
          >
            Share
          </button>
        </div>

        {/* Question + Options + Deadline */}
        <Link to={`/poll/${poll.id}`} className="block">
          <h3 className="text-md font-semibold text-gray-900 line-clamp-2">
            {poll.question}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {poll.options.length} option{poll.options.length !== 1 && "s"} •{" "}
            {poll.ends_at
              ? `Ends ${new Date(poll.ends_at).toLocaleString()}`
              : "No deadline"}
          </p>
        </Link>

        {/* Footer: Vote Count */}
        <div className="mt-4 flex justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 9l-2 2m0 0l-2 2m2-2h.01M12 3c-4.418 0-8 3.582-8 8 0 1.933.687 3.695 1.828 5.07L4 21l5.93-1.828A7.963 7.963 0 0012 19c4.418 0 8-3.582 8-8s-3.582-8-8-8z"
              />
            </svg>
            <span>
              {voteCount} vote{voteCount !== 1 && "s"}
            </span>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
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
            <QRCodeCanvas
              value={pollUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
            />
            </div>
            <p className="mt-3 text-xs text-gray-500 break-words">{pollUrl}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default PollCard;
