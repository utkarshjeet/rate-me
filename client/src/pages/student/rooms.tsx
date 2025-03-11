import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import StudentLayout from "@/components/layouts/student-layout";
import { RoomWithDetails } from "@shared/schema";

export default function StudentRooms() {
  // Fetch all rooms
  const { data: rooms = [], isLoading } = useQuery<RoomWithDetails[]>({
    queryKey: ["/api/rooms"],
  });

  return (
    <StudentLayout title="Select Room">
      <div className="bg-white shadow rounded-lg p-6">
        {isLoading ? (
          <div className="text-center py-10">
            <svg className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Loading rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600">No rooms available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Link 
                key={room.id} 
                href={`/student/rating/${room.id}`}
                className="room-card border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
              >
                <h3 className="font-medium text-gray-800">{room.roomName}</h3>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="inline-block mr-3">Branch: {room.branch}</span>
                  <span className="inline-block">Section: {room.section}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
