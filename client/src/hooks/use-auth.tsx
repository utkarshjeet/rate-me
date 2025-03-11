import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { Student, User, LoginCredentials } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthUser = {
  type: "student" | "admin";
  id: number;
  name?: string;
  studentNumber?: string;
  email?: string;
  username?: string;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginStudent: UseMutationResult<Partial<Student>, Error, LoginCredentials>;
  loginAdmin: UseMutationResult<Partial<User>, Error, LoginCredentials>;
  logout: UseMutationResult<void, Error, void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
  });

  const loginStudent = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/student/login", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], { type: "student", ...data });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loginAdmin = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/admin/login", {
        username: credentials.username,
        password: credentials.password,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], { type: "admin", ...data });
      toast({
        title: "Admin login successful",
        description: "Welcome to the admin dashboard!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Admin login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginStudent,
        loginAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
