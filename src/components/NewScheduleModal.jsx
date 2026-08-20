import { useMemo, useState } from "react";

function createPromotionDraft(index = 1) {
  return {
    id: `promo-${Date.now()}-${index}`,
    label: "",
    startDate: "2026-09-07",
    endDate: "2026-11-27",
  };
}

function createCalendarClosureDraft(index = 1) {
  return {
    id: `closure-${Date.now()}-${index}`,
    scope: "global",
    promotionId: "",
    startDate: "",
    endDate: "",
    label: "",
  };
}

function createManualSlotDraft(index = 1, slot = null) {
  return {
    id: `manual-slot-${Date.now()}-${index}`,
    startTime: slot?.startTime ?? "",
    endTime: slot?.endTime ?? "",
  };
}

function buildInitialDraft() {
  return {
    semesterName: "Semestre 1",
    promotions: [createPromotionDraft(1)],
    calendarClosures: [],
    slotConfig: {
      mode: "generated",
      slotDurationMinutes: 0,
      breakDurationMinutes: 0,
      dayStartTime: "",
      dayEndTime: "",
      manualSlots: [],
    },
  };
}

function formatClosureSummary(closure, promotionOptions) {
  const scopeLabel =
    closure.scope === "promotion"
      ? promotionOptions.find((promotion) => promotion.id === closure.promotionId)?.label ||
        "Promotion non définie"
      : "Globale";

  const dateLabel =
    closure.startDate && closure.endDate
      ? closure.startDate === closure.endDate
        ? closure.startDate
        : `${closure.startDate} → ${closure.endDate}`
      : "Dates à définir";

  return `${scopeLabel} — ${dateLabel}${closure.label ? ` — ${closure.label}` : ""}`;
}

