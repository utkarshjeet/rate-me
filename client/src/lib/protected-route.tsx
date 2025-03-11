import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type UserType = "student" | "admin" | "any";

export function ProtectedRoute({
  path,
  component: Component,
  userType = "any",
}: {
  path: string;
  component: () => React.JSX.Element;
  userType?: UserType;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (userType !== "any" && user.type !== userType) {
    return (
      <Route path={path}>
        <Redirect to={user.type === "admin" ? "/admin" : "/"} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
