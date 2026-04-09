export function getCourseTypesById(courseTypes) {
  return Object.fromEntries(courseTypes.map((course) => [course.id, course]));
}

export function getActiveGrid(assignments, activeWeekId) {
  return assignments?.[activeWeekId] ?? {};
}

export function durationLabel(durationSlots, slotMinutes = 90) {
  const totalMinutes = durationSlots * slotMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function hasPromotionIntersection(a = [], b = []) {
  if (!a.length || !b.length) {
    return true;
  }

  return a.some((id) => b.includes(id));
}

function overlapsInTime(a, b) {
  return (
    a.startSlot < b.startSlot + b.durationSlots &&
    b.startSlot < a.startSlot + a.durationSlots
  );
}

export function getMergedBlocksForDay(
  daySlots,
  courseTypesById,
  visiblePromotionIds = []
) {
  const blocks = [];
  const seen = new Set();

  daySlots.forEach((cellEntries, slotIndex) => {
    const entries = Array.isArray(cellEntries) ? cellEntries : [];

    entries.forEach((entry) => {
      if (!entry || entry.segment !== 0) return;
      if (seen.has(entry.sessionInstanceId)) return;

      const course = courseTypesById[entry.typeId];
      if (!course) return;

      if (
        visiblePromotionIds.length > 0 &&
        !hasPromotionIntersection(course.promotionIds ?? [], visiblePromotionIds)
      ) {
        return;
      }

      seen.add(entry.sessionInstanceId);

      blocks.push({
        ...entry,
        startSlot: slotIndex,
      });
    });
  });

  return blocks;
}

export function assignBlockLanes(blocks) {
  const sorted = [...blocks].sort((a, b) => {
    if (a.startSlot !== b.startSlot) return a.startSlot - b.startSlot;
    if (a.durationSlots !== b.durationSlots) return b.durationSlots - a.durationSlots;
    return String(a.sessionInstanceId).localeCompare(String(b.sessionInstanceId));
  });

  const assigned = [];

  for (const block of sorted) {
    const overlappingAssigned = assigned.filter((candidate) =>
      overlapsInTime(block, candidate)
    );

    const usedLanes = new Set(overlappingAssigned.map((candidate) => candidate.lane));

    let lane = 0;
    while (usedLanes.has(lane)) {
      lane += 1;
    }

    assigned.push({
      ...block,
      lane,
    });
  }

  return assigned.map((block) => {
    const overlapping = assigned.filter((candidate) => overlapsInTime(block, candidate));
    const laneCount = Math.max(
      1,
      ...overlapping.map((candidate) => (candidate.lane ?? 0) + 1)
    );

    return {
      ...block,
      laneCount,
    };
  });
}