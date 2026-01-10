"""
Exercise database fixtures for the workout cycle generator.

Provides 50+ base exercises organized by training goal.
"""

from ..models.exercise import Exercise
from ..models.enums import ExerciseModality, RestPeriod, TrainingGoal


def get_exercises_for_goal(goal: TrainingGoal) -> list[Exercise]:
    """
    Get all exercises for a specific training goal.
    
    Args:
        goal: TrainingGoal enum
        
    Returns:
        List of Exercise objects for that goal
    """
    if goal == TrainingGoal.STRENGTH:
        return _get_strength_exercises()
    elif goal == TrainingGoal.HYPERTROPHY:
        return _get_hypertrophy_exercises()
    elif goal == TrainingGoal.ENDURANCE:
        return _get_endurance_exercises()
    elif goal == TrainingGoal.POWER:
        return _get_power_exercises()
    else:
        return _get_all_base_exercises()


def _get_strength_exercises() -> list[Exercise]:
    """Get exercises optimized for strength training."""
    return [
        Exercise(
            id="ex_001",
            name="Barbell Back Squat",
            description="Full body compound lift, primary lower body",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Glutes", "Hamstrings", "Core"],
            difficulty_level=9,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Keep chest up, knees tracking toes"
        ),
        Exercise(
            id="ex_002",
            name="Barbell Bench Press",
            description="Upper body compound lift, chest focus",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Chest",
            secondary_muscle_groups=["Triceps", "Shoulders"],
            difficulty_level=8,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Full scapular retraction, controlled descent"
        ),
        Exercise(
            id="ex_003",
            name="Deadlift",
            description="Full body compound lift, posterior chain",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Hamstrings",
            secondary_muscle_groups=["Glutes", "Lats", "Core"],
            difficulty_level=9,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Neutral spine, bar over midfoot"
        ),
        Exercise(
            id="ex_004",
            name="Barbell Overhead Press",
            description="Standing shoulder press, core stability",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Shoulders",
            secondary_muscle_groups=["Triceps", "Core"],
            difficulty_level=8,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Braced core, full body tension"
        ),
        Exercise(
            id="ex_005",
            name="Barbell Rows",
            description="Upper back compound lift, horizontal pull",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Lats",
            secondary_muscle_groups=["Back", "Biceps"],
            difficulty_level=8,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Chest to bar, hip hinge pattern"
        ),
        Exercise(
            id="ex_006",
            name="Squats (Front)",
            description="Quad-dominant squat variation",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Core", "Glutes"],
            difficulty_level=8,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Upright torso, elbows high"
        ),
        Exercise(
            id="ex_007",
            name="Trap Bar Deadlift",
            description="Alternative deadlift, reduced back stress",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Hamstrings", "Glutes"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Bar over midfoot, neutral grip"
        ),
        Exercise(
            id="ex_008",
            name="Power Clean",
            description="Olympic lift, explosive power development",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Hamstrings", "Shoulders"],
            difficulty_level=10,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Explosive hip extension, quick feet"
        ),
    ]


