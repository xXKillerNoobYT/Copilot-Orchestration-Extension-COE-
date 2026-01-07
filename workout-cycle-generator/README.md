# Workout Cycle Generator

A comprehensive Python library for generating personalized training cycles with support for multiple periodization models, training goals, and fitness levels.

## Features

- **3 Periodization Models**
  - Linear Periodization: Progressive intensity increase, decreasing volume
  - Undulating Periodization: Daily/weekly variation to prevent plateaus
  - Block Periodization: Distinct blocks focused on specific adaptations

- **4 Training Goals**
  - Strength: Maximum force development
  - Hypertrophy: Muscle growth and size
  - Endurance: Cardiovascular fitness
  - Power: Explosive movement development

- **4 Fitness Levels**
  - Beginner: New to structured training
  - Intermediate: 1-2 years of training experience
  - Advanced: 3+ years of serious training
  - Elite: Competitive athletes

- **50+ Base Exercises**
  - Organized by training goal
  - Categorized by modality (compound, isolation, plyometric, cardio)
  - Complete with difficulty ratings and recommendations

- **Full Serialization Support**
  - JSON serialization/deserialization
  - Dictionary conversion for easy integration
  - Custom encoder for complex objects

- **Comprehensive Validation**
  - Input parameter validation
  - Cycle structure validation
  - Exercise selection validation
  - Detailed error messages

## Installation

### From Source

```bash
git clone https://github.com/yourusername/workout-cycle-generator.git
cd workout-cycle-generator
pip install -e .
```

### With Development Dependencies

```bash
pip install -e ".[dev]"
```

### Requirements

- Python 3.9+
- No external dependencies for core functionality
- pytest (for testing)
- pytest-cov (for coverage reports)

## Quick Start

### Basic Usage

```python
from src import CycleGenerator

# Create a generator
generator = CycleGenerator()

# Generate a 12-week strength cycle
cycle = generator.generate(
    goal="strength",
    fitness_level="intermediate",
    periodization="linear",
    duration_weeks=12,
    workouts_per_week=4,
)

# Get cycle information
print(f"Cycle: {cycle.name}")
print(f"Duration: {cycle.duration_weeks} weeks")
print(f"Total phases: {cycle.get_phase_count()}")
print(f"Total workouts: {cycle.get_total_workouts()}")
print(f"Total volume: {cycle.get_total_volume():.0f}")
```

### With Custom Name

```python
cycle = generator.generate(
    goal="hypertrophy",
    fitness_level="beginner",
    periodization="undulating",
    duration_weeks=8,
    workouts_per_week=3,
    cycle_name="Summer Muscle Building"
)
```

### Quick Start (with Defaults)

```python
# Generate with default workouts_per_week=3
cycle = generator.generate_quick(
    goal="power",
    fitness_level="advanced",
    periodization="block",
    duration_weeks=16,
)
```

## Periodization Models Explained

### Linear Periodization

Progressive intensity increase with decreasing volume. Best for strength-focused athletes.

```
Hypertrophy → Strength → Power → Peaking
(8-12 reps)   (6-8 reps) (3-5 reps) (1-3 reps)
```

### Undulating Periodization

Daily/weekly variation prevents adaptation plateaus. Suitable for most athletes.

```
Weekly Pattern:
Day 1: Strength (3-5 reps, 90% intensity)
Day 2: Hypertrophy (8-10 reps, 75% intensity)
Day 3: Endurance (12-15 reps, 60% intensity)
```

### Block Periodization

Distinct training blocks focused on specific adaptations. Optimal for structured progression.

```
Accumulation → Intensification → Realization → Deload
(High Volume)  (High Intensity)  (Peak Power)  (Recovery)
```

## API Reference

### CycleGenerator

Main orchestrator for training cycle generation.

#### Methods

##### `generate()`

Generate a complete training cycle.

