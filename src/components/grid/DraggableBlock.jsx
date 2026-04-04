import { useDraggable } from "@dnd-kit/core";
import { SLOT_HEIGHT } from "../../planner/constants";
import { buildTeacherShortName } from "../../planner/teacherManagement";

export default function DraggableBlock({
  block,
  dayIndex,
  weekId,
  course,
  teacherMap,
  onRemoveBlock,
  onSelectBlock,
  isRecentlyPlaced = false,
  selectedTeacherId = null,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${dayIndex}-${block.startSlot}-${block.typeId}`,
    data: {
      source: "grid",
      typeId: block.typeId,
      fromDayIndex: dayIndex,
      fromStartSlot: block.startSlot,
    },
  });

  const top = block.startSlot * SLOT_HEIGHT + 6;
  const height = block.durationSlots * SLOT_HEIGHT - 12;

  const assignedTeacher = block.assignedTeacherId
    ? teacherMap[block.assignedTeacherId]
    : null;

  const singleTeacher =
    !assignedTeacher && course.teacherIds?.length === 1
      ? teacherMap[course.teacherIds[0]]
      : null;

  const subtitle = assignedTeacher
    ? buildTeacherShortName(assignedTeacher)
    : singleTeacher
      ? buildTeacherShortName(singleTeacher)
      : "";

  const isImplicitSingleTeacherMatch =
    !block.assignedTeacherId &&
    course.teacherIds?.length === 1 &&
    course.teacherIds[0] === selectedTeacherId;

  const isTeacherRelevant =
    !selectedTeacherId ||
    block.assignedTeacherId === selectedTeacherId ||
    isImplicitSingleTeacherMatch;

  const style = {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: course.color,
    visibility: isDragging ? "hidden" : "visible",
    opacity: isTeacherRelevant ? 1 : 0.18,
  };

  if (transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  return (
    <div
      ref={setNodeRef}
      className={isRecentlyPlaced ? "course-block course-block-new" : "course-block"}
      style={style}
      title={course.label}
      onClick={() =>
        onSelectBlock?.({
          weekId,
          typeId: block.typeId,
          dayIndex,
          startSlot: block.startSlot,
        })
      }
      {...listeners}
      {...attributes}
    >
      <button
        type="button"
        className="course-block-delete"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemoveBlock({
            dayIndex,
            startSlot: block.startSlot,
            typeId: block.typeId,
          });
        }}
        aria-label={`Supprimer ${course.label}`}
        title={`Supprimer ${course.label}`}
      >
        ×
      </button>

      <div className="course-block-title">{course.label}</div>
      <div className="course-block-meta">{subtitle}</div>
    </div>
  );
}
