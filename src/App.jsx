import { DndContext, DragOverlay } from "@dnd-kit/core";
import LeftSidebar from "./components/LeftSidebar";
import WeekTabs from "./components/WeekTabs";
import ScheduleGrid from "./components/ScheduleGrid";
import DragPreview from "./components/DragPreview";
import AddTeacherModal from "./components/AddTeacherModal";
import ConfirmDialog from "./components/ConfirmDialog";
import RightSidebar from "./components/RightSidebar";
import usePlannerController from "./hooks/usePlannerController";

export default function App() {
  const planner = usePlannerController();

  return (
    <DndContext
      sensors={planner.sensors}
      onDragStart={planner.handleDragStart}
      onDragOver={planner.handleDragOver}
      onDragEnd={planner.handleDragEnd}
      onDragCancel={planner.handleDragCancel}
    >
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-row">
            <div>
              <h1>Planificateur EDT semestre</h1>
              <p>V4 : déplacement des blocs déjà placés.</p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => planner.setIsAddTeacherModalOpen(true)}
            >
              + Ajouter un intervenant
            </button>
          </div>
        </header>

        <main className="layout">
          <LeftSidebar
            semesterName={planner.semester.name}
            db={planner.db}
            selectedCourseTypeId={planner.selectedCourseTypeId}
            onSelectCourseType={planner.setSelectedCourseTypeId}
            activeDragItem={planner.activeDragItem}
            onPaletteDragStart={planner.handlePaletteDragStart}
            onSelectPaletteCourse={planner.showCoursePanelFromPalette}
            teachers={planner.teachers}
            selectedTeacherId={planner.selectedTeacherId}
            onSelectTeacher={planner.showTeacherPanel}
            onRequestDeleteTeacher={planner.setTeacherToDelete}
          />

          <section className="main-column">
            <div className="panel">
              <div className="panel-header">
                <h2>{planner.activeWeek.label}</h2>
                <div className="muted">
                  {planner.activeWeek.start} → {planner.activeWeek.end}
                </div>
                <WeekTabs
                  weeks={planner.semester.weeks}
                  activeWeekId={planner.activeWeekId}
                  onChange={planner.showWeekPanel}
                />
              </div>

              <ScheduleGrid
                db={planner.db}
                days={planner.weekDayLabels}
                slots={planner.semester.slots}
                assignments={planner.assignments}
                activeWeekId={planner.activeWeekId}
                activeWeek={planner.activeWeek}
                courseTypes={planner.courseTypes}
                teachers={planner.teachers}
                selectedCourseTypeId={planner.selectedCourseTypeId}
                activeDragItem={planner.activeDragItem}
                activeDropTarget={planner.activeDropTarget}
                onCellClick={planner.handleCellClick}
                onRemoveBlock={planner.handleRemoveCourse}
                onSelectBlock={planner.handleSelectBlock}
                teacherMap={planner.teacherMap}
                recentPlacement={planner.recentPlacement}
                pendingTeacherAssignments={planner.pendingTeacherAssignments}
                selectedTeacherId={planner.selectedTeacherId}
              />
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>État</h2>
              </div>
              <div className="panel-body muted">{planner.message}</div>
            </div>
          </section>

          <RightSidebar
            db={planner.db}
            teachers={planner.teachers}
            selectedTeacher={planner.selectedTeacher}
            activeEditorPanel={planner.activeEditorPanel}
            semester={planner.semester}
            selectedBlock={planner.selectedBlock}
            selectedPaletteCourseId={planner.selectedPaletteCourseId}
            courseTypes={planner.courseTypes}
            assignments={planner.assignments}
            activeWeek={planner.activeWeek}
            handleAddTeacherUnavailability={planner.handleAddTeacherUnavailability}
            handleRemoveTeacherUnavailability={planner.handleRemoveTeacherUnavailability}
            handleRenameTeacher={planner.handleRenameTeacher}
            handleAssignTeacher={planner.handleAssignTeacher}
          />
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragPreview
          dragItem={planner.activeDragItem}
          courseTypes={planner.courseTypes}
          teacherMap={planner.teacherMap}
        />
      </DragOverlay>

      <AddTeacherModal
        isOpen={planner.isAddTeacherModalOpen}
        onClose={() => planner.setIsAddTeacherModalOpen(false)}
        onSubmit={planner.handleAddTeacher}
        weeks={planner.semester.weeks}
        slots={planner.semester.slots}
      />

      <ConfirmDialog
        isOpen={Boolean(planner.teacherToDelete)}
        title="Supprimer l’intervenant"
        message={
          planner.teacherToDelete
            ? `Supprimer ${planner.teacherToDelete.firstName} ${planner.teacherToDelete.lastName} ? Cette action désaffectera aussi tous ses créneaux et retirera son nom des cours liés.`
            : ""
        }
        onCancel={() => planner.setTeacherToDelete(null)}
        onConfirm={planner.handleConfirmDeleteTeacher}
      />
    </DndContext>
  );
}