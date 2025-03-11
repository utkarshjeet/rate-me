import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Search } from "lucide-react";
import { Student, RoomWithDetails } from "@shared/schema";

interface ManageRoomStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomWithDetails | null;
}

export default function ManageRoomStudentsModal({ 
  isOpen, 
  onClose, 
  room 
}: ManageRoomStudentsModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // Fetch all students
  const { data: allStudents = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: isOpen && !!room,
  });
  
  // Fetch students in the room
  const { data: roomStudents = [], refetch: refetchRoomStudents } = useQuery<Student[]>({
    queryKey: ["/api/rooms", room?.id, "students"],
    queryFn: async () => {
      if (!room) return [];
      const res = await fetch(`/api/rooms/${room.id}/students`);
      if (!res.ok) throw new Error("Failed to fetch room students");
      return res.json();
    },
    enabled: isOpen && !!room,
  });
  
  // Add student to room
  const addStudentToRoomMutation = useMutation({
    mutationFn: async ({ roomId, studentId }: { roomId: number; studentId: number }) => {
      await apiRequest("POST", `/api/rooms/${roomId}/students/${studentId}`, null);
    },
    onSuccess: () => {
      refetchRoomStudents();
      toast({
        title: "Success",
        description: "Student added to room successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add student to room: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Remove student from room
  const removeStudentFromRoomMutation = useMutation({
    mutationFn: async ({ roomId, studentId }: { roomId: number; studentId: number }) => {
      await apiRequest("DELETE", `/api/rooms/${roomId}/students/${studentId}`, null);
    },
    onSuccess: () => {
      refetchRoomStudents();
      toast({
        title: "Success",
        description: "Student removed from room successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove student from room: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Filter available students based on search query
  useEffect(() => {
    if (!searchQuery.trim() || !allStudents.length) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    // Get IDs of students already in the room
    const roomStudentIds = roomStudents.map(s => s.id);
    
    // Filter students that are not already in the room and match search query
    const query = searchQuery.toLowerCase();
    const filtered = allStudents.filter(student => 
      !roomStudentIds.includes(student.id) && (
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.studentNumber.toLowerCase().includes(query)
      )
    ).slice(0, 5); // Limit to 5 results
    
    setSearchResults(filtered);
    setShowResults(filtered.length > 0);
  }, [searchQuery, allStudents, roomStudents]);
  
  const handleAddStudent = (studentId: number) => {
    if (!room) return;
    addStudentToRoomMutation.mutate({ roomId: room.id, studentId });
    setSearchQuery("");
    setShowResults(false);
  };
  
  const handleRemoveStudent = (studentId: number) => {
    if (!room) return;
    removeStudentFromRoomMutation.mutate({ roomId: room.id, studentId });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Manage Students in {room?.roomName || "Room"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Search & Add Student */}
          <div className="mb-4">
            <label htmlFor="student-search-for-room" className="block text-sm font-medium text-gray-700 mb-1">
              Add Student to Room
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400 h-4 w-4" />
              </div>
              <Input
                id="student-search-for-room"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or student number"
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Search Results */}
          {showResults && (
            <div className="mb-4 max-h-40 overflow-y-auto border rounded-md">
              <ul className="divide-y divide-gray-200">
                {searchResults.map(student => (
                  <li 
                    key={student.id} 
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAddStudent(student.id)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">
                          {student.studentNumber} | {student.email}
                        </p>
                      </div>
                      <button className="text-primary hover:text-primary-dark">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Current Room Students */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Students</h4>
            {roomStudents.length === 0 ? (
              <div className="border rounded-md p-4 text-center text-gray-500">
                No students assigned to this room yet
              </div>
            ) : (
              <div className="border rounded-md mb-4">
                <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                  {roomStudents.map(student => (
                    <li key={student.id} className="px-4 py-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">
                            {student.studentNumber} | {student.email}
                          </p>
                        </div>
                        <button 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveStudent(student.id)}
                          disabled={removeStudentFromRoomMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              type="button"
              onClick={onClose}
              disabled={addStudentToRoomMutation.isPending || removeStudentFromRoomMutation.isPending}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
