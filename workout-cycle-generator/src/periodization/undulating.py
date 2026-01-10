"""
Undulating (Daily/Weekly) periodization model.

Implements undulating periodization: variation of intensity and volume
throughout the week, typically cycling through different rep ranges.
"""

from typing import List
from .base import AbstractPeriodizer
from ..models.phase import TrainingPhase
from ..models.workout import Workout
from ..models.exercise import ExercisePerformance
from ..models.enums import (
    TrainingGoal,
    FitnessLevel,
    PhaseType,
)
from ..models.exercise import Exercise


class UndulatingPeriodizer(AbstractPeriodizer):
    """
    Undulating (Daily/Weekly) periodization strategy.
    
    Varies intensity and volume throughout the week, typically cycling
    through different rep ranges (e.g., low rep strength, moderate rep
    hypertrophy, high rep endurance within each week).
    
    This approach prevents adaptation plateaus and allows recovery.
    
    Typical weekly pattern:
    - Day 1: Strength (3-5 reps, high intensity)
    - Day 2: Hypertrophy (8-10 reps, moderate intensity)
    - Day 3: Endurance (12-15 reps, lower intensity)
    """
    
    def __init__(
        self,
        goal: TrainingGoal,
        fitness_level: FitnessLevel,
        duration_weeks: int,
        workouts_per_week: int,
        exercises: List[Exercise],
    ) -> None:
        """Initialize undulating periodizer."""
        super().__init__(
            goal,
            fitness_level,
            duration_weeks,
            workouts_per_week,
            exercises,
        )
    
    def get_phase_types(self) -> List[PhaseType]:
        """
        Get phase type for undulating periodization.
        
        Returns:
            Single phase type (PREPARATION covers entire cycle)
        """
        return [PhaseType.PREPARATION]
    
    def generate_phases(self) -> List[TrainingPhase]:
        """
        Generate phases using undulating periodization.

        Creates a single preparation phase that covers entire cycle
        with daily/weekly variation.

        Returns:
            List containing single TrainingPhase
        """
        phase = self._create_undulating_phase()
        return [phase]
    
    def _create_undulating_phase(self) -> TrainingPhase:
        """
        Create the undulating phase with varying workouts.
        
        Returns:
            TrainingPhase with undulating structure
        """
        phase = TrainingPhase(
            id="phase_01",
            name="Undulating Training Block",
            phase_type=PhaseType.PREPARATION,
            start_week=1,
            end_week=self.duration_weeks,
            intensity_multiplier=1.0,
            volume_multiplier=1.0,
            target_rep_range="Varies (3-15)",
            description="Undulating periodization with daily variation",
        )
        
        # Create workouts with daily undulation
        for week in range(1, self.duration_weeks + 1):
            for day in range(self.workouts_per_week):
                # Determine workout type based on day
                workout_type = day % 3  # Cycles through 3 types
                
                if workout_type == 0:
                    # Strength Day (Low reps, high intensity)
                    workout = self._create_strength_workout(
                        week, day, intensity=0.90
                    )
                elif workout_type == 1:
                    # Hypertrophy Day (Moderate reps, moderate intensity)
                    workout = self._create_hypertrophy_workout(
                        week, day, intensity=0.75
                    )
                else:
                    # Endurance Day (High reps, lower intensity)
                    workout = self._create_endurance_workout(
                        week, day, intensity=0.60
                    )
                
                phase.add_workout(workout)
        
        return phase
    
    def _create_strength_workout(
        self,
        week: int,
        day: int,
        intensity: float,
    ) -> Workout:
        """
        Create a strength-focused workout.
        
        Args:
            week: Week number
            day: Day number within week
            intensity: Intensity multiplier
            
        Returns:
            Strength-focused Workout
        """
        workout_id = f"workout_w{week:02d}_d{day}_strength"
        workout = Workout(
            id=workout_id,
            name=f"Strength Day (Week {week}, Day {day + 1})",
            date=f"week_{week}_day_{day + 1}",
            duration_minutes=75,
            intensity_level=9,
            description="Heavy strength work, low reps",
        )
        
        # Strength workouts: 3-5 reps, 3-5 sets
        num_exercises = min(4, len(self.exercises))
        for i in range(num_exercises):
            ex = self.exercises[i % len(self.exercises)]
            performance = ExercisePerformance(
                exercise_id=ex.id,
                exercise_name=ex.name,
                sets=4,
                reps="3-5",
                weight=150.0 * intensity,
            )
            workout.add_exercise(performance)
        
        return workout
    
    def _create_hypertrophy_workout(
        self,
        week: int,
        day: int,
        intensity: float,
    ) -> Workout:
        """
        Create a hypertrophy-focused workout.
        
        Args:
            week: Week number
            day: Day number within week
            intensity: Intensity multiplier
            
        Returns:
            Hypertrophy-focused Workout
        """
        workout_id = f"workout_w{week:02d}_d{day}_hypertrophy"
        workout = Workout(
            id=workout_id,
            name=f"Hypertrophy Day (Week {week}, Day {day + 1})",
            date=f"week_{week}_day_{day + 1}",
            duration_minutes=60,
            intensity_level=7,
            description="Muscle growth focus, moderate reps",
        )
        
        # Hypertrophy workouts: 8-10 reps, 3-4 sets
        num_exercises = min(5, len(self.exercises))
        for i in range(num_exercises):
            ex = self.exercises[i % len(self.exercises)]
            performance = ExercisePerformance(
                exercise_id=ex.id,
                exercise_name=ex.name,
                sets=3,
                reps="8-10",
                weight=100.0 * intensity,
            )
            workout.add_exercise(performance)
        
        return workout
    
    def _create_endurance_workout(
        self,
        week: int,
        day: int,
        intensity: float,
    ) -> Workout:
        """
        Create an endurance-focused workout.
        
        Args:
            week: Week number
            day: Day number within week
            intensity: Intensity multiplier
            
        Returns:
            Endurance-focused Workout
        """
        workout_id = f"workout_w{week:02d}_d{day}_endurance"
        workout = Workout(
            id=workout_id,
            name=f"Endurance Day (Week {week}, Day {day + 1})",
            date=f"week_{week}_day_{day + 1}",
            duration_minutes=45,
            intensity_level=5,
            description="Higher reps, lower intensity, conditioning",
        )
        
        # Endurance workouts: 12-15 reps, 2-3 sets
        num_exercises = min(5, len(self.exercises))
        for i in range(num_exercises):
            ex = self.exercises[i % len(self.exercises)]
            performance = ExercisePerformance(
                exercise_id=ex.id,
                exercise_name=ex.name,
                sets=3,
                reps="12-15",
                weight=70.0 * intensity,
            )
            workout.add_exercise(performance)
        
        return workout
    
    def get_description(self) -> str:
        """
        Get description of undulating periodization.
        
        Returns:
            Description string
        """
        return (
            "Undulating Periodization: Daily/weekly variation of intensity "
            "and volume. Cycles through strength, hypertrophy, and "
            "endurance days to prevent adaptation plateaus."
        )
