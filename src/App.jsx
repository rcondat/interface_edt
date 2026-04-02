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
import { moveCourse, placeCourse, removeCourse } from "./planner/actions";
import { getActiveWeek } from "./planner/selectors";

export default function App() {
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

  function handlePlaceCourse(courseTypeId, dayIndex, slotIndex) {
    const courseType = courseTypes.find((course) => course.id === courseTypeId);

    if (!courseType) {
      setMessage("Créneau introuvable.");
      return;
    }

    const result = placeCourse({
      assignments,
      weekId: activeWeekId,
      dayIndex,
      slotIndex,
      courseType,
      slotCount: semester.slots.length,
      dayCount: DAYS.length,
    });

    if (!result.ok) {
      setMessage(result.reason);
      return;
    }

    setAssignments(result.assignments);
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

    setActiveDragItem({
      source: data.source,
      typeId: data.typeId,
      fromDayIndex: data.fromDayIndex,
      fromStartSlot: data.fromStartSlot,
      width: initialRect?.width ?? null,
      height: initialRect?.height ?? null,
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

    if (!typeId) {
      return;
    }

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

    if (source === "palette") {
      handlePlaceCourse(typeId, dayIndex, slotIndex);
      return;
    }

    if (source === "grid") {
      if (typeof fromDayIndex !== "number" || typeof fromStartSlot !== "number") {
        return;
      }

      handleMoveCourse(typeId, fromDayIndex, fromStartSlot, dayIndex, slotIndex);
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null);
    setActiveDropTarget(null);
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
              courseTypes={courseTypes}
              selectedCourseTypeId={selectedCourseTypeId}
              activeDragItem={activeDragItem}
              activeDropTarget={activeDropTarget}
              onCellClick={handleCellClick}
              onRemoveBlock={handleRemoveCourse}
            />

            <div className="panel">
              <div className="panel-header">
                <h2>État</h2>
              </div>
              <div className="panel-body muted">{message}</div>
            </div>
          </section>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragPreview
          dragItem={activeDragItem}
          courseTypes={courseTypes}
          slots={semester.slots}
        />
      </DragOverlay>
    </DndContext>
  );
}