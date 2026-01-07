"""
Exercise data models for the workout cycle generator.

Defines the Exercise and ExercisePerformance dataclasses that represent
exercises and their execution within a training session.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Any, Dict
from .enums import ExerciseModality, RestPeriod, ExerciseStatus


@dataclass
class Exercise:
    """
    Represents a single exercise in the database.
    
    Attributes:
        id: Unique identifier for the exercise
        name: Name of the exercise
        description: Description of the exercise
        modality: Type of exercise (compound, isolation, etc.)
        primary_muscle_group: Primary muscle group targeted
        secondary_muscle_groups: Secondary muscle groups targeted
        difficulty_level: Difficulty rating (1-10)
        rest_period_recommendation: Recommended rest period
        notes: Additional notes or form cues
    """
    
    id: str
    name: str
    description: str
    modality: ExerciseModality
    primary_muscle_group: str
    secondary_muscle_groups: list[str] = field(default_factory=list)
    difficulty_level: int = 5
    rest_period_recommendation: RestPeriod = RestPeriod.MODERATE
    notes: str = ""
    
    def __post_init__(self) -> None:
        """Validate exercise data after initialization."""
        if not isinstance(self.modality, ExerciseModality):
            self.modality = ExerciseModality(self.modality)
        
        if not isinstance(self.rest_period_recommendation, RestPeriod):
            self.rest_period_recommendation = RestPeriod(
                self.rest_period_recommendation
            )
        
        if not 1 <= self.difficulty_level <= 10:
            raise ValueError(
                f"Difficulty level must be between 1-10, got {self.difficulty_level}"
            )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exercise to dictionary representation.
        
        Returns:
            Dictionary with all exercise attributes
        """
        data = asdict(self)
        data['modality'] = self.modality.value
        data['rest_period_recommendation'] = (
            self.rest_period_recommendation.value
        )
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Exercise":
        """
        Create Exercise instance from dictionary.
        
        Args:
            data: Dictionary with exercise data
            
        Returns:
            Exercise instance
        """
        data_copy = data.copy()
        if isinstance(data_copy.get('modality'), str):
            data_copy['modality'] = ExerciseModality(data_copy['modality'])
        if isinstance(data_copy.get('rest_period_recommendation'), str):
            data_copy['rest_period_recommendation'] = RestPeriod(
                data_copy['rest_period_recommendation']
            )
        return cls(**data_copy)


@dataclass
class ExercisePerformance:
    """
    Represents the performance of an exercise in a workout.
    
    Attributes:
        exercise_id: Reference to the exercise
        exercise_name: Name of the exercise
        sets: Number of sets performed
        reps: Target reps per set (can be range like "6-8")
        weight: Weight used (in lbs or kg)
        rpe: Rate of Perceived Exertion (1-10)
        status: Completion status of the exercise
        notes: Notes from the workout
        timestamp: When the exercise was performed
    """
    
    exercise_id: str
    exercise_name: str
    sets: int
    reps: str
    weight: Optional[float] = None
    rpe: Optional[int] = None
    status: ExerciseStatus = ExerciseStatus.PLANNED
    notes: str = ""
    timestamp: Optional[str] = None
    
    def __post_init__(self) -> None:
        """Validate performance data after initialization."""
        if not isinstance(self.status, ExerciseStatus):
            self.status = ExerciseStatus(self.status)
        
        if self.sets < 1:
            raise ValueError(f"Sets must be at least 1, got {self.sets}")
        
        if self.rpe is not None and not (1 <= self.rpe <= 10):
            raise ValueError(
                f"RPE must be between 1-10, got {self.rpe}"
            )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert performance to dictionary representation.
        
        Returns:
            Dictionary with all performance attributes
        """
        data = asdict(self)
        data['status'] = self.status.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExercisePerformance":
        """
        Create ExercisePerformance instance from dictionary.
        
        Args:
            data: Dictionary with performance data
            
        Returns:
            ExercisePerformance instance
        """
        data_copy = data.copy()
        if isinstance(data_copy.get('status'), str):
            data_copy['status'] = ExerciseStatus(data_copy['status'])
        return cls(**data_copy)
    
    def calculate_volume(self) -> float:
        """
        Calculate total volume (sets × reps × weight).
        
        For rep ranges, uses the lower number.
        Returns 0 if weight is None.
        
        Returns:
            Total volume as float
        """
        if self.weight is None:
            return 0.0
        
        # Parse reps - handle ranges like "6-8"
        rep_count = int(self.reps.split('-')[0])
        return self.sets * rep_count * self.weight
