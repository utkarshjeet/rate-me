import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  insertQuestionSchema, 
  InsertQuestion, 
  QuestionWithRoom,
  Room 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: QuestionWithRoom | null;
  isEditMode?: boolean;
}

export default function AddQuestionModal({ 
  isOpen, 
  onClose, 
  question = null,
  isEditMode = false 
}: AddQuestionModalProps) {
  const { toast } = useToast();
  
  // Fetch all rooms for the dropdown
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
  
  const form = useForm<InsertQuestion>({
    resolver: zodResolver(insertQuestionSchema),
    defaultValues: {
      roomId: isEditMode && question ? question.roomId : (rooms[0]?.id || 1),
      questionText: "",
    },
  });
  
  // Set form values when editing a question
  useEffect(() => {
    if (isEditMode && question) {
      form.reset({
        roomId: question.roomId,
        questionText: question.questionText,
      });
    } else if (rooms && rooms.length > 0) {
      form.reset({
        roomId: rooms[0].id, // Default to first room instead of 0
        questionText: "",
      });
    }
  }, [isEditMode, question, form, rooms]);
  
  const addQuestionMutation = useMutation({
    mutationFn: async (data: InsertQuestion) => {
      const res = await apiRequest("POST", "/api/questions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Success",
        description: "Question has been added successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add question: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertQuestion }) => {
      const res = await apiRequest("PUT", `/api/questions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: "Success",
        description: "Question has been updated successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update question: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: InsertQuestion) => {
    if (isEditMode && question) {
      updateQuestionMutation.mutate({ id: question.id, data });
    } else {
      addQuestionMutation.mutate(data);
    }
  };
  
  const isPending = addQuestionMutation.isPending || updateQuestionMutation.isPending;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Question" : "Add New Question"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Edit question details below." 
              : "Add a new question for a room. Students will rate each other based on this question."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Room</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingRooms ? (
                        <SelectItem value="loading" disabled>
                          Loading rooms...
                        </SelectItem>
                      ) : rooms.length === 0 ? (
                        <SelectItem value="no-rooms" disabled>
                          No rooms available
                        </SelectItem>
                      ) : (
                        rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.roomName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your question here" 
                      rows={4} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  isEditMode ? "Update Question" : "Add Question"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
