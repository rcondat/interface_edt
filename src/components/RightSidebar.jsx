import CourseDetailsPanel from "./CourseDetailsPanel";
import TeacherDetailsPanel from "./TeacherDetailsPanel";
import { getEntityUnavailabilities } from "../planner/unavailability";

export default function RightSidebar({
  db,
  teachers,
  rooms,
  selectedTeacher,
  activeEditorPanel,
  semester,
  selectedBlock,
  selectedPaletteCourseId,
  courseTypes,
  paletteItems,
  assignments,
  activeWeek,
  handleAddTeacherUnavailability,
  handleRemoveTeacherUnavailability,
  handleRenameTeacher,
  handleAssignTeacher,
  handleAssignRoom,
}) {
  return (
    <div className="right-column">

      {activeEditorPanel === "teacher" && selectedTeacher && (
        <TeacherDetailsPanel
          key={selectedTeacher.id}
          teacher={selectedTeacher}
          unavailabilities={
            selectedTeacher
              ? getEntityUnavailabilities(db, "teacher", selectedTeacher.id)
              : []
          }
          weeks={semester.weeks}
          slots={semester.slots}
          onAddUnavailability={handleAddTeacherUnavailability}
          onRemoveUnavailability={handleRemoveTeacherUnavailability}
          onRenameTeacher={handleRenameTeacher}
        />
      )}

      {activeEditorPanel === "course" && (
        <CourseDetailsPanel
          db={db}
          selectedBlock={selectedBlock}
          selectedPaletteCourseId={selectedPaletteCourseId}
          courseTypes={courseTypes}
          paletteItems={paletteItems}
          teachers={teachers}
          rooms={rooms}
          assignments={assignments}
          activeWeek={activeWeek}
          onAssignTeacher={handleAssignTeacher}
          onAssignRoom={handleAssignRoom}
        />
      )}

      {activeEditorPanel === "week" && (
        <section className="panel details-panel">
          <div className="panel-header">
            <h2>Modification de la semaine</h2>
          </div>
          <div className="panel-body">
            <div className="empty-box">
              Cette tuile sera conçue plus tard.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
