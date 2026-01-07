"""
Input validation for cycle generation parameters.

Validates user input before cycle generation begins.
"""

from typing import Optional, Union
from ..models.enums import (
    TrainingGoal,
    FitnessLevel,
    Periodization,
)
from ..exceptions.custom import InvalidInputError


class InputValidator:
    """
    Validates input parameters for cycle generation.
    
    Ensures all user-provided input meets requirements before processing.
    """
    
    # Constraints
    MIN_CYCLE_WEEKS = 1
    MAX_CYCLE_WEEKS = 52
    MIN_WORKOUTS_PER_WEEK = 1
    MAX_WORKOUTS_PER_WEEK = 7
    MIN_EXERCISES_PER_WORKOUT = 1
    MAX_EXERCISES_PER_WORKOUT = 20
    
    @staticmethod
    def validate_cycle_params(
        goal: Union[TrainingGoal, str],
        fitness_level: Union[FitnessLevel, str],
        periodization: Union[Periodization, str],
        duration_weeks: int,
        workouts_per_week: int,
        exercises_per_workout: Optional[int] = None,
    ) -> bool:
        """
        Validate all cycle generation parameters.
        
        Args:
            goal: TrainingGoal enum or string
            fitness_level: FitnessLevel enum or string
            periodization: Periodization enum or string
            duration_weeks: Duration in weeks
            workouts_per_week: Number of workouts per week
            exercises_per_workout: Number of exercises per workout
            
        Returns:
            True if valid
            
        Raises:
            InvalidInputError: If any parameter is invalid
        """
        # Validate goal
        if isinstance(goal, str):
            try:
                TrainingGoal(goal)
            except ValueError:
                raise InvalidInputError(
                    f"Invalid training goal: {goal}. "
                    f"Must be one of: {[g.value for g in TrainingGoal]}"
                )
        elif not isinstance(goal, TrainingGoal):
            raise InvalidInputError(
                f"Goal must be TrainingGoal enum or string, got {type(goal)}"
            )
        
        # Validate fitness level
        if isinstance(fitness_level, str):
            try:
                FitnessLevel(fitness_level)
            except ValueError:
                raise InvalidInputError(
                    f"Invalid fitness level: {fitness_level}. "
                    f"Must be one of: {[f.value for f in FitnessLevel]}"
                )
        elif not isinstance(fitness_level, FitnessLevel):
            raise InvalidInputError(
                f"Fitness level must be FitnessLevel enum or string, "
                f"got {type(fitness_level)}"
            )
        
        # Validate periodization
        if isinstance(periodization, str):
            try:
                Periodization(periodization)
            except ValueError:
                raise InvalidInputError(
                    f"Invalid periodization: {periodization}. "
                    f"Must be one of: {[p.value for p in Periodization]}"
                )
        elif not isinstance(periodization, Periodization):
            raise InvalidInputError(
                f"Periodization must be Periodization enum or string, "
                f"got {type(periodization)}"
            )
        
        # Validate duration
        if not isinstance(duration_weeks, int):
            raise InvalidInputError(
                f"Duration weeks must be int, got {type(duration_weeks)}"
            )
        if not (
            InputValidator.MIN_CYCLE_WEEKS <= duration_weeks <=
            InputValidator.MAX_CYCLE_WEEKS
        ):
            raise InvalidInputError(
                f"Duration weeks must be between "
                f"{InputValidator.MIN_CYCLE_WEEKS} and "
                f"{InputValidator.MAX_CYCLE_WEEKS}, got {duration_weeks}"
            )
        
        # Validate workouts per week
        if not isinstance(workouts_per_week, int):
            raise InvalidInputError(
                f"Workouts per week must be int, "
                f"got {type(workouts_per_week)}"
            )
        if not (
            InputValidator.MIN_WORKOUTS_PER_WEEK <= workouts_per_week <=
            InputValidator.MAX_WORKOUTS_PER_WEEK
        ):
            raise InvalidInputError(
                f"Workouts per week must be between "
                f"{InputValidator.MIN_WORKOUTS_PER_WEEK} and "
                f"{InputValidator.MAX_WORKOUTS_PER_WEEK}, "
                f"got {workouts_per_week}"
            )
        
        # Validate exercises per workout
        if exercises_per_workout is not None:
            if not isinstance(exercises_per_workout, int):
                raise InvalidInputError(
                    f"Exercises per workout must be int, "
                    f"got {type(exercises_per_workout)}"
                )
            if not (
                InputValidator.MIN_EXERCISES_PER_WORKOUT <= 
                exercises_per_workout <=
                InputValidator.MAX_EXERCISES_PER_WORKOUT
            ):
                raise InvalidInputError(
                    f"Exercises per workout must be between "
                    f"{InputValidator.MIN_EXERCISES_PER_WORKOUT} and "
                    f"{InputValidator.MAX_EXERCISES_PER_WORKOUT}, "
                    f"got {exercises_per_workout}"
                )
        
        return True
    
    @staticmethod
    def validate_exercise_selection(
        exercise_ids: list[str],
        min_exercises: int = 1,
        max_exercises: int = 20,
    ) -> bool:
        """
        Validate exercise selection.
        
        Args:
            exercise_ids: List of exercise IDs
            min_exercises: Minimum number of exercises
            max_exercises: Maximum number of exercises
            
        Returns:
            True if valid
            
        Raises:
            InvalidInputError: If exercise selection is invalid
        """
        if not isinstance(exercise_ids, list):
            raise InvalidInputError(
                f"Exercise IDs must be a list, got {type(exercise_ids)}"
            )
        
        if len(exercise_ids) < min_exercises:
            raise InvalidInputError(
                f"Must provide at least {min_exercises} exercises, "
                f"got {len(exercise_ids)}"
            )
        
        if len(exercise_ids) > max_exercises:
            raise InvalidInputError(
                f"Cannot have more than {max_exercises} exercises, "
                f"got {len(exercise_ids)}"
            )
        
        # Check for duplicates
        if len(exercise_ids) != len(set(exercise_ids)):
            raise InvalidInputError(
                "Duplicate exercises in selection"
            )
        
        # Validate each ID is a string
        for ex_id in exercise_ids:
            if not isinstance(ex_id, str):
                raise InvalidInputError(
                    f"Exercise ID must be string, got {type(ex_id)}"
                )
            if not ex_id:
                raise InvalidInputError("Exercise ID cannot be empty")
        
        return True
    
    @staticmethod
    def validate_rep_range(rep_range: str) -> bool:
        """
        Validate rep range format (e.g., "6-8").
        
        Args:
            rep_range: Rep range string
            
        Returns:
            True if valid
            
        Raises:
            InvalidInputError: If format is invalid
        """
        if not isinstance(rep_range, str):
            raise InvalidInputError(
                f"Rep range must be string, got {type(rep_range)}"
            )
        
        if '-' not in rep_range:
            raise InvalidInputError(
                f"Rep range must be in format 'X-Y', got {rep_range}"
            )
        
        try:
            parts = rep_range.split('-')
            if len(parts) != 2:
                raise InvalidInputError(
                    f"Rep range must have exactly 2 numbers, "
                    f"got {len(parts)}"
                )
            
            min_reps = int(parts[0])
            max_reps = int(parts[1])
            
            if min_reps < 1 or max_reps < 1:
                raise InvalidInputError(
                    "Rep counts must be at least 1"
                )
            
            if min_reps > max_reps:
                raise InvalidInputError(
                    f"Min reps ({min_reps}) cannot be greater than "
                    f"max reps ({max_reps})"
                )
            
        except (ValueError, IndexError) as e:
            raise InvalidInputError(
                f"Invalid rep range format '{rep_range}': {str(e)}"
            )
        
        return True
    
    @staticmethod
    def validate_intensity_percentage(intensity: int) -> bool:
        """
        Validate intensity percentage.
        
        Args:
            intensity: Intensity as percentage (1-100)
            
        Returns:
            True if valid
            
        Raises:
            InvalidInputError: If intensity is invalid
        """
        if not isinstance(intensity, int):
            raise InvalidInputError(
                f"Intensity must be int, got {type(intensity)}"
            )
        
        if not 1 <= intensity <= 100:
            raise InvalidInputError(
                f"Intensity must be between 1-100, got {intensity}"
            )
        
        return True
    
    @staticmethod
    def validate_multiplier(
        multiplier: float,
        min_val: float = 0.1,
        max_val: float = 5.0,
    ) -> bool:
        """
        Validate a multiplier value.
        
        Args:
            multiplier: Multiplier value
            min_val: Minimum allowed value
            max_val: Maximum allowed value
            
        Returns:
            True if valid
            
        Raises:
            InvalidInputError: If multiplier is invalid
        """
        if not isinstance(multiplier, (int, float)):
            raise InvalidInputError(
                f"Multiplier must be numeric, got {type(multiplier)}"
            )
        
        if not min_val <= multiplier <= max_val:
            raise InvalidInputError(
                f"Multiplier must be between {min_val} and {max_val}, "
                f"got {multiplier}"
            )
        
        return True
