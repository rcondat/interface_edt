function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function getTeacherById(teachers, teacherId) {
  return teachers.find((teacher) => teacher.id === teacherId) ?? null;
}

export function getTeacherMap(teachers) {
  return byId(teachers);
}

export function getCourseTeachers(courseType, teachers) {
  if (!courseType?.teacherIds?.length) return [];
  const teacherMap = getTeacherMap(teachers);

  return courseType.teacherIds
    .map((teacherId) => teacherMap[teacherId])
    .filter(Boolean);
}

export function getBlockAssignedTeacher(block, teachers) {
  if (!block?.assignedTeacherId) return null;
  return getTeacherById(teachers, block.assignedTeacherId);
}

function getWeekById(db, weekId) {
  return db.weeks.find((week) => week.id === weekId) ?? null;
}

function getDayById(db, dayId) {
  return db.days.find((day) => day.id === dayId) ?? null;
}

function getSlotIndexMap(db) {
  return Object.fromEntries(db.slots.map((slot) => [slot.id, slot.index]));
}

function getWeekForDay(db, dayId) {
  const day = getDayById(db, dayId);
  if (!day) return null;
  return getWeekById(db, day.weekId);
}

function overlaps(startIndexA, endIndexA, startIndexB, endIndexB) {
  return startIndexA < endIndexB && startIndexB < endIndexA;
}

function matchesConstraintTimeScope({
  constraint,
  day,
  week,
  slotIndexMap,
  startSlotId,
  durationSlots,
}) {
  const blockStart = slotIndexMap[startSlotId];
  const blockEnd = blockStart + durationSlots;

  const constraintStart =
    constraint.startSlotId != null ? slotIndexMap[constraint.startSlotId] : null;

  const constraintEnd =
    constraint.endSlotId != null
      ? slotIndexMap[constraint.endSlotId] + 1
      : null;

  const hasSlotRange = constraintStart != null && constraintEnd != null;

  switch (constraint.timeScopeType) {
    case "weekly":
      return (
        day.weekdayIndex === constraint.dayIndex &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "specific-weeks":
      return (
        constraint.weekIds?.includes(week.id) &&
        day.weekdayIndex === constraint.dayIndex &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "date-range":
      return (
        day.date >= constraint.startDate &&
        day.date <= constraint.endDate &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "specific-date-time":
      return (
        day.date === constraint.date &&
        (!hasSlotRange || overlaps(blockStart, blockEnd, constraintStart, constraintEnd))
      );

    case "day":
      return constraint.dayId === day.id;

    case "slot":
      return (
        constraint.dayId === day.id &&
        constraint.slotId === startSlotId
      );

    default:
      return false;
  }
}

export function getConstraintsForEntity(db, entityType, entityId) {
  return db.constraints.filter(
    (constraint) =>
      constraint.entityType === entityType &&
      constraint.entityId === entityId
  );
}

export function getGlobalConstraints(db) {
  return db.constraints.filter((constraint) => constraint.entityType === "global");
}

export function isTeacherUnavailable({
  db,
  teacherId,
  dayId,
  startSlotId,
  durationSlots,
}) {
  if (!teacherId) return false;

  const teacherConstraints = getConstraintsForEntity(db, "teacher", teacherId);
  const day = getDayById(db, dayId);
  const week = getWeekForDay(db, dayId);
  const slotIndexMap = getSlotIndexMap(db);

  if (!day || !week || !(startSlotId in slotIndexMap)) {
    return false;
  }

  return teacherConstraints.some((constraint) =>
    matchesConstraintTimeScope({
      constraint,
      day,
      week,
      slotIndexMap,
      startSlotId,
      durationSlots,
    })
  );
}

export function isDayClosed(db, dayId) {
  const day = getDayById(db, dayId);
  if (!day) return false;
  if (day.isHoliday || day.isClosed) return true;

  return getGlobalConstraints(db).some(
    (constraint) =>
      constraint.timeScopeType === "day" &&
      constraint.dayId === dayId
  );
}

export function isTeacherAvailable(args) {
  return !isTeacherUnavailable(args);
}

export function getEffectiveTeacherIdForBlockOrCourse(
  block,
  courseType,
  preselectedTeacherId = null
) {
  if (block?.assignedTeacherId) {
    return block.assignedTeacherId;
  }

  if (preselectedTeacherId) {
    return preselectedTeacherId;
  }

  if (courseType?.teacherIds?.length === 1) {
    return courseType.teacherIds[0];
  }

  return null;
}

export function getTeacherAvailabilityIssue({
  db,
  courseType,
  block,
  dayId,
  startSlotId,
  durationSlots,
  preselectedTeacherId = null,
}) {
  const teacherId = getEffectiveTeacherIdForBlockOrCourse(
    block,
    courseType,
    preselectedTeacherId
  );

  if (!teacherId) {
    return null;
  }

  const unavailable = isTeacherUnavailable({
    db,
    teacherId,
    dayId,
    startSlotId,
    durationSlots,
  });

  if (!unavailable) {
    return null;
  }

  return {
    teacherId,
    reason: "teacher-unavailable",
  };
}

export function getTeacherOptionsForBlock({
  db,
  courseType,
  dayId,
  startSlotId,
  durationSlots,
}) {
  const linkedTeachers = getCourseTeachers(courseType, db.teachers);

  return linkedTeachers.map((teacher) => ({
    teacher,
    available: isTeacherAvailable({
      db,
      teacherId: teacher.id,
      dayId,
      startSlotId,
      durationSlots,
    }),
  }));
}