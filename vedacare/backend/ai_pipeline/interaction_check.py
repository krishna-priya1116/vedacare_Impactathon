"""
Interaction Check — STUB MODULE

Per AI_PIPELINE.md: "No interaction checker — fully cut, not a bonus item"

This stub preserves the contract shape so backend code doesn't break.
Returns an empty interaction_flags list.
"""

import logging

logger = logging.getLogger(__name__)


def check_interactions(medications: list[dict]) -> list[dict]:
    """
    Stub — interaction checking is cut for this build.

    Returns an empty list so the API contract shape stays stable.
    Backend can call this without error; it just won't flag anything.

    Args:
        medications: List of medication dicts.

    Returns:
        Empty list of interaction flags.
    """
    logger.info(
        f"Interaction check stub called with {len(medications)} medications — "
        "feature is cut, returning empty flags"
    )
    return []
