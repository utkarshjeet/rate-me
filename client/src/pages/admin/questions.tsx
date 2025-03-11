import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "@/components/layouts/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { QuestionWithRoom, Room } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import AddQuestionModal from "@/components/modals/add-question-modal";
import ConfirmationModal from "@/components/modals/confirmation-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminQuestions() {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithRoom | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [roomFilter, setRoomFilter] = useState<string>("");
  
  // Fetch all questions
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<QuestionWithRoom[]>({
    queryKey: ["/api/questions"],
  });
  
  // Fetch all rooms for the filter dropdown
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Filter questions by room
  const filteredQuestions = roomFilter
    ? questions.filter(q => q.roomId === parseInt(roomFilter))
    : questions;
  
  // Delete question
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await apiRequest("DELETE", `/api/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Success",
        description: "Question has been deleted.",
      });
      setIsConfirmModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete question: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleAddNewQuestion = () => {
    setSelectedQuestion(null);
    setIsEditMode(false);
    setIsAddModalOpen(true);
  };
  
  const handleEditQuestion = (question: QuestionWithRoom) => {
    setSelectedQuestion(question);
    setIsEditMode(true);
    setIsAddModalOpen(true);
  };
  
  const handleDeleteQuestion = (question: QuestionWithRoom) => {
    setSelectedQuestion(question);
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (selectedQuestion) {
      deleteQuestionMutation.mutate(selectedQuestion.id);
    }
  };
  
  return (
    <AdminLayout title="Question Management">
      <div className="mb-6 flex justify-between items-center">
        <div></div>
        <Button 
          onClick={handleAddNewQuestion}
          className="bg-primary hover:bg-primary-dark flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Question
        </Button>
      </div>
      
      {/* Room Filter */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <label htmlFor="question-room-filter" className="block text-sm font-medium text-gray-700 mb-1">
          Select Room
        </label>
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="All Rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Rooms</SelectItem>
            {rooms.map(room => (
              <SelectItem key={room.id} value={room.id.toString()}>
                {room.roomName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Questions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingQuestions ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Loading questions...
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No questions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">{question.questionText}</TableCell>
                    <TableCell>{question.roomName}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleEditQuestion(question)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Question"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete Question"
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
      <AddQuestionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        question={selectedQuestion}
        isEditMode={isEditMode}
      />
      
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Question"
        message="Are you sure you want to delete this question? This will also remove all associated ratings."
        confirmText="Delete"
        isLoading={deleteQuestionMutation.isPending}
      />
    </AdminLayout>
  );
}
