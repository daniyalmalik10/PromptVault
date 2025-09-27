import { Link } from "react-router-dom";

export function Navbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">
        PromptVault
      </Link>
      {children}
    </div>
  );
}
