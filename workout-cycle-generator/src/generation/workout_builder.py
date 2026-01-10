"""
Workout builder for constructing individual workouts.

Handles the creation and configuration of individual workout sessions.
"""

from typing import List, Optional
from ..models.workout import Workout
from ..models.exercise import Exercise, ExercisePerformance
from ..models.enums import WorkoutStatus
from ..exceptions.custom import WorkoutStructureError
from ..utils.calculators import (
    calculate_working_weight,
    get_intensity_percentage_from_rpe,
)


class WorkoutBuilder:
    """
    Builder for constructing Workout objects.
    
    Provides fluent interface for creating and configuring workouts.
    """
    
    def __init__(self, workout_id: str, name: str, date: str) -> None:
        """
        Initialize workout builder.
        
        Args:
            workout_id: Unique workout identifier
            name: Workout name/title
            date: Date of the workout
        """
        self.workout = Workout(
            id=workout_id,
            name=name,
            date=date,
        )
    
    def with_description(self, description: str) -> "WorkoutBuilder":
        """
        Set workout description.
        
        Args:
            description: Description text
            
        Returns:
            Self for chaining
        """
        self.workout.description = description
        return self
    
    def with_duration(self, duration_minutes: int) -> "WorkoutBuilder":
        """
        Set expected duration.
        
        Args:
            duration_minutes: Duration in minutes
            
        Returns:
            Self for chaining
        """
        self.workout.duration_minutes = duration_minutes
        return self
    
    def with_intensity(self, intensity_level: int) -> "WorkoutBuilder":
        """
        Set intensity level (1-10).
        
        Args:
            intensity_level: Intensity from 1-10
            
        Returns:
            Self for chaining
        """
        if not 1 <= intensity_level <= 10:
            raise ValueError(
                f"Intensity must be 1-10, got {intensity_level}"
            )
        self.workout.intensity_level = intensity_level
        return self
    
    def add_exercise(
        self,
        exercise: Exercise,
        sets: int,
        reps: str,
        weight: Optional[float] = None,
        rpe: Optional[int] = None,
    ) -> "WorkoutBuilder":
        """
        Add an exercise to the workout.
        
        Args:
            exercise: Exercise object
            sets: Number of sets
            reps: Rep range as string (e.g., "8-10")
            weight: Weight to use (optional)
            rpe: Rate of Perceived Exertion (optional)
            
        Returns:
            Self for chaining
        """
        if sets < 1:
            raise ValueError(f"Sets must be at least 1, got {sets}")
        
        performance = ExercisePerformance(
            exercise_id=exercise.id,
            exercise_name=exercise.name,
            sets=sets,
            reps=reps,
            weight=weight,
            rpe=rpe,
        )
        
        self.workout.add_exercise(performance)
        return self
    
    def add_exercises(
        self,
        exercises: List[Exercise],
        sets_per_exercise: int = 3,
        rep_range: str = "8-10",
        weight_per_exercise: Optional[List[float]] = None,
    ) -> "WorkoutBuilder":
        """
        Add multiple exercises to workout.
        
        Args:
            exercises: List of Exercise objects
            sets_per_exercise: Sets per exercise
            rep_range: Rep range for all exercises
            weight_per_exercise: Optional weight per exercise
            
        Returns:
            Self for chaining
        """
        weights = (
            weight_per_exercise if weight_per_exercise
            else [100.0] * len(exercises)
        )
        
        for i, exercise in enumerate(exercises):
            weight = weights[i] if i < len(weights) else 100.0
            self.add_exercise(
                exercise,
                sets=sets_per_exercise,
                reps=rep_range,
                weight=weight,
            )
        
        return self
    
    def with_status(self, status: WorkoutStatus) -> "WorkoutBuilder":
        """
        Set workout status.
        
        Args:
            status: WorkoutStatus enum
            
        Returns:
            Self for chaining
        """
        self.workout.status = status
        return self
    
    def with_notes(self, notes: str) -> "WorkoutBuilder":
        """
        Add notes to the workout.
        
        Args:
            notes: Notes text
            
        Returns:
            Self for chaining
        """
        self.workout.notes = notes
        return self
    
    def validate(self) -> bool:
        """
        Validate the workout before building.
        
        Returns:
            True if valid
            
        Raises:
            WorkoutStructureError: If workout is invalid
        """
        if not self.workout.id:
            raise WorkoutStructureError("Workout must have an ID")
        
        if not self.workout.name:
            raise WorkoutStructureError("Workout must have a name")
        
        if not self.workout.exercises:
            raise WorkoutStructureError(
                "Workout must contain at least one exercise"
            )
        
        if self.workout.duration_minutes < 1:
            raise WorkoutStructureError(
                "Workout duration must be at least 1 minute"
            )
        
        return True
    
    def build(self) -> Workout:
        """
        Build and return the configured Workout.
        
        Returns:
            Configured Workout object
            
        Raises:
            WorkoutStructureError: If validation fails
        """
        self.validate()
        return self.workout
