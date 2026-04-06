export function sortTeachersByLastName(teachers) {
  return [...teachers].sort((a, b) => {
    const aKey = `${a.lastName ?? ""} ${a.firstName ?? ""}`.trim().toLowerCase();
    const bKey = `${b.lastName ?? ""} ${b.firstName ?? ""}`.trim().toLowerCase();
    return aKey.localeCompare(bKey, "fr");
  });
}

export function buildTeacherDisplayName(teacher) {
  if (!teacher) return "";
  return [teacher.firstName, teacher.lastName].filter(Boolean).join(" ").trim();
}

export function buildTeacherShortName(teacher) {
  if (!teacher) return "";

  const { firstName, lastName } = teacher;

  if (!lastName) return firstName ?? "";
  if (!firstName) return lastName;

  return `${firstName.charAt(0)}. ${lastName}`;
}

export function normalizeTeacherNames({ firstName, lastName }) {
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
  };
}

export function createTeacher({
  firstName,
  lastName,
}) {
  const normalized = normalizeTeacherNames({ firstName, lastName });

  const baseId = `${normalized.firstName}-${normalized.lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: `t-${baseId}-${Date.now()}`,
    firstName: normalized.firstName,
    lastName: normalized.lastName,
  };
}

export function createConstraint({
  entityType,
  entityId,
  timeScopeType,
  dayIndex = null,
  startSlotId = null,
  endSlotId = null,
  weekIds = [],
  startDate = null,
  endDate = null,
  date = null,
  dayId = null,
  slotId = null,
}) {
  return {
    id: `constraint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType,
    entityId,
    timeScopeType,
    dayIndex,
    startSlotId,
    endSlotId,
    weekIds,
    startDate,
    endDate,
    date,
    dayId,
    slotId,
  };
}

function cloneDb(db) {
  return structuredClone(db);
}

export function addTeacherToDb(db, teacher) {
  const next = cloneDb(db);
  next.teachers.push(teacher);
  return next;
}

export function updateTeacherIdentityInDb(db, teacherId, { firstName, lastName }) {
  const next = cloneDb(db);
  const normalized = normalizeTeacherNames({ firstName, lastName });

  next.teachers = next.teachers.map((teacher) =>
    teacher.id === teacherId
      ? {
          ...teacher,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
        }
      : teacher
  );

  return next;
}

export function addConstraintToDb(db, constraint) {
  const next = cloneDb(db);
  next.constraints.push(constraint);
  return next;
}

export function removeConstraintFromDb(db, constraintId) {
  const next = cloneDb(db);
  next.constraints = next.constraints.filter((constraint) => constraint.id !== constraintId);
  return next;
}

export function deleteTeacherFromDb(db, teacherId) {
  const next = cloneDb(db);

  next.teachers = next.teachers.filter((teacher) => teacher.id !== teacherId);

  next.constraints = next.constraints.filter(
    (constraint) =>
      !(constraint.entityType === "teacher" && constraint.entityId === teacherId)
  );

  next.sessionInstances = next.sessionInstances.map((session) =>
    session.teacherId === teacherId
      ? {
          ...session,
          teacherId: null,
        }
      : session
  );

  next.requirements = next.requirements.map((requirement) => ({
    ...requirement,
    possibleTeacherIds: (requirement.possibleTeacherIds ?? []).filter(
      (id) => id !== teacherId
    ),
  }));

  return next;
}