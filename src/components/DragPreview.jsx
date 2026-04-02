import { durationLabel } from "../planner/selectors";
import { SLOT_HEIGHT } from "../planner/constants";

export default function DragPreview({ dragItem, courseTypes, slots }) {
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
        width: `${overlayWidth}px`,
        height: `${courseType.durationSlots * SLOT_HEIGHT - 12}px`,
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