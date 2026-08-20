import { SLOT_MINUTES } from "./constants";
import {
  deriveGroupLabelsFromGroupIds,
  derivePromotionLabelsFromPromotionIds,
  getRequirementAudienceMap,
  getRequirementAudiencePromotionIds,
  getRequirementAudienceSummary,
  getRequirementForAudience,
  getRequirementMap,
  getSessionAudience,
} from "./audience";

export function durationLabel(durationSlots, slotMinutes = SLOT_MINUTES) {
  const minutes = durationSlots * slotMinutes;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

export function byId(list) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

export function getSemester(db, semesterId) {
  return db.semesters.find((item) => item.id === semesterId) ?? db.semesters[0];
}

export function getWeek(db, weekId) {
  return db.weeks.find((item) => item.id === weekId) ?? db.weeks[0];
}

export function getWeekDays(db, weekId) {
  return db.days
    .filter((day) => day.weekId === weekId)
    .sort((a, b) => a.weekdayIndex - b.weekdayIndex);
}

export function getDaysForWeek(db, weekId) {
  return getWeekDays(db, weekId);
}

export function getSlots(db) {
  return [...db.slots].sort((a, b) => a.index - b.index);
}

export function getSlotsView(db) {
  return getSlots(db).map((slot) => ({
    id: slot.id,
    label: slot.label,
    start: slot.startTime,
    end: slot.endTime,
    index: slot.index,
  }));
}

export function getTeachers(db) {
  return db.teachers;
}

export function getPromotions(db) {
  return [...(db.promotions ?? [])].sort((a, b) =>
    String(a.label ?? "").localeCompare(String(b.label ?? ""), "fr")
  );
}

function buildRequirementAudienceView(db, requirementAudience, ecMap, requirementMap) {
  const requirement = requirementMap[requirementAudience.requirementId];
  const ec = requirement ? ecMap[requirement.ecId] : null;
  const promotionIds = getRequirementAudiencePromotionIds(db, requirementAudience);
  const promotionLabels = derivePromotionLabelsFromPromotionIds(db, promotionIds);
  const groupIds = requirementAudience.targetGroupIds ?? [];
  const groupLabels = deriveGroupLabelsFromGroupIds(db, groupIds);

  return {
    id: requirementAudience.id,
    requirementId: requirement?.id ?? null,
    subject: ec?.label ?? "",
    category: requirement?.type ?? "",
    label: requirementAudience.label,
    durationSlots: requirement?.durationSlots ?? 1,
    totalCount: requirementAudience.occurrencesRequired ?? 0,
    color: ec?.color ?? "#2563eb",
    teacherIds: requirement?.possibleTeacherIds ?? [],
    promotionIds,
    promotionLabels,
    promotionLabel: promotionLabels.join(", "),
    groupIds,
    groupLabels,
    groupSetIds: requirementAudience.groupSetIds ?? [],
  };
}

function buildLegacyRequirementView(db, requirement, ecMap) {
  const ec = ecMap[requirement.ecId];
  const audience = getRequirementAudienceSummary(db, requirement);
  const promotionLabels = derivePromotionLabelsFromPromotionIds(db, audience.promotionIds);
  const groupLabels = deriveGroupLabelsFromGroupIds(db, audience.targetGroupIds);

  return {
    id: requirement.id,
    requirementId: requirement.id,
    subject: ec.label,
    category: requirement.type,
    label: `${ec.code} - ${requirement.type}`,
    durationSlots: requirement.durationSlots,
    totalCount: requirement.occurrencesRequired,
    color: ec.color,
    teacherIds: requirement.possibleTeacherIds,
    promotionIds: audience.promotionIds,
    promotionLabels,
    promotionLabel: promotionLabels.join(", "),
    groupIds: audience.targetGroupIds,
    groupLabels,
    groupSetIds: audience.groupSetIds,
  };
}

export function getRequirementsView(db) {
  const ecMap = byId(db.ecs);
  const requirementMap = getRequirementMap(db);

  if ((db.requirementAudiences ?? []).length > 0) {
    return (db.requirementAudiences ?? []).map((requirementAudience) =>
      buildRequirementAudienceView(db, requirementAudience, ecMap, requirementMap)
    );
  }

  return db.requirements.map((requirement) =>
    buildLegacyRequirementView(db, requirement, ecMap)
  );
}

export function getPaletteItems(db) {
  const courseTypes = getRequirementsView(db);
  const countsByAudienceId = {};

  (db.sessionInstances ?? []).forEach((session) => {
    const audienceId = session.requirementAudienceId ?? session.requirementId;
    if (!audienceId) {
      return;
    }

    if (!countsByAudienceId[audienceId]) {
      countsByAudienceId[audienceId] = {
        remaining: 0,
        sessionInstanceIds: [],
      };
    }

    if (session.scheduledDayId || session.startSlotId) {
      return;
    }

    countsByAudienceId[audienceId].remaining += 1;
    countsByAudienceId[audienceId].sessionInstanceIds.push(session.id);
  });

  return courseTypes
    .map((courseType) => {
      const entry = countsByAudienceId[courseType.id] ?? {
        remaining: 0,
        sessionInstanceIds: [],
      };

      return {
        ...courseType,
        remaining: entry.remaining,
        sessionInstanceIds: entry.sessionInstanceIds,
      };
    })
    .filter((courseType) => courseType.remaining > 0);
}

export function getPaletteGroups(db) {
  const items = getPaletteItems(db);
  const groups = {};

  items.forEach((course) => {
    const groupKey = course.subject;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }

    groups[groupKey].push(course);
  });

  Object.values(groups).forEach((itemsBySubject) => {
    itemsBySubject.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  });

  return groups;
}

