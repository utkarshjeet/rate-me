import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/admin-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Room, Question, LeaderboardEntry } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLeaderboard() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("all");
  
  // Fetch all rooms
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });
  
  // Fetch questions for selected room
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: ["/api/rooms", selectedRoomId, "questions"],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      const res = await fetch(`/api/rooms/${selectedRoomId}/questions`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
    enabled: !!selectedRoomId,
  });
  
  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/rooms", selectedRoomId, "leaderboard", selectedQuestionId],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      let url = `/api/rooms/${selectedRoomId}/leaderboard`;
      if (selectedQuestionId !== "all") {
        url += `?questionId=${selectedQuestionId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: !!selectedRoomId,
  });
  
  const handleRoomChange = (value: string) => {
    setSelectedRoomId(value);
    setSelectedQuestionId("all"); // Reset question selection when room changes
  };
  
  return (
    <AdminLayout title="Leaderboard">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="leaderboard-room-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Select Room
              </label>
              <Select value={selectedRoomId} onValueChange={handleRoomChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.roomName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="leaderboard-question-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Select Question
              </label>
              <Select 
                value={selectedQuestionId} 
                onValueChange={setSelectedQuestionId}
                disabled={!selectedRoomId || isLoadingQuestions}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Questions (Overall)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions (Overall)</SelectItem>
                  {questions.map(question => (
                    <SelectItem key={question.id} value={question.id.toString()}>
                      {question.questionText.length > 60 
                        ? `${question.questionText.substring(0, 60)}...` 
                        : question.questionText}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Leaderboard Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Student Number</TableHead>
                <TableHead>Total Rating</TableHead>
                <TableHead>Average Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedRoomId ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Please select a room to view the leaderboard
                  </TableCell>
                </TableRow>
              ) : isLoadingLeaderboard ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading leaderboard...
                  </TableCell>
                </TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No ratings available for this selection
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((entry) => (
                  <TableRow key={entry.student.id}>
                    <TableCell className="font-medium">{entry.rank}</TableCell>
                    <TableCell>{entry.student.name}</TableCell>
                    <TableCell>{entry.student.studentNumber}</TableCell>
                    <TableCell>{entry.totalRating}</TableCell>
                    <TableCell>{entry.averageRating.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
