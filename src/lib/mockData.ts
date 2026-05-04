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
    color: '#00E5FF',   // cyan
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
    color: '#7C4DFF',   // purple
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
    color: '#FF6D00',   // orange
    isMockData: true,
  },
  {
    id: 'mock_vial_ipamorelin',
    compoundName: 'Ipamorelin',
    concentrationMgPerMl: 2,
    totalVolumeMl: 5,
    remainingVolumeMl: 4.5,
    isActive: true,
    reconstitutionDate: d(7),
    expiryDate: d(-83),
    notes: 'Night protocol — pre-bed',
    color: '#C4EF95',   // lime
    isMockData: true,
  },
  {
    id: 'mock_vial_cjc',
    compoundName: 'CJC-1295 no DAC',
    concentrationMgPerMl: 2,
    totalVolumeMl: 5,
    remainingVolumeMl: 4.0,
    isActive: true,
    reconstitutionDate: d(7),
    expiryDate: d(-83),
    notes: 'Stack with Ipamorelin',
    color: '#FF4081',   // pink
    isMockData: true,
  },
  {
    id: 'mock_vial_mk677',
    compoundName: 'MK-677',
    concentrationMgPerMl: 25,
    totalVolumeMl: 30,
    remainingVolumeMl: 25.0,
    isActive: true,
    reconstitutionDate: d(5),
    expiryDate: d(-85),
    notes: '25mg oral nightly',
    color: '#FFD740',   // amber
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
    color: '#69F0AE',   // green
    isMockData: true,
  },
  {
    id: 'mock_vial_sema',
    compoundName: 'Semaglutide',
    concentrationMgPerMl: 1,
    totalVolumeMl: 2,
    remainingVolumeMl: 1.5,
    isActive: true,
    reconstitutionDate: d(14),
    expiryDate: d(-76),
    notes: '0.5mg weekly injection',
    color: '#F06292',   // light pink
    isMockData: true,
  },
]

// Attribute trends — deterministic values showing realistic protocol improvements
const ENERGY_TREND    = [2, 2, 3, 2, 3, 3, 4, 3, 4, 4, 3, 4, 5, 4]  // 14 days BPC-157 morning
const SLEEP_TREND     = [2, 3, 2, 3, 3, 4, 3, 4, 4, 3, 5, 4, 5, 5]  // 14 days BPC-157 morning
const MW_TREND        = [3, 3, 3, 4, 3, 4, 4, 4, 5, 4, 5, 5, 5, 5]  // morning wood — TRT effect
const LIBIDO_TREND    = [3, 3, 4, 3, 4, 4, 4, 5, 4, 5, 5, 5, 5, 5]  // libido — TRT effect
const IPAM_SLEEP      = [3, 3, 4, 3, 4, 4, 5, 4, 5, 5]              // 10 nights Ipamorelin

