export interface Compound {
  id: string
  name: string
  category: 'PEPTIDE' | 'TRT' | 'AAS' | 'SARM' | 'AI' | 'SERM' | 'OTHER' | 'MEDICATION' | 'SUPPLEMENT'
  halfLifeHours: number
  defaultDoseUnit: 'mcg' | 'mg' | 'IU' | 'ml'
  defaultRouteOfAdmin: 'SUBQ' | 'IM' | 'IV' | 'ORAL' | 'TOPICAL' | 'NASAL'
  description?: string
  isCustom?: boolean
}

export interface DoseLog {
  id: string
  userId: string
  compoundId: string
  compoundName: string
  doseMg: number
  doseDisplayValue: number
  doseDisplayUnit: string
  dateTime: number
  injectionSite?: string
  vialId?: string
  notes?: string
}

export interface DoseAttribute {
  id: string
  doseLogId: string
  dateTime: number
  mood?: number
  energyLevel?: number
  sleepQuality?: number
  sleepHours?: number
  mentalState?: number
  erectionQuality?: number
  libidoQuality?: number
  irritationAggression?: number
  nippleSensitivity?: number
  morningWood?: number
  notes?: string
}

export interface Vial {
  id: string
  userId: string
  compoundId: string
  compoundName: string
  totalAmountMg: number
  remainingAmountMg: number
  bacWaterMl?: number
  concentrationMgPerMl?: number
  reconstitutionDate?: number
  expirationDate?: number
  lotNumber?: string
  vendor?: string
  labelText?: string
  isActive: boolean
  color?: string
}

export interface BodyComposition {
  id: string
  userId: string
  date: number
  weightLbs: number
  bodyFatPercent?: number
  waistInches?: number
  chestInches?: number
  armLeftInches?: number
  armRightInches?: number
  thighLeftInches?: number
  thighRightInches?: number
  shouldersInches?: number
  neckInches?: number
  notes?: string
}

export interface DoseSchedule {
  id: string
  userId: string
  compoundId: string
  compoundName: string
  doseValue: number
  doseUnit: string
  timeOfDay: string
  repeatType: 'daily' | 'weekly' | 'every_n_days' | 'every_n_weeks' | 'monthly_date' | 'monthly_weekday'
  daysOfWeek: string
  intervalDays?: number
  monthDay?: number
  monthWeek?: number
  monthWeekday?: number
  vialId?: string
  vialColor?: string
  isActive: boolean
}

export interface BloodWork {
  id: string
  userId: string
  date: number
  labName?: string
  notes?: string
  markers: BloodWorkMarker[]
}

export interface BloodWorkMarker {
  id: string
  bloodWorkId: string
  markerName: string
  value: number
  unit: string
  referenceRangeLow?: number
  referenceRangeHigh?: number
  isOutOfRange?: boolean
}

export interface ExerciseLog {
  id: string
  userId: string
  exerciseName: string
  category: 'STRENGTH' | 'CARDIO' | 'FLEXIBILITY' | 'OTHER'
  sets?: number
  reps?: number
  weightLbs?: number
  durationMinutes?: number
  notes?: string
  date: number
}

export interface DailyLog {
  id: string
  userId: string
  dateKey: string
  notes?: string
  sleepHours?: number
  caloriesKcal?: number
  proteinG?: number
  fatG?: number
  carbsG?: number
}

export interface UserProfile {
  uid: string
  email?: string
  unitSystem: 'US' | 'CA'
  gender?: string
  weightLbs?: number
  heightInches?: number
}
