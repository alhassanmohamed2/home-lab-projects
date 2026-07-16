import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Feed from "./pages/Feed";
import Upload from "./pages/Upload";
import VideoPlayer from "./pages/VideoPlayer";

const ProtectedRouteInline = ({ children }) => {
  // Basic protection check - could use AuthContext but to keep it simple and importing straightforward
  const token = localStorage.getItem("token");
  if (!token) {
    return <Login />; // Or Navigate to login
  }
  return children;
};


function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/video/:id" element={<VideoPlayer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/upload"
            element={
              <ProtectedRouteInline>
                <Upload />
              </ProtectedRouteInline>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
