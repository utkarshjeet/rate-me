import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportStudentsModal({ isOpen, onClose }: ImportStudentsModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const importStudentsMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to import students");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported} students. ${data.skipped} were skipped.`,
      });
      setFile(null);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleImport = () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    importStudentsMutation.mutate(formData);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Students from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls) or CSV file (.csv) containing student data.
            The file should have columns for Student Number, Name, and Email.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="mb-4">
            <label 
              className={`flex flex-col rounded-lg border-2 ${
                isDragging ? "border-primary" : "border-dashed"
              } w-full h-32 p-5 group text-center cursor-pointer`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
            >
              <div className="h-full w-full text-center flex flex-col items-center justify-center">
                <Upload className="text-3xl text-gray-400 group-hover:text-primary" />
                <p className="text-sm text-gray-400 group-hover:text-primary pt-1 tracking-wider">
                  {file 
                    ? `Selected: ${file.name}`
                    : "Click to browse or drag & drop file"}
                </p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
            </label>
            <p className="mt-1 text-sm text-gray-500">
              File must contain Student Number, Name, and Email columns
            </p>
          </div>
          
          {importStudentsMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {importStudentsMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={importStudentsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importStudentsMutation.isPending}
            >
              {importStudentsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
