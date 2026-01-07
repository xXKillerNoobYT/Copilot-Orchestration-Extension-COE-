"""
Phase builder for constructing training phases.

Handles the creation and configuration of training phases.
"""

from typing import List, Optional
from ..models.phase import TrainingPhase
from ..models.workout import Workout
from ..models.enums import PhaseType
from ..exceptions.custom import PhaseValidationError


class PhaseBuilder:
    """
    Builder for constructing TrainingPhase objects.
    
    Provides fluent interface for creating and configuring phases.
    """
    
    def __init__(
        self,
        phase_id: str,
        name: str,
        phase_type: PhaseType,
        start_week: int,
        end_week: int,
    ) -> None:
        """
        Initialize phase builder.
        
        Args:
            phase_id: Unique phase identifier
            name: Phase name
            phase_type: Type of training phase
            start_week: Starting week number
            end_week: Ending week number
        """
        self.phase = TrainingPhase(
            id=phase_id,
            name=name,
            phase_type=phase_type,
            start_week=start_week,
            end_week=end_week,
        )
    
    def with_description(self, description: str) -> "PhaseBuilder":
        """
        Set phase description.
        
        Args:
            description: Description text
            
        Returns:
            Self for chaining
        """
        self.phase.description = description
        return self
    
    def with_rep_range(self, rep_range: str) -> "PhaseBuilder":
        """
        Set target rep range.
        
        Args:
            rep_range: Rep range string (e.g., "6-8")
            
        Returns:
            Self for chaining
        """
        if '-' not in rep_range:
            raise ValueError(
                f"Rep range must be in format 'X-Y', got {rep_range}"
            )
        self.phase.target_rep_range = rep_range
        return self
    
    def with_intensity_multiplier(
        self,
        multiplier: float,
    ) -> "PhaseBuilder":
        """
        Set intensity multiplier.
        
        Args:
            multiplier: Intensity scaling factor
            
        Returns:
            Self for chaining
        """
        if multiplier <= 0:
            raise ValueError(
                f"Intensity multiplier must be > 0, got {multiplier}"
            )
        self.phase.intensity_multiplier = multiplier
        return self
    
    def with_volume_multiplier(
        self,
        multiplier: float,
    ) -> "PhaseBuilder":
        """
        Set volume multiplier.
        
        Args:
            multiplier: Volume scaling factor
            
        Returns:
            Self for chaining
        """
        if multiplier <= 0:
            raise ValueError(
                f"Volume multiplier must be > 0, got {multiplier}"
            )
        self.phase.volume_multiplier = multiplier
        return self
    
    def with_multipliers(
        self,
        intensity: float,
        volume: float,
    ) -> "PhaseBuilder":
        """
        Set both intensity and volume multipliers.
        
        Args:
            intensity: Intensity scaling factor
            volume: Volume scaling factor
            
        Returns:
            Self for chaining
        """
        self.with_intensity_multiplier(intensity)
        self.with_volume_multiplier(volume)
        return self
    
    def add_workout(self, workout: Workout) -> "PhaseBuilder":
        """
        Add a workout to the phase.
        
        Args:
            workout: Workout object
            
        Returns:
            Self for chaining
        """
        self.phase.add_workout(workout)
        return self
    
    def add_workouts(self, workouts: List[Workout]) -> "PhaseBuilder":
        """
        Add multiple workouts to the phase.
        
        Args:
            workouts: List of Workout objects
            
        Returns:
            Self for chaining
        """
        for workout in workouts:
            self.phase.add_workout(workout)
        return self
    
    def with_notes(self, notes: str) -> "PhaseBuilder":
        """
        Add notes to the phase.
        
        Args:
            notes: Notes text
            
        Returns:
            Self for chaining
        """
        self.phase.notes = notes
        return self
    
    def validate(self) -> bool:
        """
        Validate the phase before building.
        
        Returns:
            True if valid
            
        Raises:
            PhaseValidationError: If phase is invalid
        """
        if not self.phase.id:
            raise PhaseValidationError("Phase must have an ID")
        
        if not self.phase.name:
            raise PhaseValidationError("Phase must have a name")
        
        if self.phase.start_week < 1:
            raise PhaseValidationError(
                "Start week must be at least 1"
            )
        
        if self.phase.end_week < self.phase.start_week:
            raise PhaseValidationError(
                "End week must be >= start week"
            )
        
        if self.phase.intensity_multiplier <= 0:
            raise PhaseValidationError(
                "Intensity multiplier must be > 0"
            )
        
        if self.phase.volume_multiplier <= 0:
            raise PhaseValidationError(
                "Volume multiplier must be > 0"
            )
        
        if not self.phase.workouts:
            raise PhaseValidationError(
                "Phase must contain at least one workout"
            )
        
        return True
    
    def build(self) -> TrainingPhase:
        """
        Build and return the configured TrainingPhase.
        
        Returns:
            Configured TrainingPhase object
            
        Raises:
            PhaseValidationError: If validation fails
        """
        self.validate()
        return self.phase