```python
cycle = generator.generate(
    goal: Union[TrainingGoal, str],
    fitness_level: Union[FitnessLevel, str],
    periodization: Union[Periodization, str],
    duration_weeks: int,
    workouts_per_week: int,
    cycle_name: Optional[str] = None,
    exercises: Optional[List[Exercise]] = None,
    baseline_intensity: int = 5,
    baseline_volume: float = 1000.0,
) -> TrainingCycle
```

##### `generate_quick()`

Generate a cycle with minimal parameters.

```python
cycle = generator.generate_quick(
    goal: Union[TrainingGoal, str],
    fitness_level: Union[FitnessLevel, str],
    periodization: Union[Periodization, str],
    duration_weeks: int,
    workouts_per_week: int = 3,
) -> TrainingCycle
```

##### Metadata Methods

```python
goals = generator.get_available_goals()        # ["strength", "hypertrophy", ...]
levels = generator.get_available_levels()      # ["beginner", "intermediate", ...]
periodizations = generator.get_available_periodizations()  # ["linear", "undulating", "block"]
```

### TrainingCycle

Complete training cycle containing phases, workouts, and exercises.

#### Properties

- `id`: Unique identifier
- `name`: Cycle name
- `goal`: Training goal (TrainingGoal enum)
- `fitness_level`: Fitness level (FitnessLevel enum)
- `periodization`: Periodization model (Periodization enum)
- `duration_weeks`: Total weeks
- `phases`: List of TrainingPhase objects
- `baseline_intensity`: Base intensity (1-10)
- `baseline_volume`: Base volume value

#### Methods

```python
# Phase management
cycle.add_phase(phase)
cycle.get_phase_count()
cycle.get_phase_by_week(week)

# Metrics
cycle.get_total_workouts()
cycle.get_total_volume()
cycle.get_average_intensity()

# Validation
cycle.validate_phases()

# Serialization
data = cycle.to_dict()
cycle_restored = TrainingCycle.from_dict(data)
```

### TrainingPhase

A training block within a cycle focused on specific adaptations.

#### Properties

- `id`: Phase identifier
- `name`: Phase name
- `phase_type`: Type of phase (PhaseType enum)
- `start_week`: Starting week number
- `end_week`: Ending week number
- `workouts`: List of Workout objects
- `intensity_multiplier`: Intensity scaling factor
- `volume_multiplier`: Volume scaling factor
- `target_rep_range`: Recommended rep range (e.g., "6-8")

### Workout

A single training session.

#### Properties

- `id`: Workout identifier
- `name`: Workout name
- `date`: Date/timing identifier
- `exercises`: List of ExercisePerformance objects
- `duration_minutes`: Expected duration
- `intensity_level`: Intensity (1-10)
- `status`: Completion status

#### Methods

```python
workout.add_exercise(exercise_performance)
workout.remove_exercise(exercise_id)
workout.get_exercise_count()
workout.get_total_volume()
workout.get_total_sets()
workout.get_average_rpe()
workout.mark_completed()
workout.mark_in_progress()
```

### ExercisePerformance

Performance of an exercise in a workout.

#### Properties

- `exercise_id`: Exercise identifier
- `exercise_name`: Exercise name
- `sets`: Number of sets
- `reps`: Repetitions (e.g., "8-10")
- `weight`: Weight used
- `rpe`: Rate of Perceived Exertion (1-10)
- `status`: Completion status

#### Methods

```python
volume = performance.calculate_volume()
```

## Serialization

### To JSON

```python
from src.utils import to_json, to_json_file

# Serialize to string
json_str = to_json(cycle)
print(json_str)

# Save to file
to_json_file(cycle, "my_cycle.json")
```

### From JSON

```python
from src.utils import from_json, from_json_file
from src.models import TrainingCycle

# From string
cycle = from_json(json_str, TrainingCycle)

# From file
cycle = from_json_file("my_cycle.json", TrainingCycle)
```

### Dictionary Conversion

