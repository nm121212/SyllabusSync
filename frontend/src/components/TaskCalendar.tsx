import React, { useMemo, useState } from 'react';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight, CheckCircle } from '@mui/icons-material';

export interface CalendarTask {
  id: number | string;
  title: string;
  dueDate: string; // ISO yyyy-mm-dd
  type?: string;
  courseName?: string;
  priority?: string;
  status?: string;
  googleEventId?: string;
}

interface TaskCalendarProps {
  tasks: CalendarTask[];
  /** "full" = roomy grid for the Calendar page, "compact" = smaller preview for landing */
  variant?: 'full' | 'compact';
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
}) => {
  const compact = variant === 'compact';
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

  return (
    <Box
      sx={{
        borderRadius: 4,
        border: '1px solid rgba(139, 92, 246, 0.25)',
        background:
          'linear-gradient(180deg, rgba(26,23,51,0.8) 0%, rgba(20,17,39,0.5) 100%)',
        backdropFilter: 'blur(10px)',
        p: compact ? 2 : 3,
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
          const dayTasks = tasksByDay.get(formatIsoKey(cell)) ?? [];
          const hasTasks = dayTasks.length > 0;

          return (
            <Box
              key={idx}
              sx={{
                position: 'relative',
                minHeight: cellSize,
                p: compact ? 0.75 : 1,
                borderRadius: 2,
                border: isToday
                  ? '1px solid rgba(124, 108, 255, 0.85)'
                  : '1px solid rgba(139, 92, 246, 0.12)',
                background: isToday
                  ? 'rgba(124, 108, 255, 0.14)'
                  : hasTasks
                    ? 'rgba(10, 9, 20, 0.55)'
                    : 'rgba(10, 9, 20, 0.3)',
                boxShadow: isToday
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
                          </Box>
                        }
                      >
                        <Box
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
                      sx={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.55)',
                        pl: 0.5,
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
    </Box>
  );
};

export default TaskCalendar;
