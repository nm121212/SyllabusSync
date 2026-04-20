import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const STORAGE_OPEN = 'cadence-chat-dock-open';
const STORAGE_POS = 'cadence-chat-dock-pos';

export type PendingPrompt = { text: string; id: string };

type Pos = { left: number; top: number };

function loadOpen(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_OPEN);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_POS);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pos;
    if (
      typeof p?.left === 'number' &&
      typeof p?.top === 'number' &&
      !Number.isNaN(p.left) &&
      !Number.isNaN(p.top)
    ) {
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function defaultPos(): Pos {
  if (typeof window === 'undefined') return { left: 24, top: 100 };
  const w = 380;
  return {
    left: Math.max(16, window.innerWidth - w - 24),
    top: 100,
  };
}

interface FloatingChatContextValue {
  dockOpen: boolean;
  setDockOpen: (open: boolean) => void;
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
  pendingPrompt: PendingPrompt | undefined;
  setPendingPrompt: React.Dispatch<
    React.SetStateAction<PendingPrompt | undefined>
  >;
  position: Pos;
  setPosition: React.Dispatch<React.SetStateAction<Pos>>;
  persistPosition: (p: Pos) => void;
}

const FloatingChatContext = createContext<FloatingChatContextValue | undefined>(
  undefined
);

export const FloatingChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dockOpen, setDockOpenState] = useState(loadOpen);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | undefined>(
    undefined
  );
  const [position, setPosition] = useState<Pos>(() => loadPos() ?? defaultPos);

  const setDockOpen = useCallback((open: boolean) => {
    setDockOpenState(open);
    try {
      localStorage.setItem(STORAGE_OPEN, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const openDock = useCallback(() => setDockOpen(true), [setDockOpen]);
  const closeDock = useCallback(() => setDockOpen(false), [setDockOpen]);
  const toggleDock = useCallback(() => {
    setDockOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_OPEN, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const persistPosition = useCallback((p: Pos) => {
    try {
      localStorage.setItem(STORAGE_POS, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<FloatingChatContextValue>(
    () => ({
      dockOpen,
      setDockOpen,
      openDock,
      closeDock,
      toggleDock,
      pendingPrompt,
      setPendingPrompt,
      position,
      setPosition,
      persistPosition,
    }),
    [
      dockOpen,
      setDockOpen,
      openDock,
      closeDock,
      toggleDock,
      pendingPrompt,
      position,
      persistPosition,
    ]
  );

  return (
    <FloatingChatContext.Provider value={value}>
      {children}
    </FloatingChatContext.Provider>
  );
};

export const useFloatingChat = (): FloatingChatContextValue => {
  const ctx = useContext(FloatingChatContext);
  if (!ctx) {
    throw new Error('useFloatingChat must be used inside FloatingChatProvider');
  }
  return ctx;
};
