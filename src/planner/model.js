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

export function cloneAssignments(assignments) {
  return structuredClone(assignments);
}