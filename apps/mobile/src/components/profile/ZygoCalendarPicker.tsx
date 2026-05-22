import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, radii } from '../../theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type PickerMode = 'day' | 'year' | 'month';

type Props = {
  value: Date;
  minimumDate: Date;
  maximumDate: Date;
  onChange: (date: Date) => void;
};

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function clampDayForMonth(year: number, month: number, day: number, min: Date, max: Date): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const d = Math.min(day, daysInMonth);
  let next = new Date(year, month, d, 12, 0, 0, 0);
  const ts = startOfDay(next);
  const minTs = startOfDay(min);
  const maxTs = startOfDay(max);
  if (ts < minTs) next = new Date(min.getFullYear(), min.getMonth(), min.getDate(), 12, 0, 0, 0);
  if (ts > maxTs) next = new Date(max.getFullYear(), max.getMonth(), max.getDate(), 12, 0, 0, 0);
  return next;
}

function monthEnabled(year: number, month: number, min: Date, max: Date): boolean {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 0).getTime();
  return end >= startOfDay(min) && start <= startOfDay(max);
}

export function ZygoCalendarPicker({ value, minimumDate, maximumDate, onChange }: Props) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [mode, setMode] = useState<PickerMode>('day');

  React.useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
  }, [value]);

  const minYear = minimumDate.getFullYear();
  const maxYear = maximumDate.getFullYear();
  const minTs = startOfDay(minimumDate);
  const maxTs = startOfDay(maximumDate);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const canGoPrev =
    new Date(viewYear, viewMonth, 1).getTime() >
    new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1).getTime();

  const canGoNext =
    new Date(viewYear, viewMonth + 1, 0).getTime() <
    new Date(maximumDate.getFullYear(), maximumDate.getMonth() + 1, 0).getTime();

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function pickDay(day: number) {
    const next = new Date(viewYear, viewMonth, day, 12, 0, 0, 0);
    const ts = startOfDay(next);
    if (ts < minTs || ts > maxTs) return;
    onChange(next);
  }

  function pickYear(year: number) {
    setViewYear(year);
    const next = clampDayForMonth(year, viewMonth, value.getDate(), minimumDate, maximumDate);
    onChange(next);
    setViewMonth(next.getMonth());
    setMode('month');
  }

  function pickMonth(month: number) {
    setViewMonth(month);
    const next = clampDayForMonth(viewYear, month, value.getDate(), minimumDate, maximumDate);
    onChange(next);
    setMode('day');
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        {mode === 'day' ? (
          <>
            <Pressable
              onPress={() => canGoPrev && shiftMonth(-1)}
              disabled={!canGoPrev}
              style={[styles.navBtn, !canGoPrev && styles.navDisabled]}
            >
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <View style={styles.titleRow}>
              <Pressable onPress={() => setMode('month')} style={styles.filterChip}>
                <Text style={styles.filterChipText}>{MONTHS_SHORT[viewMonth]}</Text>
                <Text style={styles.filterChevron}>▾</Text>
              </Pressable>
              <Pressable onPress={() => setMode('year')} style={styles.filterChip}>
                <Text style={styles.filterChipText}>{viewYear}</Text>
                <Text style={styles.filterChevron}>▾</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => canGoNext && shiftMonth(1)}
              disabled={!canGoNext}
              style={[styles.navBtn, !canGoNext && styles.navDisabled]}
            >
              <Text style={styles.navText}>›</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => setMode('day')} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>
            <Text style={styles.modeTitle}>
              {mode === 'year' ? 'Select year' : 'Select month'}
            </Text>
            <View style={styles.headerSpacer} />
          </>
        )}
      </View>

      {mode === 'year' ? (
        <ScrollView
          style={styles.filterScroll}
          contentContainerStyle={styles.yearGrid}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {years.map((year) => {
            const selected = year === viewYear;
            return (
              <Pressable
                key={year}
                onPress={() => pickYear(year)}
                style={[styles.yearCell, selected && styles.yearCellSelected]}
              >
                <Text style={[styles.yearText, selected && styles.yearTextSelected]}>{year}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {mode === 'month' ? (
        <View style={styles.monthGrid}>
          {MONTHS_SHORT.map((label, month) => {
            const enabled = monthEnabled(viewYear, month, minimumDate, maximumDate);
            const selected = month === viewMonth;
            return (
              <Pressable
                key={label}
                onPress={() => enabled && pickMonth(month)}
                disabled={!enabled}
                style={[
                  styles.monthCell,
                  selected && styles.monthCellSelected,
                  !enabled && styles.monthCellDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.monthText,
                    selected && styles.monthTextSelected,
                    !enabled && styles.monthTextDisabled,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {mode === 'day' ? (
        <>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          {grid.map((row, ri) => (
            <View key={`row-${ri}`} style={styles.weekRow}>
              {row.map((day, ci) => {
                if (day == null) {
                  return <View key={`e-${ri}-${ci}`} style={styles.dayCell} />;
                }
                const cellDate = new Date(viewYear, viewMonth, day, 12, 0, 0, 0);
                const ts = startOfDay(cellDate);
                const disabled = ts < minTs || ts > maxTs;
                const selected = sameDay(cellDate, value);
                return (
                  <Pressable
                    key={`d-${ri}-${ci}`}
                    onPress={() => pickDay(day)}
                    disabled={disabled}
                    style={[
                      styles.dayCell,
                      selected && styles.daySelected,
                      disabled && styles.dayDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  filterChevron: {
    color: colors.primaryBright,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '700',
  },
  modeTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: colors.primaryBright,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSpacer: { width: 56 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  navDisabled: { opacity: 0.35 },
  navText: {
    color: colors.primaryBright,
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  filterScroll: {
    maxHeight: 220,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  yearCell: {
    width: '22%',
    minWidth: 72,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  yearCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
  },
  yearText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  yearTextSelected: {
    color: colors.text,
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  monthCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBright,
  },
  monthCellDisabled: { opacity: 0.3 },
  monthText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  monthTextSelected: {
    color: colors.text,
    fontWeight: '800',
  },
  monthTextDisabled: {
    color: colors.textMuted,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 22,
  },
  daySelected: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  dayDisabled: { opacity: 0.25 },
  dayText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: colors.text,
    fontWeight: '800',
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
});
