import { useState } from "react";
import {
  addTeacherToDb,
  addUnavailabilityToDb,
  createUnavailability,
  deleteTeacherFromDb,
  removeUnavailabilityFromDb,
  updateTeacherIdentityInDb,
} from "../planner/teacherManagement";

export default function useTeacherManagement({
  setDb,
  teacherMap,
  setPendingTeacherAssignments,
  setMessage,
  activeEditorPanel,
  setActiveEditorPanel,
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);

  const selectedTeacher = selectedTeacherId
    ? teacherMap[selectedTeacherId] ?? null
    : null;

  function showTeacherPanel(teacherId) {
    setSelectedTeacherId((prev) => {
      const nextId = prev === teacherId ? null : teacherId;

      if (nextId) {
        setActiveEditorPanel("teacher");
      } else if (activeEditorPanel === "teacher") {
        setActiveEditorPanel(null);
      }

      return nextId;
    });
  }

  function handleRenameTeacher({ teacherId, firstName, lastName }) {
    setDb((prev) =>
      updateTeacherIdentityInDb(prev, teacherId, { firstName, lastName })
    );
    setMessage("Intervenant mis a jour.");
  }

  function handleAddTeacher({ teacher, unavailabilities }) {
    setDb((prev) => {
      let next = addTeacherToDb(prev, teacher);

      unavailabilities.forEach((unavailability) => {
        next = addUnavailabilityToDb(next, unavailability);
      });

      return next;
    });

    setMessage(`Intervenant ajoute : ${teacher.firstName} ${teacher.lastName}.`);
  }

  function handleAddTeacherUnavailability(rule) {
    if (!selectedTeacherId) return;

    const unavailability = createUnavailability({
      entityType: "teacher",
      entityId: selectedTeacherId,
      ...rule,
    });

    setDb((prev) => addUnavailabilityToDb(prev, unavailability));
    setMessage("Indisponibilite ajoutee.");
  }

  function handleRemoveTeacherUnavailability(unavailabilityId) {
    setDb((prev) => removeUnavailabilityFromDb(prev, unavailabilityId));
    setMessage("Indisponibilite supprimee.");
  }

  function handleConfirmDeleteTeacher() {
    if (!teacherToDelete) return;

    setDb((prev) => deleteTeacherFromDb(prev, teacherToDelete.id));

    setPendingTeacherAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((requirementId) => {
        if (next[requirementId] === teacherToDelete.id) {
          delete next[requirementId];
        }
      });
      return next;
    });

    if (selectedTeacherId === teacherToDelete.id) {
      setSelectedTeacherId(null);
    }

    setTeacherToDelete(null);
    setMessage("Intervenant supprime.");
  }

  function resetTeacherManagement() {
    setSelectedTeacherId(null);
    setTeacherToDelete(null);
    setIsAddTeacherModalOpen(false);
  }

  return {
    selectedTeacherId,
    setSelectedTeacherId,
    teacherToDelete,
    setTeacherToDelete,
    isAddTeacherModalOpen,
    setIsAddTeacherModalOpen,
    selectedTeacher,
    showTeacherPanel,
    handleRenameTeacher,
    handleAddTeacher,
    handleAddTeacherUnavailability,
    handleRemoveTeacherUnavailability,
    handleConfirmDeleteTeacher,
    resetTeacherManagement,
  };
}
