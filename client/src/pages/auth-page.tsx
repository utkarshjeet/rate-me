import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Schema for student login
const studentLoginSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  studentNumber: z.string().min(1, "Student number is required"),
});

type StudentLoginFormValues = z.infer<typeof studentLoginSchema>;

// Schema for admin login
const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export default function AuthPage() {
  const { user, loginStudent, loginAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("student");

  // Show loading indicator while authentication status is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already logged in, redirect to appropriate dashboard
  if (user) {
    if (user.type === "admin") {
      return <Redirect to="/admin" />;
    } else {
      return <Redirect to="/student" />;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <Tabs defaultValue="student" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student Login</TabsTrigger>
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
          </TabsList>
          
          <TabsContent value="student">
            <StudentLoginForm 
              isLoading={loginStudent.isPending} 
              onSubmit={(data) => loginStudent.mutate(data)}
              error={loginStudent.error?.message} 
            />
          </TabsContent>
          
          <TabsContent value="admin">
            <AdminLoginForm 
              isLoading={loginAdmin.isPending} 
              onSubmit={(data) => loginAdmin.mutate(data)}
              error={loginAdmin.error?.message} 
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function StudentLoginForm({ 
  onSubmit, 
  isLoading, 
  error 
}: { 
  onSubmit: (data: StudentLoginFormValues) => void;
  isLoading: boolean;
  error?: string;
}) {
  const form = useForm<StudentLoginFormValues>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      name: "",
      email: "",
      studentNumber: "",
    },
  });

  return (
    <CardContent className="pt-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Student Rating System</h1>
        <p className="text-gray-600 mt-2">Sign in with your student credentials</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your full name" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your email" 
                    type="email" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="studentNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your student number" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </Form>
    </CardContent>
  );
}

function AdminLoginForm({ 
  onSubmit, 
  isLoading, 
  error 
}: { 
  onSubmit: (data: AdminLoginFormValues) => void;
  isLoading: boolean;
  error?: string;
}) {
  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <CardContent className="pt-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Login</h1>
        <p className="text-gray-600 mt-2">Sign in with your admin credentials</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Admin username" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Admin password" 
                    type="password" 
                    {...field} 
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            variant="secondary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Admin Sign In"
            )}
          </Button>
        </form>
      </Form>
    </CardContent>
  );
}
