import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import StudentLayout from "@/components/layouts/student-layout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Room, Question, LeaderboardEntry } from "@shared/schema";

export default function StudentLeaderboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("all");
  
  // Fetch room details
  const { data: room, isLoading: isLoadingRoom } = useQuery<Room>({
    queryKey: ["/api/rooms", roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) throw new Error("Failed to fetch room");
      return res.json();
    },
  });
  
  // Fetch questions for the room
  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
    queryKey: ["/api/rooms", roomId, "questions"],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/questions`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
    enabled: !!roomId,
  });
  
  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/rooms", roomId, "leaderboard", selectedQuestionId],
    queryFn: async () => {
      let url = `/api/rooms/${roomId}/leaderboard`;
      if (selectedQuestionId !== "all") {
        url += `?questionId=${selectedQuestionId}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: !!roomId,
  });
  
  // Loading state
  if (isLoadingRoom) {
    return (
      <StudentLayout title="Loading...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </StudentLayout>
    );
  }
  
  return (
    <StudentLayout 
      title={`Leaderboard: ${room?.roomName || "Room"}`} 
      showBackButton={true}
      backUrl={`/student/rating/${roomId}`}
    >
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-4">
            <label htmlFor="leaderboard-question-selector" className="block text-sm font-medium text-gray-700 mb-1">
              Select Question
            </label>
            <Select value={selectedQuestionId} onValueChange={setSelectedQuestionId}>
              <SelectTrigger className="w-full md:w-auto">
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
        </CardContent>
      </Card>
      
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
              {isLoadingLeaderboard ? (
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
    </StudentLayout>
  );
}