def _get_hypertrophy_exercises() -> list[Exercise]:
    """Get exercises optimized for muscle growth."""
    return [
        Exercise(
            id="ex_101",
            name="Dumbbell Bench Press",
            description="Bilateral chest press, increased ROM",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Chest",
            secondary_muscle_groups=["Triceps", "Shoulders"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Control the negative, full stretch"
        ),
        Exercise(
            id="ex_102",
            name="Incline Dumbbell Press",
            description="Upper chest emphasis, shoulder-friendly",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Chest",
            secondary_muscle_groups=["Shoulders", "Triceps"],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.LONG,
            notes="30-45 degree incline, controlled reps"
        ),
        Exercise(
            id="ex_103",
            name="Machine Chest Press",
            description="Controlled chest pressing, safety",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Chest",
            secondary_muscle_groups=["Triceps", "Shoulders"],
            difficulty_level=5,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Full ROM, squeeze at the top"
        ),
        Exercise(
            id="ex_104",
            name="Cable Flyes",
            description="Isolation chest, controlled movement",
            modality=ExerciseModality.ISOLATION,
            primary_muscle_group="Chest",
            secondary_muscle_groups=[],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Slight bend in elbows, squeeze pecs"
        ),
        Exercise(
            id="ex_105",
            name="Leg Press",
            description="Quad-dominant leg compound, safety",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Glutes", "Hamstrings"],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Full ROM, knees tracking toes"
        ),
        Exercise(
            id="ex_106",
            name="Leg Curl Machine",
            description="Hamstring isolation, controlled movement",
            modality=ExerciseModality.ISOLATION,
            primary_muscle_group="Hamstrings",
            secondary_muscle_groups=[],
            difficulty_level=5,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Full ROM, squeeze at the top"
        ),
        Exercise(
            id="ex_107",
            name="Leg Extension",
            description="Quadriceps isolation, joint-friendly",
            modality=ExerciseModality.ISOLATION,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=[],
            difficulty_level=5,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Full ROM, peak contraction squeeze"
        ),
        Exercise(
            id="ex_108",
            name="Barbell Rows (Underhand)",
            description="Underhand row, bicep emphasis",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Lats",
            secondary_muscle_groups=["Biceps", "Back"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Elbows tucked, chest to bar"
        ),
        Exercise(
            id="ex_109",
            name="Pull-ups / Chin-ups",
            description="Upper back and arm compound",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Lats",
            secondary_muscle_groups=["Biceps", "Back"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Full ROM, control the negative"
        ),
        Exercise(
            id="ex_110",
            name="Dumbbell Curls",
            description="Bicep isolation, arm growth",
            modality=ExerciseModality.ISOLATION,
            primary_muscle_group="Biceps",
            secondary_muscle_groups=[],
            difficulty_level=4,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Control the negative, squeeze peak"
        ),
        Exercise(
            id="ex_111",
            name="Cable Rows",
            description="Controlled row variation, back pump",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Lats",
            secondary_muscle_groups=["Back", "Biceps"],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Squeeze back, full stretch"
        ),
        Exercise(
            id="ex_112",
            name="Tricep Dips",
            description="Tricep compound movement",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Triceps",
            secondary_muscle_groups=["Chest"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Lean slightly forward, full ROM"
        ),
    ]


def _get_endurance_exercises() -> list[Exercise]:
    """Get exercises optimized for endurance and conditioning."""
    return [
        Exercise(
            id="ex_201",
            name="Treadmill Running",
            description="Steady-state cardio, aerobic development",
            modality=ExerciseModality.CARDIO,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=5,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Maintain steady pace, proper form"
        ),
        Exercise(
            id="ex_202",
            name="Rowing Machine",
            description="Full-body endurance, low impact",
            modality=ExerciseModality.CARDIO,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Drive through legs first, maintain rhythm"
        ),
        Exercise(
            id="ex_203",
            name="Stationary Bike",
            description="Lower body cardio, joint-friendly",
            modality=ExerciseModality.CARDIO,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Glutes"],
            difficulty_level=5,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Keep cadence consistent, adjust resistance"
        ),
        Exercise(
            id="ex_204",
            name="Elliptical",
            description="Full-body low-impact cardio",
            modality=ExerciseModality.CARDIO,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=4,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Smooth, controlled movement"
        ),
        Exercise(
            id="ex_205",
            name="Swimming",
            description="Full-body endurance, low impact",
            modality=ExerciseModality.CARDIO,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Proper breathing and technique"
        ),
        Exercise(
            id="ex_206",
            name="Battle Ropes",
            description="High-intensity cardio and power",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Explosive arm movements, wide stance"
        ),
        Exercise(
            id="ex_207",
            name="Jump Rope",
            description="Footwork and cardiovascular fitness",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Calves",
            secondary_muscle_groups=["Full Body"],
            difficulty_level=5,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Keep wrists loose, land on balls of feet"
        ),
        Exercise(
            id="ex_208",
            name="Circuit Training",
            description="Multiple exercises performed in sequence",
            modality=ExerciseModality.ACCESSORY,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.SHORT,
            notes="Minimal rest between exercises"
        ),
    ]


def _get_power_exercises() -> list[Exercise]:
    """Get exercises optimized for power development."""
    return [
        Exercise(
            id="ex_301",
            name="Power Clean",
            description="Explosive Olympic lift, power development",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=10,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="Explosive hip extension, quick feet"
        ),
        Exercise(
            id="ex_302",
            name="Box Jumps",
            description="Lower body plyometric power",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Glutes", "Calves"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Explosive jump, stick landing"
        ),
        Exercise(
            id="ex_303",
            name="Medicine Ball Slams",
            description="Core and explosive power development",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Core",
            secondary_muscle_groups=["Shoulders"],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Explosive slam, absorb rebound"
        ),
        Exercise(
            id="ex_304",
            name="Plyometric Push-ups",
            description="Upper body explosive power",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Chest",
            secondary_muscle_groups=["Triceps"],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Explosive push, control landing"
        ),
        Exercise(
            id="ex_305",
            name="Barbell Back Squat (Paused)",
            description="Strength base for power development",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Quadriceps",
            secondary_muscle_groups=["Glutes", "Hamstrings"],
            difficulty_level=8,
            rest_period_recommendation=RestPeriod.EXTENDED,
            notes="2-second pause at bottom"
        ),
        Exercise(
            id="ex_306",
            name="Landmine Rotational Press",
            description="Explosive rotational power",
            modality=ExerciseModality.COMPOUND,
            primary_muscle_group="Core",
            secondary_muscle_groups=["Shoulders"],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Explosive press through rotation"
        ),
        Exercise(
            id="ex_307",
            name="Kettlebell Swings",
            description="Explosive hip drive and power",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Hamstrings",
            secondary_muscle_groups=["Glutes", "Core"],
            difficulty_level=6,
            rest_period_recommendation=RestPeriod.MODERATE,
            notes="Explosive hip snap at top"
        ),
        Exercise(
            id="ex_308",
            name="Broad Jumps",
            description="Horizontal power development",
            modality=ExerciseModality.PLYOMETRIC,
            primary_muscle_group="Full Body",
            secondary_muscle_groups=[],
            difficulty_level=7,
            rest_period_recommendation=RestPeriod.LONG,
            notes="Explosive jump for distance"
        ),
    ]


def _get_all_base_exercises() -> list[Exercise]:
    """Get all base exercises regardless of goal."""
    all_exercises = (
        _get_strength_exercises() +
        _get_hypertrophy_exercises() +
        _get_endurance_exercises() +
        _get_power_exercises()
    )
    # Remove duplicates by ID
    seen = set()
    unique_exercises = []
    for ex in all_exercises:
        if ex.id not in seen:
            seen.add(ex.id)
            unique_exercises.append(ex)
    return unique_exercises
