import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { ThumbsUp, ThumbsDown, Send, Play } from "lucide-react";

export default function VideoPlayer() {
    const { id } = useParams();
    const { user } = useAuth();
    const [video, setVideo] = useState(null);
    const [likes, setLikes] = useState({ likes: 0, dislikes: 0 });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch video details and increment views
    useEffect(() => {
        const fetchVideoData = async () => {
            try {
                // We need an endpoint to get single video metadata, assume we add GET /videos/{id} or we filter from list (less efficient).
                // Since we didn't explicitly add GET /videos/{id}, let's add it or rely on list for now.
                // Actually best practice is to have specific endpoint. I'll add a quick one or assume it acts like that.
                // For now, let's assume we use the list one and find it (inefficient but works for small app)
                // Better: let's assume I add get_video to router or use the list.
                // Wait, I updated crud.get_video but didn't expose it in router properly as a single endpoint.
                // I should fix that in next step. For now I will code assuming it exists: api.get(`/videos/${id}`)

                const videoRes = await api.get(`/videos/${id}`);
                setVideo(videoRes.data);

                // Increment view
                await api.post(`/videos/${id}/view`);

                // Refresh video data to show new view count
                const updatedRes = await api.get(`/videos/${id}`);
                setVideo(updatedRes.data);
            } catch (err) {
                console.error("Error loading video", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVideoData();
    }, [id]);

    // Fetch likes and comments
    useEffect(() => {
        const fetchInteractions = async () => {
            try {
                const [likesRes, commentsRes, allVideosRes] = await Promise.all([
                    api.get(`/videos/${id}/likes`),
                    api.get(`/videos/${id}/comments`),
                    api.get("/videos/")
                ]);
                setLikes(likesRes.data);
                setComments(commentsRes.data);

                // Filter current video and shuffle
                const otherVideos = allVideosRes.data.filter(v => v.id !== parseInt(id));
                const shuffled = otherVideos.sort(() => 0.5 - Math.random());
                setRecommendations(shuffled.slice(0, 5)); // Show 5 random videos
            } catch (err) {
                console.error("Error loading interactions", err);
            }
        };
        fetchInteractions();
    }, [id]);

    const handleLike = async (isLike) => {
        if (!user) return alert("Please login to vote");
        try {
            await api.post(`/videos/${id}/like`, { is_like: isLike });
            const res = await api.get(`/videos/${id}/likes`);
            setLikes(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!user) return alert("Please login to comment");
        if (!newComment.trim()) return;

        try {
            const res = await api.post(`/videos/${id}/comments`, { content: newComment });
            setComments([res.data, ...comments]);
            setNewComment("");
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="text-white text-center pt-20">Loading...</div>;
    if (!video) return <div className="text-white text-center pt-20">Video not found</div>;

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="lg:w-3/4">
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                        <video
                            src={`/api/videos/stream/${video.file_path}`}
                            controls
                            className="w-full h-full object-contain"
                            autoPlay
                        />
                    </div>

                    <h1 className="text-2xl font-bold mt-4 mb-2">{video.title}</h1>

                    <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                        <div className="text-gray-400 text-sm">
                            {video.views} views • {new Date(video.created_at).toLocaleDateString()}
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => handleLike(true)}
                                className="flex items-center space-x-2 text-gray-300 hover:text-blue-400 transition-colors"
                            >
                                <ThumbsUp className="h-5 w-5" />
                                <span>{likes.likes}</span>
                            </button>
                            <button
                                onClick={() => handleLike(false)}
                                className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors"
                            >
                                <ThumbsDown className="h-5 w-5" />
                                <span>{likes.dislikes}</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-gray-800/30 rounded-lg">
                        <p className="font-semibold mb-2">{video.owner?.username || "Unknown"}</p>
                        <p className="text-gray-300 whitespace-pre-wrap">{video.description}</p>
                    </div>

                    {/* Comments Section */}
                    <div className="mt-8">
                        <h3 className="text-xl font-bold mb-4">{comments.length} Comments</h3>

                        {user && (
                            <form onSubmit={handleComment} className="flex gap-4 mb-8">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-gray-800 border-b border-gray-600 focus:border-blue-500 outline-none px-4 py-2 text-white transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim()}
                                    className="p-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        )}

                        <div className="space-y-6">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                                        {comment.user?.username?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-sm">
                                                {comment.user?.username || "User"}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-gray-300 mt-1">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar (Recommendations) - simplified as list of other videos */}
                <div className="lg:w-1/4">
                    <h3 className="font-bold mb-4 text-gray-400">Up Next</h3>
                    <div className="flex flex-col space-y-4">
                        {recommendations.map((rec) => (
                            <Link to={`/video/${rec.id}`} key={rec.id} className="flex gap-3 group">
                                <div className="w-24 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-700 group-hover:border-blue-500/50 transition-colors">
                                    <Play className="h-6 w-6 text-gray-600 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                                        {rec.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rec.owner?.username || "Unknown"}</p>
                                    <p className="text-xs text-gray-600">
                                        {rec.views} views • {new Date(rec.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
                        ))}
                        {recommendations.length === 0 && (
                            <div className="text-gray-500 text-sm">No other videos available yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
