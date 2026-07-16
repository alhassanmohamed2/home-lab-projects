import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Video, Upload, LogOut, User } from "lucide-react";

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center space-x-2">
                        <Video className="h-8 w-8 text-blue-500" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                            ALTupe
                        </span>
                    </Link>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Link
                                    to="/upload"
                                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white font-medium"
                                >
                                    <Upload className="h-4 w-4" />
                                    <span>Upload</span>
                                </Link>
                                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-700">
                                    <div className="flex items-center space-x-2 text-gray-300">
                                        <User className="h-4 w-4" />
                                        <span className="text-sm">{user.username}</span>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link
                                    to="/login"
                                    className="text-gray-300 hover:text-white font-medium transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors border border-gray-700"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
