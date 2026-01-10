"""
Linear periodization model.

Implements linear periodization: progressive increase in intensity,
decrease in volume over the cycle.
"""

from typing import List
from .base import AbstractPeriodizer
from ..models.phase import TrainingPhase
from ..models.enums import (
    TrainingGoal,
    FitnessLevel,
    PhaseType,
)
from ..models.exercise import Exercise


class LinearPeriodizer(AbstractPeriodizer):
    """
    Linear periodization strategy.
    
    Progressively increases intensity while decreasing volume throughout
    the training cycle. Best for strength-focused training.
    
    Typical progression:
    - Phase 1 (Hypertrophy): 8-12 reps, 65-75% intensity
    - Phase 2 (Strength): 6-8 reps, 80-85% intensity
    - Phase 3 (Power): 3-5 reps, 85-95% intensity
    - Phase 4 (Peaking): 1-3 reps, 90-95% intensity
    """
    
    def __init__(
        self,
        goal: TrainingGoal,
        fitness_level: FitnessLevel,
        duration_weeks: int,
        workouts_per_week: int,
        exercises: List[Exercise],
    ) -> None:
        """Initialize linear periodizer."""
        super().__init__(
            goal,
            fitness_level,
            duration_weeks,
            workouts_per_week,
            exercises,
        )
    
    def get_phase_types(self) -> List[PhaseType]:
        """
        Get phase types for linear periodization.
        
        Returns:
            Ordered list of phase types
        """
        return [
            PhaseType.HYPERTROPHY,
            PhaseType.STRENGTH,
            PhaseType.POWER,
            PhaseType.PEAKING,
        ]
    
    def generate_phases(self) -> List[TrainingPhase]:
        """
        Generate phases using linear periodization.
        
        Divides cycle into 4 phases with progressive intensity increases.
        
        Returns:
            List of TrainingPhase objects
        """
        phases = []
        
        # Calculate weeks per phase
        weeks_per_phase = self.duration_weeks // 4
        remainder = self.duration_weeks % 4
        
        phase_definitions = [
            {
                "type": PhaseType.HYPERTROPHY,
                "intensity": 0.70,
                "volume": 1.0,
                "reps": "8-12",
            },
            {
                "type": PhaseType.STRENGTH,
                "intensity": 0.82,
                "volume": 0.85,
                "reps": "6-8",
            },
            {
                "type": PhaseType.POWER,
                "intensity": 0.90,
                "volume": 0.70,
                "reps": "3-5",
            },
            {
                "type": PhaseType.PEAKING,
                "intensity": 0.95,
                "volume": 0.60,
                "reps": "1-3",
            },
        ]
        
        current_week = 1
        
        for phase_num, definition in enumerate(phase_definitions, 1):
            # Distribute remainder weeks across first phases
            phase_weeks = weeks_per_phase + (
                1 if phase_num <= remainder else 0
            )
            
            end_week = current_week + phase_weeks - 1
            
            # Ensure we don't exceed total duration
            if end_week > self.duration_weeks:
                end_week = self.duration_weeks
            
            phase = self._create_phase(
                phase_num=phase_num,
                phase_type=definition["type"],
                start_week=current_week,
                end_week=end_week,
                intensity_multiplier=definition["intensity"],
                volume_multiplier=definition["volume"],
                target_rep_range=definition["reps"],
            )
            
            phases.append(phase)
            current_week = end_week + 1
            
            # Stop if we've reached the end
            if end_week >= self.duration_weeks:
                break
        
        # Handle case where we didn't fill all weeks
        if current_week <= self.duration_weeks:
            # Add final peaking phase for remaining weeks
            phase = self._create_phase(
                phase_num=len(phases) + 1,
                phase_type=PhaseType.PEAKING,
                start_week=current_week,
                end_week=self.duration_weeks,
                intensity_multiplier=0.95,
                volume_multiplier=0.60,
                target_rep_range="1-3",
            )
            phases.append(phase)
        
        return phases
    
    def get_description(self) -> str:
        """
        Get description of linear periodization.
        
        Returns:
            Description string
        """
        return (
            "Linear Periodization: Progressive intensity increase with "
            "decreasing volume. Follows pattern: Hypertrophy → "
            "Strength → Power → Peaking"
        )
