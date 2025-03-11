import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

// Student pages
import StudentRooms from "@/pages/student/rooms";
import StudentRating from "@/pages/student/rating";
import StudentLeaderboard from "@/pages/student/leaderboard";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminRooms from "@/pages/admin/rooms";
import AdminQuestions from "@/pages/admin/questions";
import AdminLeaderboard from "@/pages/admin/leaderboard";

function Router() {
  return (
    <Switch>
      {/* Auth page */}
      <Route path="/auth" component={AuthPage} />

      {/* Root path - redirect based on user type */}
      <ProtectedRoute 
        path="/" 
        component={() => {
          const { user } = useAuth();
          if (user?.type === "admin") {
            return <Redirect to="/admin" />;
          } else if (user?.type === "student") {
            return <Redirect to="/student" />;
          }
          return <Redirect to="/auth" />;
        }} 
      />

      {/* Student routes */}
      <ProtectedRoute path="/student" userType="student" component={StudentRooms} />
      <ProtectedRoute path="/student/rooms" userType="student" component={StudentRooms} />
      <ProtectedRoute path="/student/rating/:roomId" userType="student" component={StudentRating} />
      <ProtectedRoute path="/student/leaderboard/:roomId" userType="student" component={StudentLeaderboard} />

      {/* Admin routes */}
      <ProtectedRoute path="/admin" userType="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/students" userType="admin" component={AdminStudents} />
      <ProtectedRoute path="/admin/rooms" userType="admin" component={AdminRooms} />
      <ProtectedRoute path="/admin/questions" userType="admin" component={AdminQuestions} />
      <ProtectedRoute path="/admin/leaderboard" userType="admin" component={AdminLeaderboard} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
