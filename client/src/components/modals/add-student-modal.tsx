import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertStudentSchema, InsertStudent } from "@shared/schema";
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

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddStudentModal({ isOpen, onClose }: AddStudentModalProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertStudent>({
    resolver: zodResolver(insertStudentSchema),
    defaultValues: {
      studentNumber: "",
      name: "",
      email: "",
      isRegistered: false,
    },
  });
  
  const addStudentMutation = useMutation({
    mutationFn: async (data: InsertStudent) => {
      const res = await apiRequest("POST", "/api/students", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Success",
        description: "Student has been added successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add student: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: InsertStudent) => {
    addStudentMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Add a new student to the system. The student will be able to login with these credentials.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="studentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
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
                    <Input type="email" placeholder="Enter email address" {...field} />
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
                disabled={addStudentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addStudentMutation.isPending}
              >
                {addStudentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Student"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
