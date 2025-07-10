import { useEffect, useMemo, useState } from "react";
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
import { BiPoll } from "react-icons/bi";
import { FaVoteYea } from "react-icons/fa";
import { FiEdit2, FiSave } from "react-icons/fi";
import { AiOutlineUpload } from "react-icons/ai";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";

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
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState<{ field: string | null }>({
    field: null,
  });
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pollsPerPage = 3;

  const navigate = useNavigate();

  const age = useMemo(() => {
    if (!user?.dob) return null;
    return Math.floor(
      (Date.now() - new Date(user.dob).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    );
  }, [user?.dob]);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user: sessionUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (!sessionUser || userError) return;

      let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (!profile) {
        await supabase
          .from("profiles")
          .insert([{ id: sessionUser.id, email: sessionUser.email }]);
        const { data: newProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionUser.id)
          .maybeSingle();
        profile = newProfile;
      }

      const { data: userPolls } = await supabase
        .from("polls")
        .select("*")
        .eq("created_by", sessionUser.id);

      setUser(
        profile || {
          id: sessionUser.id,
          email: sessionUser.email,
          created_at: sessionUser.created_at,
        }
      );
      setPolls(userPolls || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const uploadAvatar = async (file: File, userId: string) => {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 512,
      useWebWorker: true,
    });
    const extension = compressedFile.type.split("/")[1];
    const filePath = `public/${userId}.${extension}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, compressedFile, { cacheControl: "3600", upsert: true });
    if (error) throw new Error("Upload failed");

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    const toastId = toast.loading("Updating profile...");
    setUploading(true);

    try {
      if (avatarFile) {
        const newUrl = await uploadAvatar(avatarFile, user.id);
        user.avatar_url = newUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          bio: user.bio,
          dob: user.dob,
          avatar_url: user.avatar_url,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated!", { id: toastId });
      setEditing({ field: null });
      setAvatarFile(null);
    } catch (err) {
      toast.error("Update failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleExport = (poll: Poll) => {
    const csv = `Question,Options\n"${poll.question}","${poll.options.join(
      ", "
    )}"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${poll.question.replace(/\s+/g, "_")}.csv`;
    link.click();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this poll?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (!error) setPolls((prev) => prev.filter((p) => p.id !== id));
  };

  const activityData = useMemo(() => {
    const counts: Record<string, number> = {};
    polls.forEach((poll) => {
      const day = format(new Date(poll.created_at), "MMM d");
      counts[day] = (counts[day] || 0) + 1;
    });
    return Object.entries(counts).map(([day, count]) => ({ day, count }));
  }, [polls]);

  const filteredPolls = useMemo(() => {
    const sorted = [...polls].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    return sorted.filter((poll) =>
      poll.question.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [polls, searchTerm, sortOrder]);

  const paginatedPolls = useMemo(() => {
    const start = (currentPage - 1) * pollsPerPage;
    return filteredPolls.slice(start, start + pollsPerPage);
  }, [filteredPolls, currentPage]);

  return (
    <div className="p-4 min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded shadow md:col-span-1 flex flex-col items-center text-center">
          {loading ? (
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-24 w-24 rounded-full bg-gray-300 mx-auto" />
              <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto" />
            </div>
          ) : (
            <>
              <div className="relative flex flex-col items-center">
                {/* Avatar Preview */}
                <img
                  src={
                    avatarFile
                      ? URL.createObjectURL(avatarFile)
                      : user?.avatar_url ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.email}`
                  }
                  alt="avatar"
                  className="w-24 h-24 rounded-full border object-cover"
                />

                {/* Upload Button - Hidden if avatarFile is selected */}
                {!avatarFile && !uploading && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 p-1 rounded-full cursor-pointer">
                    <AiOutlineUpload className="text-white text-xs" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        setAvatarFile(e.target.files ? e.target.files[0] : null)
                      }
                    />
                  </label>
                )}

                {/* Spinner */}
                {uploading && (
                  <div className="mt-3 text-sm text-blue-600 animate-pulse">
                    Uploading...
                  </div>
                )}

                {/* Save Button - Visible when avatarFile is selected */}
                {avatarFile && !uploading && (
                  <>
                    <button
                      onClick={handleSave}
                      className="mt-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                    >
                      Save Avatar
                    </button>
                    <p className="text-xs mt-1 text-gray-500">
                      New image selected. Click Save to upload.
                    </p>
                  </>
                )}
              </div>
              <div className="w-full border border-gray-300 rounded-xl p-6 mt-8 shadow-sm bg-white">
                {["full_name", "bio", "dob"].map((field, idx) => (
                  <div
                    key={field}
                    className="w-full text-left pb-4 mb-4 border-b last:border-b-0 last:mb-0 last:pb-0 border-dashed border-gray-200"
                  >
                    <label className="text-gray-600 text-xs font-medium capitalize block mb-1">
                      {field === "dob" ? "Age" : field.replace("_", " ")}
                    </label>
                    {editing.field === field ? (
                      <div className="flex items-center gap-2">
                        <input
                          type={field === "dob" ? "date" : "text"}
                          value={(user as any)[field] || ""}
                          onChange={(e) =>
                            setUser((prev) =>
                              prev ? { ...prev, [field]: e.target.value } : prev
                            )
                          }
                          className="border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none px-3 py-2 rounded-md text-sm w-full"
                        />
                        <FiSave
                          className="cursor-pointer text-green-600 hover:text-green-700"
                          onClick={handleSave}
                        />
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-800">
                          {field === "dob"
                            ? age
                              ? `${age} years old`
                              : "Not set"
                            : (user as any)[field] || "Not set"}
                        </p>
                        <FiEdit2
                          className="text-gray-400 hover:text-blue-500 cursor-pointer"
                          onClick={() => setEditing({ field })}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Metrics */}
                <div className="mt-6 w-full divide-y divide-gray-200">
                  <div className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <BiPoll className="text-blue-600" />
                      <span>Polls</span>
                    </div>
                    <span className="font-medium text-gray-800">
                      {polls.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <FaVoteYea className="text-green-600" />
                      <span>Votes</span>
                    </div>
                    <span className="font-medium text-gray-800">
                      {polls.reduce((acc, p) => acc + p.options.length, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Activity Chart</h2>
            <ResponsiveContainer width="100%" height={150}>
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

          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Your Polls</h2>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <input
                type="text"
                placeholder="Search question..."
                className="border px-3 py-2 rounded w-full md:w-1/2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="border px-3 py-2 rounded w-full md:w-1/4"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((_, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-100 animate-pulse rounded shadow space-y-2"
                  >
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-6 w-24 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredPolls.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No polls found.</p>
            ) : (
              <div className="space-y-4">
                {paginatedPolls.map((poll) => (
                  <motion.div
                    key={poll.id}
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded shadow transition"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div className="mb-2 md:mb-0">
                        <h3 className="text-md font-medium">{poll.question}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {format(new Date(poll.created_at), "PPP")} |{" "}
                          {poll.options.length} options
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/poll/${poll.id}/results`)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                        >
                          Results
                        </button>
                        <button
                          onClick={() => handleExport(poll)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => handleDelete(poll.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredPolls.length > pollsPerPage && (
              <div className="flex justify-center mt-4 gap-2">
                {Array.from({
                  length: Math.ceil(filteredPolls.length / pollsPerPage),
                }).map((_, i) => (
                  <button
                    key={i}
                    className={`px-3 py-1 rounded ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