export const MOCK_DOSE_LOGS = [
  // BPC-157 twice daily for 14 days — with attributes on morning doses
  ...Array.from({ length: 14 }, (_, i) => ([
    {
      compoundName: 'BPC-157', doseMg: 0.5, doseDisplayValue: 500, doseDisplayUnit: 'mcg',
      vialId: 'mock_vial_bpc', injectionSite: 'Abdomen',
      dateTime: d(i) + 8 * 3600_000,
      notes: i === 6 ? 'Knee feeling much better' : '',
      energyLevel: ENERGY_TREND[i],
      sleepQuality: SLEEP_TREND[i],
      mood: i < 5 ? 'Calm' : i < 10 ? 'Content' : 'Happy',
      mentalState: i < 7 ? 'Alert' : 'Motivated',
      isMockData: true,
    },
    {
      compoundName: 'BPC-157', doseMg: 0.5, doseDisplayValue: 500, doseDisplayUnit: 'mcg',
      vialId: 'mock_vial_bpc', injectionSite: 'Abdomen',
      dateTime: d(i) + 20 * 3600_000,
      notes: i === 1 ? 'Sleep quality great' : '',
      isMockData: true,
    },
  ])).flat(),
  // TB-500 every 3 days
  { compoundName: 'TB-500', doseMg: 2.0, doseDisplayValue: 2.0, doseDisplayUnit: 'mg', vialId: 'mock_vial_tb', injectionSite: 'Abdomen', dateTime: d(0)  + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, doseDisplayValue: 2.0, doseDisplayUnit: 'mg', vialId: 'mock_vial_tb', injectionSite: 'Abdomen', dateTime: d(3)  + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, doseDisplayValue: 2.0, doseDisplayUnit: 'mg', vialId: 'mock_vial_tb', injectionSite: 'Abdomen', dateTime: d(6)  + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, doseDisplayValue: 2.0, doseDisplayUnit: 'mg', vialId: 'mock_vial_tb', injectionSite: 'Abdomen', dateTime: d(9)  + 9 * 3600_000, notes: '', isMockData: true },
  { compoundName: 'TB-500', doseMg: 2.0, doseDisplayValue: 2.0, doseDisplayUnit: 'mg', vialId: 'mock_vial_tb', injectionSite: 'Abdomen', dateTime: d(12) + 9 * 3600_000, notes: '', isMockData: true },
  // Testosterone weekly — with libido/morning wood attributes
  {
    compoundName: 'Testosterone Cypionate', doseMg: 150, doseDisplayValue: 150, doseDisplayUnit: 'mg',
    vialId: 'mock_vial_trt', injectionSite: 'Glute R', dateTime: d(0) + 10 * 3600_000,
    notes: '', libidoQuality: LIBIDO_TREND[0], morningWood: MW_TREND[0], erectionQuality: 4, isMockData: true,
  },
  {
    compoundName: 'Testosterone Cypionate', doseMg: 150, doseDisplayValue: 150, doseDisplayUnit: 'mg',
    vialId: 'mock_vial_trt', injectionSite: 'Glute L', dateTime: d(7) + 10 * 3600_000,
    notes: '', libidoQuality: LIBIDO_TREND[7], morningWood: MW_TREND[7], erectionQuality: 4, isMockData: true,
  },
  {
    compoundName: 'Testosterone Cypionate', doseMg: 150, doseDisplayValue: 150, doseDisplayUnit: 'mg',
    vialId: 'mock_vial_trt', injectionSite: 'Glute R', dateTime: d(14) + 10 * 3600_000,
    notes: '', libidoQuality: LIBIDO_TREND[13], morningWood: MW_TREND[13], erectionQuality: 5, isMockData: true,
  },
  // Ipamorelin + CJC nightly — sleep quality on Ipamorelin
  ...Array.from({ length: 10 }, (_, i) => ([
    {
      compoundName: 'Ipamorelin', doseMg: 0.2, doseDisplayValue: 200, doseDisplayUnit: 'mcg',
      vialId: 'mock_vial_ipamorelin', injectionSite: 'Abdomen',
      dateTime: d(i) + 21 * 3600_000,
      notes: '', sleepQuality: IPAM_SLEEP[i], energyLevel: ENERGY_TREND[i] ?? 4,
      isMockData: true,
    },
    {
      compoundName: 'CJC-1295 no DAC', doseMg: 0.1, doseDisplayValue: 100, doseDisplayUnit: 'mcg',
      vialId: 'mock_vial_cjc', injectionSite: 'Abdomen',
      dateTime: d(i) + 21 * 3600_000 + 60_000,
      notes: '', isMockData: true,
    },
  ])).flat(),
  // MK-677 daily oral
  ...Array.from({ length: 7 }, (_, i) => (
    { compoundName: 'MK-677', doseMg: 25, doseDisplayValue: 25, doseDisplayUnit: 'mg', vialId: 'mock_vial_mk677', injectionSite: 'Oral', dateTime: d(i) + 22 * 3600_000, notes: '', isMockData: true }
  )),
  // Semaglutide weekly
  { compoundName: 'Semaglutide', doseMg: 0.5, doseDisplayValue: 0.5, doseDisplayUnit: 'mg', vialId: 'mock_vial_sema', injectionSite: 'Abdomen', dateTime: d(0) + 11 * 3600_000, notes: 'Week 4 — appetite suppression great', isMockData: true },
  { compoundName: 'Semaglutide', doseMg: 0.5, doseDisplayValue: 0.5, doseDisplayUnit: 'mg', vialId: 'mock_vial_sema', injectionSite: 'Abdomen', dateTime: d(7) + 11 * 3600_000, notes: '', isMockData: true },
]

export const MOCK_BODY_COMPS = [
  { date: d(0), weightLbs: 193.4, bodyFatPercent: 14.2, waistInches: 33.5, chestInches: 42, armLeftInches: 15.5, armRightInches: 15.5, notes: '', isMockData: true },
  { date: d(7), weightLbs: 192.8, bodyFatPercent: 14.5, waistInches: 33.8, chestInches: 41.5, notes: '', isMockData: true },
  { date: d(14), weightLbs: 191.2, bodyFatPercent: 15.0, waistInches: 34.0, chestInches: 41.5, notes: '', isMockData: true },
  { date: d(21), weightLbs: 190.5, bodyFatPercent: 15.2, waistInches: 34.2, notes: '', isMockData: true },
  { date: d(30), weightLbs: 188.0, bodyFatPercent: 15.8, waistInches: 34.5, notes: 'Starting new protocol', isMockData: true },
  { date: d(45), weightLbs: 185.5, bodyFatPercent: 16.5, waistInches: 35.0, notes: '', isMockData: true },
]

export const MOCK_EXERCISE_LOGS = [
  {
    exerciseName: 'Bench Press', category: 'STRENGTH',
    sets: [{ reps: 8, weight: 185 }, { reps: 8, weight: 185 }, { reps: 6, weight: 205 }, { reps: 5, weight: 205 }],
    date: d(1), notes: 'Felt strong — new PR on last set', isMockData: true,
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
  {
    exerciseName: 'Lat Pulldown', category: 'STRENGTH',
    sets: [{ reps: 12, weight: 140 }, { reps: 10, weight: 150 }, { reps: 8, weight: 160 }],
    date: d(5), notes: '', isMockData: true,
  },
  {
    exerciseName: 'Hip Thrust', category: 'STRENGTH',
    sets: [{ reps: 12, weight: 225 }, { reps: 10, weight: 245 }, { reps: 8, weight: 245 }],
    date: d(8), notes: 'Glutes firing well', isMockData: true,
  },
]
