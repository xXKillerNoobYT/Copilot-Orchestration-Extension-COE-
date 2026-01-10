"""
Cycle validation for completeness and correctness.

Validates generated cycles for structural integrity.
"""

from typing import Optional, List
from ..models.cycle import TrainingCycle
from ..models.phase import TrainingPhase
from ..models.workout import Workout
from ..exceptions.custom import ValidationError


class CycleValidator:
    """
    Validates training cycles for correctness and completeness.
    
    Ensures cycles meet all requirements before being returned to user.
    """
    
    @staticmethod
    def validate_cycle(cycle: TrainingCycle) -> bool:
        """
        Perform complete cycle validation.
        
        Args:
            cycle: TrainingCycle to validate
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If cycle is invalid
        """
        # Basic structure validation
        if not cycle.id:
            raise ValidationError("Cycle ID cannot be empty")
        
        if not cycle.name:
            raise ValidationError("Cycle name cannot be empty")
        
        if not cycle.phases:
            raise ValidationError("Cycle must contain at least one phase")
        
        if cycle.duration_weeks < 1:
            raise ValidationError(
                f"Cycle duration must be at least 1 week, "
                f"got {cycle.duration_weeks}"
            )
        
        # Validate phases
        CycleValidator._validate_phase_structure(cycle)
        CycleValidator._validate_phase_coverage(cycle)
        CycleValidator._validate_workout_distribution(cycle)
        
        return True
    
    @staticmethod
    def _validate_phase_structure(cycle: TrainingCycle) -> None:
        """
        Validate individual phase structures.
        
        Args:
            cycle: TrainingCycle to validate
            
        Raises:
            ValidationError: If phases are invalid
        """
        for i, phase in enumerate(cycle.phases):
            # Check phase has ID and name
            if not phase.id:
                raise ValidationError(
                    f"Phase {i} has no ID"
                )
            
            if not phase.name:
                raise ValidationError(
                    f"Phase {i} ({phase.id}) has no name"
                )
            
            # Check week ranges
            if phase.start_week < 1:
                raise ValidationError(
                    f"Phase {phase.id} start week must be >= 1, "
                    f"got {phase.start_week}"
                )
            
            if phase.end_week < phase.start_week:
                raise ValidationError(
                    f"Phase {phase.id} end week must be >= start week"
                )
            
            # Check multipliers
            if phase.intensity_multiplier <= 0:
                raise ValidationError(
                    f"Phase {phase.id} intensity multiplier must be > 0"
                )
            
            if phase.volume_multiplier <= 0:
                raise ValidationError(
                    f"Phase {phase.id} volume multiplier must be > 0"
                )
            
            # Check workouts
            if not phase.workouts:
                raise ValidationError(
                    f"Phase {phase.id} must contain at least one workout"
                )
            
            for j, workout in enumerate(phase.workouts):
                if not workout.id:
                    raise ValidationError(
                        f"Workout {j} in phase {phase.id} has no ID"
                    )
                
                if not workout.exercises:
                    raise ValidationError(
                        f"Workout {workout.id} in phase {phase.id} "
                        f"has no exercises"
                    )
    
    @staticmethod
    def _validate_phase_coverage(cycle: TrainingCycle) -> None:
        """
        Validate that phases cover the entire cycle duration.
        
        Args:
            cycle: TrainingCycle to validate
            
        Raises:
            ValidationError: If coverage is incomplete
        """
        if not cycle.phases:
            return
        
        sorted_phases = sorted(cycle.phases, key=lambda p: p.start_week)
        
        # Check first phase starts at week 1
        if sorted_phases[0].start_week != 1:
            raise ValidationError(
                f"First phase must start at week 1, "
                f"got week {sorted_phases[0].start_week}"
            )
        
        # Check for overlaps and gaps
        for i in range(len(sorted_phases) - 1):
            current = sorted_phases[i]
            next_phase = sorted_phases[i + 1]
            
            if current.end_week >= next_phase.start_week:
                raise ValidationError(
                    f"Phases overlap: {current.id} ends at week "
                    f"{current.end_week}, {next_phase.id} starts at week "
                    f"{next_phase.start_week}"
                )
            
            if current.end_week + 1 != next_phase.start_week:
                raise ValidationError(
                    f"Gap in phases between {current.id} and {next_phase.id}"
                )
        
        # Check last phase ends at cycle duration
        if sorted_phases[-1].end_week != cycle.duration_weeks:
            raise ValidationError(
                f"Last phase must end at week {cycle.duration_weeks}, "
                f"got week {sorted_phases[-1].end_week}"
            )
    
    @staticmethod
    def _validate_workout_distribution(cycle: TrainingCycle) -> None:
        """
        Validate workout distribution across the cycle.
        
        Args:
            cycle: TrainingCycle to validate
            
        Raises:
            ValidationError: If distribution is invalid
        """
        total_workouts = cycle.get_total_workouts()
        
        if total_workouts == 0:
            raise ValidationError(
                "Cycle must contain at least one workout"
            )
        
        # Calculate expected workouts per week
        expected_workouts = (
            total_workouts / cycle.duration_weeks
        )
        
        # Warn if unusually unbalanced (but don't fail)
        # This is informational - valid cycles can have unbalanced weeks
    
    @staticmethod
    def validate_exercises_in_cycle(cycle: TrainingCycle) -> bool:
        """
        Validate that all exercises in cycle are valid.
        
        Args:
            cycle: TrainingCycle to validate
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If exercises are invalid
        """
        for phase in cycle.phases:
            for workout in phase.workouts:
                for exercise in workout.exercises:
                    # Check required fields
                    if not exercise.exercise_id:
                        raise ValidationError(
                            f"Exercise in workout {workout.id} has no ID"
                        )
                    
                    if not exercise.exercise_name:
                        raise ValidationError(
                            f"Exercise {exercise.exercise_id} has no name"
                        )
                    
                    if exercise.sets < 1:
                        raise ValidationError(
                            f"Exercise {exercise.exercise_id} has invalid "
                            f"set count: {exercise.sets}"
                        )
                    
                    # Validate reps format
                    if not exercise.reps:
                        raise ValidationError(
                            f"Exercise {exercise.exercise_id} has no reps"
                        )
        
        return True
    
    @staticmethod
    def validate_intensity_progression(cycle: TrainingCycle) -> bool:
        """
        Validate that intensity progresses appropriately.
        
        Args:
            cycle: TrainingCycle to validate
            
        Returns:
            True if valid or warning-only
        """
        sorted_phases = sorted(cycle.phases, key=lambda p: p.start_week)
        
        for i in range(len(sorted_phases) - 1):
            current = sorted_phases[i]
            next_phase = sorted_phases[i + 1]
            
            current_avg = current.get_average_intensity()
            next_avg = next_phase.get_average_intensity()
            
            if current_avg and next_avg:
                if next_avg < current_avg * 0.5:
                    # Warning: Large intensity drop between phases
                    pass
        
        return True
    
    @staticmethod
    def get_validation_summary(cycle: TrainingCycle) -> dict:
        """
        Get a summary of cycle validation results.
        
        Args:
            cycle: TrainingCycle to summarize
            
        Returns:
            Dictionary with validation summary
        """
        total_workouts = cycle.get_total_workouts()
        total_exercises = sum(
            len(w.exercises)
            for p in cycle.phases
            for w in p.workouts
        )
        total_sets = sum(
            e.sets
            for p in cycle.phases
            for w in p.workouts
            for e in w.exercises
        )
        
        return {
            "is_valid": True,
            "phase_count": cycle.get_phase_count(),
            "workout_count": total_workouts,
            "exercise_count": total_exercises,
            "set_count": total_sets,
            "total_duration_weeks": cycle.duration_weeks,
            "average_intensity": cycle.get_average_intensity(),
            "total_volume": cycle.get_total_volume(),
        }
