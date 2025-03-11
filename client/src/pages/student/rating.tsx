import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams } from "wouter";
import StudentLayout from "@/components/layouts/student-layout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Room, Question, Student, InsertRating } from "@shared/schema";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function StudentRating() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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

  // Fetch students in the room
  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/rooms", roomId, "students"],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/students`);
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!roomId,
  });

  // Reset selected students when the question changes
  useEffect(() => {
    setSelectedStudents([]);
  }, [currentQuestionIndex]);

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async (data: InsertRating) => {
      const res = await apiRequest("POST", "/api/ratings", data);
      return await res.json();
    },
    onSuccess: () => {
      // Mark current question as submitted
      const currentQuestionId = questions[currentQuestionIndex]?.id;
      if (currentQuestionId) {
        setSubmittedQuestions(prev => {
          const newSet = new Set(prev);
          newSet.add(currentQuestionId);
          return newSet;
        });
      }
      
      // Show success message
      setSubmissionSuccess(true);
      setTimeout(() => {
        setSubmissionSuccess(false);
      }, 3000);
      
      // Reset selected students
      setSelectedStudents([]);
      
      // Go to next question if available
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
      
      toast({
        title: "Ratings submitted",
        description: "Your ratings have been submitted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit ratings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle student selection for ranking
  const handleSelectStudent = (studentId: number) => {
    // If already selected, do nothing
    if (selectedStudents.includes(studentId)) {
      return;
    }
    
    // Add to selected students
    setSelectedStudents(prev => [...prev, studentId]);
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Submit ratings
  const submitRatings = () => {
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "You must be logged in to submit ratings.",
        variant: "destructive",
      });
      return;
    }

    // Get current question
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      toast({
        title: "Error",
        description: "No question selected.",
        variant: "destructive",
      });
      return;
    }

    // Submit ratings for each selected student
    const raterId = user.id;
    
    selectedStudents.forEach((studentId, index) => {
      const rank = index + 1; // Rank starts at 1
      
      submitRatingMutation.mutate({
        roomId: parseInt(roomId),
        questionId: currentQuestion.id,
        studentId,
        raterId,
        rank,
      });
    });
  };

  // Check if current question is already submitted
  const isCurrentQuestionSubmitted = questions[currentQuestionIndex]
    ? submittedQuestions.has(questions[currentQuestionIndex].id)
    : false;

  // Loading state
  if (isLoadingRoom || isLoadingQuestions || isLoadingStudents) {
    return (
      <StudentLayout title="Loading...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </StudentLayout>
    );
  }

  // No questions available
  if (questions.length === 0) {
    return (
      <StudentLayout 
        title={room?.roomName || "Room"} 
        showBackButton={true}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-medium text-gray-900 mb-2">No Questions Available</h2>
              <p className="text-gray-600">
                There are no questions set up for this room yet. Please check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </StudentLayout>
    );
  }

  // Current question
  const currentQuestion = questions[currentQuestionIndex];

  // Safety check to ensure there's at least one question available
  if (!currentQuestion) {
    return (
      <StudentLayout 
        title={room?.roomName || "Room"} 
        showBackButton={true}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-medium text-gray-900 mb-2">No Question Available</h2>
              <p className="text-gray-600">
                The selected question cannot be found. Please try again later or contact an administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout 
      title={room?.roomName || "Room"} 
      showBackButton={true}
      showLeaderboardButton={true}
      roomId={roomId}
    >
      {/* Question Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="question-carousel">
            <div className="current-question">
              <h3 className="text-base font-medium text-gray-800 mb-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h3>
              <p className="text-lg text-gray-900 mb-4">{currentQuestion.questionText}</p>
              
              <div className="flex space-x-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center"
                >
                  <ArrowLeftIcon className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center"
                >
                  Next <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Student Rating Section */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-base font-medium text-gray-800 mb-4">
            Rank Students (Click in order of preference)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => {
              const selectedIndex = selectedStudents.indexOf(student.id);
              const isSelected = selectedIndex > -1;
              
              return (
                <div
                  key={student.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition ${
                    isSelected ? "border-primary" : ""
                  }`}
                  onClick={() => handleSelectStudent(student.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800">{student.name}</h4>
                      <p className="text-sm text-gray-600">{student.studentNumber}</p>
                    </div>
                    {isSelected && (
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary text-white font-medium">
                        <span>{selectedIndex + 1}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button
              onClick={submitRatings}
              disabled={
                selectedStudents.length === 0 || 
                isCurrentQuestionSubmitted || 
                submitRatingMutation.isPending
              }
              className="px-4 py-2"
            >
              {submitRatingMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                  Submitting...
                </div>
              ) : (
                "Submit Ratings"
              )}
            </Button>
          </div>
          
          {/* Rating Submitted Message */}
          {submissionSuccess && (
            <Alert className="mt-4 bg-green-100 text-green-700">
              <AlertDescription>
                Ratings submitted successfully for this question!
              </AlertDescription>
            </Alert>
          )}
          
          {/* Already Submitted Message */}
          {isCurrentQuestionSubmitted && !submissionSuccess && (
            <Alert className="mt-4 bg-yellow-100 text-yellow-700">
              <AlertDescription>
                You have already submitted ratings for this question.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </StudentLayout>
  );
}
