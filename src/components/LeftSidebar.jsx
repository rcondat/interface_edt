import CoursePanel from "./CoursePanel";
import TeacherPanel from "./TeacherPanel";

export default function LeftSidebar({
  semesterName,
  db,
  selectedCourseTypeId,
  onSelectCourseType,
  activeDragItem,
  onPaletteDragStart,
  onSelectPaletteCourse,
  teachers,
  selectedTeacherId,
  onSelectTeacher,
  onRequestDeleteTeacher,
}) {
  return (
    <aside className="sidebar">
      <CoursePanel
        semesterName={semesterName}
        db={db}
        selectedCourseTypeId={selectedCourseTypeId}
        onSelectCourseType={onSelectCourseType}
        activeDragItem={activeDragItem}
        onPaletteDragStart={onPaletteDragStart}
        onSelectPaletteCourse={onSelectPaletteCourse}
      />

      <TeacherPanel
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onSelectTeacher={onSelectTeacher}
        onRequestDeleteTeacher={onRequestDeleteTeacher}
      />
    </aside>
  );
}