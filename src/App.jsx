import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Sidebar from "./components/Sidebar";
import WeekTabs from "./components/WeekTabs";
import ScheduleGrid from "./components/ScheduleGrid";
import DragPreview from "./components/DragPreview";
import { DAYS, demoSemester, demoCourseTypes } from "./data/demoData";
import { buildDemoAssignments } from "./data/demoAssignments";
import { getActiveWeek } from "./planner/selectors";
import CourseDetailsPanel from "./components/CourseDetailsPanel";
import { demoTeachers } from "./data/teachers";
import { getTeacherMap } from "./planner/teachers";
import {
  assignTeacherToBlock,
  moveCourse,
  placeCourse,
  removeCourse,
} from "./planner/actions";
import { validateDrop } from "./planner/preview";

export default function App() {
  const [recentPlacement, setRecentPlacement] = useState(null);
  const [paletteDragSize, setPaletteDragSize] = useState(null);

  const [teachers] = useState(demoTeachers);
  const [selectedItem, setSelectedItem] = useState(null);
  const teacherMap = useMemo(() => getTeacherMap(teachers), [teachers]);
  const [pendingTeacherAssignments, setPendingTeacherAssignments] = useState({});
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [semester] = useState(demoSemester);
  const [courseTypes] = useState(demoCourseTypes);
  const [activeWeekId, setActiveWeekId] = useState(demoSemester.weeks[0].id);
  const [assignments, setAssignments] = useState(buildDemoAssignments);
  const [selectedCourseTypeId, setSelectedCourseTypeId] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const [message, setMessage] = useState(
    "V4 : glisse une tuile ou un bloc déjà placé."
  );

  const activeWeek = useMemo(
    () => getActiveWeek(semester, activeWeekId),
    [semester, activeWeekId]
  );

  function handleAssignTeacher({ dayIndex, startSlot, durationSlots, teacherId }) {
    const result = assignTeacherToBlock({
      assignments,
      weekId: activeWeekId,
      dayIndex,
      startSlot,
      durationSlots,
      teacherId,
      dayCount: DAYS.length,
      slotCount: semester.slots.length,
    });

    setAssignments(result.assignments);
    setMessage(
      teacherId
        ? "Intervenant affecté au créneau."
        : "Affectation de l’intervenant supprimée."
    );
  }


  function handleSetPendingTeacher({ typeId, teacherId }) {
    setPendingTeacherAssignments((prev) => ({
      ...prev,
      [typeId]: teacherId,
    }));
  }


  function handlePaletteDragStart(typeId, width, height) {
    setPaletteDragSize({
      typeId,
      width,
      height,
    });
  }

  function handlePlaceCourse(courseTypeId, dayIndex, slotIndex) {
    const courseType = courseTypes.find((course) => course.id === courseTypeId);

    if (!courseType) {
      setMessage("Créneau introuvable.");
      return;
    }

    const assignedTeacherId = pendingTeacherAssignments[courseType.id] ?? null;

    const result = placeCourse({
      assignments,
      weekId: activeWeekId,
      dayIndex,
      slotIndex,
      courseType,
      slotCount: semester.slots.length,
      dayCount: DAYS.length,
      assignedTeacherId,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setAssignments(result.assignments);
    setSelectedItem({
      source: "grid",
      typeId: courseType.id,
      dayIndex,
      startSlot: slotIndex,
    });
    setRecentPlacement({
      weekId: activeWeekId,
      dayIndex,
      startSlot: slotIndex,
      typeId: courseType.id,
    });
    setMessage(
      `${courseType.label} placé sur ${DAYS[dayIndex]} à ${semester.slots[slotIndex].start}.`
    );
    setSelectedCourseTypeId(null);
  }

  function handleMoveCourse(courseTypeId, fromDayIndex, fromStartSlot, toDayIndex, toSlotIndex) {
    const courseType = courseTypes.find((course) => course.id === courseTypeId);

    if (!courseType) {
      setMessage("Créneau introuvable.");
      return;
    }

    if (fromDayIndex === toDayIndex && fromStartSlot === toSlotIndex) {
      return;
    }

    const result = moveCourse({
      assignments,
      weekId: activeWeekId,
      fromDayIndex,
      fromStartSlot,
      toDayIndex,
      toSlotIndex,
      courseType,
      dayCount: DAYS.length,
      slotCount: semester.slots.length,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setAssignments(result.assignments);
    setSelectedItem({
      source: "grid",
      typeId: courseType.id,
      dayIndex: toDayIndex,
      startSlot: toSlotIndex,
    });
    setRecentPlacement(null);
    setMessage(
      `${courseType.label} déplacé vers ${DAYS[toDayIndex]} à ${semester.slots[toSlotIndex].start}.`
    );
  }

  function handleRemoveCourse({ dayIndex, startSlot, typeId }) {
    const courseType = courseTypes.find((course) => course.id === typeId);

    if (!courseType) {
      setMessage("Impossible de supprimer ce créneau.");
      return;
    }

    const result = removeCourse({
      assignments,
      weekId: activeWeekId,
      dayIndex,
      startSlot,
      courseType,
      dayCount: DAYS.length,
      slotCount: semester.slots.length,
    });

    setAssignments(result.assignments);
    setSelectedItem(null);
    setRecentPlacement(null);
    setMessage(
      `${courseType.label} supprimé de ${DAYS[dayIndex]} à ${semester.slots[startSlot].start}.`
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

    // Suppression vers sidebar (inchangé)
    if (dropzone === "sidebar" && source === "grid") {
      if (typeof fromDayIndex !== "number" || typeof fromStartSlot !== "number") {
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
      source === "grid"
        ? activeGrid?.[fromDayIndex]?.[fromStartSlot]
        : null;

    const preselectedTeacherId =
      source === "palette"
        ? pendingTeacherAssignments[typeId] ?? null
        : null;

    const validation = validateDrop({
      activeGrid,
      dayIndex,
      slotIndex,
      durationSlots: courseType.durationSlots,
      ignoreBlock,
      slotCount: semester.slots.length,
      teachers,
      courseType,
      draggedBlock,
      activeWeek,
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
        default:
          setMessage("Placement impossible.");
      }
      return;
    }

    // ✅ Placement autorisé

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

      handleMoveCourse(typeId, fromDayIndex, fromStartSlot, dayIndex, slotIndex);
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null);
    setActiveDropTarget(null);
    setPaletteDragSize(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Planificateur EDT semestre</h1>
            <p>V4 : déplacement des blocs déjà placés.</p>
          </div>
        </header>

        <main className="layout">
          <Sidebar
            semesterName={semester.name}
            courseTypes={courseTypes}
            assignments={assignments}
            selectedCourseTypeId={selectedCourseTypeId}
            onSelectCourseType={setSelectedCourseTypeId}
            activeDragItem={activeDragItem}
            onPaletteDragStart={handlePaletteDragStart}
            onSelectPaletteItem={setSelectedItem}
          />

          <section className="main-column">
            <div className="panel">
              <div className="panel-header">
                <h2>{activeWeek.label}</h2>
                <div className="muted">
                  {activeWeek.start} → {activeWeek.end}
                </div>
                <WeekTabs
                  weeks={semester.weeks}
                  activeWeekId={activeWeekId}
                  onChange={setActiveWeekId}
                />
              </div>
            </div>

            <ScheduleGrid
              days={DAYS}
              slots={semester.slots}
              assignments={assignments}
              activeWeekId={activeWeekId}
              activeWeek={activeWeek}
              courseTypes={courseTypes}
              teachers={teachers}
              selectedCourseTypeId={selectedCourseTypeId}
              activeDragItem={activeDragItem}
              activeDropTarget={activeDropTarget}
              onCellClick={handleCellClick}
              onRemoveBlock={handleRemoveCourse}
              onSelectBlock={setSelectedItem}
              teacherMap={teacherMap}
              recentPlacement={recentPlacement}
              pendingTeacherAssignments={pendingTeacherAssignments}
            />

            <div className="panel">
              <div className="panel-header">
                <h2>État</h2>
              </div>
              <div className="panel-body muted">{message}</div>
            </div>
          </section>

          <CourseDetailsPanel
            selectedItem={selectedItem}
            courseTypes={courseTypes}
            teachers={teachers}
            assignments={assignments}
            activeWeek={activeWeek}
            onAssignTeacher={handleAssignTeacher}
            pendingTeacherAssignments={pendingTeacherAssignments}
            onSetPendingTeacher={handleSetPendingTeacher}
          />
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragPreview
          dragItem={activeDragItem}
          courseTypes={courseTypes}
          teacherMap={teacherMap}
        />
      </DragOverlay>
    </DndContext>
  );
}