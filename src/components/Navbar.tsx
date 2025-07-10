import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../app/supabase";
import { useContext } from "react";
import ThemeContext from "../context/ThemeContext";
import { FiMoon, FiSun } from "react-icons/fi";

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ avatar_url?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggle } = useContext(ThemeContext);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const { data } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", currentUser.id)
            .maybeSingle();

          setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching user/profile:", err);
      }
    };

    fetchUserAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          (async () => {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("id", currentUser.id)
                .maybeSingle();

              setProfile(data);
            } catch (err) {
              console.error("Error in profile fetch:", err);
              setProfile(null);
            }
          })();
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || "U";

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b px-4 py-3">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between relative z-50">
        {/* Left: Brand & Menu */}
        <div className="flex items-center justify-between w-full sm:w-1/3">
          <Link to="/" className="text-xl font-bold text-blue-600">
            Pollify
          </Link>

          <button
            className="sm:hidden block text-gray-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Center (desktop only) */}
        <div className="hidden sm:flex w-1/3 justify-center gap-6 ">
          {["/", "/profile"].map((path) => (
            <Link
              key={path}
              to={path}
              className={`text-sm font-medium  ${
                location.pathname === path ? "text-blue-600 " : "text-gray-700 dark:text-gray-200"
              }`}
            >
              {path === "/" ? "Home" : "Profile"}
            </Link>
          ))}
        </div>

        {/* Right (desktop only) */}
        <div className="hidden sm:flex w-1/3 justify-end items-center gap-3">
          {user ? (
            <>
              <Link
                to="/create"
                className={`px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-semibold text-sm shadow transition-colors ${
                  location.pathname === "/create" ? "ring-2 ring-green-400" : ""
                }`}
              >
                Create
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow transition-colors"
              >
                Logout
              </button>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 text-sm font-bold text-center leading-8 text-gray-700">
                  {userInitial}
                </div>
              )}
            </>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm shadow transition-colors"
            >
              Login
            </Link>
          )}
        </div>
        <button
          aria-label="Toggle dark mode"
          onClick={toggle}
          className="ml-4 text-gray-700 dark:text-gray-200"
        >
          {theme === "light" ? <FiMoon /> : <FiSun />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden mt-2 px-4 py-2 bg-white border-t shadow-md flex flex-col gap-2">
          <Link
            to="/"
            className="text-sm font-medium text-gray-700"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/profile"
            className="text-sm font-medium text-gray-700"
            onClick={() => setMenuOpen(false)}
          >
            Profile
          </Link>
          {user ? (
            <>
              <Link
                to="/create"
                className="text-sm font-medium text-green-600"
                onClick={() => setMenuOpen(false)}
              >
                Create
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="text-sm font-medium text-red-600 text-left"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="text-sm font-medium text-blue-600"
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
