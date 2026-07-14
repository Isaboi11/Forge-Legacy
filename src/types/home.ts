export type MissionGoal = {
  label: string
}

export type MissionProgram = {
  name: string
  workoutsComplete: number
  workoutsTotal: number
}

export type MissionTodaySession = {
  title: string
  meta: string
}

export type MissionData = {
  weekLabel: string
  chapterName: string
  forgingSinceLabel: string
  tags: string[]
  goal: MissionGoal
  program: MissionProgram
  todaySession: MissionTodaySession
}

export type HomeData = {
  mission: MissionData
}
