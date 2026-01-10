"""
End-to-end integration tests for cycle generation.

Tests complete workflows from generation to serialization.
"""

import pytest
import json
from src import CycleGenerator
from src.models.enums import (
    TrainingGoal,
    FitnessLevel,
    Periodization,
)
from src.utils.serializers import to_json, from_json
from src.validation import CycleValidator


class TestEndToEndGeneration:
    """Test complete generation workflows."""
    
    def test_generate_and_validate_linear(self):
        """Test generating and validating a linear cycle."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal=TrainingGoal.STRENGTH,
            fitness_level=FitnessLevel.INTERMEDIATE,
            periodization=Periodization.LINEAR,
            duration_weeks=12,
            workouts_per_week=4,
            cycle_name="Strength Progression",
        )
        
        # Validate
        assert CycleValidator.validate_cycle(cycle) is True
        assert cycle.get_phase_count() > 0
        assert cycle.get_total_workouts() > 0
    
    def test_generate_and_validate_undulating(self):
        """Test generating and validating an undulating cycle."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal=TrainingGoal.HYPERTROPHY,
            fitness_level=FitnessLevel.BEGINNER,
            periodization=Periodization.UNDULATING,
            duration_weeks=8,
            workouts_per_week=3,
        )
        
        assert CycleValidator.validate_cycle(cycle) is True
    
    def test_generate_and_validate_block(self):
        """Test generating and validating a block cycle."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal=TrainingGoal.POWER,
            fitness_level=FitnessLevel.ADVANCED,
            periodization=Periodization.BLOCK,
            duration_weeks=16,
            workouts_per_week=4,
        )
        
        assert CycleValidator.validate_cycle(cycle) is True


class TestCycleSerialization:
    """Test cycle serialization workflows."""
    
    def test_serialize_and_deserialize(self):
        """Test serializing and deserializing a cycle."""
        generator = CycleGenerator()
        original_cycle = generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=8,
            workouts_per_week=3,
        )
        
        # Serialize to dict
        data = original_cycle.to_dict()
        assert isinstance(data, dict)
        
        # Deserialize back
        from src.models import TrainingCycle
        restored_cycle = TrainingCycle.from_dict(data)
        
        assert restored_cycle.id == original_cycle.id
        assert restored_cycle.name == original_cycle.name
        assert restored_cycle.goal == original_cycle.goal
        assert restored_cycle.get_phase_count() == original_cycle.get_phase_count()
    
    def test_serialize_to_json_and_back(self):
        """Test serializing to JSON and back."""
        generator = CycleGenerator()
        original_cycle = generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=8,
            workouts_per_week=3,
        )
        
        # Serialize to JSON
        json_str = to_json(original_cycle)
        assert isinstance(json_str, str)
        
        # Parse JSON to verify it's valid
        json_data = json.loads(json_str)
        assert json_data["id"] == original_cycle.id


class TestCycleVariations:
    """Test generating cycles with various parameters."""
    
    @pytest.mark.parametrize("goal", [
        TrainingGoal.STRENGTH,
        TrainingGoal.HYPERTROPHY,
        TrainingGoal.ENDURANCE,
        TrainingGoal.POWER,
    ])
    def test_all_goals(self, goal):
        """Test generation with all goals."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal=goal,
            fitness_level=FitnessLevel.INTERMEDIATE,
            periodization=Periodization.LINEAR,
            duration_weeks=8,
            workouts_per_week=3,
        )
        assert cycle.goal == goal
    
    @pytest.mark.parametrize("level", [
        FitnessLevel.BEGINNER,
        FitnessLevel.INTERMEDIATE,
        FitnessLevel.ADVANCED,
        FitnessLevel.ELITE,
    ])
    def test_all_fitness_levels(self, level):
        """Test generation with all fitness levels."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal=TrainingGoal.STRENGTH,
            fitness_level=level,
            periodization=Periodization.LINEAR,
            duration_weeks=8,
            workouts_per_week=3,
        )
        assert cycle.fitness_level == level
    
    @pytest.mark.parametrize("periodization", [
        Periodization.LINEAR,
        Periodization.UNDULATING,
        Periodization.BLOCK,
    ])
    def test_all_periodizations(self, periodization):
        """Test generation with all periodization models."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal=TrainingGoal.STRENGTH,
            fitness_level=FitnessLevel.INTERMEDIATE,
            periodization=periodization,
            duration_weeks=8,
            workouts_per_week=3,
        )
        assert cycle.periodization == periodization


class TestCycleMetrics:
    """Test cycle metrics calculations."""
    
    def test_total_metrics(self):
        """Test calculating various metrics."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=12,
            workouts_per_week=4,
        )
        
        # Calculate metrics
        total_phases = cycle.get_phase_count()
        total_workouts = cycle.get_total_workouts()
        total_volume = cycle.get_total_volume()
        avg_intensity = cycle.get_average_intensity()
        
        # Verify metrics are reasonable
        assert total_phases > 0
        assert total_workouts > 0
        assert total_workouts == cycle.duration_weeks * cycle.workouts_per_week
        assert total_volume >= 0
        if avg_intensity:
            assert 1 <= avg_intensity <= 10


class TestCyclePhaseStructure:
    """Test the structure of phases in generated cycles."""
    
    def test_phase_week_coverage(self):
        """Test that phases cover all weeks."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=12,
            workouts_per_week=3,
        )
        
        # Verify all weeks are covered
        for week in range(1, cycle.duration_weeks + 1):
            phase = cycle.get_phase_by_week(week)
            assert phase is not None, f"Week {week} not covered by any phase"
    
    def test_phase_workout_counts(self):
        """Test that phases have correct number of workouts."""
        generator = CycleGenerator()
        cycle = generator.generate(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=12,
            workouts_per_week=3,
        )
        
        total_workouts = sum(
            p.get_workout_count() for p in cycle.phases
        )
        expected = cycle.duration_weeks * cycle.workouts_per_week
        assert total_workouts == expected
