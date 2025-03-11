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
import { PlusCircle, Users, Edit, Trash2 } from "lucide-react";
import { Room, RoomWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import AddRoomModal from "@/components/modals/add-room-modal";
import ManageRoomStudentsModal from "@/components/modals/manage-room-students-modal";
import ConfirmationModal from "@/components/modals/confirmation-modal";

export default function AdminRooms() {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageStudentsModalOpen, setIsManageStudentsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithDetails | null>(null);
  
  // Fetch all rooms
  const { data: rooms = [], isLoading } = useQuery<RoomWithDetails[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Delete room
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      await apiRequest("DELETE", `/api/rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room has been deleted.",
      });
      setIsConfirmModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete room: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleManageStudents = (room: RoomWithDetails) => {
    setSelectedRoom(room);
    setIsManageStudentsModalOpen(true);
  };
  
  const handleEditRoom = (room: RoomWithDetails) => {
    setSelectedRoom(room);
    setIsEditMode(true);
    setIsAddModalOpen(true);
  };
  
  const handleDeleteRoom = (room: RoomWithDetails) => {
    setSelectedRoom(room);
    setIsConfirmModalOpen(true);
  };
  
  const handleAddNewRoom = () => {
    setSelectedRoom(null);
    setIsEditMode(false);
    setIsAddModalOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (selectedRoom) {
      deleteRoomMutation.mutate(selectedRoom.id);
    }
  };
  
  return (
    <AdminLayout title="Room Management">
      <div className="mb-6 flex justify-between items-center">
        <div></div>
        <Button 
          onClick={handleAddNewRoom}
          className="bg-primary hover:bg-primary-dark flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Room
        </Button>
      </div>
      
      {/* Rooms Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading rooms...
                  </TableCell>
                </TableRow>
              ) : rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No rooms found
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.roomName}</TableCell>
                    <TableCell>{room.branch}</TableCell>
                    <TableCell>{room.section}</TableCell>
                    <TableCell>{room.studentCount}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleManageStudents(room)}
                          className="text-primary hover:text-primary-dark"
                          title="Manage Students"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Room"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete Room"
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
      <AddRoomModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        room={selectedRoom}
        isEditMode={isEditMode}
      />
      
      <ManageRoomStudentsModal
        isOpen={isManageStudentsModalOpen}
        onClose={() => setIsManageStudentsModalOpen(false)}
        room={selectedRoom}
      />
      
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Room"
        message={`Are you sure you want to delete the room "${selectedRoom?.roomName}"? This will also remove all associated questions and ratings.`}
        confirmText="Delete"
        isLoading={deleteRoomMutation.isPending}
      />
    </AdminLayout>
  );
}
