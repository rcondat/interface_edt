import { useState } from "react";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

import { getSelectedSession, getSlotsView, getWeekDays } from "../planner/dbSelectors";
import {
  assignTeacherToSession,
  moveSessionInstance,
  placeRequirementInstance,
  unplaceSessionInstance,
} from "../planner/dbActions";
import { validateDrop } from "../planner/preview";

export default function usePlannerInteraction({
  db,
  setDb,
  activeWeekId,
  setActiveWeekId,
  semester,
  courseTypes,
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
    "V4 : glisse une tuile ou un bloc déjà placé."
  );
  const [selectedPaletteCourseId, setSelectedPaletteCourseId] = useState(null);
  const [activeEditorPanel, setActiveEditorPanel] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

  function handleAssignTeacher({ dayIndex, startSlot, teacherId }) {
    const session = getSelectedSession(db, activeWeekId, dayIndex, startSlot);

    if (!session) {
      setMessage("Affectation impossible.");
      return;
    }

    const result = assignTeacherToSession({
      db,
      sessionInstanceId: session.id,
      teacherId,
    });

    setDb(result.db);
    setMessage(
      teacherId
        ? "Intervenant affecté au créneau."
        : "Affectation de l’intervenant supprimée."
    );
  }

  function handlePaletteDragStart(typeId, width, height) {
    setPaletteDragSize({ typeId, width, height });
  }

  function handlePlaceCourse(courseTypeId, dayIndex, slotIndex) {
    const courseType = courseTypes.find((course) => course.id === courseTypeId);

    if (!courseType) {
      setMessage("Créneau introuvable.");
      return;
    }

    const assignedTeacherId = pendingTeacherAssignments[courseType.id] ?? null;

    const result = placeRequirementInstance({
      db,
      weekId: activeWeekId,
      dayIndex,
      slotIndex,
      requirementId: courseType.id,
      teacherId: assignedTeacherId,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setDb(result.db);
    setSelectedBlock({
      weekId: activeWeekId,
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
      `${courseType.label} placé sur ${weekDayLabels[dayIndex]} à ${semester.slots[slotIndex].start}.`
    );
    setSelectedCourseTypeId(null);
  }

  function handleMoveCourse(
    courseTypeId,
    fromDayIndex,
    fromStartSlot,
    toDayIndex,
    toSlotIndex
  ) {
    const session = getSelectedSession(
      db,
      activeWeekId,
      fromDayIndex,
      fromStartSlot
    );
    const courseType = courseTypes.find((course) => course.id === courseTypeId);

    if (!session || !courseType) {
      setMessage("Créneau introuvable.");
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
    });
    setSelectedPaletteCourseId(null);
    setActiveEditorPanel("course");
    setRecentPlacement(null);
    setMessage(
      `${courseType.label} déplacé vers ${weekDayLabels[toDayIndex]} à ${semester.slots[toSlotIndex].start}.`
    );
  }

  function handleRemoveCourse({ dayIndex, startSlot, typeId }) {
    const courseType = courseTypes.find((course) => course.id === typeId);
    const session = getSelectedSession(db, activeWeekId, dayIndex, startSlot);

    if (!courseType || !session) {
      setMessage("Impossible de supprimer ce créneau.");
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
      `${courseType.label} supprimé de ${weekDayLabels[dayIndex]} à ${semester.slots[startSlot].start}.`
    );
  }

  function handleCellClick(dayIndex, slotIndex) {
    if (!selectedCourseTypeId) {
      setMessage("Sélectionne d'abord une tuile, ou utilise le glisser-déposer.");
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
        assignments[activeWeekId]?.[data.fromDayIndex]?.[data.fromStartSlot]
          ?.assignedTeacherId ?? null;
    }

    setActiveDragItem({
      source: data.source,
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
    const source = activeDragItem?.source;
    const typeId = activeDragItem?.typeId;
    const fromDayIndex = activeDragItem?.fromDayIndex;
    const fromStartSlot = activeDragItem?.fromStartSlot;

    const dropzone = activeDropTarget?.dropzone;
    const dayIndex = activeDropTarget?.dayIndex;
    const slotIndex = activeDropTarget?.slotIndex;

    setActiveDragItem(null);
    setActiveDropTarget(null);

    if (!typeId) return;

    if (dropzone === "sidebar" && source === "grid") {
      if (
        typeof fromDayIndex !== "number" ||
        typeof fromStartSlot !== "number"
      ) {
        return;
      }

      handleRemoveCourse({
        dayIndex: fromDayIndex,
        startSlot: fromStartSlot,
        typeId,
      });
      return;
    }

    if (typeof dayIndex !== "number" || typeof slotIndex !== "number") {
      return;
    }

    const courseType = courseTypes.find((c) => c.id === typeId);
    if (!courseType) return;

    const activeGrid = assignments[activeWeekId];

    const ignoreBlock =
      source === "grid"
        ? {
            dayIndex: fromDayIndex,
            startSlot: fromStartSlot,
            durationSlots: courseType.durationSlots,
          }
        : null;

    const draggedBlock =
      source === "grid" ? activeGrid?.[fromDayIndex]?.[fromStartSlot] : null;

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
      switch (validation.reason) {
        case "overlap":
          setMessage("Placement impossible : cases déjà occupées.");
          break;
        case "out-of-day":
          setMessage("Placement impossible : dépassement de la journée.");
          break;
        case "teacher-unavailable":
          setMessage("Placement impossible : intervenant indisponible.");
          break;
        case "day-closed":
          setMessage("Placement impossible : journée fermée.");
          break;
        default:
          setMessage("Placement impossible.");
      }
      return;
    }

    if (source === "palette") {
      handlePlaceCourse(typeId, dayIndex, slotIndex);
      return;
    }

    if (source === "grid") {
      if (
        typeof fromDayIndex !== "number" ||
        typeof fromStartSlot !== "number"
      ) {
        return;
      }

      handleMoveCourse(
        typeId,
        fromDayIndex,
        fromStartSlot,
        dayIndex,
        slotIndex
      );
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
  };
}