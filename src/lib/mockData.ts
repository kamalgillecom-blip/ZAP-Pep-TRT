// Demo/mock data that seeds a new user's account so they can see the app working.
// All documents are tagged with isMockData: true for easy removal.

const now = Date.now()
const day = 86_400_000

const d = (daysAgo: number) => now - daysAgo * day

export const MOCK_VIALS = [
  {
    id: 'mock_vial_bpc',
    compoundName: 'BPC-157',
    concentrationMgPerMl: 1,
    totalVolumeMl: 5,
    remainingVolumeMl: 3.2,
    isActive: true,
    reconstitutionDate: d(18),
    expiryDate: d(-72),
    notes: 'Amber vial, fridge right shelf',
    isMockData: true,
  },
  {
    id: 'mock_vial_tb',
    compoundName: 'TB-500',
    concentrationMgPerMl: 2,
    totalVolumeMl: 5,
    remainingVolumeMl: 4.0,
    isActive: true,
    reconstitutionDate: d(10),
    expiryDate: d(-80),
    notes: 'Combined with BPC protocol',
    isMockData: true,
  },
  {
    id: 'mock_vial_trt',
    compoundName: 'Testosterone Cypionate',
    concentrationMgPerMl: 200,
    totalVolumeMl: 10,
    remainingVolumeMl: 7.0,
    isActive: true,
    reconstitutionDate: d(20),
    expiryDate: d(-160),
    notes: '200mg/mL — weekly pinning',
    isMockData: true,
  },
  {
    id: 'mock_vial_ghk',
    compoundName: 'GHK-Cu',
    concentrationMgPerMl: 0.5,
    totalVolumeMl: 5,
    remainingVolumeMl: 5.0,
    isActive: false,
    reconstitutionDate: d(45),
    expiryDate: d(-45),
    notes: 'Finished protocol',
    isMockData: true,
  },
]

export const MOCK_DOSE_LOGS = [
  // BPC-157 doses — last 14 days, twice daily
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(0) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(0) + 20 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(1) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(1) + 20 * 3600_000, notes: 'Sleep quality great', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(2) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(2) + 20 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(3) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(4) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(5) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(6) + 8 * 3600_000, notes: 'Knee feeling better', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(7) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(8) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(9) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(10) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(11) + 8 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'BPC-157', doseMg: 0.5, vialId: 'mock_vial_bpc', route: 'SubQ', site: 'Abdomen', dateTime: d(12) + 8 * 3600_000, notes: '', isMockData: true },
  // TB-500
  { compoundName: 'TB-500', doseMg: 2.0, vialId: 'mock_vial_tb', route: 'SubQ', site: 'Abdomen', dateTime: d(0) + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, vialId: 'mock_vial_tb', route: 'SubQ', site: 'Abdomen', dateTime: d(3) + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, vialId: 'mock_vial_tb', route: 'SubQ', site: 'Abdomen', dateTime: d(6) + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, vialId: 'mock_vial_tb', route: 'SubQ', site: 'Abdomen', dateTime: d(9) + 9 * 3600_000, notes: '', isMockData: true },
  // Testosterone — weekly
  { compoundName: 'Testosterone Cypionate', doseMg: 150, vialId: 'mock_vial_trt', route: 'IM', site: 'Glute R', dateTime: d(0) + 10 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'Testosterone Cypionate', doseMg: 150, vialId: 'mock_vial_trt', route: 'IM', site: 'Glute L', dateTime: d(7) + 10 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'Testosterone Cypionate', doseMg: 150, vialId: 'mock_vial_trt', route: 'IM', site: 'Glute R', dateTime: d(14) + 10 * 3600_000, notes: '', isMockData: true },
]

export const MOCK_BODY_COMPS = [
  { date: d(0), weightLbs: 193.4, bodyFatPercent: 14.2, waistInches: 33.5, chestInches: 42, armLeftInches: 15.5, armRightInches: 15.5, notes: '', isMockData: true },
  { date: d(7), weightLbs: 192.8, bodyFatPercent: 14.5, waistInches: 33.8, chestInches: 41.5, notes: '', isMockData: true },
  { date: d(14), weightLbs: 191.2, bodyFatPercent: 15.0, waistInches: 34.0, chestInches: 41.5, notes: '', isMockData: true },
  { date: d(21), weightLbs: 190.5, bodyFatPercent: 15.2, waistInches: 34.2, notes: '', isMockData: true },
  { date: d(30), weightLbs: 188.0, bodyFatPercent: 15.8, waistInches: 34.5, notes: 'Starting new protocol', isMockData: true },
]

export const MOCK_EXERCISE_LOGS = [
  {
    exerciseName: 'Bench Press', category: 'STRENGTH',
    sets: [{ reps: 8, weight: 185 }, { reps: 8, weight: 185 }, { reps: 6, weight: 205 }, { reps: 5, weight: 205 }],
    date: d(1), notes: 'Felt strong, new PR on last set', isMockData: true,
  },
  {
    exerciseName: 'Squat', category: 'STRENGTH',
    sets: [{ reps: 5, weight: 275 }, { reps: 5, weight: 275 }, { reps: 4, weight: 295 }],
    date: d(1), notes: '', isMockData: true,
  },
  {
    exerciseName: 'Deadlift', category: 'STRENGTH',
    sets: [{ reps: 5, weight: 315 }, { reps: 5, weight: 315 }, { reps: 3, weight: 335 }],
    date: d(3), notes: 'Lower back tight, stopped early', isMockData: true,
  },
  {
    exerciseName: 'Overhead Press', category: 'STRENGTH',
    sets: [{ reps: 8, weight: 115 }, { reps: 8, weight: 115 }, { reps: 6, weight: 125 }],
    date: d(5), notes: '', isMockData: true,
  },
  {
    exerciseName: 'Running', category: 'CARDIO',
    sets: null, durationMinutes: 30,
    date: d(2), notes: '5K easy pace', isMockData: true,
  },
]
