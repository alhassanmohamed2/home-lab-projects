import { useState, useEffect } from "react";
import api from "../api";
import { Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function Feed() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const res = await api.get("/videos/");
                setVideos(res.data);
            } catch (err) {
                console.error("Failed to fetch videos", err);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Explore Videos
                </h1>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-gray-800">
                        <p className="text-gray-400 text-lg">No videos uploaded yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {videos.map((video) => (
                            <Link
                                to={`/video/${video.id}`}
                                key={video.id}
                                className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20 group"
                            >
                                <div className="relative aspect-video bg-black">
                                    <video
                                        src={`/api/videos/stream/${video.file_path}`}
                                        controls
                                        className="w-full h-full object-cover"
                                        poster={video.thumbnail_path} // Standard attribute if available
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-blue-400 transition-colors">
                                        {video.title}
                                    </h3>
                                    <p className="text-sm text-gray-400 line-clamp-2">
                                        {video.description}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                                        <span>{new Date(video.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