export function getWeeksView(db, semesterId) {
  const semester = getSemester(db, semesterId);

  return semester.weekIds.map((weekId) => {
    const week = getWeek(db, weekId);
    return {
      id: week.id,
      label: week.label,
      start: week.startDate,
      end: week.endDate,
    };
  });
}

export function getSemesterView(db, semesterId) {
  const semester = getSemester(db, semesterId);

  return {
    id: semester.id,
    name: semester.label,
    label: semester.label,
    weeks: getWeeksView(db, semester.id),
    slots: getSlotsView(db),
  };
}

export function getWeekDaysView(db, weekId) {
  return getDaysForWeek(db, weekId).map((day) =>
    day.isHoliday || day.isClosed ? `${day.weekdayLabel} - ferme` : day.weekdayLabel
  );
}

export function buildAssignmentsView(db, weekId) {
  const days = getDaysForWeek(db, weekId);
  const slots = getSlots(db);
  const dayIndexById = Object.fromEntries(days.map((day, index) => [day.id, index]));
  const slotIndexById = Object.fromEntries(slots.map((slot, index) => [slot.id, index]));
  const requirementAudienceMap = getRequirementAudienceMap(db);
  const ecMap = byId(db.ecs);

  const weekGrid = {};
  days.forEach((_, dayIndex) => {
    weekGrid[dayIndex] = Array.from({ length: slots.length }, () => []);
  });

  db.sessionInstances.forEach((session) => {
    if (!session.scheduledDayId || !session.startSlotId) return;
    if (!(session.scheduledDayId in dayIndexById)) return;

    const dayIndex = dayIndexById[session.scheduledDayId];
    const slotIndex = slotIndexById[session.startSlotId];
    const requirementAudience = requirementAudienceMap[session.requirementAudienceId];
    const requirement = requirementAudience
      ? getRequirementForAudience(db, requirementAudience)
      : null;
    const ec = requirement ? ecMap[requirement.ecId] : null;

    if (!requirementAudience || !requirement || !ec) {
      return;
    }

    const audience = getSessionAudience(db, session);
    const groupLabels = deriveGroupLabelsFromGroupIds(db, audience.targetGroupIds);

    for (let segment = 0; segment < requirement.durationSlots; segment += 1) {
      const targetSlotIndex = slotIndex + segment;

      weekGrid[dayIndex][targetSlotIndex].push({
        sessionInstanceId: session.id,
        typeId: requirementAudience.id,
        requirementId: requirement.id,
        segment,
        startSlot: slotIndex,
        durationSlots: requirement.durationSlots,
        assignedTeacherId: session.teacherId ?? null,
        groupIds: audience.targetGroupIds,
        groupLabels,
        promotionIds: audience.promotionIds,
        groupSetIds: audience.groupSetIds,
        label: requirementAudience.label,
        subject: ec.label,
        category: requirement.type,
        color: ec.color,
      });
    }
  });

  return { [weekId]: weekGrid };
}
