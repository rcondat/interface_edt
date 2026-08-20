const DEFAULT_MANUAL_SLOTS = [
  { startTime: "08:00", endTime: "09:30" },
  { startTime: "09:45", endTime: "11:15" },
  { startTime: "11:30", endTime: "13:00" },
  { startTime: "13:15", endTime: "14:45" },
  { startTime: "15:00", endTime: "16:30" },
  { startTime: "16:45", endTime: "18:15" },
];

const WEEKDAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addDays(dateString, daysToAdd) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function getJsDay(dateString) {
  return new Date(`${dateString}T00:00:00`).getDay();
}

function toMonday(dateString) {
  const jsDay = getJsDay(dateString);
  const offset = jsDay === 0 ? -6 : 1 - jsDay;
  return addDays(dateString, offset);
}

function toDisplayedFriday(dateString) {
  const jsDay = getJsDay(dateString);

  if (jsDay === 6) return addDays(dateString, -1);
  if (jsDay === 0) return addDays(dateString, -2);

  return addDays(dateString, 5 - jsDay);
}

function computeDisplayedWeekCount(startDate, endDate) {
  if (!startDate || !endDate) return 1;

  const displayedStart = toMonday(startDate);
  const displayedEnd = toDisplayedFriday(endDate);

  const start = new Date(`${displayedStart}T00:00:00`);
  const end = new Date(`${displayedEnd}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 1;

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

function getPromotionDateBounds(promotions) {
  const validPromotions = promotions.filter(
    (promotion) =>
      String(promotion.label ?? "").trim() &&
      promotion.startDate &&
      promotion.endDate
  );

  if (validPromotions.length === 0) {
    return {
      startDate: "2026-09-07",
      endDate: "2026-11-27",
    };
  }

  const startDate = validPromotions.map((promotion) => promotion.startDate).sort()[0];
  const endDate = validPromotions.map((promotion) => promotion.endDate).sort().at(-1);

  return { startDate, endDate };
}

function parseTimeToMinutes(value) {
  if (!value || !value.includes(":")) return null;
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildGeneratedSlotDrafts(slotConfig) {
  const dayStart = parseTimeToMinutes(slotConfig.dayStartTime);
  const dayEnd = parseTimeToMinutes(slotConfig.dayEndTime);
  const slotDuration = Number(slotConfig.slotDurationMinutes);
  const breakDuration = Number(slotConfig.breakDurationMinutes ?? 0);

  if (
    dayStart == null ||
    dayEnd == null ||
    Number.isNaN(slotDuration) ||
    Number.isNaN(breakDuration) ||
    slotDuration <= 0 ||
    breakDuration < 0 ||
    dayEnd <= dayStart
  ) {
    return [];
  }

  const slots = [];
  let cursor = dayStart;
  let index = 1;

  while (cursor + slotDuration <= dayEnd) {
    slots.push({
      id: `generated-slot-${index}`,
      startTime: formatMinutesToTime(cursor),
      endTime: formatMinutesToTime(cursor + slotDuration),
    });

    cursor += slotDuration + breakDuration;
    index += 1;
  }

  return slots;
}

function resolveSlotDrafts(slotConfig) {
  if (slotConfig?.mode === "generated") {
    return buildGeneratedSlotDrafts(slotConfig);
  }

  const manualSlots = slotConfig?.manualSlots;
  if (Array.isArray(manualSlots) && manualSlots.length > 0) {
    return manualSlots;
  }

  return DEFAULT_MANUAL_SLOTS.map((slot, index) => ({
    id: `fallback-slot-${index + 1}`,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));
}

function buildSlots(slotConfig) {
  return resolveSlotDrafts(slotConfig)
    .filter((slot) => slot.startTime && slot.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((slot, index) => {
      const startMinutes = parseTimeToMinutes(slot.startTime);
      const endMinutes = parseTimeToMinutes(slot.endTime);
      const durationMinutes =
        startMinutes != null && endMinutes != null && endMinutes > startMinutes
          ? endMinutes - startMinutes
          : 0;

      return {
        id: slot.id || `slot-${index + 1}`,
        index,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes,
        label: `${slot.startTime} – ${slot.endTime}`,
      };
    });
}

function dateInRange(date, startDate, endDate) {
  return Boolean(date && startDate && endDate && date >= startDate && date <= endDate);
}

export default function buildDbFromDraft(draft) {
  const semesterId = "sem-1";
  const slots = buildSlots(draft.slotConfig);

  const promotions = (draft.promotions ?? [])
    .filter((promotion) => String(promotion.label ?? "").trim())
    .map((promotion, index) => ({
      id: promotion.id || `promo-${index + 1}`,
      semesterId,
      label: String(promotion.label ?? "").trim(),
      startDate: promotion.startDate ?? null,
      endDate: promotion.endDate ?? null,
      groupIds: [],
      ecIds: [],
    }));

  const groupSets = promotions.map((promotion) => ({
    id: `groupset-${promotion.id}-full`,
    label: `${promotion.label} · Promo entière`,
    promotionIds: [promotion.id],
    groupIds: [`group-${promotion.id}-full`],
  }));

  const groups = promotions.map((promotion) => ({
    id: `group-${promotion.id}-full`,
    label: `${slugify(promotion.label).toUpperCase()}_CM`,
    groupSetId: `groupset-${promotion.id}-full`,
    promotionIds: [promotion.id],
    parentGroupIds: [],
    childGroupIds: [],
  }));

  promotions.forEach((promotion, index) => {
    promotion.groupIds = [groups[index].id];
  });

  const teachers = (draft.teachers ?? [])
    .filter(
      (teacher) =>
        String(teacher.firstName ?? "").trim() &&
        String(teacher.lastName ?? "").trim()
    )
    .map((teacher, index) => ({
      id: teacher.id || `teacher-${index + 1}`,
      firstName: String(teacher.firstName ?? "").trim(),
      lastName: String(teacher.lastName ?? "").trim(),
    }));

  const weeks = [];
  const days = [];
  const constraints = [];

  const { startDate: realStartDate, endDate: realEndDate } =
    getPromotionDateBounds(draft.promotions ?? []);

  const displayedStartDate = toMonday(realStartDate);
  const weekCount = computeDisplayedWeekCount(realStartDate, realEndDate);

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const weekId = `week-${weekIndex + 1}`;
    const startDate = addDays(displayedStartDate, weekIndex * 7);
    const endDate = addDays(startDate, 4);

    const dayIds = WEEKDAY_LABELS.map(
      (_, weekdayIndex) => `day-${weekIndex + 1}-${weekdayIndex + 1}`
    );

    weeks.push({
      id: weekId,
      semesterId,
      label: `Semaine ${weekIndex + 1}`,
      startDate,
      endDate,
      dayIds,
    });

    WEEKDAY_LABELS.forEach((weekdayLabel, weekdayIndex) => {
      const dayId = dayIds[weekdayIndex];
      const date = addDays(startDate, weekdayIndex);

      const beforeRealStart = date < realStartDate;
      const afterRealEnd = date > realEndDate;

      const hasGlobalClosure = (draft.calendarClosures ?? []).some(
        (closure) =>
          closure.scope === "global" &&
          dateInRange(date, closure.startDate, closure.endDate)
      );

      const isClosed = beforeRealStart || afterRealEnd || hasGlobalClosure;

      days.push({
        id: dayId,
        weekId,
        date,
        weekdayIndex,
        weekdayLabel,
        isHoliday: false,
        isClosed,
      });

      if (isClosed) {
        constraints.push({
          id: `constraint-global-${dayId}`,
          entityType: "global",
          entityId: null,
          timeScopeType: "day",
          dayIndex: null,
          startSlotId: null,
          endSlotId: null,
          weekIds: [],
          startDate: null,
          endDate: null,
          date: null,
          dayId,
          slotId: null,
        });
      }
    });
  }

  (draft.calendarClosures ?? [])
    .filter(
      (closure) =>
        closure.scope === "promotion" &&
        closure.promotionId &&
        closure.startDate &&
        closure.endDate
    )
    .forEach((closure, index) => {
      constraints.push({
        id: closure.id || `constraint-promo-${index + 1}`,
        entityType: "promotion",
        entityId: closure.promotionId,
        timeScopeType: "date-range",
        dayIndex: null,
        startSlotId: null,
        endSlotId: null,
        weekIds: [],
        startDate: closure.startDate,
        endDate: closure.endDate,
        date: null,
        dayId: null,
        slotId: null,
        label: closure.label || "",
      });
    });

  const ecs = [];
  const requirements = [];
  const requirementAudiences = [];
  const sessionInstances = [];

  let ecIndex = 1;
  let requirementIndex = 1;
  let requirementAudienceIndex = 1;

  (draft.ecs ?? [])
    .filter((ec) => String(ec.label ?? "").trim() && ec.promotionId)
    .forEach((ecDraft) => {
      const ecId = ecDraft.id || `ec-${ecIndex++}`;
      const color = ecDraft.color || "#2563eb";
      const code =
        String(ecDraft.code ?? "").trim() ||
        slugify(ecDraft.label).slice(0, 6).toUpperCase();

      const requirementIds = [];
      const teacherIds = ecDraft.teacherIds ?? [];

      const courseTypeDefs = [
        {
          type: "CM",
          durationSlots: 2,
          occurrencesRequired: Number(ecDraft.cmCount ?? 0),
        },
        {
          type: "TD",
          durationSlots: 1,
          occurrencesRequired: Number(ecDraft.tdCount ?? 0),
        },
      ].filter((item) => item.occurrencesRequired > 0);

      courseTypeDefs.forEach((courseTypeDef) => {
        const requirementId = `req-${requirementIndex++}`;
        requirementIds.push(requirementId);

        requirements.push({
          id: requirementId,
          ecId,
          type: courseTypeDef.type,
          durationSlots: courseTypeDef.durationSlots,
          possibleTeacherIds: teacherIds,
          targetPromotionIds: [],
          targetGroupIds: [],
        });

        const targetGroupId = `group-${ecDraft.promotionId}-full`;
        const requirementAudienceId = `ra-${requirementAudienceIndex++}`;
        const audienceLabel = `${String(ecDraft.label ?? "").trim()} - ${courseTypeDef.type}`;

        requirementAudiences.push({
          id: requirementAudienceId,
          requirementId,
          label: audienceLabel,
          occurrencesRequired: courseTypeDef.occurrencesRequired,
          targetPromotionIds: [ecDraft.promotionId],
          targetGroupIds: [targetGroupId],
          groupSetIds: [`groupset-${ecDraft.promotionId}-full`],
        });

        for (
          let occurrenceIndex = 1;
          occurrenceIndex <= courseTypeDef.occurrencesRequired;
          occurrenceIndex += 1
        ) {
          sessionInstances.push({
            id: `sess-${requirementId}-${occurrenceIndex}`,
            requirementId,
            requirementAudienceId,
            occurrenceIndex,
            teacherId: null,
            scheduledDayId: null,
            startSlotId: null,
            targetGroupIds: [targetGroupId],
            status: "draft",
          });
        }
      });

      ecs.push({
        id: ecId,
        promotionId: ecDraft.promotionId,
        code,
        label: String(ecDraft.label ?? "").trim(),
        color,
        requirementIds,
      });
    });

  const promotionMap = new Map(promotions.map((promotion) => [promotion.id, promotion]));

  ecs.forEach((ec) => {
    const promotion = promotionMap.get(ec.promotionId);
    if (!promotion) return;
    promotion.ecIds.push(ec.id);
  });

  const semester = {
    id: semesterId,
    label: String(draft.semesterName ?? "Semestre").trim() || "Semestre",
    weekIds: weeks.map((week) => week.id),
    promotionIds: promotions.map((promotion) => promotion.id),
    slotIds: slots.map((slot) => slot.id),
  };

  return {
    semesters: [semester],
    weeks,
    days,
    slots,
    promotions,
    groupSets,
    groups,
    ecs,
    requirements,
    requirementAudiences,
    sessionInstances,
    teachers,
    constraints,
  };
}
