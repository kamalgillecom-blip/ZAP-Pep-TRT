import { create } from 'zustand'
import type { User } from 'firebase/auth'
import type { DoseLog, Compound, Vial, BodyComposition, DoseSchedule, BloodWork, ExerciseLog, DailyLog, UserProfile } from '../types'

interface AppState {
  user: User | null
  profile: UserProfile | null
  compounds: Compound[]
  doseLogs: DoseLog[]
  vials: Vial[]
  bodyComps: BodyComposition[]
  schedules: DoseSchedule[]
  bloodWork: BloodWork[]
  exerciseLogs: ExerciseLog[]
  dailyLogs: DailyLog[]
  loading: boolean

  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setCompounds: (compounds: Compound[]) => void
  setDoseLogs: (logs: DoseLog[]) => void
  setVials: (vials: Vial[]) => void
  setBodyComps: (comps: BodyComposition[]) => void
  setSchedules: (schedules: DoseSchedule[]) => void
  setBloodWork: (bw: BloodWork[]) => void
  setExerciseLogs: (logs: ExerciseLog[]) => void
  setDailyLogs: (logs: DailyLog[]) => void
  setLoading: (loading: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  profile: null,
  compounds: [],
  doseLogs: [],
  vials: [],
  bodyComps: [],
  schedules: [],
  bloodWork: [],
  exerciseLogs: [],
  dailyLogs: [],
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setCompounds: (compounds) => set({ compounds }),
  setDoseLogs: (doseLogs) => set({ doseLogs }),
  setVials: (vials) => set({ vials }),
  setBodyComps: (bodyComps) => set({ bodyComps }),
  setSchedules: (schedules) => set({ schedules }),
  setBloodWork: (bloodWork) => set({ bloodWork }),
  setExerciseLogs: (exerciseLogs) => set({ exerciseLogs }),
  setDailyLogs: (dailyLogs) => set({ dailyLogs }),
  setLoading: (loading) => set({ loading }),
}))
