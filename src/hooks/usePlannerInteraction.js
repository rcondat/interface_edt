import { useState } from "react";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

import { getSlotsView, getWeekDays } from "../planner/dbSelectors";
import {
  assignTeacherToSession,
  moveSessionInstance,
  placeSessionInstance,
  unplaceSessionInstance,
} from "../planner/dbActions";
import { getRequirementForSession } from "../planner/audience";
import { validateDrop } from "../planner/preview";
import { getTeacherAssignmentIssue } from "../planner/teachers";

function getSessionById(db, sessionInstanceId) {
  return db.sessionInstances.find((session) => session.id === sessionInstanceId) ?? null;
}

function getSlotIndexMap(db) {
  return Object.fromEntries(
    [...db.slots]
      .sort((a, b) => a.index - b.index)
      .map((slot, index) => [slot.id, index])
  );
}

function rangesOverlap(startA, durationA, startB, durationB) {
  return startA < startB + durationB && startB < startA + durationA;
}

function hasTeacherScheduleConflictForSession({ db, session, requirement, teacherId }) {
  if (!teacherId || !session?.scheduledDayId || !session?.startSlotId || !requirement) {
    return false;
  }

  const slotIndexMap = getSlotIndexMap(db);
  const sessionStartIndex = slotIndexMap[session.startSlotId];

  if (sessionStartIndex == null) {
    return false;
  }

  return db.sessionInstances.some((candidate) => {
    if (candidate.id === session.id) return false;
    if (!candidate.scheduledDayId || !candidate.startSlotId) return false;
    if (candidate.scheduledDayId !== session.scheduledDayId) return false;
    if (candidate.teacherId !== teacherId) return false;

    const candidateRequirement = getRequirementForSession(db, candidate);
    const candidateStartIndex = slotIndexMap[candidate.startSlotId];

    if (!candidateRequirement || candidateStartIndex == null) {
      return false;
    }

    return rangesOverlap(
      sessionStartIndex,
      requirement.durationSlots,
      candidateStartIndex,
      candidateRequirement.durationSlots
    );
  });
}

function getCourseTypeById(items, courseTypeId) {
  return items.find((course) => course.id === courseTypeId) ?? null;
}

function getSlotStartLabel(semester, slotIndex) {
  return semester.slots[slotIndex]?.start ?? "";
}

function buildPlacementMessage(courseLabel, dayLabel, startLabel) {
  return `${courseLabel} place sur ${dayLabel} a ${startLabel}.`;
}

function buildMoveMessage(courseLabel, dayLabel, startLabel) {
  return `${courseLabel} deplace vers ${dayLabel} a ${startLabel}.`;
}

function buildRemovalMessage(courseLabel, dayLabel, startLabel) {
  return `${courseLabel} supprime de ${dayLabel} a ${startLabel}.`;
}

function getValidationMessage(reason) {
  switch (reason) {
    case "overlap":
      return "Placement impossible : cases deja occupees.";
    case "out-of-day":
      return "Placement impossible : depassement de la journee.";
    case "teacher-unavailable":
      return "Placement impossible : intervenant indisponible.";
    case "promotion-unavailable":
      return "Placement impossible : promotion indisponible.";
    case "day-closed":
      return "Placement impossible : journee fermee.";
    default:
      return "Placement impossible.";
  }
}

