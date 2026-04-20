import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, CheckCircle } from '@mui/icons-material';
import { CADENCE_TASK_DRAG_TYPE } from '../lib/cadenceDrag.ts';

export interface CalendarTask {
  id: number | string;
  title: string;
  dueDate: string; // ISO yyyy-mm-dd
  type?: string;
  courseName?: string;
  priority?: string;
  status?: string;
  googleEventId?: string;
  description?: string;
}

interface TaskCalendarProps {
  tasks: CalendarTask[];
  /** "full" = roomy grid for the Calendar page, "compact" = smaller preview for landing */
  variant?: 'full' | 'compact';
  /** When false, render without outer card chrome (for split-layout embedding). */
  framed?: boolean;
  /** When set, task chips are clickable to edit (e.g. open the same dialog as the task list). */
  onTaskClick?: (task: CalendarTask) => void;
  /** Drop a task from the list onto a day to reschedule its due date (yyyy-mm-dd). */
  onTaskDroppedOnDay?: (taskId: number, isoDay: string) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Deterministic purple/blue palette, keyed by task type so each type keeps
 *  the same colour across the grid. */
const TYPE_COLORS: Record<string, string> = {
  ASSIGNMENT: '#7c6cff',
  PROJECT: '#3b82f6',
  EXAM: '#f472b6',
  QUIZ: '#c084fc',
  LAB: '#22d3ee',
  PRESENTATION: '#fbbf24',
  PAPER: '#a08fff',
  DISCUSSION: '#60a5fa',
  OTHER: '#a08fff',
};

const colorFor = (task: CalendarTask): string => {
  const key = (task.type || 'OTHER').toUpperCase();
  return TYPE_COLORS[key] ?? '#7c6cff';
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, delta: number) =>
  new Date(d.getFullYear(), d.getMonth() + delta, 1);
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatIsoKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const parseIso = (s: string): Date | null => {
  if (!s) return null;
  // Support both "YYYY-MM-DD" and full ISO strings
  const core = s.length >= 10 ? s.slice(0, 10) : s;
  const d = new Date(core + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
};

const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  variant = 'full',
  framed = true,
  onTaskClick,
  onTaskDroppedOnDay,
}) => {
  const compact = variant === 'compact';
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [moreMenu, setMoreMenu] = useState<{
    anchor: HTMLElement;
    dayTasks: CalendarTask[];
  } | null>(null);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Default: start on the month of the nearest upcoming task (fall back to today)
  const defaultMonth = useMemo(() => {
    const upcoming = tasks
      .map((t) => parseIso(t.dueDate))
      .filter((d): d is Date => !!d && d.getTime() >= today.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    return startOfMonth(upcoming[0] ?? today);
  }, [tasks, today]);

  const [month, setMonth] = useState<Date>(defaultMonth);

  // Group tasks by ISO day-key for O(1) cell lookups
  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    tasks.forEach((t) => {
      const d = parseIso(t.dueDate);
      if (!d) return;
      const k = formatIsoKey(d);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    });
    return map;
  }, [tasks]);

  // Build 6x7 grid of Date cells for the currently viewed month
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const startOffset = first.getDay(); // 0 = Sunday
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      out.push(d);
    }
    return out;
  }, [month]);

  const monthLabel = month.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const cellSize = compact ? 42 : 72;
  const chipFontSize = compact ? 9 : 11;

  useEffect(() => {
    if (!dropTargetKey || !onTaskDroppedOnDay) return;
    const clear = () => setDropTargetKey(null);
    window.addEventListener('dragend', clear);
    return () => window.removeEventListener('dragend', clear);
  }, [dropTargetKey, onTaskDroppedOnDay]);

  return (
    <Box
      sx={{
        borderRadius: framed ? 4 : 0,
        border: framed ? '1px solid rgba(139, 92, 246, 0.25)' : 'none',
        background: framed
          ? 'linear-gradient(180deg, rgba(26,23,51,0.8) 0%, rgba(20,17,39,0.5) 100%)'
          : 'transparent',
        backdropFilter: framed ? 'blur(10px)' : 'none',
        p: compact ? 2 : framed ? 3 : 2,
      }}
    >
      {/* Header: month + nav */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: compact ? 1.5 : 2.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: compact ? 11 : 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              mb: 0.5,
            }}
          >
            Your month
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontSize: compact ? 18 : 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
            className="ss-gradient-text"
          >
            {monthLabel}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            p: 0.5,
            borderRadius: 999,
            border: '1px solid rgba(139, 92, 246, 0.22)',
            background: 'rgba(10,9,20,0.5)',
          }}
        >
          <IconButton
            size="small"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            sx={{ color: 'rgba(255,255,255,0.75)' }}
            aria-label="Previous month"
          >
            <ChevronLeft fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setMonth(startOfMonth(new Date()))}
            sx={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11,
              px: 1.25,
              borderRadius: 999,
            }}
            aria-label="Go to today"
          >
            <Typography
              sx={{
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Today
            </Typography>
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            sx={{ color: 'rgba(255,255,255,0.75)' }}
            aria-label="Next month"
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Weekday header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: compact ? 0.5 : 1,
          mb: compact ? 0.5 : 1,
        }}
      >
        {WEEKDAYS.map((w) => (
          <Typography
            key={w}
            sx={{
              textAlign: 'center',
              fontSize: compact ? 10 : 11,
              letterSpacing: '0.2em',
              color: 'var(--ss-text-mute)',
              fontWeight: 600,
            }}
          >
            {w}
          </Typography>
        ))}
      </Box>

      {/* Month grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: compact ? 0.5 : 1,
        }}
      >
        {cells.map((cell, idx) => {
          const inMonth = cell.getMonth() === month.getMonth();
          const isToday = isSameDay(cell, today);
          const isoKey = formatIsoKey(cell);
          const dayTasks = tasksByDay.get(isoKey) ?? [];
          const hasTasks = dayTasks.length > 0;
          const isDropTarget =
            Boolean(onTaskDroppedOnDay) && dropTargetKey === isoKey;

          return (
            <Box
              key={idx}
              onDragOver={
                onTaskDroppedOnDay
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDropTargetKey(isoKey);
                    }
                  : undefined
              }
              onDrop={
                onTaskDroppedOnDay
                  ? (e) => {
                      e.preventDefault();
                      setDropTargetKey(null);
                      const raw =
                        e.dataTransfer.getData(CADENCE_TASK_DRAG_TYPE) ||
                        e.dataTransfer.getData('text/plain');
                      const taskId = parseInt(raw, 10);
                      if (Number.isNaN(taskId)) return;
                      onTaskDroppedOnDay(taskId, isoKey);
                      if (
                        cell.getMonth() !== month.getMonth() ||
                        cell.getFullYear() !== month.getFullYear()
                      ) {
                        setMonth(startOfMonth(cell));
                      }
                    }
                  : undefined
              }
              sx={{
                position: 'relative',
                minHeight: cellSize,
                p: compact ? 0.75 : 1,
                borderRadius: 2,
                border: isDropTarget
                  ? '1px solid rgba(34, 211, 238, 0.9)'
                  : isToday
                    ? '1px solid rgba(124, 108, 255, 0.85)'
                    : '1px solid rgba(139, 92, 246, 0.12)',
                background: isDropTarget
                  ? 'rgba(34, 211, 238, 0.12)'
                  : isToday
                    ? 'rgba(124, 108, 255, 0.14)'
                    : hasTasks
                      ? 'rgba(10, 9, 20, 0.55)'
                      : 'rgba(10, 9, 20, 0.3)',
                boxShadow: isDropTarget
                  ? '0 0 0 2px rgba(34, 211, 238, 0.35)'
                  : isToday
                    ? '0 8px 24px -10px rgba(124,108,255,0.7)'
                    : 'none',
                opacity: inMonth ? 1 : 0.35,
                transition:
                  'transform 160ms ease, border-color 160ms ease, background 160ms ease',
                '&:hover': hasTasks
                  ? {
                      transform: 'translateY(-1px)',
                      borderColor: 'rgba(139, 92, 246, 0.5)',
                    }
                  : undefined,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: compact ? 0.25 : 0.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: compact ? 11 : 13,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday
                      ? '#fff'
                      : inMonth
                        ? 'rgba(255,255,255,0.85)'
                        : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {cell.getDate()}
                </Typography>
                {hasTasks && compact && (
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: colorFor(dayTasks[0]),
                      boxShadow: `0 0 6px ${colorFor(dayTasks[0])}`,
                    }}
                  />
                )}
              </Box>

              {/* Task pills (full variant only) */}
              {!compact && hasTasks && (
                <Box sx={{ display: 'grid', gap: 0.5 }}>
                  {dayTasks.slice(0, 2).map((t) => {
                    const accent = colorFor(t);
                    const synced = !!t.googleEventId;
                    const done = t.status === 'COMPLETED';
                    const clickable = Boolean(onTaskClick);
                    return (
                      <Tooltip
                        key={t.id}
                        arrow
                        title={
                          <Box>
                            <Typography
                              sx={{ fontWeight: 700, fontSize: 12.5 }}
                            >
                              {t.title}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.7)',
                              }}
                            >
                              {t.courseName || 'Personal'}
                              {t.type ? ` · ${t.type}` : ''}
                            </Typography>
                            {clickable && (
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  color: 'rgba(255,255,255,0.55)',
                                  mt: 0.5,
                                }}
                              >
                                Click to edit
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <Box
                          role={clickable ? 'button' : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onClick={
                            clickable
                              ? (e) => {
                                  e.stopPropagation();
                                  onTaskClick(t);
                                }
                              : undefined
                          }
                          onKeyDown={
                            clickable
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTaskClick(t);
                                  }
                                }
                              : undefined
                          }
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 999,
                            background: `${accent}22`,
                            border: `1px solid ${accent}55`,
                            fontSize: chipFontSize,
                            color: '#fff',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            opacity: done ? 0.55 : 1,
                            textDecoration: done ? 'line-through' : 'none',
                            cursor: clickable ? 'pointer' : 'default',
                            width: '100%',
                            textAlign: 'left',
                            font: 'inherit',
                            ...(clickable
                              ? {
                                  '&:hover': {
                                    borderColor: `${accent}99`,
                                    background: `${accent}33`,
                                  },
                                }
                              : {}),
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: 999,
                              flexShrink: 0,
                              background: accent,
                              boxShadow: `0 0 6px ${accent}`,
                            }}
                          />
                          <Box
                            component="span"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.title}
                          </Box>
                          {synced && (
                            <CheckCircle
                              sx={{
                                fontSize: 10,
                                color: '#22d3ee',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                  {dayTasks.length > 2 && (
                    <Typography
                      role={onTaskClick ? 'button' : undefined}
                      tabIndex={onTaskClick ? 0 : undefined}
                      onClick={
                        onTaskClick
                          ? (e) => {
                              e.stopPropagation();
                              setMoreMenu({
                                anchor: e.currentTarget,
                                dayTasks,
                              });
                            }
                          : undefined
                      }
                      onKeyDown={
                        onTaskClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setMoreMenu({
                                  anchor: e.currentTarget as HTMLElement,
                                  dayTasks,
                                });
                              }
                            }
                          : undefined
                      }
                      sx={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.55)',
                        pl: 0.5,
                        cursor: onTaskClick ? 'pointer' : 'default',
                        '&:hover': onTaskClick
                          ? { color: 'rgba(255,255,255,0.85)' }
                          : {},
                      }}
                    >
                      +{dayTasks.length - 2} more
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Legend (full only) */}
      {!compact && (
        <Box
          sx={{
            mt: 2.5,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {Object.entries(TYPE_COLORS).slice(0, 6).map(([label, color]) => (
            <Box
              key={label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
              {label.toLowerCase()}
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              ml: 'auto',
            }}
          >
            <CheckCircle sx={{ fontSize: 12, color: '#22d3ee' }} />
            synced to Google
          </Box>
        </Box>
      )}

      {onTaskClick && (
        <Menu
          open={Boolean(moreMenu)}
          anchorEl={moreMenu?.anchor ?? null}
          onClose={() => setMoreMenu(null)}
          PaperProps={{
            sx: {
              bgcolor: '#141127',
              border: '1px solid rgba(139,92,246,0.22)',
              minWidth: 200,
            },
          }}
        >
          {(moreMenu?.dayTasks ?? []).slice(2).map((t) => (
            <MenuItem
              key={String(t.id)}
              onClick={() => {
                onTaskClick(t);
                setMoreMenu(null);
              }}
            >
              {t.title}
            </MenuItem>
          ))}
        </Menu>
      )}
    </Box>
  );
};

export default TaskCalendar;
