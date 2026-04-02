export function getTeacherById(teachers, teacherId) {
  return teachers.find((teacher) => teacher.id === teacherId) ?? null;
}

export function getTeacherMap(teachers) {
  return Object.fromEntries(teachers.map((teacher) => [teacher.id, teacher]));
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

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function isDateInRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate;
}

export function isTeacherUnavailable({
  teacher,
  week,
  dayIndex,
  startSlot,
  durationSlots,
}) {
  if (!teacher) return false;

  const blockStart = startSlot;
  const blockEnd = startSlot + durationSlots;

  return teacher.unavailabilities.some((rule) => {
    const ruleStart = rule.startSlot;
    const ruleEnd = rule.endSlot;

    switch (rule.type) {
      case "weekly":
        return (
          rule.dayIndex === dayIndex &&
          rangesOverlap(blockStart, blockEnd, ruleStart, ruleEnd)
        );

      case "specific-weeks":
        return (
          rule.weekIds?.includes(week.id) &&
          rule.dayIndex === dayIndex &&
          rangesOverlap(blockStart, blockEnd, ruleStart, ruleEnd)
        );

      case "date-range":
        return (
          isDateInRange(week.start, rule.startDate, rule.endDate) &&
          rangesOverlap(blockStart, blockEnd, ruleStart, ruleEnd)
        );

      case "specific-date-time":
        return (
          week.start <= rule.date &&
          week.end >= rule.date &&
          rangesOverlap(blockStart, blockEnd, ruleStart, ruleEnd)
        );

      default:
        return false;
    }
  });
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
  teachers,
  courseType,
  block,
  week,
  dayIndex,
  startSlot,
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

  const teacher = getTeacherById(teachers, teacherId);
  if (!teacher) {
    return null;
  }

  const unavailable = isTeacherUnavailable({
    teacher,
    week,
    dayIndex,
    startSlot,
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
  teachers,
  courseType,
  week,
  dayIndex,
  startSlot,
  durationSlots,
}) {
  const linkedTeachers = getCourseTeachers(courseType, teachers);

  return linkedTeachers.map((teacher) => ({
    teacher,
    available: isTeacherAvailable({
      teacher,
      week,
      dayIndex,
      startSlot,
      durationSlots,
    }),
  }));
}