export default function usePlannerInteraction({
  db,
  setDb,
  activeWeekId,
  setActiveWeekId,
  semester,
  courseTypes,
  paletteItems,
  assignments,
  weekDayLabels,
}) {
  const [recentPlacement, setRecentPlacement] = useState(null);
  const [paletteDragSize, setPaletteDragSize] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [pendingTeacherAssignments, setPendingTeacherAssignments] = useState({});
  const [selectedCourseTypeId, setSelectedCourseTypeId] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const [message, setMessage] = useState(
    "V8 : glisse une tuile ou un bloc deja place."
  );
  const [selectedPaletteCourseId, setSelectedPaletteCourseId] = useState(null);
  const [activeEditorPanel, setActiveEditorPanel] = useState(null);
  const [visiblePromotionIds, setVisiblePromotionIds] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function toggleVisiblePromotion(promotionId) {
    setVisiblePromotionIds((prev) =>
      prev.includes(promotionId)
        ? prev.filter((id) => id !== promotionId)
        : [...prev, promotionId]
    );
  }

  function showAllPromotions() {
    setVisiblePromotionIds([]);
  }

  function showCoursePanelFromPalette(courseTypeId) {
    setSelectedPaletteCourseId(courseTypeId);
    setSelectedBlock(null);
    setSelectedCourseTypeId(courseTypeId);
    setActiveEditorPanel("course");
  }

  function showWeekPanel(weekId) {
    setActiveWeekId(weekId);
    setActiveEditorPanel("week");
  }

  function handleAssignTeacher({ sessionInstanceId, teacherId }) {
    const session = getSessionById(db, sessionInstanceId);
    const courseType = getCourseTypeById(courseTypes, session?.requirementAudienceId);
    const requirement = session ? getRequirementForSession(db, session) : null;

    if (!session || !courseType || !requirement) {
      setMessage("Affectation impossible.");
      return;
    }

    if (teacherId) {
      const teacherIssue = getTeacherAssignmentIssue({
        db,
        sessionInstanceId: session.id,
        teacherId,
      });
      const teacherScheduleConflict = hasTeacherScheduleConflictForSession({
        db,
        session,
        requirement,
        teacherId,
      });

      if (teacherIssue || teacherScheduleConflict) {
        setMessage(
          "Affectation impossible : intervenant deja occupe ou indisponible sur ce creneau."
        );
        return;
      }
    }

    const result = assignTeacherToSession({
      db,
      sessionInstanceId: session.id,
      teacherId,
    });

    if (!result.ok) {
      setMessage(result.reason ?? "Affectation impossible.");
      return;
    }

    setDb(result.db);
    setMessage(
      teacherId
        ? "Intervenant affecte au creneau."
        : "Affectation de l'intervenant supprimee."
    );
  }

  function handlePaletteDragStart(typeId, width, height) {
    setPaletteDragSize({ typeId, width, height });
  }

  function handlePlaceCourse(courseTypeId, dayIndex, slotIndex) {
    const courseType = getCourseTypeById(paletteItems, courseTypeId);

    if (!courseType) {
      setMessage("Creneau introuvable.");
      return;
    }

    const assignedTeacherId = pendingTeacherAssignments[courseType.id] ?? null;
    const sessionInstanceId = courseType.sessionInstanceIds?.[0] ?? null;

    const result = placeSessionInstance({
      db,
      sessionInstanceId,
      weekId: activeWeekId,
      dayIndex,
      slotIndex,
      teacherId: assignedTeacherId,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setDb(result.db);
    setSelectedBlock({
      weekId: activeWeekId,
      sessionInstanceId: result.sessionInstanceId,
      typeId: courseType.id,
      dayIndex,
      startSlot: slotIndex,
    });
    setSelectedPaletteCourseId(null);
    setActiveEditorPanel("course");
    setRecentPlacement({
      weekId: activeWeekId,
      dayIndex,
      startSlot: slotIndex,
      typeId: courseType.id,
    });
    setMessage(
      buildPlacementMessage(
        courseType.label,
        weekDayLabels[dayIndex],
        getSlotStartLabel(semester, slotIndex)
      )
    );
    setSelectedCourseTypeId(null);
  }

  function handleMoveCourse({ sessionInstanceId, courseTypeId, toDayIndex, toSlotIndex }) {
    const session = getSessionById(db, sessionInstanceId);
    const courseType = getCourseTypeById(courseTypes, courseTypeId);

    if (!session || !courseType) {
      setMessage("Creneau introuvable.");
      return;
    }

    const result = moveSessionInstance({
      db,
      sessionInstanceId: session.id,
      weekId: activeWeekId,
      dayIndex: toDayIndex,
      slotIndex: toSlotIndex,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setDb(result.db);
    setSelectedBlock({
      weekId: activeWeekId,
      typeId: courseType.id,
      dayIndex: toDayIndex,
      startSlot: toSlotIndex,
      sessionInstanceId: session.id,
    });
    setSelectedPaletteCourseId(null);
    setActiveEditorPanel("course");
    setRecentPlacement(null);
    setMessage(
      buildMoveMessage(
        courseType.label,
        weekDayLabels[toDayIndex],
        getSlotStartLabel(semester, toSlotIndex)
      )
    );
  }

  function handleRemoveCourse({ dayIndex, startSlot, typeId, sessionInstanceId }) {
    const courseType = getCourseTypeById(courseTypes, typeId);
    const session = sessionInstanceId ? getSessionById(db, sessionInstanceId) : null;

    if (!courseType || !session) {
      setMessage("Impossible de supprimer ce creneau.");
      return;
    }

    const result = unplaceSessionInstance({
      db,
      sessionInstanceId: session.id,
    });

    setDb(result.db);
    setSelectedBlock(null);
    if (activeEditorPanel === "course") {
      setActiveEditorPanel(null);
    }
    setRecentPlacement(null);
    setMessage(
      buildRemovalMessage(
        courseType.label,
        weekDayLabels[dayIndex],
        getSlotStartLabel(semester, startSlot)
      )
    );
  }

  function handleCellClick(dayIndex, slotIndex) {
    if (!selectedCourseTypeId) {
      setMessage("Selectionne d'abord une tuile, ou utilise le glisser-deposer.");
      return;
    }

    handlePlaceCourse(selectedCourseTypeId, dayIndex, slotIndex);
  }

  function handleDragStart(event) {
    const data = event.active.data.current;
    if (!data?.typeId) return;

    const initialRect = event.active.rect.current?.initial;
    let assignedTeacherId = null;

    if (
      data.source === "grid" &&
      typeof data.fromDayIndex === "number" &&
      typeof data.fromStartSlot === "number"
    ) {
      assignedTeacherId =
        (assignments[activeWeekId]?.[data.fromDayIndex]?.[data.fromStartSlot] ?? []).find(
          (entry) =>
            entry.segment === 0 &&
            entry.sessionInstanceId === data.sessionInstanceId
        )?.assignedTeacherId ?? null;
    }

    setActiveDragItem({
      source: data.source,
      sessionInstanceId: data.sessionInstanceId ?? null,
      typeId: data.typeId,
      fromDayIndex: data.fromDayIndex,
      fromStartSlot: data.fromStartSlot,
      assignedTeacherId,
      width:
        data.source === "palette" && paletteDragSize?.typeId === data.typeId
          ? paletteDragSize.width
          : initialRect?.width ?? null,
      height:
        data.source === "palette" && paletteDragSize?.typeId === data.typeId
          ? paletteDragSize.height
          : initialRect?.height ?? null,
    });
  }

  function handleDragOver(event) {
    const dropzone = event.over?.data.current?.dropzone;
    const dayIndex = event.over?.data.current?.dayIndex;
    const slotIndex = event.over?.data.current?.slotIndex;

    if (dropzone === "sidebar") {
      setActiveDropTarget({ dropzone: "sidebar" });
      return;
    }

    if (typeof dayIndex === "number" && typeof slotIndex === "number") {
      setActiveDropTarget({ dayIndex, slotIndex });
    } else {
      setActiveDropTarget(null);
    }
  }

  function handleDragEnd() {
    const dragItem = activeDragItem;
    const dropTarget = activeDropTarget;

    setActiveDragItem(null);
    setActiveDropTarget(null);

    const source = dragItem?.source;
    const typeId = dragItem?.typeId;
    const fromDayIndex = dragItem?.fromDayIndex;
    const fromStartSlot = dragItem?.fromStartSlot;
    const dropzone = dropTarget?.dropzone;
    const dayIndex = dropTarget?.dayIndex;
    const slotIndex = dropTarget?.slotIndex;

    if (!typeId) return;

    if (dropzone === "sidebar" && source === "grid") {
      if (typeof fromDayIndex !== "number" || typeof fromStartSlot !== "number") {
        return;
      }

      handleRemoveCourse({
        dayIndex: fromDayIndex,
        startSlot: fromStartSlot,
        typeId,
        sessionInstanceId: dragItem?.sessionInstanceId ?? null,
      });
      return;
    }

    if (typeof dayIndex !== "number" || typeof slotIndex !== "number") {
      return;
    }

    const courseType =
      source === "palette"
        ? getCourseTypeById(paletteItems, typeId)
        : getCourseTypeById(courseTypes, typeId);

    if (!courseType) return;

    const activeGrid = assignments[activeWeekId];
    const ignoreBlock =
      source === "grid"
        ? {
            dayIndex: fromDayIndex,
            startSlot: fromStartSlot,
            durationSlots: courseType.durationSlots,
            sessionInstanceId: dragItem?.sessionInstanceId ?? null,
          }
        : null;

    const draggedBlock =
      source === "grid"
        ? (activeGrid?.[fromDayIndex]?.[fromStartSlot] ?? []).find(
            (entry) =>
              entry.segment === 0 &&
              entry.sessionInstanceId === dragItem?.sessionInstanceId
          ) ?? null
        : null;

    const preselectedTeacherId =
      source === "palette" ? pendingTeacherAssignments[typeId] ?? null : null;

    const validation = validateDrop({
      db,
      activeGrid,
      dayIndex,
      slotIndex,
      durationSlots: courseType.durationSlots,
      ignoreBlock,
      slotCount: semester.slots.length,
      weekDays: getWeekDays(db, activeWeekId),
      slots: getSlotsView(db),
      courseType,
      draggedBlock,
      preselectedTeacherId,
    });

    if (!validation.ok) {
      setMessage(getValidationMessage(validation.reason));
      return;
    }

    if (source === "palette") {
      handlePlaceCourse(typeId, dayIndex, slotIndex);
      return;
    }

    if (source === "grid") {
      if (typeof fromDayIndex !== "number" || typeof fromStartSlot !== "number") {
        return;
      }

      handleMoveCourse({
        sessionInstanceId: dragItem?.sessionInstanceId ?? null,
        courseTypeId: typeId,
        toDayIndex: dayIndex,
        toSlotIndex: slotIndex,
      });
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null);
    setActiveDropTarget(null);
    setPaletteDragSize(null);
  }

  function handleSelectBlock(block) {
    setSelectedBlock(block);
    setSelectedPaletteCourseId(null);
    setActiveEditorPanel("course");
  }

  function resetForNewSchedule({ firstWeekId, message: nextMessage }) {
    setRecentPlacement(null);
    setPaletteDragSize(null);
    setSelectedBlock(null);
    setPendingTeacherAssignments({});
    setSelectedCourseTypeId(null);
    setActiveDragItem(null);
    setActiveDropTarget(null);
    setSelectedPaletteCourseId(null);
    setActiveEditorPanel(null);
    setActiveWeekId(firstWeekId);
    setMessage(nextMessage ?? "Nouvel EDT cree.");
    setVisiblePromotionIds([]);
  }

  return {
    sensors,
    recentPlacement,
    selectedBlock,
    pendingTeacherAssignments,
    setPendingTeacherAssignments,
    selectedCourseTypeId,
    setSelectedCourseTypeId,
    activeDragItem,
    activeDropTarget,
    message,
    setMessage,
    selectedPaletteCourseId,
    activeEditorPanel,
    setActiveEditorPanel,
    showCoursePanelFromPalette,
    showWeekPanel,
    handleAssignTeacher,
    handlePaletteDragStart,
    handleCellClick,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    handleSelectBlock,
    handleRemoveCourse,
    resetForNewSchedule,
    visiblePromotionIds,
    setVisiblePromotionIds,
    toggleVisiblePromotion,
    showAllPromotions,
  };
}
