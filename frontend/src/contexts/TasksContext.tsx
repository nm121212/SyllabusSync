import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Global tasks coordination:
 * - `version` bumps whenever any consumer changes the backing data; panels
 *   subscribe via `useEffect(..., [version])` to refetch.
 * - `openAddTask()` is how any button in the app pops the manual-add dialog.
 */
interface TasksContextValue {
  version: number;
  bumpVersion: () => void;
  isAddTaskOpen: boolean;
  openAddTask: () => void;
  closeAddTask: () => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [version, setVersion] = useState(0);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);

  const bumpVersion = useCallback(() => setVersion((v) => v + 1), []);
  const openAddTask = useCallback(() => setAddTaskOpen(true), []);
  const closeAddTask = useCallback(() => setAddTaskOpen(false), []);

  const value = useMemo<TasksContextValue>(
    () => ({
      version,
      bumpVersion,
      isAddTaskOpen,
      openAddTask,
      closeAddTask,
    }),
    [version, bumpVersion, isAddTaskOpen, openAddTask, closeAddTask]
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
};

export const useTasks = (): TasksContextValue => {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks must be used inside <TasksProvider>');
  }
  return ctx;
};
