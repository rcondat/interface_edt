import { useDraggable } from "@dnd-kit/core";
import { SLOT_HEIGHT } from "../../planner/constants";
import { durationLabel } from "../../planner/selectors";

export default function DraggableBlock({
  block,
  dayIndex,
  slots,
  course,
  onRemoveBlock,
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
  const firstSlot = slots[block.startSlot];
  const lastSlot = slots[block.startSlot + block.durationSlots - 1];

  const style = {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: course.color,
    opacity: isDragging ? 0.35 : 1,
  };

  if (transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }

  return (
    <div
      ref={setNodeRef}
      className="course-block"
      style={style}
      title={course.label}
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
      <div className="course-block-meta">
        {firstSlot.start} → {lastSlot.end}
      </div>
      <div className="course-block-foot">
        <span>{durationLabel(block.durationSlots)}</span>
      </div>
    </div>
  );
}