export function durationLabel(durationSlots, slotMinutes = 90) {
  const minutes = durationSlots * slotMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins === 0 ? `${hours}h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

export function getCourseTypesById(courseTypes) {
  return Object.fromEntries(courseTypes.map((course) => [course.id, course]));
}

export function getActiveWeek(semester, activeWeekId) {
  return semester.weeks.find((week) => week.id === activeWeekId) ?? semester.weeks[0];
}

export function getActiveGrid(assignments, activeWeekId) {
  return assignments[activeWeekId] ?? {};
}

export function computePlacedCounts(assignments, courseTypes) {
  const totals = Object.fromEntries(courseTypes.map((course) => [course.id, 0]));

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

    if (!groups[course.category]) {
      groups[course.category] = [];
    }

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