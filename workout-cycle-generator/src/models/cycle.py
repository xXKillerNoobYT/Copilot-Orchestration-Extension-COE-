"""
Training cycle data model for the workout cycle generator.

Defines the TrainingCycle dataclass that represents a complete training cycle.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Any, Dict
from datetime import datetime
from .phase import TrainingPhase
from .enums import TrainingGoal, FitnessLevel, Periodization


@dataclass
class TrainingCycle:
    """
    Represents a complete training cycle.
    
    A cycle is the top-level organizational unit containing multiple phases.
    
    Attributes:
        id: Unique identifier for the cycle
        name: Name of the cycle
        goal: Primary training goal
        fitness_level: Athlete's fitness level
        periodization: Periodization model used
        duration_weeks: Total duration in weeks
        start_date: Start date of the cycle
        phases: List of TrainingPhase objects
        baseline_intensity: Baseline intensity (1-10) for scaling
        baseline_volume: Baseline volume for scaling
        notes: Additional notes about the cycle
        created_at: Timestamp when cycle was created
        updated_at: Timestamp of last update
    """
    
    id: str
    name: str
    goal: TrainingGoal
    fitness_level: FitnessLevel
    periodization: Periodization
    duration_weeks: int
    start_date: str
    phases: list[TrainingPhase] = field(default_factory=list)
    baseline_intensity: int = 5
    baseline_volume: float = 1000.0
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def __post_init__(self) -> None:
        """Validate cycle data after initialization."""
        if not isinstance(self.goal, TrainingGoal):
            self.goal = TrainingGoal(self.goal)
        
        if not isinstance(self.fitness_level, FitnessLevel):
            self.fitness_level = FitnessLevel(self.fitness_level)
        
        if not isinstance(self.periodization, Periodization):
            self.periodization = Periodization(self.periodization)
        
        if self.duration_weeks < 1:
            raise ValueError(
                f"Duration must be at least 1 week, "
                f"got {self.duration_weeks}"
            )
        
        if not 1 <= self.baseline_intensity <= 10:
            raise ValueError(
                f"Baseline intensity must be 1-10, "
                f"got {self.baseline_intensity}"
            )
        
        if self.baseline_volume <= 0:
            raise ValueError(
                f"Baseline volume must be > 0, "
                f"got {self.baseline_volume}"
            )
    
    def add_phase(self, phase: TrainingPhase) -> None:
        """
        Add a training phase to the cycle.
        
        Args:
            phase: TrainingPhase to add
        """
        self.phases.append(phase)
        self.updated_at = datetime.utcnow().isoformat()
    
    def validate_phases(self) -> bool:
        """
        Validate that phases properly cover the cycle duration.
        
        Checks that:
        - Phases don't overlap
        - All weeks are covered (no gaps)
        - Phases are in chronological order
        
        Returns:
            True if valid, False otherwise
            
        Raises:
            ValueError: If phases are invalid
        """
        if not self.phases:
            return True
        
        # Sort phases by start week
        sorted_phases = sorted(self.phases, key=lambda p: p.start_week)
        
        # Check first phase starts at week 1
        if sorted_phases[0].start_week != 1:
            raise ValueError(
                f"First phase must start at week 1, "
                f"got week {sorted_phases[0].start_week}"
            )
        
        # Check for overlaps and gaps
        for i, phase in enumerate(sorted_phases[:-1]):
            next_phase = sorted_phases[i + 1]
            if phase.end_week >= next_phase.start_week:
                raise ValueError(
                    f"Phases overlap: phase ends at week {phase.end_week}, "
                    f"next starts at week {next_phase.start_week}"
                )
        
        # Check last phase ends at the cycle duration
        if sorted_phases[-1].end_week != self.duration_weeks:
            raise ValueError(
                f"Last phase must end at week {self.duration_weeks}, "
                f"got week {sorted_phases[-1].end_week}"
            )
        
        return True
    
    def get_phase_count(self) -> int:
        """Get number of phases in the cycle."""
        return len(self.phases)
    
    def get_total_workouts(self) -> int:
        """Get total number of workouts across all phases."""
        return sum(p.get_workout_count() for p in self.phases)
    
    def get_total_volume(self) -> float:
        """Get total volume across the entire cycle."""
        return sum(p.get_total_volume() for p in self.phases)
    
    def get_average_intensity(self) -> Optional[float]:
        """
        Get average intensity across all phases.
        
        Returns:
            Average intensity or None if no phases
        """
        if not self.phases:
            return None
        
        phase_intensities = [
            p.get_average_intensity() for p in self.phases
            if p.get_average_intensity() is not None
        ]
        
        if not phase_intensities:
            return None
        
        return sum(phase_intensities) / len(phase_intensities)
    
    def get_phase_by_week(self, week: int) -> Optional[TrainingPhase]:
        """
        Get the phase that contains a specific week.
        
        Args:
            week: Week number (1-indexed)
            
        Returns:
            TrainingPhase or None if week not in any phase
        """
        for phase in self.phases:
            if phase.start_week <= week <= phase.end_week:
                return phase
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert cycle to dictionary representation.
        
        Returns:
            Dictionary with all cycle attributes
        """
        data = asdict(self)
        data['goal'] = self.goal.value
        data['fitness_level'] = self.fitness_level.value
        data['periodization'] = self.periodization.value
        data['phases'] = [p.to_dict() for p in self.phases]
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TrainingCycle":
        """
        Create TrainingCycle instance from dictionary.
        
        Args:
            data: Dictionary with cycle data
            
        Returns:
            TrainingCycle instance
        """
        data_copy = data.copy()
        
        # Convert enums
        if isinstance(data_copy.get('goal'), str):
            data_copy['goal'] = TrainingGoal(data_copy['goal'])
        
        if isinstance(data_copy.get('fitness_level'), str):
            data_copy['fitness_level'] = FitnessLevel(
                data_copy['fitness_level']
            )
        
        if isinstance(data_copy.get('periodization'), str):
            data_copy['periodization'] = Periodization(
                data_copy['periodization']
            )
        
        # Convert phases
        if 'phases' in data_copy:
            data_copy['phases'] = [
                TrainingPhase.from_dict(p)
                if isinstance(p, dict)
                else p
                for p in data_copy['phases']
            ]
        
        return cls(**data_copy)
