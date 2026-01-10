"""
Tests for cycle generation.

Tests CycleGenerator and periodization models.
"""

import pytest
from src import CycleGenerator
from src.models.enums import (
    TrainingGoal,
    FitnessLevel,
    Periodization,
)
from src.exceptions import InvalidInputError, CycleGenerationError


class TestCycleGeneratorBasic:
    """Test basic cycle generation."""
    
    def test_generate_linear_cycle(self, cycle_generator):
        """Test generating a linear periodization cycle."""
        cycle = cycle_generator.generate(
            goal=TrainingGoal.STRENGTH,
            fitness_level=FitnessLevel.INTERMEDIATE,
            periodization=Periodization.LINEAR,
            duration_weeks=12,
            workouts_per_week=3,
        )
        
        assert cycle is not None
        assert cycle.goal == TrainingGoal.STRENGTH
        assert cycle.periodization == Periodization.LINEAR
        assert cycle.duration_weeks == 12
        assert cycle.get_phase_count() > 0
    
    def test_generate_undulating_cycle(self, cycle_generator):
        """Test generating an undulating periodization cycle."""
        cycle = cycle_generator.generate(
            goal=TrainingGoal.HYPERTROPHY,
            fitness_level=FitnessLevel.BEGINNER,
            periodization=Periodization.UNDULATING,
            duration_weeks=8,
            workouts_per_week=4,
        )
        
        assert cycle is not None
        assert cycle.periodization == Periodization.UNDULATING
    
    def test_generate_block_cycle(self, cycle_generator):
        """Test generating a block periodization cycle."""
        cycle = cycle_generator.generate(
            goal=TrainingGoal.POWER,
            fitness_level=FitnessLevel.ADVANCED,
            periodization=Periodization.BLOCK,
            duration_weeks=16,
            workouts_per_week=3,
        )
        
        assert cycle is not None
        assert cycle.periodization == Periodization.BLOCK


class TestCycleGeneratorWithStrings:
    """Test cycle generation with string parameters."""
    
    def test_generate_with_string_goal(self, cycle_generator):
        """Test generating cycle with string goal."""
        cycle = cycle_generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=12,
            workouts_per_week=3,
        )
        assert cycle.goal == TrainingGoal.STRENGTH
    
    def test_generate_with_string_fitness_level(self, cycle_generator):
        """Test generating cycle with string fitness level."""
        cycle = cycle_generator.generate(
            goal="strength",
            fitness_level="advanced",
            periodization="linear",
            duration_weeks=12,
            workouts_per_week=3,
        )
        assert cycle.fitness_level == FitnessLevel.ADVANCED
    
    def test_generate_with_string_periodization(self, cycle_generator):
        """Test generating cycle with string periodization."""
        cycle = cycle_generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="block",
            duration_weeks=12,
            workouts_per_week=3,
        )
        assert cycle.periodization == Periodization.BLOCK


class TestCycleGeneratorValidation:
    """Test input validation in cycle generation."""
    
    def test_invalid_goal(self, cycle_generator):
        """Test generation with invalid goal."""
        with pytest.raises(InvalidInputError):
            cycle_generator.generate(
                goal="invalid",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=12,
                workouts_per_week=3,
            )
    
    def test_invalid_duration(self, cycle_generator):
        """Test generation with invalid duration."""
        with pytest.raises(InvalidInputError):
            cycle_generator.generate(
                goal="strength",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=0,
                workouts_per_week=3,
            )
    
    def test_invalid_workouts_per_week(self, cycle_generator):
        """Test generation with invalid workouts per week."""
        with pytest.raises(InvalidInputError):
            cycle_generator.generate(
                goal="strength",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=12,
                workouts_per_week=10,
            )


class TestCycleGeneratorQuickStart:
    """Test quick start cycle generation."""
    
    def test_generate_quick(self, cycle_generator):
        """Test quick start generation."""
        cycle = cycle_generator.generate_quick(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=8,
        )
        assert cycle is not None
        assert cycle.duration_weeks == 8
        assert cycle.workouts_per_week == 3  # Default


class TestCycleGeneratorMetadata:
    """Test metadata from cycle generator."""
    
    def test_available_goals(self, cycle_generator):
        """Test getting available goals."""
        goals = cycle_generator.get_available_goals()
        assert len(goals) > 0
        assert "strength" in goals
    
    def test_available_levels(self, cycle_generator):
        """Test getting available fitness levels."""
        levels = cycle_generator.get_available_levels()
        assert len(levels) > 0
        assert "beginner" in levels
    
    def test_available_periodizations(self, cycle_generator):
        """Test getting available periodizations."""
        periodizations = cycle_generator.get_available_periodizations()
        assert len(periodizations) == 3
        assert "linear" in periodizations
        assert "undulating" in periodizations
        assert "block" in periodizations


class TestCycleGeneratorStructure:
    """Test structure of generated cycles."""
    
    def test_cycle_has_workouts(self, cycle_generator):
        """Test that generated cycle has workouts."""
        cycle = cycle_generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=8,
            workouts_per_week=3,
        )
        
        total_workouts = cycle.get_total_workouts()
        assert total_workouts > 0
    
    def test_cycle_has_exercises(self, cycle_generator):
        """Test that generated cycle has exercises."""
        cycle = cycle_generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=8,
            workouts_per_week=3,
        )
        
        total_exercises = sum(
            len(w.exercises)
            for p in cycle.phases
            for w in p.workouts
        )
        assert total_exercises > 0
