
import type {
  Task,
  DeletedTask,
  TaskPriority,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters
} from '../../main/repositories/task-repository';

export {};

declare global {
  interface Window {
    sidekick: {
      platform: string;

      versions: {
        electron: string;
        chrome: string;
        node: string;
      };

      tasks: {
        create(input: CreateTaskInput): Promise<Task>;
        list(filters?: TaskFilters): Promise<Task[]>;
        get(id: string): Promise<Task | null>;
        update(id: string, input: UpdateTaskInput): Promise<Task | null>;
        complete(id: string): Promise<Task | null>;
        delete(id: string): Promise<boolean>;
      };

      deletedTasks: {
        list(): Promise<DeletedTask[]>;
        restore(archiveId: string): Promise<boolean>;
        permanentlyDelete(archiveId: string): Promise<boolean>;
        empty(): Promise<number>;
      };
    };
  }
}
