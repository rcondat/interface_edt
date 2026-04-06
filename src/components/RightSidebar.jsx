import CourseDetailsPanel from "./CourseDetailsPanel";
import TeacherDetailsPanel from "./TeacherDetailsPanel";

export default function RightSidebar({
  db,
  teachers,
  selectedTeacher,
  activeEditorPanel,
  semester,
  selectedBlock,
  selectedPaletteCourseId,
  courseTypes,
  assignments,
  activeWeek,
  handleAddTeacherUnavailability,
  handleRemoveTeacherUnavailability,
  handleRenameTeacher,
  handleAssignTeacher,
}) {
  return (
    <div className="right-column">

      {activeEditorPanel === "teacher" && selectedTeacher && (
        <TeacherDetailsPanel
          key={selectedTeacher.id}
          teacher={selectedTeacher}
          constraints={
            selectedTeacher
              ? db.constraints.filter(
                  (constraint) =>
                    constraint.entityType === "teacher" &&
                    constraint.entityId === selectedTeacher.id
                )
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
          teachers={teachers}
          assignments={assignments}
          activeWeek={activeWeek}
          onAssignTeacher={handleAssignTeacher}
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