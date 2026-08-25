export function makeEmptyWeek(dayCount, slotCount) {
  const week = {};
  for (let day = 0; day < dayCount; day += 1) {
    week[day] = Array(slotCount).fill(null);
  }
  return week;
}

export function ensureWeekGrid(assignments, weekId, dayCount, slotCount) {
  if (!assignments[weekId]) {
    assignments[weekId] = makeEmptyWeek(dayCount, slotCount);
  }
  return assignments[weekId];
}

export function durationLabel(durationSlots, slotMinutes = 90) {
  const minutes = durationSlots * slotMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

export function computePlacedCounts(assignments, courseTypes) {
  const totals = Object.fromEntries(courseTypes.map((c) => [c.id, 0]));

  Object.values(assignments).forEach((week) => {
    Object.values(week).forEach((daySlots) => {
      daySlots.forEach((cell) => {
        if (cell?.typeId) totals[cell.typeId] += 1;
      });
    });
  });

  const result = {};
  courseTypes.forEach((course) => {
    result[course.id] = Math.floor((totals[course.id] || 0) / course.durationSlots);
  });

  return result;
}

export function groupPalette(courseTypes, assignments) {
  const placed = computePlacedCounts(assignments, courseTypes);
  const groups = {};

  courseTypes.forEach((course) => {
    const remaining = course.totalCount - (placed[course.id] || 0);
    if (remaining <= 0) return;
    if (!groups[course.category]) groups[course.category] = [];
    groups[course.category].push({ ...course, remaining });
  });

  return groups;
}

export function getMergedBlocksForDay(daySlots, courseTypesById) {
  const blocks = [];
  let slot = 0;

  while (slot < daySlots.length) {
    const cell = daySlots[slot];

    if (!cell || cell.segment !== 0) {
      slot += 1;
      continue;
    }

    const course = courseTypesById[cell.typeId];
    if (!course) {
      slot += 1;
      continue;
    }

    blocks.push({
      typeId: cell.typeId,
      startSlot: slot,
      durationSlots: course.durationSlots,
    });

    slot += course.durationSlots;
  }

  return blocks;
}

export function placeCourse({
  assignments,
  weekId,
  dayIndex,
  slotIndex,
  courseType,
  slotCount,
  dayCount,
}) {
  const next = structuredClone(assignments);
  const week = ensureWeekGrid(next, weekId, dayCount, slotCount);

  if (slotIndex + courseType.durationSlots > slotCount) {
    return { ok: false, reason: "Le créneau dépasse la fin de journée." };
  }

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    if (week[dayIndex][slotIndex + i]) {
      return { ok: false, reason: "Des cases sont déjà occupées." };
    }
  }

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    week[dayIndex][slotIndex + i] = {
      typeId: courseType.id,
      segment: i,
      startSlot: slotIndex,
      durationSlots: courseType.durationSlots,
    };
  }

  return { ok: true, assignments: next };
}

export function removeCourse({
  assignments,
  weekId,
  dayIndex,
  startSlot,
  courseType,
  dayCount,
  slotCount,
}) {
  const next = structuredClone(assignments);
  const week = ensureWeekGrid(next, weekId, dayCount, slotCount);

  for (let i = 0; i < courseType.durationSlots; i += 1) {
    week[dayIndex][startSlot + i] = null;
  }

  return { ok: true, assignments: next };
}