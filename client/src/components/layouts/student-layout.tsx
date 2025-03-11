import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type StudentLayoutProps = {
  children: ReactNode;
  title: string;
  showBackButton?: boolean;
  backUrl?: string;
  showLeaderboardButton?: boolean;
  leaderboardUrl?: string;
  roomId?: string;
};

export default function StudentLayout({ 
  children, 
  title, 
  showBackButton = false, 
  backUrl = "/student/rooms",
  showLeaderboardButton = false,
  leaderboardUrl = "",
  roomId
}: StudentLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Student Rating System</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-primary hover:text-primary-600 flex items-center"
            >
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
          <div className="flex space-x-3">
            {showBackButton && (
              <Link
                href={backUrl}
                className="text-sm text-primary hover:text-primary-600 flex items-center"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Rooms
              </Link>
            )}
            
            {showLeaderboardButton && roomId && (
              <Link
                href={`/student/leaderboard/${roomId}`}
                className="text-sm text-primary hover:text-primary-600 flex items-center"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Leaderboard
              </Link>
            )}
          </div>
        </div>
        
        {children}
      </main>
    </div>
  );
}
