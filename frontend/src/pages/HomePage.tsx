import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">PromptVault</h1>
        <p className="text-gray-500 mb-6">Your personal LLM prompt library</p>
        <p className="text-sm text-gray-600 mb-4">Signed in as {user?.email}</p>
        <button
          onClick={logout}
          className="text-sm text-indigo-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
