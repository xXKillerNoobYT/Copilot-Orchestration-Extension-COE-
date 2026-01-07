"""
Main cycle generation orchestrator.

Coordinates all components to generate complete training cycles.
"""

from typing import Optional, Union, List
from datetime import datetime
import uuid

from ..models.cycle import TrainingCycle
from ..models.enums import (
    TrainingGoal,
    FitnessLevel,
    Periodization,
)
from ..models.exercise import Exercise
from ..exceptions.custom import (
    InvalidInputError,
    CycleGenerationError,
)
from ..validation.input_validator import InputValidator
from ..validation.cycle_validator import CycleValidator
from ..exercise_db.repository import ExerciseRepository
from ..periodization.linear import LinearPeriodizer
from ..periodization.undulating import UndulatingPeriodizer
from ..periodization.block import BlockPeriodizer


class CycleGenerator:
    """
    Main orchestrator for training cycle generation.
    
    Coordinates input validation, exercise selection, periodization,
    and output validation to produce complete training cycles.
    """
    
    def __init__(self) -> None:
        """Initialize cycle generator."""
        self.exercise_repo = ExerciseRepository()
    
    def generate(
        self,
        goal: Union[TrainingGoal, str],
        fitness_level: Union[FitnessLevel, str],
        periodization: Union[Periodization, str],
        duration_weeks: int,
        workouts_per_week: int,
        cycle_name: Optional[str] = None,
        exercises: Optional[List[Exercise]] = None,
        baseline_intensity: int = 5,
        baseline_volume: float = 1000.0,
    ) -> TrainingCycle:
        """
        Generate a complete training cycle.
        
        Args:
            goal: Training goal (enum or string)
            fitness_level: Fitness level (enum or string)
            periodization: Periodization model (enum or string)
            duration_weeks: Duration in weeks
            workouts_per_week: Workouts per week
            cycle_name: Optional cycle name
            exercises: Optional list of Exercise objects
            baseline_intensity: Baseline intensity (1-10)
            baseline_volume: Baseline volume for calculations
            
        Returns:
            Generated TrainingCycle
            
        Raises:
            InvalidInputError: If parameters are invalid
            CycleGenerationError: If generation fails
        """
        try:
            # Validate input
            InputValidator.validate_cycle_params(
                goal=goal,
                fitness_level=fitness_level,
                periodization=periodization,
                duration_weeks=duration_weeks,
                workouts_per_week=workouts_per_week,
            )
            
            # Convert string enums to actual enums
            if isinstance(goal, str):
                goal = TrainingGoal(goal)
            if isinstance(fitness_level, str):
                fitness_level = FitnessLevel(fitness_level)
            if isinstance(periodization, str):
                periodization = Periodization(periodization)
            
            # Get exercises
            if exercises is None:
                exercises = self.exercise_repo.get_for_goal(goal)
            
            if not exercises:
                raise CycleGenerationError(
                    f"No exercises available for goal: {goal}"
                )
            
            # Generate cycle using appropriate periodizer
            cycle = self._generate_cycle_with_periodization(
                goal=goal,
                fitness_level=fitness_level,
                periodization=periodization,
                duration_weeks=duration_weeks,
                workouts_per_week=workouts_per_week,
                exercises=exercises,
                baseline_intensity=baseline_intensity,
                baseline_volume=baseline_volume,
                cycle_name=cycle_name,
            )
            
            # Validate generated cycle
            CycleValidator.validate_cycle(cycle)
            
            return cycle
            
        except (InvalidInputError, CycleGenerationError):
            raise
        except Exception as e:
            raise CycleGenerationError(
                f"Cycle generation failed: {str(e)}"
            ) from e
    
    def _generate_cycle_with_periodization(
        self,
        goal: TrainingGoal,
        fitness_level: FitnessLevel,
        periodization: Periodization,
        duration_weeks: int,
        workouts_per_week: int,
        exercises: List[Exercise],
        baseline_intensity: int,
        baseline_volume: float,
        cycle_name: Optional[str],
    ) -> TrainingCycle:
        """
        Generate cycle using specified periodization model.
        
        Args:
            goal: Training goal
            fitness_level: Fitness level
            periodization: Periodization model
            duration_weeks: Duration in weeks
            workouts_per_week: Workouts per week
            exercises: Available exercises
            baseline_intensity: Baseline intensity
            baseline_volume: Baseline volume
            cycle_name: Optional cycle name
            
        Returns:
            Generated TrainingCycle
        """
        # Create appropriate periodizer
        if periodization == Periodization.LINEAR:
            periodizer = LinearPeriodizer(
                goal=goal,
                fitness_level=fitness_level,
                duration_weeks=duration_weeks,
                workouts_per_week=workouts_per_week,
                exercises=exercises,
            )
        elif periodization == Periodization.UNDULATING:
            periodizer = UndulatingPeriodizer(
                goal=goal,
                fitness_level=fitness_level,
                duration_weeks=duration_weeks,
                workouts_per_week=workouts_per_week,
                exercises=exercises,
            )
        elif periodization == Periodization.BLOCK:
            periodizer = BlockPeriodizer(
                goal=goal,
                fitness_level=fitness_level,
                duration_weeks=duration_weeks,
                workouts_per_week=workouts_per_week,
                exercises=exercises,
            )
        else:
            raise CycleGenerationError(
                f"Unknown periodization: {periodization}"
            )
        
        # Generate phases
        phases = periodizer.generate_phases()
        
        # Create cycle
        cycle_id = str(uuid.uuid4())[:8]
        cycle_name = (
            cycle_name or
            f"{goal.value.title()} {periodization.value.title()} Cycle"
        )
        
        cycle = TrainingCycle(
            id=cycle_id,
            name=cycle_name,
            goal=goal,
            fitness_level=fitness_level,
            periodization=periodization,
            duration_weeks=duration_weeks,
            start_date=datetime.utcnow().strftime("%Y-%m-%d"),
            baseline_intensity=baseline_intensity,
            baseline_volume=baseline_volume,
        )
        
        # Add phases to cycle
        for phase in phases:
            cycle.add_phase(phase)
        
        return cycle
    
    def generate_quick(
        self,
        goal: Union[TrainingGoal, str],
        fitness_level: Union[FitnessLevel, str],
        periodization: Union[Periodization, str],
        duration_weeks: int,
        workouts_per_week: int = 3,
    ) -> TrainingCycle:
        """
        Generate a cycle with minimal parameters (quick start).
        
        Args:
            goal: Training goal
            fitness_level: Fitness level
            periodization: Periodization model
            duration_weeks: Duration in weeks
            workouts_per_week: Workouts per week (default 3)
            
        Returns:
            Generated TrainingCycle
        """
        return self.generate(
            goal=goal,
            fitness_level=fitness_level,
            periodization=periodization,
            duration_weeks=duration_weeks,
            workouts_per_week=workouts_per_week,
        )
    
    def get_available_goals(self) -> List[str]:
        """
        Get list of available training goals.
        
        Returns:
            List of goal names
        """
        return [g.value for g in TrainingGoal]
    
    def get_available_levels(self) -> List[str]:
        """
        Get list of available fitness levels.
        
        Returns:
            List of fitness level names
        """
        return [f.value for f in FitnessLevel]
    
    def get_available_periodizations(self) -> List[str]:
        """
        Get list of available periodization models.
        
        Returns:
            List of periodization names
        """
        return [p.value for p in Periodization]
