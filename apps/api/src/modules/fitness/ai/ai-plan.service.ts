import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { WorkoutPlansService } from '../workouts/workout-plans.service';
import { DietPlansService } from '../diet/diet-plans.service';

/**
 * Generates workout and diet plans, filling the schema's isAiGenerated /
 * aiPrompt / aiResponse fields. Uses the Anthropic Messages API when
 * ANTHROPIC_API_KEY is configured; otherwise falls back to a deterministic
 * rule-based generator so the feature works in local/dev without a key.
 * Generated plans are saved as DRAFT and go through the existing
 * trainer-approval flow (POST :id/approve).
 */
@Injectable()
export class AiPlanService {
  private readonly logger = new Logger(AiPlanService.name);

  constructor(
    private prisma: PrismaService,
    private workoutPlans: WorkoutPlansService,
    private dietPlans: DietPlansService,
  ) {}

  private get apiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY || undefined;
  }

  private get model(): string {
    return process.env.AI_PLAN_MODEL || 'claude-sonnet-5';
  }

  private async memberContext(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, tenantId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!member) throw new NotFoundException('Member not found');
    const assessment = await this.prisma.bodyAssessment.findFirst({
      where: { tenantId, memberId },
      orderBy: { assessedAt: 'desc' },
    });
    return { member, assessment };
  }

  private async callAnthropic(prompt: string): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Anthropic API error ${res.status}: ${await res.text()}`);
        return null;
      }
      const data: any = await res.json();
      return data?.content?.[0]?.text ?? null;
    } catch (err) {
      this.logger.warn(`Anthropic API call failed: ${err}`);
      return null;
    }
  }

  /** Extract the first JSON object from an LLM response (handles ```json fences). */
  private parseJson(text: string): any | null {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  // ============================== WORKOUT ==============================

  async generateWorkoutPlan(tenantId: string, dto: any) {
    if (!dto?.memberId) throw new BadRequestException('memberId is required');
    const { member, assessment } = await this.memberContext(tenantId, dto.memberId);

    const goalType = dto.goalType || assessment?.goalType || member.goals || 'GENERAL_FITNESS';
    const fitnessLevel = dto.fitnessLevel || assessment?.fitnessLevel || 'BEGINNER';
    const daysPerWeek = Number(dto.daysPerWeek) || 3;
    const durationWeeks = Number(dto.durationWeeks) || 4;

    const prompt = [
      `Create a gym workout plan as strict JSON (no prose).`,
      `Member: ${member.user?.firstName ?? 'Member'}, goal ${goalType}, level ${fitnessLevel}.`,
      assessment ? `Latest assessment: weight ${assessment.weight}kg, BMI ${assessment.bmi}, body fat ${assessment.bodyFatPercent}%.` : '',
      dto.notes ? `Notes: ${dto.notes}` : '',
      `${daysPerWeek} training days per week for ${durationWeeks} weeks.`,
      `JSON shape: {"name":string,"description":string,"days":[{"dayNumber":number,"dayName":string,"muscleGroup":string,"isRestDay":boolean,"exercises":[{"name":string,"sets":number,"reps":number,"restSeconds":number,"equipment":string}]}]}`,
    ].filter(Boolean).join('\n');

    const aiText = await this.callAnthropic(prompt);
    const parsed = aiText ? this.parseJson(aiText) : null;
    const plan = parsed ?? this.fallbackWorkout(goalType, fitnessLevel, daysPerWeek);

    return this.workoutPlans.create(tenantId, {
      memberId: dto.memberId,
      trainerId: dto.trainerId,
      name: plan.name,
      description: plan.description,
      goalType,
      fitnessLevel,
      durationWeeks,
      daysPerWeek,
      status: 'DRAFT',
      isAiGenerated: true,
      aiPrompt: prompt,
      aiResponse: aiText ?? 'FALLBACK_RULE_BASED',
      workoutDays: (plan.days ?? []).map((d: any, i: number) => ({
        dayNumber: d.dayNumber ?? i + 1,
        dayName: d.dayName,
        muscleGroup: d.muscleGroup,
        isRestDay: d.isRestDay ?? false,
        exercises: d.exercises ?? [],
      })),
    });
  }

  private fallbackWorkout(goalType: string, fitnessLevel: string, daysPerWeek: number) {
    const heavy = fitnessLevel === 'ADVANCED';
    const reps = goalType === 'MUSCLE_GAIN' ? (heavy ? 6 : 10) : 12;
    const sets = heavy ? 4 : 3;
    const templates = [
      { dayName: 'Push Day', muscleGroup: 'Chest, Shoulders, Triceps', exercises: [
        { name: 'Bench Press', equipment: 'Barbell' }, { name: 'Overhead Press', equipment: 'Dumbbell' }, { name: 'Tricep Pushdown', equipment: 'Cable' }] },
      { dayName: 'Pull Day', muscleGroup: 'Back, Biceps', exercises: [
        { name: 'Lat Pulldown', equipment: 'Machine' }, { name: 'Seated Row', equipment: 'Machine' }, { name: 'Bicep Curl', equipment: 'Dumbbell' }] },
      { dayName: 'Leg Day', muscleGroup: 'Quads, Hamstrings, Glutes', exercises: [
        { name: 'Squat', equipment: 'Barbell' }, { name: 'Leg Press', equipment: 'Machine' }, { name: 'Romanian Deadlift', equipment: 'Barbell' }] },
      { dayName: 'Full Body', muscleGroup: 'Full Body', exercises: [
        { name: 'Deadlift', equipment: 'Barbell' }, { name: 'Push-ups', equipment: 'Bodyweight' }, { name: 'Plank', equipment: 'Bodyweight' }] },
      { dayName: 'Cardio & Core', muscleGroup: 'Cardio, Core', exercises: [
        { name: 'Treadmill Intervals', equipment: 'Machine' }, { name: 'Russian Twists', equipment: 'Bodyweight' }, { name: 'Mountain Climbers', equipment: 'Bodyweight' }] },
      { dayName: 'Upper Body', muscleGroup: 'Upper Body', exercises: [
        { name: 'Incline Dumbbell Press', equipment: 'Dumbbell' }, { name: 'Pull-ups', equipment: 'Bodyweight' }, { name: 'Lateral Raise', equipment: 'Dumbbell' }] },
    ];
    return {
      name: `${goalType.replace(/_/g, ' ')} ${daysPerWeek}-Day Program`,
      description: `Auto-generated ${fitnessLevel.toLowerCase()} program targeting ${goalType.replace(/_/g, ' ').toLowerCase()}.`,
      days: templates.slice(0, Math.min(daysPerWeek, templates.length)).map((t, i) => ({
        dayNumber: i + 1,
        dayName: t.dayName,
        muscleGroup: t.muscleGroup,
        isRestDay: false,
        exercises: t.exercises.map((e, j) => ({ ...e, sets, reps, restSeconds: heavy ? 120 : 60, sortOrder: j })),
      })),
    };
  }

  // ============================== DIET ==============================

  async generateDietPlan(tenantId: string, dto: any) {
    if (!dto?.memberId) throw new BadRequestException('memberId is required');
    const { member, assessment } = await this.memberContext(tenantId, dto.memberId);

    const goalType = dto.goalType || assessment?.goalType || 'GENERAL_FITNESS';
    const dietType = dto.dietType || 'NON_VEGETARIAN';
    const weight = Number(assessment?.weight ?? member.weight ?? 70);
    // Simple maintenance estimate adjusted by goal.
    const dailyCalories = Number(dto.dailyCalories) ||
      Math.round(weight * 30 + (goalType === 'MUSCLE_GAIN' ? 300 : goalType === 'WEIGHT_LOSS' ? -400 : 0));

    const foods = await this.prisma.nepaliFoodItem.findMany({
      where: { isActive: true, ...(dietType === 'VEGETARIAN' || dietType === 'VEGAN' ? { isVegetarian: true } : {}) },
      take: 40,
    });
    const foodList = foods.map((f) => `${f.name} (${f.servingSize}: ${f.calories}kcal P${f.protein} C${f.carbs} F${f.fats})`).join('; ');

    const prompt = [
      `Create a 1-day Nepali diet plan as strict JSON (no prose).`,
      `Member goal ${goalType}, diet type ${dietType}, target ${dailyCalories} kcal/day.`,
      dto.allergies ? `Allergies: ${dto.allergies}` : '',
      `Prefer these local foods: ${foodList}`,
      `JSON shape: {"name":string,"description":string,"proteinGrams":number,"carbsGrams":number,"fatsGrams":number,"fiberGrams":number,"meals":[{"mealType":"BREAKFAST"|"MORNING_SNACK"|"LUNCH"|"AFTERNOON_SNACK"|"DINNER"|"EVENING_SNACK","name":string,"foodItems":[{"name":string,"quantity":string,"calories":number,"protein":number,"carbs":number,"fats":number}],"totalCalories":number}]}`,
    ].filter(Boolean).join('\n');

    const aiText = await this.callAnthropic(prompt);
    const parsed = aiText ? this.parseJson(aiText) : null;
    const plan = parsed ?? this.fallbackDiet(goalType, dietType, dailyCalories, foods);

    return this.dietPlans.create(tenantId, {
      memberId: dto.memberId,
      name: plan.name,
      description: plan.description,
      dailyCalories,
      proteinGrams: plan.proteinGrams ?? Math.round((dailyCalories * 0.3) / 4),
      carbsGrams: plan.carbsGrams ?? Math.round((dailyCalories * 0.45) / 4),
      fatsGrams: plan.fatsGrams ?? Math.round((dailyCalories * 0.25) / 9),
      fiberGrams: plan.fiberGrams ?? 30,
      dietType,
      allergies: dto.allergies,
      status: 'DRAFT',
      isAiGenerated: true,
      meals: (plan.meals ?? []).map((m: any, i: number) => ({
        mealType: m.mealType,
        name: m.name ?? m.mealType,
        foodItems: m.foodItems,
        totalCalories: m.totalCalories,
        totalProtein: m.totalProtein,
        totalCarbs: m.totalCarbs,
        totalFats: m.totalFats,
        sortOrder: i,
      })),
    });
  }

  private fallbackDiet(goalType: string, dietType: string, dailyCalories: number, foods: any[]) {
    const byCat = (cat: string) => foods.filter((f) => f.category === cat);
    const pickFood = (cat: string, i: number) => {
      const list = byCat(cat).length ? byCat(cat) : foods;
      return list[i % list.length];
    };
    const split: Array<[string, number]> = [
      ['BREAKFAST', 0.25], ['MORNING_SNACK', 0.1], ['LUNCH', 0.3], ['AFTERNOON_SNACK', 0.1], ['DINNER', 0.25],
    ];
    const cats = ['STAPLE', 'BEVERAGE', 'PROTEIN', 'SNACK', 'VEGETABLE'];
    return {
      name: `${dietType} ${goalType.replace(/_/g, ' ')} Diet (${dailyCalories} kcal)`,
      description: `Auto-generated Nepali diet plan for ${goalType.replace(/_/g, ' ').toLowerCase()}.`,
      meals: split.map(([mealType, share], i) => {
        const f = pickFood(cats[i % cats.length], i);
        const target = Math.round(dailyCalories * share);
        const qty = f?.calories ? Math.max(1, Math.round(target / f.calories)) : 1;
        return {
          mealType,
          name: mealType.replace(/_/g, ' '),
          foodItems: f ? [{ name: f.name, quantity: `${qty} x ${f.servingSize}`, calories: (f.calories ?? 0) * qty, protein: Number(f.protein) * qty, carbs: Number(f.carbs) * qty, fats: Number(f.fats) * qty }] : [],
          totalCalories: f ? (f.calories ?? 0) * qty : target,
          totalProtein: f ? Number(f.protein) * qty : null,
          totalCarbs: f ? Number(f.carbs) * qty : null,
          totalFats: f ? Number(f.fats) * qty : null,
        };
      }),
    };
  }
}
