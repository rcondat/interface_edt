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
import { DAYS, demoSemester, demoCourseTypes } from "./data/demoData";
import { makeEmptyWeek } from "./planner/model";
import { moveCourse, placeCourse, removeCourse } from "./planner/actions";
import { durationLabel, getActiveWeek } from "./planner/selectors";

function buildDemoAssignments() {
  const week = makeEmptyWeek(DAYS.length, demoSemester.slots.length);

  week[0][0] = { typeId: "algo-cm", segment: 0, startSlot: 0, durationSlots: 2 };
  week[0][1] = { typeId: "algo-cm", segment: 1, startSlot: 0, durationSlots: 2 };

  week[2][1] = { typeId: "bdd-cm", segment: 0, startSlot: 1, durationSlots: 1 };
  week[4][3] = { typeId: "algo-td", segment: 0, startSlot: 3, durationSlots: 1 };

  return {
    [demoSemester.weeks[0].id]: week,
    [demoSemester.weeks[1].id]: makeEmptyWeek(DAYS.length, demoSemester.slots.length),
    [demoSemester.weeks[2].id]: makeEmptyWeek(DAYS.length, demoSemester.slots.length),
  };
}

function DragPreview({ dragItem, courseTypes, slots }) {
  if (!dragItem) return null;

  const courseType = courseTypes.find((course) => course.id === dragItem.typeId);
  if (!courseType) return null;

  let meta = durationLabel(courseType.durationSlots);

  if (dragItem.source === "grid" && typeof dragItem.fromStartSlot === "number") {
    const firstSlot = slots[dragItem.fromStartSlot];
    const lastSlot = slots[dragItem.fromStartSlot + courseType.durationSlots - 1];

    if (firstSlot && lastSlot) {
      meta = `${firstSlot.start} → ${lastSlot.end}`;
    }
  }

  const overlayWidth =
    dragItem.source === "grid"
      ? dragItem.width ?? 180
      : Math.min(dragItem.width ?? 220, 200);

  return (
    <div
      className="course-block course-block-overlay"
      style={{
        backgroundColor: courseType.color,
        height: `${courseType.durationSlots * 72 - 12}px`,
        width: `${overlayWidth}px`,
      }}
    >
      <div className="course-block-title">{courseType.label}</div>
      <div className="course-block-meta">{meta}</div>
      <div className="course-block-foot">
        <span>{durationLabel(courseType.durationSlots)}</span>
      </div>
    </div>
  );
}

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

  function tryPlaceCourse(courseTypeId, dayIndex, slotIndex) {
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

  function tryMoveCourse(courseTypeId, fromDayIndex, fromStartSlot, toDayIndex, toSlotIndex) {
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

  function handleCellClick(dayIndex, slotIndex) {
    if (!selectedCourseTypeId) {
      setMessage("Sélectionne d'abord une tuile, ou utilise le glisser-déposer.");
      return;
    }

    tryPlaceCourse(selectedCourseTypeId, dayIndex, slotIndex);
  }

  function handleBlockClick({ dayIndex, startSlot, typeId }) {
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

      handleBlockClick({
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
      tryPlaceCourse(typeId, dayIndex, slotIndex);
      return;
    }

    if (source === "grid") {
      if (typeof fromDayIndex !== "number" || typeof fromStartSlot !== "number") {
        return;
      }

      tryMoveCourse(typeId, fromDayIndex, fromStartSlot, dayIndex, slotIndex);
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
              onRemoveBlock={handleBlockClick}
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