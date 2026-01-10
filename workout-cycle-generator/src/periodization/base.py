"""
Abstract base class for periodization models.

Defines the interface and common functionality for periodization strategies.
"""

from abc import ABC, abstractmethod
from typing import List, Tuple
from ..models.cycle import TrainingCycle
from ..models.phase import TrainingPhase
from ..models.workout import Workout
from ..models.exercise import Exercise, ExercisePerformance
from ..models.enums import (
    TrainingGoal,
    FitnessLevel,
    PhaseType,
)


class AbstractPeriodizer(ABC):
    """
    Abstract base class for periodization strategies.
    
    Defines the interface that all periodization models must implement.
    """
    
    def __init__(
        self,
        goal: TrainingGoal,
        fitness_level: FitnessLevel,
        duration_weeks: int,
        workouts_per_week: int,
        exercises: List[Exercise],
    ) -> None:
        """
        Initialize periodizer with cycle parameters.
        
        Args:
            goal: Training goal
            fitness_level: Athlete's fitness level
            duration_weeks: Total cycle duration in weeks
            workouts_per_week: Number of workouts per week
            exercises: List of available exercises
        """
        self.goal = goal
        self.fitness_level = fitness_level
        self.duration_weeks = duration_weeks
        self.workouts_per_week = workouts_per_week
        self.exercises = exercises
    
    @abstractmethod
    def generate_phases(self) -> List[TrainingPhase]:
        """
        Generate training phases for the cycle.
        
        Returns:
            List of TrainingPhase objects
        """
        pass
    
    @abstractmethod
    def get_phase_types(self) -> List[PhaseType]:
        """
        Get the ordered list of phase types for this periodization.
        
        Returns:
            List of PhaseType enums
        """
        pass
    
    def _create_phase(
        self,
        phase_num: int,
        phase_type: PhaseType,
        start_week: int,
        end_week: int,
        intensity_multiplier: float,
        volume_multiplier: float,
        target_rep_range: str,
    ) -> TrainingPhase:
        """
        Create a training phase with workouts.
        
        Args:
            phase_num: Phase number
            phase_type: Type of phase
            start_week: Starting week
            end_week: Ending week
            intensity_multiplier: Intensity scaling
            volume_multiplier: Volume scaling
            target_rep_range: Target rep range
            
        Returns:
            TrainingPhase with generated workouts
        """
        phase_id = f"phase_{phase_num:02d}"
        phase = TrainingPhase(
            id=phase_id,
            name=f"{phase_type.value.title()} Phase {phase_num}",
            phase_type=phase_type,
            start_week=start_week,
            end_week=end_week,
            intensity_multiplier=intensity_multiplier,
            volume_multiplier=volume_multiplier,
            target_rep_range=target_rep_range,
        )
        
        # Generate workouts for the phase
        week_count = end_week - start_week + 1
        total_workouts = week_count * self.workouts_per_week
        
        for w_num in range(total_workouts):
            workout = self._create_workout(
                phase_num,
                w_num,
                intensity_multiplier,
            )
            phase.add_workout(workout)
        
        return phase
    
    def _create_workout(
        self,
        phase_num: int,
        workout_num: int,
        intensity_multiplier: float,
    ) -> Workout:
        """
        Create a single workout.
        
        Args:
            phase_num: Phase number
            workout_num: Workout number within phase
            intensity_multiplier: Intensity scaling
            
        Returns:
            Workout object with exercises
        """
        workout_id = f"workout_p{phase_num:02d}_w{workout_num:02d}"
        workout = Workout(
            id=workout_id,
            name=f"Workout {workout_num + 1}",
            date=f"week_{(workout_num // self.workouts_per_week) + 1}_day_{(workout_num % self.workouts_per_week) + 1}",
            duration_minutes=60,
            intensity_level=max(1, min(10, int(5 * intensity_multiplier))),
        )
        
        # Add exercises to workout
        num_exercises = min(5, len(self.exercises))
        for i in range(num_exercises):
            ex = self.exercises[i % len(self.exercises)]
            performance = ExercisePerformance(
                exercise_id=ex.id,
                exercise_name=ex.name,
                sets=3,
                reps="8-10",
                weight=100.0 * intensity_multiplier,
            )
            workout.add_exercise(performance)
        
        return workout
    
    def _get_intensity_for_rep_range(self, rep_range: str) -> Tuple[int, int]:
        """
        Get intensity percentage range for a rep range.
        
        Args:
            rep_range: Rep range string (e.g., "6-8")
            
        Returns:
            Tuple of (min_intensity, max_intensity) percentages
        """
        rep_ranges = {
            "3-5": (85, 95),
            "6-8": (75, 85),
            "8-10": (70, 80),
            "10-12": (65, 75),
            "12-15": (60, 70),
            "15-20": (50, 65),
        }
        return rep_ranges.get(rep_range, (70, 80))
    
    def get_description(self) -> str:
        """
        Get description of this periodization strategy.
        
        Returns:
            Description string
        """
        return f"{self.__class__.__name__} periodization"