```python
# To dictionary
data = cycle.to_dict()

# From dictionary
cycle = TrainingCycle.from_dict(data)
```

## Validation

### Input Validation

```python
from src.validation import InputValidator

# Validate cycle parameters
InputValidator.validate_cycle_params(
    goal="strength",
    fitness_level="intermediate",
    periodization="linear",
    duration_weeks=12,
    workouts_per_week=4,
)

# Validate exercise selection
InputValidator.validate_exercise_selection(
    ["ex_001", "ex_002", "ex_003"]
)

# Validate rep range
InputValidator.validate_rep_range("6-8")

# Validate intensity percentage
InputValidator.validate_intensity_percentage(85)
```

### Cycle Validation

```python
from src.validation import CycleValidator

# Validate generated cycle
CycleValidator.validate_cycle(cycle)

# Get validation summary
summary = CycleValidator.get_validation_summary(cycle)
print(summary)
```

## Testing

Run the complete test suite:

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src

# Run specific test file
pytest tests/test_generation/test_cycle_generator.py

# Run specific test class
pytest tests/test_generation/test_cycle_generator.py::TestCycleGeneratorBasic

# Verbose output
pytest -v
```

### Test Coverage

The project includes 100+ tests covering:

- Data model creation and validation
- Serialization/deserialization
- Input validation
- All 3 periodization models
- Cycle generation for all combinations
- End-to-end workflows
- Edge cases and error handling

Current coverage: **>80%**

## Examples

See the `examples/` directory for complete working examples:

- `basic_usage.py` - Quick start example
- More examples coming soon

## Project Structure

```
workout-cycle-generator/
├── src/
│   ├── models/              # Data models
│   │   ├── enums.py
│   │   ├── exercise.py
│   │   ├── workout.py
│   │   ├── phase.py
│   │   ├── cycle.py
│   │   └── __init__.py
│   ├── utils/               # Utilities
│   │   ├── calculators.py
│   │   ├── serializers.py
│   │   └── __init__.py
│   ├── exercise_db/         # Exercise database
│   │   ├── fixtures.py      # 50+ base exercises
│   │   ├── repository.py    # Exercise queries
│   │   └── __init__.py
│   ├── validation/          # Input/output validation
│   │   ├── input_validator.py
│   │   ├── cycle_validator.py
│   │   └── __init__.py
│   ├── periodization/       # Periodization models
│   │   ├── base.py
│   │   ├── linear.py
│   │   ├── undulating.py
│   │   ├── block.py
│   │   └── __init__.py
│   ├── generation/          # Cycle generation
│   │   ├── workout_builder.py
│   │   ├── phase_builder.py
│   │   ├── cycle_generator.py
│   │   └── __init__.py
│   ├── exceptions/          # Custom exceptions
│   │   └── custom.py
│   └── __init__.py
├── tests/                   # Test suite
│   ├── conftest.py          # Pytest fixtures
│   ├── test_models/
│   ├── test_validation/
│   ├── test_generation/
│   └── test_integration/
├── examples/                # Usage examples
│   └── basic_usage.py
├── requirements.txt
├── setup.py
└── README.md
```

## Design Principles

1. **Type Safety**: 100% type hints for all functions
2. **Validation**: Input and output validation at all levels
3. **Extensibility**: Easy to add new exercises, periodization models
4. **Serialization**: Full JSON support for integration
5. **Testing**: Comprehensive test coverage
6. **Documentation**: Detailed docstrings and examples

## Contributing

Contributions welcome! Please ensure:

1. All tests pass: `pytest`
2. Code is formatted: `black src tests`
3. No lint errors: `flake8 src tests`
4. Type checking: `mypy src`

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Check existing documentation
- Review examples in `examples/` directory

## Changelog

### Version 1.0.0 (Initial Release)

- Complete cycle generation with 3 periodization models
- 50+ base exercises organized by goal
- Full input/output validation
- Comprehensive test suite (100+ tests)
- JSON serialization support
- Detailed documentation and examples
