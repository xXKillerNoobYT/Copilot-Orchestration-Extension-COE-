"""
Tests for the TrainingCycle model.

Tests cycle creation, validation, and operations.
"""

import pytest
from src.models import (
    TrainingCycle,
    TrainingGoal,
    FitnessLevel,
    Periodization,
)


class TestTrainingCycleCreation:
    """Test cycle creation and initialization."""
    
    def test_create_basic_cycle(self, sample_cycle):
        """Test creating a basic cycle."""
        assert sample_cycle.id == "cycle_001"
        assert sample_cycle.name == "12-Week Strength Cycle"
        assert sample_cycle.goal == TrainingGoal.STRENGTH
        assert sample_cycle.fitness_level == FitnessLevel.INTERMEDIATE
        assert sample_cycle.periodization == Periodization.LINEAR
        assert sample_cycle.duration_weeks == 12
    
    def test_cycle_with_different_goals(self):
        """Test creating cycles with different goals."""
        for goal in [TrainingGoal.STRENGTH, TrainingGoal.HYPERTROPHY,
                     TrainingGoal.ENDURANCE, TrainingGoal.POWER]:
            cycle = TrainingCycle(
                id="test",
                name="Test",
                goal=goal,
                fitness_level=FitnessLevel.BEGINNER,
                periodization=Periodization.LINEAR,
                duration_weeks=8,
                start_date="2026-01-01",
            )
            assert cycle.goal == goal
    
    def test_cycle_invalid_duration(self):
        """Test cycle with invalid duration."""
        with pytest.raises(ValueError):
            TrainingCycle(
                id="test",
                name="Test",
                goal=TrainingGoal.STRENGTH,
                fitness_level=FitnessLevel.BEGINNER,
                periodization=Periodization.LINEAR,
                duration_weeks=0,
                start_date="2026-01-01",
            )


class TestCyclePhaseManagement:
    """Test adding and managing phases in cycle."""
    
    def test_add_single_phase(self, sample_cycle, sample_phase):
        """Test adding a single phase."""
        initial_count = sample_cycle.get_phase_count()
        sample_cycle.add_phase(sample_phase)
        assert sample_cycle.get_phase_count() == initial_count + 1
    
    def test_get_phase_count(self, sample_cycle):
        """Test getting phase count."""
        count = sample_cycle.get_phase_count()
        assert count == 3
    
    def test_get_phase_by_week(self, sample_cycle):
        """Test retrieving phase by week."""
        phase = sample_cycle.get_phase_by_week(2)
        assert phase is not None
        assert 1 <= 2 <= phase.end_week


class TestCycleMetrics:
    """Test cycle metrics calculations."""
    
    def test_total_workouts(self, sample_cycle):
        """Test calculating total workouts."""
        total = sample_cycle.get_total_workouts()
        assert total > 0
        assert total == sum(
            p.get_workout_count() for p in sample_cycle.phases
        )
    
    def test_total_volume(self, sample_cycle):
        """Test calculating total volume."""
        volume = sample_cycle.get_total_volume()
        assert volume >= 0
    
    def test_average_intensity(self, sample_cycle):
        """Test calculating average intensity."""
        intensity = sample_cycle.get_average_intensity()
        if intensity is not None:
            assert 1 <= intensity <= 10


class TestCycleValidation:
    """Test cycle validation."""
    
    def test_validate_phases_valid(self, sample_cycle):
        """Test validation of valid phases."""
        assert sample_cycle.validate_phases() is True
    
    def test_validate_phases_no_phases(self):
        """Test validation with no phases."""
        cycle = TrainingCycle(
            id="test",
            name="Test",
            goal=TrainingGoal.STRENGTH,
            fitness_level=FitnessLevel.BEGINNER,
            periodization=Periodization.LINEAR,
            duration_weeks=4,
            start_date="2026-01-01",
        )
        # Should return True for empty phases
        assert cycle.validate_phases() is True
    
    def test_validate_phases_overlapping(self, sample_cycle):
        """Test validation with overlapping phases."""
        from src.models import TrainingPhase, PhaseType
        
        # Create overlapping phase
        bad_phase = TrainingPhase(
            id="bad",
            name="Bad",
            phase_type=PhaseType.STRENGTH,
            start_week=2,
            end_week=5,
        )
        sample_cycle.phases.append(bad_phase)
        
        with pytest.raises(ValueError):
            sample_cycle.validate_phases()


class TestCycleSerialization:
    """Test cycle serialization and deserialization."""
    
    def test_to_dict(self, sample_cycle):
        """Test converting cycle to dictionary."""
        data = sample_cycle.to_dict()
        assert isinstance(data, dict)
        assert data["id"] == sample_cycle.id
        assert data["name"] == sample_cycle.name
        assert data["goal"] == "strength"
        assert "phases" in data
    
    def test_from_dict(self, sample_cycle):
        """Test creating cycle from dictionary."""
        data = sample_cycle.to_dict()
        cycle = TrainingCycle.from_dict(data)
        assert cycle.id == sample_cycle.id
        assert cycle.name == sample_cycle.name
        assert cycle.goal == sample_cycle.goal


class TestCycleComparisons:
    """Test cycle comparisons and lookups."""
    
    def test_get_phase_by_week_valid(self, sample_cycle):
        """Test getting phase by valid week."""
        for week in range(1, sample_cycle.duration_weeks + 1):
            phase = sample_cycle.get_phase_by_week(week)
            assert phase is not None
    
    def test_get_phase_by_week_invalid(self, sample_cycle):
        """Test getting phase by invalid week."""
        phase = sample_cycle.get_phase_by_week(100)
        assert phase is None
