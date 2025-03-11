import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Users, Building, HelpCircle, BarChart3, 
  Menu, X, LogOut 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type AdminLayoutProps = {
  children: ReactNode;
  title: string;
};

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/admin/students", label: "Students", icon: <Users className="mr-3 text-lg" /> },
    { path: "/admin/rooms", label: "Rooms", icon: <Building className="mr-3 text-lg" /> },
    { path: "/admin/questions", label: "Questions", icon: <HelpCircle className="mr-3 text-lg" /> },
    { path: "/admin/leaderboard", label: "Leaderboard", icon: <BarChart3 className="mr-3 text-lg" /> },
  ];

  const handleLogout = () => {
    logout.mutate();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-800">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-lg font-medium text-white">Admin Dashboard</h1>
            </div>
            <div className="mt-6 flex-1 flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      location === item.path
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
              <button
                onClick={handleLogout}
                className="flex-shrink-0 w-full group block text-gray-300 hover:text-white"
              >
                <div className="flex items-center">
                  <div>
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Logout</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-gray-800 text-white py-4 px-4">
        <h1 className="text-lg font-medium">Admin Dashboard</h1>
        <button
          onClick={toggleMobileMenu}
          className="text-white focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-gray-800 bg-opacity-90 z-50">
          <div className="flex justify-end p-4">
            <button
              onClick={toggleMobileMenu}
              className="text-white focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="px-4 py-2 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block py-2 text-base font-medium ${
                  location === item.path
                    ? "text-white"
                    : "text-gray-300 hover:text-white"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center py-2 text-base font-medium text-gray-300 hover:text-white"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6 md:p-6 mt-14 md:mt-0" tabIndex={0}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