function parseTimeToMinutes(value) {
  if (!value || !value.includes(":")) return null;
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDurationLabel(minutes) {
  if (minutes == null || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h${String(remaining).padStart(2, "0")}`;
}

function computeSlotDuration(slot) {
  const start = parseTimeToMinutes(slot.startTime);
  const end = parseTimeToMinutes(slot.endTime);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

function splitMinutes(totalMinutes) {
  const safe = Number(totalMinutes);
  if (Number.isNaN(safe) || safe < 0) {
    return { hours: 0, minutes: 0 };
  }

  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

function joinHoursAndMinutes(hoursValue, minutesValue) {
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    minutes < 0
  ) {
    return 0;
  }

  return hours * 60 + minutes;
}

function buildGeneratedSlotPreview(slotConfig) {
  const dayStart = parseTimeToMinutes(slotConfig.dayStartTime);
  const dayEnd = parseTimeToMinutes(slotConfig.dayEndTime);
  const slotDuration = Number(slotConfig.slotDurationMinutes);
  const breakDuration = Number(slotConfig.breakDurationMinutes ?? 0);

  if (
    dayStart == null ||
    dayEnd == null ||
    Number.isNaN(slotDuration) ||
    Number.isNaN(breakDuration) ||
    slotDuration <= 0 ||
    breakDuration < 0 ||
    dayEnd <= dayStart
  ) {
    return [];
  }

  const slots = [];
  let cursor = dayStart;
  let index = 1;

  while (cursor + slotDuration <= dayEnd) {
    const startTime = formatMinutesToTime(cursor);
    const endTime = formatMinutesToTime(cursor + slotDuration);

    slots.push({
      id: `generated-slot-${index}`,
      startTime,
      endTime,
      durationMinutes: slotDuration,
    });

    cursor += slotDuration + breakDuration;
    index += 1;
  }

  return slots;
}

function getManualReferenceDuration(slotConfig) {
  const manualSlots = [...(slotConfig.manualSlots ?? [])]
    .filter((slot) => slot.startTime && slot.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (const slot of manualSlots) {
    const duration = computeSlotDuration(slot);
    if (duration != null) {
      return duration;
    }
  }

  return null;
}

function validateSlotConfig(slotConfig) {
  if (slotConfig.mode === "generated") {
    const dayStart = parseTimeToMinutes(slotConfig.dayStartTime);
    const dayEnd = parseTimeToMinutes(slotConfig.dayEndTime);
    const slotDuration = Number(slotConfig.slotDurationMinutes);
    const breakDuration = Number(slotConfig.breakDurationMinutes ?? 0);

    if (dayStart == null || dayEnd == null) {
      return "Les horaires de début et de fin de journée doivent être définis.";
    }

    if (dayEnd <= dayStart) {
      return "L’horaire de fin de journée doit être après l’horaire de début.";
    }

    if (Number.isNaN(slotDuration) || slotDuration <= 0) {
      return "La durée d’un créneau doit être strictement positive.";
    }

    if (Number.isNaN(breakDuration) || breakDuration < 0) {
      return "La pause entre créneaux doit être positive ou nulle.";
    }

    if (buildGeneratedSlotPreview(slotConfig).length === 0) {
      return "Aucun créneau généré avec ces paramètres.";
    }

    return null;
  }

  const manualSlots = [...(slotConfig.manualSlots ?? [])]
    .filter((slot) => slot.startTime && slot.endTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (manualSlots.length === 0) {
    return "Ajoute au moins un créneau.";
  }

  const referenceDuration = getManualReferenceDuration(slotConfig);

  if (referenceDuration == null) {
    return "Le premier créneau valide doit permettre de déterminer la durée de référence.";
  }

  for (let index = 0; index < manualSlots.length; index += 1) {
    const slot = manualSlots[index];
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);

    if (start == null || end == null || end <= start) {
      return `Le créneau manuel ${index + 1} est invalide.`;
    }

    const duration = end - start;
    if (duration !== referenceDuration) {
      return `Le créneau manuel ${index + 1} a une durée de ${formatDurationLabel(
        duration
      )}, différente de la durée détectée (${formatDurationLabel(referenceDuration)}).`;
    }

    if (index > 0) {
      const previous = manualSlots[index - 1];
      const previousEnd = parseTimeToMinutes(previous.endTime);
      if (previousEnd != null && start < previousEnd) {
        return "Les créneaux manuels se chevauchent.";
      }
    }
  }

  return null;
}

function DurationInputs({
  label,
  totalMinutes,
  onChange,
}) {
  const { hours, minutes } = splitMinutes(totalMinutes);

  return (
    <div className="form-field">
      <span>{label}</span>
      <div className="form-row">
        <label className="form-field">
          <span>Heures</span>
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(event) =>
              onChange(joinHoursAndMinutes(event.target.value, minutes))
            }
          />
        </label>

        <label className="form-field">
          <span>Minutes</span>
          <input
            type="number"
            min="0"
            step="1"
            value={minutes}
            onChange={(event) =>
              onChange(joinHoursAndMinutes(hours, event.target.value))
            }
          />
        </label>
      </div>
    </div>
  );
}

export default function NewScheduleModal({
  isOpen,
  onClose,
  onSubmit,
}) {
  const [draft, setDraft] = useState(buildInitialDraft());

  const promotionOptions = draft.promotions.filter((promotion) =>
    String(promotion.label ?? "").trim()
  );

  const generatedSlotPreview = useMemo(
    () => buildGeneratedSlotPreview(draft.slotConfig),
    [draft.slotConfig]
  );

  const slotConfigError = useMemo(
    () => validateSlotConfig(draft.slotConfig),
    [draft.slotConfig]
  );

  const manualReferenceDuration = useMemo(
    () => getManualReferenceDuration(draft.slotConfig),
    [draft.slotConfig]
  );

  if (!isOpen) return null;

  function resetDraft() {
    setDraft(buildInitialDraft());
  }

  function handleClose() {
    resetDraft();
    onClose();
  }

  function updatePromotion(id, patch) {
    setDraft((prev) => ({
      ...prev,
      promotions: prev.promotions.map((promotion) =>
        promotion.id === id ? { ...promotion, ...patch } : promotion
      ),
    }));
  }

  function updateCalendarClosure(id, patch) {
    setDraft((prev) => ({
      ...prev,
      calendarClosures: prev.calendarClosures.map((closure) =>
        closure.id === id ? { ...closure, ...patch } : closure
      ),
    }));
  }

  function removeCalendarClosure(id) {
    setDraft((prev) => ({
      ...prev,
      calendarClosures: prev.calendarClosures.filter((closure) => closure.id !== id),
    }));
  }

  function updateSlotConfig(patch) {
    setDraft((prev) => ({
      ...prev,
      slotConfig: {
        ...prev.slotConfig,
        ...patch,
      },
    }));
  }

  function updateManualSlot(id, patch) {
    setDraft((prev) => ({
      ...prev,
      slotConfig: {
        ...prev.slotConfig,
        manualSlots: prev.slotConfig.manualSlots.map((slot) =>
          slot.id === id ? { ...slot, ...patch } : slot
        ),
      },
    }));
  }

  function addManualSlot() {
    setDraft((prev) => ({
      ...prev,
      slotConfig: {
        ...prev.slotConfig,
        manualSlots: [
          ...prev.slotConfig.manualSlots,
          createManualSlotDraft(prev.slotConfig.manualSlots.length + 1),
        ],
      },
    }));
  }

  function removeManualSlot(id) {
    setDraft((prev) => ({
      ...prev,
      slotConfig: {
        ...prev.slotConfig,
        manualSlots: prev.slotConfig.manualSlots.filter((slot) => slot.id !== id),
      },
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (slotConfigError) {
      return;
    }

    onSubmit(draft);
    resetDraft();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card modal-card-large"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Nouveau EDT</h2>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form className="modal-form new-schedule-form" onSubmit={handleSubmit}>
          <section className="new-schedule-section">
            <h3>Informations générales</h3>

            <label className="form-field">
              <span>Nom du semestre / EDT</span>
              <input
                type="text"
                value={draft.semesterName}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    semesterName: event.target.value,
                  }))
                }
              />
            </label>

            <div className="form-hint muted">
              Période calculée automatiquement à partir des dates des promotions.
            </div>
          </section>

          <section className="new-schedule-section">
            <div className="new-schedule-section-header">
              <h3>Créneaux de la journée</h3>
            </div>

            <label className="form-field">
              <span>Mode</span>
              <select
                value={draft.slotConfig.mode}
                onChange={(event) =>
                  updateSlotConfig({ mode: event.target.value })
                }
              >
                <option value="generated">Créneaux générés automatiquement</option>
                <option value="manual">Créneaux définis manuellement</option>
              </select>
            </label>

            {draft.slotConfig.mode === "manual" ? (
              <>
                <div className="new-schedule-section-header">
                  <h4>Créneaux saisis</h4>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addManualSlot}
                  >
                    + Ajouter un créneau
                  </button>
                </div>

                <div className="new-schedule-list">
                  {draft.slotConfig.manualSlots.length === 0 ? (
                    <div className="empty-box">
                      Aucun créneau défini. Ajoute manuellement les créneaux de la journée.
                    </div>
                  ) : (
                    draft.slotConfig.manualSlots.map((slot, index) => {
                      const duration = computeSlotDuration(slot);
                      const matchesReference =
                        duration != null &&
                        manualReferenceDuration != null &&
                        duration === manualReferenceDuration;

                      return (
                        <div key={slot.id} className="new-schedule-card">
                          <div className="new-schedule-section-header">
                            <div className="new-schedule-card-title">Créneau {index + 1}</div>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => removeManualSlot(slot.id)}
                            >
                              Supprimer
                            </button>
                          </div>

                          <div className="form-row">
                            <label className="form-field">
                              <span>Début</span>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(event) =>
                                  updateManualSlot(slot.id, {
                                    startTime: event.target.value,
                                  })
                                }
                              />
                            </label>

                            <label className="form-field">
                              <span>Fin</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(event) =>
                                  updateManualSlot(slot.id, {
                                    endTime: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>

                          <div className="form-hint muted">
                            Durée calculée : {formatDurationLabel(duration)}
                            {manualReferenceDuration != null
                              ? index === 0
                                ? ` — durée de référence détectée`
                                : duration != null && !matchesReference
                                  ? ` — différente de la durée de référence (${formatDurationLabel(
                                      manualReferenceDuration
                                    )})`
                                  : ""
                              : ""}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="form-hint muted">
                  La durée de référence est déduite du premier créneau valide saisi.
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <label className="form-field">
                    <span>Début de journée</span>
                    <input
                      type="time"
                      value={draft.slotConfig.dayStartTime}
                      onChange={(event) =>
                        updateSlotConfig({ dayStartTime: event.target.value })
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>Fin de journée</span>
                    <input
                      type="time"
                      value={draft.slotConfig.dayEndTime}
                      onChange={(event) =>
                        updateSlotConfig({ dayEndTime: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="form-row">
                  <DurationInputs
                    label="Durée d’un créneau"
                    totalMinutes={draft.slotConfig.slotDurationMinutes}
                    onChange={(value) =>
                      updateSlotConfig({ slotDurationMinutes: value })
                    }
                  />

                  <DurationInputs
                    label="Pause entre créneaux"
                    totalMinutes={draft.slotConfig.breakDurationMinutes}
                    onChange={(value) =>
                      updateSlotConfig({ breakDurationMinutes: value })
                    }
                  />
                </div>

                <div className="new-schedule-card">
                  <h4>Créneaux saisis</h4>

                  {generatedSlotPreview.length === 0 ? (
                    <div className="empty-box">
                      Aucun créneau généré avec ces paramètres.
                    </div>
                  ) : (
                    <div className="new-schedule-preview-list">
                      {generatedSlotPreview.map((slot, index) => (
                        <div key={slot.id} className="new-schedule-preview-row">
                          <span>
                            Créneau {index + 1} — {slot.startTime} → {slot.endTime}
                          </span>
                          <span className="muted">
                            {formatDurationLabel(slot.durationMinutes)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="form-hint muted">
              Tous les créneaux ont une durée fixe pour conserver une grille homogène.
            </div>

            {slotConfigError && (
              <div className="form-hint" style={{ color: "#b91c1c" }}>
                {slotConfigError}
              </div>
            )}
          </section>

          <section className="new-schedule-section">
            <div className="new-schedule-section-header">
              <h3>Promotions</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    promotions: [
                      ...prev.promotions,
                      createPromotionDraft(prev.promotions.length + 1),
                    ],
                  }))
                }
              >
                + Ajouter
              </button>
            </div>

            <div className="new-schedule-list">
              {draft.promotions.map((promotion, index) => (
                <div key={promotion.id} className="new-schedule-card">
                  <label className="form-field">
                    <div className="new-schedule-card-title">Promotion {index + 1}</div>
                    <input
                      type="text"
                      placeholder="ITI 3"
                      value={promotion.label}
                      onChange={(event) =>
                        updatePromotion(promotion.id, {
                          label: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="form-row">
                    <label className="form-field">
                      <span>Date de début</span>
                      <input
                        type="date"
                        value={promotion.startDate}
                        onChange={(event) =>
                          updatePromotion(promotion.id, {
                            startDate: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="form-field">
                      <span>Date de fin</span>
                      <input
                        type="date"
                        value={promotion.endDate}
                        onChange={(event) =>
                          updatePromotion(promotion.id, {
                            endDate: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="new-schedule-section">
            <div className="new-schedule-section-header">
              <h3>Indisponibilités calendrier</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    calendarClosures: [
                      ...prev.calendarClosures,
                      createCalendarClosureDraft(prev.calendarClosures.length + 1),
                    ],
                  }))
                }
              >
                + Ajouter
              </button>
            </div>

            {draft.calendarClosures.length === 0 ? (
              <div className="empty-box">
                Aucune indisponibilité calendrier configurée.
              </div>
            ) : (
              <div className="new-schedule-list">
                {draft.calendarClosures.map((closure, index) => (
                  <div key={closure.id} className="new-schedule-card">
                    <div className="new-schedule-section-header">
                      <div className="new-schedule-card-title">Indisponibilité {index + 1}</div>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => removeCalendarClosure(closure.id)}
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="form-row">
                      <label className="form-field">
                        <span>Portée</span>
                        <select
                          value={closure.scope}
                          onChange={(event) =>
                            updateCalendarClosure(closure.id, {
                              scope: event.target.value,
                              promotionId:
                                event.target.value === "promotion"
                                  ? closure.promotionId
                                  : "",
                            })
                          }
                        >
                          <option value="global">Globale</option>
                          <option value="promotion">Promotion</option>
                        </select>
                      </label>

                      <label className="form-field">
                        <span>Promotion</span>
                        <select
                          value={closure.promotionId}
                          disabled={closure.scope !== "promotion"}
                          onChange={(event) =>
                            updateCalendarClosure(closure.id, {
                              promotionId: event.target.value,
                            })
                          }
                        >
                          <option value="">Sélectionner...</option>
                          {promotionOptions.map((promotion) => (
                            <option key={promotion.id} value={promotion.id}>
                              {promotion.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="form-row">
                      <label className="form-field">
                        <span>Date de début</span>
                        <input
                          type="date"
                          value={closure.startDate}
                          onChange={(event) =>
                            updateCalendarClosure(closure.id, {
                              startDate: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label className="form-field">
                        <span>Date de fin</span>
                        <input
                          type="date"
                          value={closure.endDate}
                          onChange={(event) =>
                            updateCalendarClosure(closure.id, {
                              endDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <label className="form-field">
                      <span>Libellé</span>
                      <input
                        type="text"
                        placeholder="Toussaint, Jury, Projet..."
                        value={closure.label}
                        onChange={(event) =>
                          updateCalendarClosure(closure.id, {
                            label: event.target.value,
                          })
                        }
                      />
                    </label>

                    <div className="form-hint muted">
                      {formatClosureSummary(closure, promotionOptions)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={Boolean(slotConfigError)}
            >
              Créer l’EDT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
