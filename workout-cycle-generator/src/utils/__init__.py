"""
Utilities module for calculations and serialization.

Exports utility functions and classes.
"""

from .calculators import (
    calculate_1rm_estimate,
    calculate_working_weight,
    calculate_volume,
    calculate_rpe_to_reps_in_reserve,
    get_intensity_percentage_from_rpe,
    calculate_progression_factor,
    get_rep_range_for_goal,
    get_intensity_range_for_goal,
    get_sets_for_goal,
    get_rest_period_seconds,
    calculate_volume_progression,
    get_deload_multiplier,
)

from .serializers import (
    to_json,
    from_json,
    to_json_file,
    from_json_file,
    dict_to_pretty_json,
    json_to_dict,
    CycleEncoder,
    to_json_with_encoder,
    validate_json_schema,
)

__all__ = [
    # Calculators
    "calculate_1rm_estimate",
    "calculate_working_weight",
    "calculate_volume",
    "calculate_rpe_to_reps_in_reserve",
    "get_intensity_percentage_from_rpe",
    "calculate_progression_factor",
    "get_rep_range_for_goal",
    "get_intensity_range_for_goal",
    "get_sets_for_goal",
    "get_rest_period_seconds",
    "calculate_volume_progression",
    "get_deload_multiplier",
    # Serializers
    "to_json",
    "from_json",
    "to_json_file",
    "from_json_file",
    "dict_to_pretty_json",
    "json_to_dict",
    "CycleEncoder",
    "to_json_with_encoder",
    "validate_json_schema",
]
