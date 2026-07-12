export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  family: string;
  equipmentId: string;
  movementPattern: string;
  primaryMuscleIds: string[];
  secondaryMuscleIds: string[];
  difficulty: "Beginner"|"Intermediate"|"Advanced";
}
