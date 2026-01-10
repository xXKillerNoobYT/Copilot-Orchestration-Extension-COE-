"""
Workout data model for the workout cycle generator.

Defines the Workout dataclass that represents a single training session.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Any, Dict
from datetime import datetime
from .exercise import ExercisePerformance
from .enums import WorkoutStatus


@dataclass
class Workout:
    """
    Represents a single workout/training session.
    
    Attributes:
        id: Unique identifier for the workout
        name: Name of the workout
        description: Description of the workout focus
        date: Date the workout is scheduled/performed
        duration_minutes: Expected or actual duration in minutes
        exercises: List of ExercisePerformance objects
        status: Current status of the workout
        intensity_level: Intensity level (1-10)
        notes: Additional notes about the workout
    """
    
    id: str
    name: str
    date: str
    exercises: list[ExercisePerformance] = field(default_factory=list)
    description: str = ""
    duration_minutes: int = 60
    status: WorkoutStatus = WorkoutStatus.PLANNED
    intensity_level: int = 5
    notes: str = ""
    
    def __post_init__(self) -> None:
        """Validate workout data after initialization."""
        if not isinstance(self.status, WorkoutStatus):
            self.status = WorkoutStatus(self.status)
        
        if not 1 <= self.intensity_level <= 10:
            raise ValueError(
                f"Intensity level must be between 1-10, "
                f"got {self.intensity_level}"
            )
        
        if self.duration_minutes < 1:
            raise ValueError(
                f"Duration must be at least 1 minute, "
                f"got {self.duration_minutes}"
            )
    
    def add_exercise(self, exercise: ExercisePerformance) -> None:
        """
        Add an exercise to the workout.
        
        Args:
            exercise: ExercisePerformance to add
        """
        self.exercises.append(exercise)
    
    def remove_exercise(self, exercise_id: str) -> bool:
        """
        Remove an exercise from the workout by ID.
        
        Args:
            exercise_id: ID of the exercise to remove
            
        Returns:
            True if exercise was removed, False if not found
        """
        original_length = len(self.exercises)
        self.exercises = [
            e for e in self.exercises if e.exercise_id != exercise_id
        ]
        return len(self.exercises) < original_length
    
    def get_exercise_count(self) -> int:
        """
        Get total number of exercises in the workout.
        
        Returns:
            Number of exercises
        """
        return len(self.exercises)
    
    def get_total_volume(self) -> float:
        """
        Calculate total workout volume.
        
        Returns:
            Sum of all exercise volumes
        """
        return sum(e.calculate_volume() for e in self.exercises)
    
    def get_total_sets(self) -> int:
        """
        Get total number of sets in the workout.
        
        Returns:
            Sum of all sets across all exercises
        """
        return sum(e.sets for e in self.exercises)
    
    def get_average_rpe(self) -> Optional[float]:
        """
        Calculate average RPE across all exercises.
        
        Returns:
            Average RPE or None if no exercises have RPE recorded
        """
        exercises_with_rpe = [
            e for e in self.exercises if e.rpe is not None
        ]
        if not exercises_with_rpe:
            return None
        
        total_rpe = sum(e.rpe for e in exercises_with_rpe)
        return total_rpe / len(exercises_with_rpe)
    
    def mark_completed(self) -> None:
        """Mark the workout as completed."""
        self.status = WorkoutStatus.COMPLETED
    
    def mark_in_progress(self) -> None:
        """Mark the workout as in progress."""
        self.status = WorkoutStatus.IN_PROGRESS
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert workout to dictionary representation.
        
        Returns:
            Dictionary with all workout attributes
        """
        data = asdict(self)
        data['status'] = self.status.value
        data['exercises'] = [e.to_dict() for e in self.exercises]
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Workout":
        """
        Create Workout instance from dictionary.
        
        Args:
            data: Dictionary with workout data
            
        Returns:
            Workout instance
        """
        data_copy = data.copy()
        
        # Convert status
        if isinstance(data_copy.get('status'), str):
            data_copy['status'] = WorkoutStatus(data_copy['status'])
        
        # Convert exercises
        if 'exercises' in data_copy:
            data_copy['exercises'] = [
                ExercisePerformance.from_dict(e)
                if isinstance(e, dict)
                else e
                for e in data_copy['exercises']
            ]
        
        return cls(**data_copy)
