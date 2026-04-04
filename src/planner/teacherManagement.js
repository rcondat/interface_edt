export function sortTeachersByLastName(teachers) {
  return [...teachers].sort((a, b) => {
    const aKey = `${a.lastName ?? ""} ${a.firstName ?? ""}`.trim().toLowerCase();
    const bKey = `${b.lastName ?? ""} ${b.firstName ?? ""}`.trim().toLowerCase();
    return aKey.localeCompare(bKey, "fr");
  });
}

export function buildTeacherDisplayName(teacher) {
  return [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim();
}

export function buildTeacherShortName(teacher) {
  if (!teacher) return "";

  const { firstName, lastName } = teacher;

  if (!lastName) return firstName ?? "";
  if (!firstName) return lastName;

  return `${firstName.charAt(0)}. ${lastName}`;
}

export function createTeacher({
  firstName,
  lastName,
  unavailabilities = [],
}) {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();

  const baseId = `${normalizedFirstName}-${normalizedLastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: `t-${baseId}-${Date.now()}`,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    unavailabilities,
  };
}

export function removeTeacherFromAssignments(assignments, teacherId) {
  const next = structuredClone(assignments);

  Object.values(next).forEach((week) => {
    Object.values(week).forEach((daySlots) => {
      daySlots.forEach((cell, index) => {
        if (cell?.assignedTeacherId === teacherId) {
          daySlots[index] = {
            ...cell,
            assignedTeacherId: null,
          };
        }
      });
    });
  });

  return next;
}

export function removeTeacherFromCourseTypes(courseTypes, teacherId) {
  return courseTypes.map((courseType) => ({
    ...courseType,
    teacherIds: (courseType.teacherIds ?? []).filter((id) => id !== teacherId),
  }));
}

export function createUnavailability({
  type,
  dayIndex = null,
  startSlot = 0,
  endSlot = 1,
  weekIds = [],
  startDate = "",
  endDate = "",
  date = "",
}) {
  return {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    dayIndex,
    startSlot,
    endSlot,
    weekIds,
    startDate,
    endDate,
    date,
  };
}

export function addUnavailabilityToTeacher(teachers, teacherId, unavailability) {
  return teachers.map((teacher) =>
    teacher.id === teacherId
      ? {
          ...teacher,
          unavailabilities: [...(teacher.unavailabilities ?? []), unavailability],
        }
      : teacher
  );
}

export function removeUnavailabilityFromTeacher(teachers, teacherId, unavailabilityId) {
  return teachers.map((teacher) =>
    teacher.id === teacherId
      ? {
          ...teacher,
          unavailabilities: (teacher.unavailabilities ?? []).filter(
            (item) => item.id !== unavailabilityId
          ),
        }
      : teacher
  );
}

export function normalizeTeacherNames({ firstName, lastName }) {
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  };
}

export function updateTeacherIdentity(teachers, teacherId, { firstName, lastName }) {
  const normalized = normalizeTeacherNames({ firstName, lastName });

  return teachers.map((teacher) =>
    teacher.id === teacherId
      ? {
          ...teacher,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
        }
      : teacher
  );
}