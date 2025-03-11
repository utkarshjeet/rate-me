import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertRoomSchema, InsertRoom, Room, RoomWithDetails } from "@shared/schema";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: RoomWithDetails | null;
  isEditMode?: boolean;
}

export default function AddRoomModal({ 
  isOpen, 
  onClose, 
  room = null,
  isEditMode = false 
}: AddRoomModalProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertRoom>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      roomName: "",
      branch: "",
      section: "",
    },
  });
  
  // Set form values when editing a room
  useEffect(() => {
    if (isEditMode && room) {
      form.reset({
        roomName: room.roomName,
        branch: room.branch,
        section: room.section,
      });
    } else {
      form.reset({
        roomName: "",
        branch: "",
        section: "",
      });
    }
  }, [isEditMode, room, form]);
  
  const addRoomMutation = useMutation({
    mutationFn: async (data: InsertRoom) => {
      const res = await apiRequest("POST", "/api/rooms", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room has been added successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add room: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertRoom }) => {
      const res = await apiRequest("PUT", `/api/rooms/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room has been updated successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update room: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: InsertRoom) => {
    if (isEditMode && room) {
      updateRoomMutation.mutate({ id: room.id, data });
    } else {
      addRoomMutation.mutate(data);
    }
  };
  
  const isPending = addRoomMutation.isPending || updateRoomMutation.isPending;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Room" : "Add New Room"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Edit room details below." 
              : "Add a new room to the system. Students can be assigned to this room later."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roomName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter room name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter branch (e.g., CSE, ECE)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter section (e.g., A, B)" {...field} />
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
                  isEditMode ? "Update Room" : "Add Room"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
