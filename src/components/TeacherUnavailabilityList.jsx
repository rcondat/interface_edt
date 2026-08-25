const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

function formatRule(rule, weeks, slots) {
  const startSlot = slots.find((slot) => slot.id === rule.startSlotId);
  const endSlot = slots.find((slot) => slot.id === rule.endSlotId);

  const startLabel = startSlot?.start ?? startSlot?.startTime ?? "";
  const endLabel = endSlot?.end ?? endSlot?.endTime ?? "";

  switch (rule.timeScopeType) {
    case "weekly":
      return `${DAY_LABELS[rule.dayIndex]} · ${startLabel} → ${endLabel}`;

    case "specific-weeks":
      return `Semaines ${rule.weekIds
        .map((id) => weeks.find((week) => week.id === id)?.label ?? id)
        .join(", ")} · ${DAY_LABELS[rule.dayIndex]} · ${startLabel} → ${endLabel}`;

    case "date-range":
      return `Du ${rule.startDate} au ${rule.endDate} · ${startLabel} → ${endLabel}`;

    case "specific-date-time":
      return `${rule.date} · ${startLabel} → ${endLabel}`;

    case "day":
      return "Jour entier indisponible";

    default:
      return "Indisponibilité";
  }
}

export default function TeacherUnavailabilityList({
  unavailabilities,
  weeks,
  slots,
  onRemoveUnavailability,
}) {
  const items = unavailabilities ?? [];

  return (
    <div className="unavailability-list">
      <div className="details-label">Indisponibilités</div>

      {items.length === 0 ? (
        <div className="details-value muted">Aucune indisponibilité renseignée</div>
      ) : (
        <div className="unavailability-items">
          {items.map((rule) => (
            <div key={rule.id} className="unavailability-item">
              <div className="unavailability-text">
                {formatRule(rule, weeks, slots)}
              </div>
              <button
                type="button"
                className="unavailability-delete"
                onClick={() => onRemoveUnavailability(rule.id)}
                aria-label="Supprimer l’indisponibilité"
                title="Supprimer l’indisponibilité"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
