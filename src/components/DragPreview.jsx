import {
  DRAG_PREVIEW_WIDTH,
  SLOT_HEIGHT,
} from "../planner/constants";

export default function DragPreview({
  dragItem,
  courseTypes,
}) {
  if (!dragItem) return null;

  const courseType = courseTypes.find((course) => course.id === dragItem.typeId);
  if (!courseType) return null;

  return (
    <div
      className="course-block course-block-overlay"
      style={{
        backgroundColor: courseType.color,
        width: `${DRAG_PREVIEW_WIDTH}px`,
        height: `${courseType.durationSlots * SLOT_HEIGHT - 12}px`,
      }}
    >
      <div className="course-block-title">{courseType.label}</div>
      <div className="course-block-meta">{"TMP"}</div>
    </div>
  );
}