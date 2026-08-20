function unique(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

export function getRequirementMap(db) {
  return Object.fromEntries(
    (db.requirements ?? []).map((requirement) => [requirement.id, requirement])
  );
}

export function getRequirementAudienceMap(db) {
  return Object.fromEntries(
    (db.requirementAudiences ?? []).map((audience) => [audience.id, audience])
  );
}

export function getGroupMap(db) {
  return Object.fromEntries((db.groups ?? []).map((group) => [group.id, group]));
}

export function getGroupSetMap(db) {
  return Object.fromEntries(
    (db.groupSets ?? []).map((groupSet) => [groupSet.id, groupSet])
  );
}

export function getRequirementAudience(db, requirementAudienceId) {
  return getRequirementAudienceMap(db)[requirementAudienceId] ?? null;
}

export function getRequirementForAudience(db, requirementAudience) {
  if (!requirementAudience?.requirementId) {
    return null;
  }

  return getRequirementMap(db)[requirementAudience.requirementId] ?? null;
}

export function getRequirementForSession(db, session) {
  const requirementAudience = getRequirementAudience(db, session?.requirementAudienceId);
  if (requirementAudience) {
    return getRequirementForAudience(db, requirementAudience);
  }

  if (!session?.requirementId) {
    return null;
  }

  return getRequirementMap(db)[session.requirementId] ?? null;
}

export function derivePromotionIdsFromGroupIds(db, groupIds) {
  const groupMap = getGroupMap(db);

  return unique(
    (groupIds ?? []).flatMap((groupId) => {
      const group = groupMap[groupId];
      if (!group) return [];
      if (Array.isArray(group.promotionIds) && group.promotionIds.length > 0) {
        return group.promotionIds;
      }
      return group.promotionId ? [group.promotionId] : [];
    })
  );
}

export function deriveGroupSetIdsFromGroupIds(db, groupIds) {
  const groupMap = getGroupMap(db);

  return unique((groupIds ?? []).map((groupId) => groupMap[groupId]?.groupSetId ?? null));
}

export function deriveGroupLabelsFromGroupIds(db, groupIds) {
  const groupMap = getGroupMap(db);

  return unique((groupIds ?? []).map((groupId) => groupMap[groupId]?.label ?? null));
}

export function derivePromotionLabelsFromPromotionIds(db, promotionIds) {
  const promotionMap = Object.fromEntries(
    (db.promotions ?? []).map((promotion) => [promotion.id, promotion])
  );

  return unique(
    (promotionIds ?? []).map((promotionId) => promotionMap[promotionId]?.label ?? null)
  );
}

export function getRequirementAudienceTargetGroupIds(requirementAudience) {
  return unique(requirementAudience?.targetGroupIds ?? []);
}

export function getRequirementAudiencePromotionIds(db, requirementAudience) {
  const targetGroupIds = getRequirementAudienceTargetGroupIds(requirementAudience);

  if (targetGroupIds.length > 0) {
    return derivePromotionIdsFromGroupIds(db, targetGroupIds);
  }

  return unique(requirementAudience?.targetPromotionIds ?? []);
}

export function getRequirementAudienceGroupSetIds(db, requirementAudience) {
  return deriveGroupSetIdsFromGroupIds(
    db,
    getRequirementAudienceTargetGroupIds(requirementAudience)
  );
}

function getRelatedGroupIds(groupMap, startGroupId, relationKey) {
  const visited = new Set();
  const stack = [...(groupMap[startGroupId]?.[relationKey] ?? [])];

  while (stack.length > 0) {
    const currentGroupId = stack.pop();
    if (!currentGroupId || visited.has(currentGroupId)) {
      continue;
    }

    visited.add(currentGroupId);
    const nextIds = groupMap[currentGroupId]?.[relationKey] ?? [];
    nextIds.forEach((nextId) => {
      if (!visited.has(nextId)) {
        stack.push(nextId);
      }
    });
  }

  return visited;
}

export function getAncestorGroupIds(db, groupId) {
  return getRelatedGroupIds(getGroupMap(db), groupId, "parentGroupIds");
}

export function getDescendantGroupIds(db, groupId) {
  return getRelatedGroupIds(getGroupMap(db), groupId, "childGroupIds");
}

export function groupsOverlap(db, groupIdA, groupIdB) {
  if (!groupIdA || !groupIdB) {
    return false;
  }

  if (groupIdA === groupIdB) {
    return true;
  }

  const ancestorsOfA = getAncestorGroupIds(db, groupIdA);
  if (ancestorsOfA.has(groupIdB)) {
    return true;
  }

  const descendantsOfA = getDescendantGroupIds(db, groupIdA);
  if (descendantsOfA.has(groupIdB)) {
    return true;
  }

  return false;
}

function getGroupLineageIds(db, groupId) {
  if (!groupId) {
    return [];
  }

  return [groupId, ...getAncestorGroupIds(db, groupId)];
}

function groupsCanRunInParallel(db, groupIdA, groupIdB) {
  if (!groupIdA || !groupIdB) {
    return false;
  }

  if (groupsOverlap(db, groupIdA, groupIdB)) {
    return false;
  }

  const groupMap = getGroupMap(db);
  const groupA = groupMap[groupIdA];
  const groupB = groupMap[groupIdB];

  if (!groupA || !groupB) {
    return false;
  }

  const lineageA = getGroupLineageIds(db, groupIdA)
    .map((lineageGroupId) => groupMap[lineageGroupId])
    .filter(Boolean);
  const lineageB = getGroupLineageIds(db, groupIdB)
    .map((lineageGroupId) => groupMap[lineageGroupId])
    .filter(Boolean);

  return lineageA.some((candidateA) =>
    lineageB.some(
      (candidateB) =>
        candidateA.id !== candidateB.id &&
        candidateA.groupSetId &&
        candidateA.groupSetId === candidateB.groupSetId
    )
  );
}

export function getSessionAudience(db, session) {
  const requirementAudience = getRequirementAudience(db, session?.requirementAudienceId);
  const targetGroupIds = requirementAudience
    ? getRequirementAudienceTargetGroupIds(requirementAudience)
    : unique(session?.targetGroupIds ?? []);
  const promotionIds = requirementAudience
    ? getRequirementAudiencePromotionIds(db, requirementAudience)
    : derivePromotionIdsFromGroupIds(db, targetGroupIds);
  const groupSetIds = requirementAudience
    ? getRequirementAudienceGroupSetIds(db, requirementAudience)
    : deriveGroupSetIdsFromGroupIds(db, targetGroupIds);

  return {
    targetGroupIds,
    promotionIds,
    groupSetIds,
  };
}

export function getRequirementAudienceSummary(db, requirement) {
  const requirementAudiences = (db.requirementAudiences ?? []).filter(
    (audience) => audience.requirementId === requirement.id
  );

  if (requirementAudiences.length > 0) {
    const targetGroupIds = unique(
      requirementAudiences.flatMap((audience) => audience.targetGroupIds ?? [])
    );
    const promotionIds = unique(
      requirementAudiences.flatMap((audience) =>
        getRequirementAudiencePromotionIds(db, audience)
      )
    );
    const groupSetIds = unique(
      requirementAudiences.flatMap((audience) =>
        getRequirementAudienceGroupSetIds(db, audience)
      )
    );

    return {
      targetGroupIds,
      promotionIds,
      groupSetIds,
    };
  }

  const relatedSessions = (db.sessionInstances ?? []).filter(
    (session) => session.requirementId === requirement.id
  );

  if (relatedSessions.length > 0) {
    const targetGroupIds = unique(
      relatedSessions.flatMap((session) => session.targetGroupIds ?? [])
    );

    return {
      targetGroupIds,
      promotionIds: derivePromotionIdsFromGroupIds(db, targetGroupIds),
      groupSetIds: deriveGroupSetIdsFromGroupIds(db, targetGroupIds),
    };
  }

  const fallbackGroupIds = unique(requirement.targetGroupIds ?? []);
  const fallbackPromotionIds =
    fallbackGroupIds.length > 0
      ? derivePromotionIdsFromGroupIds(db, fallbackGroupIds)
      : unique(requirement.targetPromotionIds ?? []);

  return {
    targetGroupIds: fallbackGroupIds,
    promotionIds: fallbackPromotionIds,
    groupSetIds: deriveGroupSetIdsFromGroupIds(db, fallbackGroupIds),
  };
}

export function getAudienceFromCourseType(courseType) {
  return {
    targetGroupIds: unique(courseType?.groupIds ?? []),
    promotionIds: unique(courseType?.promotionIds ?? []),
    groupSetIds: unique(courseType?.groupSetIds ?? []),
  };
}

export function getAudienceFromEntry(entry) {
  return {
    targetGroupIds: unique(entry?.groupIds ?? []),
    promotionIds: unique(entry?.promotionIds ?? []),
    groupSetIds: unique(entry?.groupSetIds ?? []),
  };
}

export function audiencesConflict(db, audienceA, audienceB) {
  const promotionsA = unique(audienceA?.promotionIds ?? []);
  const promotionsB = unique(audienceB?.promotionIds ?? []);
  const overlappingPromotions = promotionsA.filter((promotionId) =>
    promotionsB.includes(promotionId)
  );

  if (overlappingPromotions.length === 0) {
    return false;
  }

  const groupIdsA = unique(audienceA?.targetGroupIds ?? []);
  const groupIdsB = unique(audienceB?.targetGroupIds ?? []);

  if (!groupIdsA.length || !groupIdsB.length) {
    return true;
  }

  for (const groupIdA of groupIdsA) {
    for (const groupIdB of groupIdsB) {
      if (groupsOverlap(db, groupIdA, groupIdB)) {
        return true;
      }

      if (!groupsCanRunInParallel(db, groupIdA, groupIdB)) {
        return true;
      }
    }
  }

  return false;
}
