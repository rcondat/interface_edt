import { DndContext, DragOverlay } from "@dnd-kit/core";
import LeftSidebar from "./components/LeftSidebar";
import WeekTabs from "./components/WeekTabs";
import ScheduleGrid from "./components/ScheduleGrid";
import DragPreview from "./components/DragPreview";
import AddTeacherModal from "./components/AddTeacherModal";
import ConfirmDialog from "./components/ConfirmDialog";
import RightSidebar from "./components/RightSidebar";
import usePlannerController from "./hooks/usePlannerController";
import NewScheduleModal from "./components/NewScheduleModal";
import { useState } from "react";

export default function App() {
  const planner = usePlannerController();
  const [isPromotionMenuOpen, setIsPromotionMenuOpen] = useState(false);
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

            <div className="topbar-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => planner.setIsNewScheduleModalOpen(true)}
              >
                + Nouveau EDT
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => planner.setIsAddTeacherModalOpen(true)}
              >
                + Ajouter un intervenant
              </button>
            </div>
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
                <div className="grid-filters-bar">
                  <label className="grid-filter-field">
                    <span>Semaine</span>
                    <select
                      value={planner.activeWeekId}
                      onChange={(event) => planner.showWeekPanel(event.target.value)}
                    >
                      {planner.semester.weeks.map((week) => (
                        <option key={week.id} value={week.id}>
                          {week.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid-filter-field">
                    <span>Promotions</span>

                    <button
                      type="button"
                      className="grid-filter-trigger"
                      onClick={() => setIsPromotionMenuOpen((prev) => !prev)}
                    >
                      {planner.visiblePromotionIds.length === 0
                        ? "Toutes les promotions"
                        : planner.promotions
                            .filter((promotion) =>
                              planner.visiblePromotionIds.includes(promotion.id)
                            )
                            .map((promotion) => promotion.label)
                            .join(", ")}
                    </button>

                    {isPromotionMenuOpen && (
                      <div className="grid-filter-dropdown">
                        <label className="grid-filter-option">
                          <input
                            type="checkbox"
                            checked={planner.visiblePromotionIds.length === 0}
                            onChange={() => planner.showAllPromotions()}
                          />
                          <span>Toutes les promotions</span>
                        </label>

                        {planner.promotions.map((promotion) => (
                          <label key={promotion.id} className="grid-filter-option">
                            <input
                              type="checkbox"
                              checked={planner.visiblePromotionIds.includes(promotion.id)}
                              onChange={() => planner.toggleVisiblePromotion(promotion.id)}
                            />
                            <span>{promotion.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <ScheduleGrid
                db={planner.db}
                days={planner.weekDayLabels}
                slots={planner.semester.slots}
                assignments={planner.assignments}
                activeWeekId={planner.activeWeekId}
                activeWeek={planner.activeWeek}
                courseTypes={planner.courseTypes}
                paletteItems={planner.paletteItems}
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
                visiblePromotionIds={planner.visiblePromotionIds}
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
            rooms={planner.rooms}
            selectedTeacher={planner.selectedTeacher}
            activeEditorPanel={planner.activeEditorPanel}
            semester={planner.semester}
            selectedBlock={planner.selectedBlock}
            selectedPaletteCourseId={planner.selectedPaletteCourseId}
            courseTypes={planner.courseTypes}
            paletteItems={planner.paletteItems}
            assignments={planner.assignments}
            activeWeek={planner.activeWeek}
            handleAddTeacherUnavailability={planner.handleAddTeacherUnavailability}
            handleRemoveTeacherUnavailability={planner.handleRemoveTeacherUnavailability}
            handleRenameTeacher={planner.handleRenameTeacher}
            handleAssignTeacher={planner.handleAssignTeacher}
            handleAssignRoom={planner.handleAssignRoom}
          />
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragPreview
          dragItem={planner.activeDragItem}
          courseTypes={planner.courseTypes}
          paletteItems={planner.paletteItems}
          teacherMap={planner.teacherMap}
        />
      </DragOverlay>

      <NewScheduleModal
        isOpen={planner.isNewScheduleModalOpen}
        onClose={() => planner.setIsNewScheduleModalOpen(false)}
        onSubmit={planner.handleCreateSchedule}
      />

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
