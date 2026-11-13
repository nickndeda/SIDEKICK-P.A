export type LearningSubjectStatus = 'active' | 'completed' | 'archived';
export type LearningTopicDifficulty = 'easy' | 'medium' | 'hard';
export type LearningTopicStatus = 'not_started' | 'in_progress' | 'completed';
export type LearningSessionStatus = 'running' | 'paused' | 'completed' | 'cancelled';
export type LearningQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type LearningRevisionGrade = 'again' | 'difficult' | 'fair' | 'good' | 'easy';
export type LearningGoalType = 'study_minutes' | 'completed_topics' | 'revisions';

export interface LearningSubject {
  id: string; name: string; subjectCode: string | null; description: string | null;
  category: string | null; targetWeeklyMinutes: number; startDate: string | null;
  endDate: string | null; status: LearningSubjectStatus; topicCount: number;
  completedTopics: number; studySeconds: number; createdAt: Date; updatedAt: Date;
}
export interface LearningSubjectInput {
  name: string; subjectCode?: string | null; description?: string | null; category?: string | null;
  targetWeeklyMinutes?: number; startDate?: string | null; endDate?: string | null;
}
export interface LearningTopic {
  id: string; subjectId: string; subjectName: string; title: string; description: string | null;
  difficulty: LearningTopicDifficulty; status: LearningTopicStatus; estimatedMinutes: number | null;
  progressPercent: number; studySeconds: number; lastStudiedAt: Date | null;
  nextRevisionAt: Date | null; archivedAt: Date | null; averageQuizPercent: number | null;
  quizAttempts: number; createdAt: Date; updatedAt: Date;
}
export interface LearningTopicInput {
  subjectId: string; title: string; description?: string | null; difficulty?: LearningTopicDifficulty;
  status?: LearningTopicStatus; estimatedMinutes?: number | null; progressPercent?: number;
}
export interface LearningSession {
  id: string; subjectId: string; subjectName: string; topicId: string | null; topicTitle: string | null;
  title: string; notes: string | null; status: LearningSessionStatus; startedAt: Date;
  endedAt: Date | null; elapsedSeconds: number; segmentStartedAt: Date | null; createdAt: Date;
}
export interface LearningSessionInput { subjectId: string; topicId?: string | null; title: string; notes?: string | null }
export interface LearningNote { id: string; subjectId: string | null; topicId: string | null; title: string; body: string; createdAt: Date; updatedAt: Date }
export interface LearningNoteInput { subjectId?: string | null; topicId?: string | null; title: string; body: string }
export type LearningResourceType = 'link' | 'document' | 'text_note' | 'other';
export interface LearningResource { id: string; subjectId: string; topicId: string | null; title: string; description: string | null; resourceType: LearningResourceType; url: string | null; localPath: string | null; createdAt: Date; updatedAt: Date; localPathAvailable: boolean | null }
export interface LearningResourceInput { subjectId: string; topicId?: string | null; title: string; description?: string | null; resourceType: LearningResourceType; url?: string | null; localPath?: string | null }
export interface LearningQuestion { id: string; quizId: string; questionText: string; questionType: LearningQuestionType; options: string[]; explanation: string | null; points: number; questionOrder: number }
export interface LearningQuestionInput { quizId: string; questionText: string; questionType: LearningQuestionType; options?: string[]; correctAnswer: string; explanation?: string | null; points?: number; questionOrder?: number }
export interface LearningQuiz { id: string; subjectId: string; subjectName: string; topicId: string | null; topicTitle: string | null; title: string; description: string | null; timeLimitMinutes: number | null; passingPercent: number | null; status: 'draft' | 'published' | 'archived'; questionCount: number; createdAt: Date; updatedAt: Date }
export interface LearningQuizDetail extends LearningQuiz { questions: LearningQuestion[] }
export interface LearningAttempt { id: string; quizId: string; quizTitle: string; status: 'in_progress' | 'submitted' | 'abandoned'; startedAt: Date; submittedAt: Date | null; score: number | null; maxScore: number | null; percentage: number | null; resultStatus: 'passed' | 'not_passed' | null; answers?: Array<{ questionId: string; answerText: string; isCorrect: boolean; awardedPoints: number; explanation: string | null }> }
export interface LearningRevision { id: string; topicId: string; topicTitle: string; subjectId: string; subjectName: string; dueAt: Date; reviewedAt: Date | null; grade: LearningRevisionGrade | null; status: 'scheduled' | 'completed' | 'dismissed'; createdAt: Date }
export interface LearningGoal { id: string; subjectId: string | null; subjectName: string | null; title: string; description: string | null; goalType: LearningGoalType; targetValue: number; currentValue: number; startDate: string; deadline: string | null; status: 'active' | 'completed' | 'archived'; createdAt: Date }
export interface LearningGoalInput { subjectId?: string | null; title: string; description?: string | null; goalType: LearningGoalType; targetValue: number; startDate: string; deadline?: string | null }
export interface LearningQuizInput { subjectId: string; topicId?: string | null; title: string; description?: string | null; timeLimitMinutes?: number | null; passingPercent?: number | null; status?: 'draft' | 'published' | 'archived' }
export interface WeakTopic { topicId: string; subjectName: string; topicTitle: string; averageQuizPercent: number; quizAttempts: number; lastStudiedAt: Date | null; level: 'significant_attention' | 'improvement' | 'developing' | 'strong'; reasons: string[] }
export interface LearningOverview {
  activeSubjects: number; totalTopics: number; completedTopics: number; inProgressTopics: number;
  studyTodaySeconds: number; studyWeekSeconds: number; studyMonthSeconds: number;
  quizAttempts: number; averageQuizPercent: number | null; weakTopics: WeakTopic[];
  revisionsDueToday: number; overdueRevisions: number; upcomingRevisions: LearningRevision[];
  currentSession: LearningSession | null; subjectStudy: Array<{ subjectId: string; subjectName: string; studySeconds: number }>;
  activeGoals: LearningGoal[]; recentSessions: LearningSession[];
}
export interface LearningAnalyticsFilter { from?: string; to?: string; subjectId?: string }
export interface LearningApi {
  subjects: {
    list(includeArchived?: boolean): Promise<LearningSubject[]>; getById(id: string): Promise<LearningSubject | null>;
    create(input: LearningSubjectInput): Promise<LearningSubject>; update(id: string, input: LearningSubjectInput): Promise<LearningSubject>;
    archive(id: string): Promise<void>; restore(id: string): Promise<void>; delete(id: string): Promise<boolean>;
    complete(id: string): Promise<void>;
  };
  topics: {
    list(filters?: { subjectId?: string; status?: LearningTopicStatus; difficulty?: LearningTopicDifficulty; search?: string; includeArchived?: boolean }): Promise<LearningTopic[]>;
    getById(id: string): Promise<LearningTopic | null>; create(input: LearningTopicInput): Promise<LearningTopic>;
    update(id: string, input: LearningTopicInput): Promise<LearningTopic>; updateProgress(id: string, progress: number, status?: LearningTopicStatus): Promise<LearningTopic>;
    delete(id: string): Promise<boolean>;
  };
  sessions: {
    list(limit?: number, subjectId?: string): Promise<LearningSession[]>; current(): Promise<LearningSession | null>;
    start(input: LearningSessionInput): Promise<LearningSession>; pause(id: string): Promise<LearningSession>;
    resume(id: string): Promise<LearningSession>; finish(id: string, notes?: string): Promise<LearningSession>;
    cancel(id: string): Promise<LearningSession>; todaySeconds(): Promise<number>; weeklySeconds(): Promise<number>;
  };
  notes: { list(subjectId?: string, topicId?: string): Promise<LearningNote[]>; create(input: LearningNoteInput): Promise<LearningNote>; update(id: string, input: LearningNoteInput): Promise<LearningNote>; delete(id: string): Promise<boolean> };
  resources: { list(subjectId?: string, topicId?: string): Promise<LearningResource[]>; create(input: LearningResourceInput): Promise<LearningResource>; update(id: string, input: LearningResourceInput): Promise<LearningResource>; delete(id: string): Promise<boolean>; open(id: string): Promise<void> };
  quizzes: { list(subjectId?: string): Promise<LearningQuiz[]>; getById(id: string): Promise<LearningQuizDetail | null>; create(input: { subjectId: string; topicId?: string | null; title: string; description?: string | null; timeLimitMinutes?: number | null; passingPercent?: number | null; status?: 'draft'|'published' }): Promise<LearningQuiz>; update(id: string, input: { subjectId: string; topicId?: string | null; title: string; description?: string | null; timeLimitMinutes?: number | null; passingPercent?: number | null; status?: 'draft'|'published'|'archived' }): Promise<LearningQuiz>; delete(id: string): Promise<boolean>; addQuestion(input: LearningQuestionInput): Promise<LearningQuestion>; updateQuestion(id: string, input: LearningQuestionInput): Promise<LearningQuestion>; deleteQuestion(id: string): Promise<boolean>; startAttempt(quizId: string): Promise<{ attempt: LearningAttempt; quiz: LearningQuizDetail }>; submitAttempt(attemptId: string, answers: Array<{ questionId: string; answerText: string }>): Promise<LearningAttempt>; attempts(quizId?: string): Promise<LearningAttempt[]>; resumeAttempt(id: string): Promise<{ attempt: LearningAttempt; quiz: LearningQuizDetail }>; abandonAttempt(id:string):Promise<void> };
  revisions: { list(status?: LearningRevision['status'], subjectId?: string): Promise<LearningRevision[]>; dueToday(): Promise<LearningRevision[]>; overdue(): Promise<LearningRevision[]>; upcoming(): Promise<LearningRevision[]>; create(topicId: string, dueAt: Date): Promise<LearningRevision>; complete(id: string, grade: LearningRevisionGrade): Promise<{ completed: LearningRevision; next: LearningRevision }>; reschedule(id: string, dueAt: Date): Promise<LearningRevision>; dismiss(id: string): Promise<void> };
  goals: { list(status?: LearningGoal['status']): Promise<LearningGoal[]>; create(input: { subjectId?: string | null; title: string; description?: string | null; goalType: LearningGoalType; targetValue: number; startDate: string; deadline?: string | null }): Promise<LearningGoal>; update(id: string, input: { subjectId?: string | null; title: string; description?: string | null; goalType: LearningGoalType; targetValue: number; startDate: string; deadline?: string | null }): Promise<LearningGoal>; complete(id: string): Promise<void>; archive(id: string): Promise<void> };
  analytics: { overview(): Promise<LearningOverview>; studyTime(filter?: LearningAnalyticsFilter): Promise<Array<{ label: string; seconds: number }>>; performance(filter?: LearningAnalyticsFilter): Promise<Array<{ date: string; percentage: number }>>; weakTopics(): Promise<WeakTopic[]> };
}
