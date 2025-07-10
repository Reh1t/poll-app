import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Auth from "./pages/Auth";
import CreatePoll from "./pages/CreatePoll";
import ProtectedRoute from "./components/ProtectedRoute";
import PollList from "./pages/PollList";
import PollDetail from "./pages/PollDetail";
import PollResultPage from "./pages/PollResultPage";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm font-medium px-4 py-2",
          success: { style: { background: "#4ade80", color: "#fff" } },
          error: { style: { background: "#f87171", color: "#fff" } },
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/" element={<PollList />} />
        <Route path="/poll/:id" element={<PollDetail />} />
        <Route path="/poll/:id/results" element={<PollResultPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePoll />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
