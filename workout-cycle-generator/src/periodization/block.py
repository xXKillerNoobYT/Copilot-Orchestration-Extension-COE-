"""
Block periodization model.

Implements block periodization: distinct training blocks focused on
specific adaptations (accumulation, intensification, realization).
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


class BlockPeriodizer(AbstractPeriodizer):
    """
    Block periodization strategy.
    
    Divides training into distinct blocks, each focusing on specific
    adaptations:
    
    - Accumulation Block: High volume, moderate intensity (muscle growth)
    - Intensification Block: Moderate volume, high intensity (strength)
    - Realization Block: Low volume, very high intensity (peaking)
    - Deload Block: Recovery and adaptation consolidation
    
    This approach allows athletes to develop specific qualities in each
    block while previous adaptations are maintained.
    """
    
    def __init__(
        self,
        goal: TrainingGoal,
        fitness_level: FitnessLevel,
        duration_weeks: int,
        workouts_per_week: int,
        exercises: List[Exercise],
    ) -> None:
        """Initialize block periodizer."""
        super().__init__(
            goal,
            fitness_level,
            duration_weeks,
            workouts_per_week,
            exercises,
        )
    
    def get_phase_types(self) -> List[PhaseType]:
        """
        Get phase types for block periodization.
        
        Returns:
            Ordered list of block types
        """
        return [
            PhaseType.HYPERTROPHY,  # Accumulation
            PhaseType.STRENGTH,      # Intensification
            PhaseType.POWER,         # Realization
            PhaseType.DELOAD,        # Deload/Recovery
        ]
    
    def generate_phases(self) -> List[TrainingPhase]:
        """
        Generate phases using block periodization.
        
        Divides cycle into accumulation, intensification, realization,
        and deload blocks. Deload blocks are typically shorter (1 week)
        and appear every 2-3 weeks.
        
        Returns:
            List of TrainingPhase objects
        """
        phases = []
        
        # Block structure definition
        blocks = [
            {
                "type": PhaseType.HYPERTROPHY,  # Accumulation
                "duration_ratio": 0.35,
                "intensity": 0.70,
                "volume": 1.0,
                "reps": "8-12",
                "description": "Accumulation Block",
            },
            {
                "type": PhaseType.STRENGTH,      # Intensification
                "duration_ratio": 0.35,
                "intensity": 0.85,
                "volume": 0.75,
                "reps": "4-6",
                "description": "Intensification Block",
            },
            {
                "type": PhaseType.POWER,         # Realization
                "duration_ratio": 0.25,
                "intensity": 0.92,
                "volume": 0.50,
                "reps": "2-4",
                "description": "Realization Block",
            },
        ]
        
        # Add deload block (1 week every 8-9 weeks)
        total_weeks = sum(
            int(self.duration_weeks * b["duration_ratio"])
            for b in blocks
        )
        
        current_week = 1
        block_num = 0
        deload_count = 0
        
        for block in blocks:
            block_weeks = max(
                1,
                int(self.duration_weeks * block["duration_ratio"]),
            )
            
            # Add deload every 3 blocks or at cycle end
            if current_week + block_weeks < self.duration_weeks:
                block_weeks -= 1  # Reserve 1 week for deload
            
            block_num += 1
            phase = self._create_phase(
                phase_num=block_num,
                phase_type=block["type"],
                start_week=current_week,
                end_week=current_week + block_weeks - 1,
                intensity_multiplier=block["intensity"],
                volume_multiplier=block["volume"],
                target_rep_range=block["reps"],
            )
            phase.description = block["description"]
            phases.append(phase)
            
            current_week += block_weeks
            
            # Add deload block if not at end
            if current_week <= self.duration_weeks:
                deload_count += 1
                deload_end = min(current_week, self.duration_weeks)
                
                deload_phase = self._create_phase(
                    phase_num=block_num + 1,
                    phase_type=PhaseType.DELOAD,
                    start_week=current_week,
                    end_week=deload_end,
                    intensity_multiplier=0.50,
                    volume_multiplier=0.50,
                    target_rep_range="10-15",
                )
                deload_phase.description = "Deload/Recovery Block"
                phases.append(deload_phase)
                
                current_week = deload_end + 1
                block_num += 1
        
        return phases
    
    def get_description(self) -> str:
        """
        Get description of block periodization.
        
        Returns:
            Description string
        """
        return (
            "Block Periodization: Distinct training blocks focusing on "
            "specific adaptations. Follows pattern: Accumulation "
            "(high volume) → Intensification (high intensity) → "
            "Realization (peaking) → Deload (recovery)"
        )
