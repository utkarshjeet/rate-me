import { useEffect } from "react";
import { Redirect } from "wouter";
import AdminLayout from "@/components/layouts/admin-layout";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Building2, HelpCircle, BarChart 
} from "lucide-react";

export default function AdminDashboard() {
  // Simply redirect to the students page
  return <Redirect to="/admin/students" />;
}
