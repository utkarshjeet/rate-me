import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Upload, 
  UserPlus, 
  RefreshCw,
  Trash2, 
  Search
} from "lucide-react";
import { Student } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import AddStudentModal from "@/components/modals/add-student-modal";
import ImportStudentsModal from "@/components/modals/import-students-modal";
import ConfirmationModal from "@/components/modals/confirmation-modal";

export default function AdminStudents() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<"delete" | "reset">("delete");
  
  // Fetch all students
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });
  
  // Filter students based on search query and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "registered" && student.isRegistered) || 
      (statusFilter === "unregistered" && !student.isRegistered);
    
    return matchesSearch && matchesStatus;
  });
  
  // Reset student registration
  const resetRegistrationMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest("POST", `/api/students/${studentId}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student registration has been reset.",
      });
      setIsConfirmModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reset student registration: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete student
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest("DELETE", `/api/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student has been deleted.",
      });
      setIsConfirmModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete student: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleResetRegistration = (studentId: number) => {
    setSelectedStudentId(studentId);
    setConfirmAction("reset");
    setIsConfirmModalOpen(true);
  };
  
  const handleDeleteStudent = (studentId: number) => {
    setSelectedStudentId(studentId);
    setConfirmAction("delete");
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmAction = () => {
    if (!selectedStudentId) return;
    
    if (confirmAction === "reset") {
      resetRegistrationMutation.mutate(selectedStudentId);
    } else {
      deleteStudentMutation.mutate(selectedStudentId);
    }
  };
  
  return (
    <AdminLayout title="Student Management">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div></div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-primary hover:bg-primary-dark flex items-center"
          >
            <Upload className="mr-2 h-4 w-4" /> Import from Excel
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            variant="secondary"
            className="flex items-center"
          >
            <UserPlus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>
      
      {/* Search & Filter */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="student-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400 h-4 w-4" />
              </div>
              <Input
                id="student-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or student number"
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label htmlFor="registration-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="unregistered">Unregistered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Students Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="whitespace-nowrap">{student.studentNumber}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.isRegistered
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {student.isRegistered ? "Registered" : "Unregistered"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleResetRegistration(student.id)}
                          className="text-primary hover:text-primary-dark"
                          title="Reset Registration"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
      
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAction}
        title={confirmAction === "delete" ? "Delete Student" : "Reset Registration"}
        message={
          confirmAction === "delete"
            ? "Are you sure you want to delete this student? This action cannot be undone."
            : "Are you sure you want to reset this student's registration? They will need to login again."
        }
        confirmText={confirmAction === "delete" ? "Delete" : "Reset"}
        isLoading={
          confirmAction === "delete" 
            ? deleteStudentMutation.isPending 
            : resetRegistrationMutation.isPending
        }
      />
    </AdminLayout>
  );
}
