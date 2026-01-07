"""
Basic usage example for the Workout Cycle Generator.

Demonstrates how to generate, inspect, and work with training cycles.
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src import CycleGenerator
from src.utils import to_json


def main():
    """Main example demonstrating cycle generation."""
    
    print("=" * 70)
    print("WORKOUT CYCLE GENERATOR - BASIC USAGE EXAMPLE")
    print("=" * 70)
    print()
    
    # Create generator
    generator = CycleGenerator()
    
    # Display available options
    print("Available Training Goals:")
    for goal in generator.get_available_goals():
        print(f"  - {goal}")
    print()
    
    print("Available Fitness Levels:")
    for level in generator.get_available_levels():
        print(f"  - {level}")
    print()
    
    print("Available Periodization Models:")
    for period in generator.get_available_periodizations():
        print(f"  - {period}")
    print()
    
    # Example 1: Linear Periodization for Strength
    print("=" * 70)
    print("EXAMPLE 1: 12-Week Strength Cycle (Linear Periodization)")
    print("=" * 70)
    print()
    
    cycle1 = generator.generate(
        goal="strength",
        fitness_level="intermediate",
        periodization="linear",
        duration_weeks=12,
        workouts_per_week=4,
        cycle_name="12-Week Strength Builder"
    )
    
    print(f"Cycle Name: {cycle1.name}")
    print(f"Goal: {cycle1.goal.value}")
    print(f"Fitness Level: {cycle1.fitness_level.value}")
    print(f"Periodization: {cycle1.periodization.value}")
    print(f"Duration: {cycle1.duration_weeks} weeks")
    print(f"Workouts per week: {cycle1.workouts_per_week}")
    print()
    
    print(f"Cycle Metrics:")
    print(f"  Total Phases: {cycle1.get_phase_count()}")
    print(f"  Total Workouts: {cycle1.get_total_workouts()}")
    print(f"  Total Volume: {cycle1.get_total_volume():.0f}")
    print(f"  Average Intensity: {cycle1.get_average_intensity():.1f}")
    print()
    
    print("Phases:")
    for i, phase in enumerate(cycle1.phases, 1):
        print(f"  Phase {i}: {phase.name}")
        print(f"    - Type: {phase.phase_type.value}")
        print(f"    - Weeks {phase.start_week}-{phase.end_week}")
        print(f"    - Workouts: {phase.get_workout_count()}")
        print(f"    - Intensity Multiplier: {phase.intensity_multiplier:.2f}x")
        print(f"    - Volume Multiplier: {phase.volume_multiplier:.2f}x")
        print(f"    - Target Rep Range: {phase.target_rep_range}")
    print()
    
    # Example 2: Undulating Periodization for Hypertrophy
    print("=" * 70)
    print("EXAMPLE 2: 8-Week Hypertrophy Cycle (Undulating Periodization)")
    print("=" * 70)
    print()
    
    cycle2 = generator.generate(
        goal="hypertrophy",
        fitness_level="beginner",
        periodization="undulating",
        duration_weeks=8,
        workouts_per_week=3,
    )
    
    print(f"Cycle Name: {cycle2.name}")
    print(f"Duration: {cycle2.duration_weeks} weeks")
    print(f"Total Workouts: {cycle2.get_total_workouts()}")
    print()
    
    # Inspect first workout
    first_phase = cycle2.phases[0]
    first_workout = first_phase.workouts[0]
    
    print(f"First Workout: {first_workout.name}")
    print(f"  Intensity Level: {first_workout.intensity_level}")
    print(f"  Exercises: {first_workout.get_exercise_count()}")
    print(f"  Total Sets: {first_workout.get_total_sets()}")
    print()
    
    print("Exercises in first workout:")
    for i, exercise in enumerate(first_workout.exercises, 1):
        print(f"  {i}. {exercise.exercise_name}")
        print(f"     - Sets: {exercise.sets}")
        print(f"     - Reps: {exercise.reps}")
        if exercise.weight:
            print(f"     - Weight: {exercise.weight:.1f}")
    print()
    
    # Example 3: Block Periodization for Power
    print("=" * 70)
    print("EXAMPLE 3: 16-Week Power Cycle (Block Periodization)")
    print("=" * 70)
    print()
    
    cycle3 = generator.generate(
        goal="power",
        fitness_level="advanced",
        periodization="block",
        duration_weeks=16,
        workouts_per_week=4,
    )
    
    print(f"Cycle Name: {cycle3.name}")
    print(f"Total Phases: {cycle3.get_phase_count()}")
    print(f"Total Workouts: {cycle3.get_total_workouts()}")
    print()
    
    # Example 4: Quick Start
    print("=" * 70)
    print("EXAMPLE 4: Quick Start Generation")
    print("=" * 70)
    print()
    
    cycle4 = generator.generate_quick(
        goal="endurance",
        fitness_level="intermediate",
        periodization="linear",
        duration_weeks=10,
    )
    
    print(f"Generated quick cycle: {cycle4.name}")
    print(f"Workouts per week (default): {cycle4.workouts_per_week}")
    print()
    
    # Example 5: Serialization
    print("=" * 70)
    print("EXAMPLE 5: Cycle Serialization")
    print("=" * 70)
    print()
    
    print("Converting cycle to dictionary:")
    cycle_dict = cycle1.to_dict()
    print(f"  Keys: {list(cycle_dict.keys())}")
    print()
    
    print("Serializing to JSON (first 500 chars):")
    json_str = to_json(cycle1)
    print(json_str[:500] + "...")
    print()
    
    # Example 6: Phase and Workout Details
    print("=" * 70)
    print("EXAMPLE 6: Detailed Phase Analysis")
    print("=" * 70)
    print()
    
    for week in [1, 4, 8, 12]:
        phase = cycle1.get_phase_by_week(week)
        if phase:
            print(f"Week {week} is in: {phase.name} ({phase.phase_type.value})")
    print()
    
    # Example 7: Metrics and Statistics
    print("=" * 70)
    print("EXAMPLE 7: Cycle Statistics")
    print("=" * 70)
    print()
    
    total_exercises = sum(
        len(w.exercises)
        for p in cycle1.phases
        for w in p.workouts
    )
    
    total_sets = sum(
        sum(e.sets for e in w.exercises)
        for p in cycle1.phases
        for w in p.workouts
    )
    
    total_duration = sum(
        w.duration_minutes
        for p in cycle1.phases
        for w in p.workouts
    )
    
    print(f"Cycle: {cycle1.name}")
    print(f"  Total Phases: {cycle1.get_phase_count()}")
    print(f"  Total Workouts: {cycle1.get_total_workouts()}")
    print(f"  Total Exercises: {total_exercises}")
    print(f"  Total Sets: {total_sets}")
    print(f"  Total Duration: {total_duration} minutes")
    print(f"  Average Duration per Workout: {total_duration / cycle1.get_total_workouts():.0f} minutes")
    print(f"  Average Exercises per Workout: {total_exercises / cycle1.get_total_workouts():.1f}")
    print()
    
    print("=" * 70)
    print("EXAMPLES COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
