"""
Calculation utilities for the workout cycle generator.

Provides functions for calculating intensity, volume, and progression metrics.
"""

from typing import Tuple
from ..models.enums import FitnessLevel, TrainingGoal


def calculate_1rm_estimate(weight: float, reps: int) -> float:
    """
    Estimate one-rep maximum using Brzycki formula.
    
    Formula: 1RM = weight / (1.0278 - 0.0278 * reps)
    
    Args:
        weight: Weight lifted
        reps: Number of reps performed
        
    Returns:
        Estimated 1RM
    """
    if reps < 1:
        raise ValueError(f"Reps must be at least 1, got {reps}")
    if reps == 1:
        return weight
    
    one_rm = weight / (1.0278 - 0.0278 * reps)
    return round(one_rm, 2)


def calculate_working_weight(
    one_rm: float,
    intensity_percentage: int
) -> float:
    """
    Calculate working weight from 1RM and intensity percentage.
    
    Args:
        one_rm: One-rep maximum
        intensity_percentage: Intensity as percentage (e.g., 80 for 80%)
        
    Returns:
        Working weight
    """
    if not 1 <= intensity_percentage <= 100:
        raise ValueError(
            f"Intensity percentage must be 1-100, got {intensity_percentage}"
        )
    
    weight = one_rm * (intensity_percentage / 100)
    return round(weight, 2)


def calculate_volume(sets: int, reps: int, weight: float) -> float:
    """
    Calculate total volume (sets × reps × weight).
    
    Args:
        sets: Number of sets
        reps: Reps per set
        weight: Weight lifted
        
    Returns:
        Total volume
    """
    if sets < 1 or reps < 1 or weight <= 0:
        raise ValueError(
            f"Invalid inputs: sets={sets}, reps={reps}, weight={weight}"
        )
    
    return sets * reps * weight


def calculate_rpe_to_reps_in_reserve(rpe: int) -> int:
    """
    Convert RPE (Rate of Perceived Exertion) to Reps In Reserve.
    
    RPE 10 = 0 RIR, RPE 9 = 1 RIR, RPE 8 = 2 RIR, etc.
    
    Args:
        rpe: RPE value (1-10)
        
    Returns:
        Reps in reserve
    """
    if not 1 <= rpe <= 10:
        raise ValueError(f"RPE must be 1-10, got {rpe}")
    
    return 10 - rpe


def get_intensity_percentage_from_rpe(rpe: int) -> int:
    """
    Estimate intensity percentage from RPE.
    
    Uses approximation: intensity% ≈ 40 + (rpe * 6)
    
    Args:
        rpe: RPE value (1-10)
        
    Returns:
        Estimated intensity percentage
    """
    if not 1 <= rpe <= 10:
        raise ValueError(f"RPE must be 1-10, got {rpe}")
    
    intensity = 40 + (rpe * 6)
    return min(intensity, 100)


def calculate_progression_factor(
    current_volume: float,
    previous_volume: float
) -> float:
    """
    Calculate volume progression factor.
    
    Positive value indicates progression, negative indicates regression.
    
    Args:
        current_volume: Current training volume
        previous_volume: Previous training volume
        
    Returns:
        Progression factor (percent change)
    """
    if previous_volume == 0:
        return 0.0
    
    factor = ((current_volume - previous_volume) / previous_volume) * 100
    return round(factor, 2)


def get_rep_range_for_goal(goal: TrainingGoal) -> str:
    """
    Get recommended rep range for a training goal.
    
    Args:
        goal: TrainingGoal enum
        
    Returns:
        Rep range as string (e.g., "6-8")
    """
    goal_rep_ranges = {
        TrainingGoal.STRENGTH: "3-5",
        TrainingGoal.HYPERTROPHY: "6-12",
        TrainingGoal.ENDURANCE: "12-20",
        TrainingGoal.POWER: "3-5",
    }
    return goal_rep_ranges.get(goal, "6-8")


def get_intensity_range_for_goal(goal: TrainingGoal) -> Tuple[int, int]:
    """
    Get recommended intensity range (percentage) for a training goal.
    
    Args:
        goal: TrainingGoal enum
        
    Returns:
        Tuple of (min_intensity, max_intensity)
    """
    goal_intensities = {
        TrainingGoal.STRENGTH: (85, 95),
        TrainingGoal.HYPERTROPHY: (65, 85),
        TrainingGoal.ENDURANCE: (50, 70),
        TrainingGoal.POWER: (75, 90),
    }
    return goal_intensities.get(goal, (60, 80))


def get_sets_for_goal(goal: TrainingGoal) -> Tuple[int, int]:
    """
    Get recommended set range for a training goal.
    
    Args:
        goal: TrainingGoal enum
        
    Returns:
        Tuple of (min_sets, max_sets)
    """
    goal_sets = {
        TrainingGoal.STRENGTH: (3, 5),
        TrainingGoal.HYPERTROPHY: (3, 4),
        TrainingGoal.ENDURANCE: (2, 3),
        TrainingGoal.POWER: (3, 5),
    }
    return goal_sets.get(goal, (3, 4))


def get_rest_period_seconds(rest_category: str) -> Tuple[int, int]:
    """
    Get rest period range in seconds for a category.
    
    Args:
        rest_category: Rest category ("short", "moderate", "long", "extended")
        
    Returns:
        Tuple of (min_seconds, max_seconds)
    """
    rest_periods = {
        "short": (30, 60),
        "moderate": (60, 90),
        "long": (120, 180),
        "extended": (180, 300),
    }
    return rest_periods.get(rest_category, (60, 90))


def calculate_volume_progression(
    week: int,
    base_volume: float,
    progression_type: str = "linear"
) -> float:
    """
    Calculate volume for a given week based on progression type.
    
    Args:
        week: Week number
        base_volume: Base volume for week 1
        progression_type: "linear", "exponential", or "wave"
        
    Returns:
        Volume for the given week
    """
    if week < 1:
        raise ValueError(f"Week must be >= 1, got {week}")
    
    if progression_type == "linear":
        # 5% increase per week
        return base_volume * (1 + (week - 1) * 0.05)
    
    elif progression_type == "exponential":
        # 3% increase per week (compounds)
        return base_volume * (1.03 ** (week - 1))
    
    elif progression_type == "wave":
        # Oscillates: weeks follow 1, 1.05, 1.1, 1.05, 1.1, 1.15, etc
        cycle_pos = (week - 1) % 3
        cycle_num = (week - 1) // 3
        wave_factors = [1.0, 1.05, 1.1]
        return base_volume * (1 + cycle_num * 0.1) * wave_factors[cycle_pos]
    
    else:
        return base_volume


def get_deload_multiplier(week: int, cycle_length: int) -> float:
    """
    Determine deload multiplier for a week.
    
    Typically, every 4th week is a deload (reduced to 50-60% volume).
    
    Args:
        week: Current week
        cycle_length: Total cycle length
        
    Returns:
        Multiplier for volume/intensity (1.0 = normal, 0.5 = deload)
    """
    if week % 4 == 0:  # Every 4th week is deload
        return 0.6
    return 1.0
