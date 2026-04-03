import { SLOT_HEIGHT } from "../planner/constants";
import { buildTeacherShortName } from "../planner/teacherManagement";

function getBlockSubtitle({ dragItem, courseType, teacherMap }) {
  const assignedTeacher =
    dragItem?.assignedTeacherId ? teacherMap[dragItem.assignedTeacherId] : null;

  if (assignedTeacher) {
    return buildTeacherShortName(assignedTeacher);
  }

  if (courseType.teacherIds?.length === 1) {
    const singleTeacher = teacherMap[courseType.teacherIds[0]];
    return singleTeacher? buildTeacherShortName(singleTeacher) : "";
  }

  return "";
}

export default function DragPreview({
  dragItem,
  courseTypes,
  teacherMap,
}) {
  if (!dragItem) return null;

  const courseType = courseTypes.find((course) => course.id === dragItem.typeId);
  if (!courseType) return null;

  const subtitle = getBlockSubtitle({
    dragItem,
    courseType,
    teacherMap,
  });

  return (
    <div
      className="course-block course-block-overlay"
      style={{
        backgroundColor: courseType.color,
        height: `${courseType.durationSlots * SLOT_HEIGHT - 12}px`,
      }}
    >
      <div className="course-block-title">{courseType.label}</div>
      <div className="course-block-meta">{subtitle}</div>
    </div>
  );
}