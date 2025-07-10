import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../app/supabase";

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

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
    <nav className="bg-white shadow-sm border-b px-4 sm:px-8 py-3 flex items-center justify-between relative z-50">
      {/* Left: Brand */}
      <div className="flex items-center justify-between w-full sm:w-1/3">
        <Link to="/" className="text-xl font-bold text-blue-600">
          Pollify
        </Link>

        {/* Hamburger for mobile */}
        <button
          className="sm:hidden block text-gray-700"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Center (desktop) */}
      <div className="hidden sm:flex w-1/3 justify-center gap-6">
        <Link to="/" className={`text-sm font-medium ${location.pathname === "/" ? "text-blue-600" : "text-gray-700"}`}>
          Home
        </Link>
        <Link to="/profile" className={`text-sm font-medium ${location.pathname === "/profile" ? "text-blue-600" : "text-gray-700"}`}>
          Profile
        </Link>
      </div>

      {/* Right */}
      <div className="hidden sm:flex w-1/3 justify-end items-center gap-3">
        {user && (
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
            <div className="ml-2 w-8 h-8 rounded-full bg-gray-300 text-sm font-bold text-center leading-8 text-gray-700">
              {userInitial}
            </div>
          </>
        )}
        {!user && (
          <Link
            to="/login"
            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm shadow transition-colors"
          >
            Login
          </Link>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-14 left-0 w-full bg-white border-t shadow-md flex flex-col sm:hidden z-50 px-4 py-2 space-y-2">
          <Link to="/" className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/profile" className="text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>
            Profile
          </Link>
          {user && (
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
          )}
          {!user && (
            <Link to="/login" className="text-sm font-medium text-blue-600" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
