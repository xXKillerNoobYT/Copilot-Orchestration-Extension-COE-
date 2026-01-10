"""
Training phase data model for the workout cycle generator.

Defines the TrainingPhase dataclass that represents a phase within a cycle.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Any, Dict
from .workout import Workout
from .enums import PhaseType


@dataclass
class TrainingPhase:
    """
    Represents a training phase within a cycle.
    
    A phase is a distinct training block with specific focus and structure.
    
    Attributes:
        id: Unique identifier for the phase
        name: Name of the phase
        phase_type: Type of training phase
        start_week: Starting week number in the cycle
        end_week: Ending week number in the cycle
        description: Description of the phase focus
        target_rep_range: Target repetition range (e.g., "6-8")
        intensity_multiplier: Intensity multiplier relative to baseline (1.0)
        volume_multiplier: Volume multiplier relative to baseline (1.0)
        workouts: List of Workout objects in the phase
        notes: Additional notes about the phase
    """
    
    id: str
    name: str
    phase_type: PhaseType
    start_week: int
    end_week: int
    workouts: list[Workout] = field(default_factory=list)
    description: str = ""
    target_rep_range: str = "6-8"
    intensity_multiplier: float = 1.0
    volume_multiplier: float = 1.0
    notes: str = ""
    
    def __post_init__(self) -> None:
        """Validate phase data after initialization."""
        if not isinstance(self.phase_type, PhaseType):
            self.phase_type = PhaseType(self.phase_type)
        
        if self.start_week < 1:
            raise ValueError(
                f"Start week must be at least 1, got {self.start_week}"
            )
        
        if self.end_week < self.start_week:
            raise ValueError(
                f"End week ({self.end_week}) must be >= "
                f"start week ({self.start_week})"
            )
        
        if self.intensity_multiplier <= 0:
            raise ValueError(
                f"Intensity multiplier must be > 0, "
                f"got {self.intensity_multiplier}"
            )
        
        if self.volume_multiplier <= 0:
            raise ValueError(
                f"Volume multiplier must be > 0, "
                f"got {self.volume_multiplier}"
            )
    
    @property
    def week_count(self) -> int:
        """Get number of weeks in this phase."""
        return self.end_week - self.start_week + 1
    
    def add_workout(self, workout: Workout) -> None:
        """
        Add a workout to the phase.
        
        Args:
            workout: Workout to add
        """
        self.workouts.append(workout)
    
    def get_workout_count(self) -> int:
        """
        Get total number of workouts in the phase.
        
        Returns:
            Number of workouts
        """
        return len(self.workouts)
    
    def get_total_volume(self) -> float:
        """
        Calculate total phase volume.
        
        Returns:
            Sum of all workout volumes
        """
        return sum(w.get_total_volume() for w in self.workouts)
    
    def get_average_intensity(self) -> Optional[float]:
        """
        Calculate average intensity across all workouts.
        
        Returns:
            Average intensity or None if no workouts
        """
        if not self.workouts:
            return None
        
        total_intensity = sum(w.intensity_level for w in self.workouts)
        return total_intensity / len(self.workouts)
    
    def get_total_duration_minutes(self) -> int:
        """
        Get total duration of all workouts in the phase.
        
        Returns:
            Total duration in minutes
        """
        return sum(w.duration_minutes for w in self.workouts)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert phase to dictionary representation.
        
        Returns:
            Dictionary with all phase attributes
        """
        data = asdict(self)
        data['phase_type'] = self.phase_type.value
        data['workouts'] = [w.to_dict() for w in self.workouts]
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TrainingPhase":
        """
        Create TrainingPhase instance from dictionary.
        
        Args:
            data: Dictionary with phase data
            
        Returns:
            TrainingPhase instance
        """
        data_copy = data.copy()
        
        # Convert phase_type
        if isinstance(data_copy.get('phase_type'), str):
            data_copy['phase_type'] = PhaseType(data_copy['phase_type'])
        
        # Convert workouts
        if 'workouts' in data_copy:
            data_copy['workouts'] = [
                Workout.from_dict(w)
                if isinstance(w, dict)
                else w
                for w in data_copy['workouts']
            ]
        
        return cls(**data_copy)
