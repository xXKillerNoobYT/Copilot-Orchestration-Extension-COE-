"""
Tests for input validation.

Tests InputValidator class methods.
"""

import pytest
from src.models.enums import (
    TrainingGoal,
    FitnessLevel,
    Periodization,
)
from src.validation import InputValidator
from src.exceptions import InvalidInputError


class TestCycleParamsValidation:
    """Test cycle parameters validation."""
    
    def test_valid_params_with_enums(self):
        """Test validation with enum parameters."""
        assert InputValidator.validate_cycle_params(
            goal=TrainingGoal.STRENGTH,
            fitness_level=FitnessLevel.INTERMEDIATE,
            periodization=Periodization.LINEAR,
            duration_weeks=12,
            workouts_per_week=4,
        ) is True
    
    def test_valid_params_with_strings(self):
        """Test validation with string parameters."""
        assert InputValidator.validate_cycle_params(
            goal="strength",
            fitness_level="intermediate",
            periodization="linear",
            duration_weeks=12,
            workouts_per_week=4,
        ) is True
    
    def test_invalid_goal(self):
        """Test invalid goal."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="invalid_goal",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=12,
                workouts_per_week=4,
            )
    
    def test_invalid_fitness_level(self):
        """Test invalid fitness level."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="strength",
                fitness_level="invalid_level",
                periodization="linear",
                duration_weeks=12,
                workouts_per_week=4,
            )
    
    def test_invalid_periodization(self):
        """Test invalid periodization."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="strength",
                fitness_level="intermediate",
                periodization="invalid",
                duration_weeks=12,
                workouts_per_week=4,
            )
    
    def test_duration_too_short(self):
        """Test duration too short."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="strength",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=0,
                workouts_per_week=4,
            )
    
    def test_duration_too_long(self):
        """Test duration too long."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="strength",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=100,
                workouts_per_week=4,
            )
    
    def test_workouts_per_week_too_low(self):
        """Test workouts per week too low."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="strength",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=12,
                workouts_per_week=0,
            )
    
    def test_workouts_per_week_too_high(self):
        """Test workouts per week too high."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_cycle_params(
                goal="strength",
                fitness_level="intermediate",
                periodization="linear",
                duration_weeks=12,
                workouts_per_week=8,
            )


class TestExerciseSelectionValidation:
    """Test exercise selection validation."""
    
    def test_valid_exercise_selection(self):
        """Test valid exercise selection."""
        assert InputValidator.validate_exercise_selection(
            ["ex_001", "ex_002", "ex_003"]
        ) is True
    
    def test_no_exercises(self):
        """Test with no exercises."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_exercise_selection([])
    
    def test_duplicate_exercises(self):
        """Test with duplicate exercises."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_exercise_selection(
                ["ex_001", "ex_001", "ex_002"]
            )
    
    def test_too_many_exercises(self):
        """Test with too many exercises."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_exercise_selection(
                [f"ex_{i:03d}" for i in range(30)]
            )


class TestRepRangeValidation:
    """Test rep range validation."""
    
    def test_valid_rep_range(self):
        """Test valid rep range."""
        assert InputValidator.validate_rep_range("6-8") is True
        assert InputValidator.validate_rep_range("8-10") is True
        assert InputValidator.validate_rep_range("1-3") is True
    
    def test_invalid_format_no_dash(self):
        """Test invalid format without dash."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_rep_range("68")
    
    def test_invalid_range_inverted(self):
        """Test inverted range."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_rep_range("10-5")
    
    def test_invalid_zero_reps(self):
        """Test zero reps."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_rep_range("0-5")


class TestIntensityValidation:
    """Test intensity percentage validation."""
    
    def test_valid_intensity(self):
        """Test valid intensity."""
        assert InputValidator.validate_intensity_percentage(50) is True
        assert InputValidator.validate_intensity_percentage(85) is True
    
    def test_intensity_too_low(self):
        """Test intensity too low."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_intensity_percentage(0)
    
    def test_intensity_too_high(self):
        """Test intensity too high."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_intensity_percentage(101)


class TestMultiplierValidation:
    """Test multiplier validation."""
    
    def test_valid_multiplier(self):
        """Test valid multiplier."""
        assert InputValidator.validate_multiplier(1.0) is True
        assert InputValidator.validate_multiplier(0.5) is True
        assert InputValidator.validate_multiplier(2.0) is True
    
    def test_multiplier_too_low(self):
        """Test multiplier too low."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_multiplier(0.05)
    
    def test_multiplier_too_high(self):
        """Test multiplier too high."""
        with pytest.raises(InvalidInputError):
            InputValidator.validate_multiplier(10.0)
