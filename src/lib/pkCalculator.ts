export interface DosePoint {
  doseMg: number
  halfLifeHours: number
  timeMillis: number
  compoundName: string
}

export interface TimeLevelPoint {
  timeMillis: number
  levelMg: number
}

export const PKCalculator = {
  eliminationConstant(halfLifeHours: number): number {
    return Math.LN2 / halfLifeHours
  },

  singleDoseLevel(doseMg: number, halfLifeHours: number, hoursElapsed: number): number {
    if (hoursElapsed < 0) return 0
    const k = this.eliminationConstant(halfLifeHours)
    return doseMg * Math.exp(-k * hoursElapsed)
  },

  totalLevel(doses: DosePoint[], evaluationTimeMillis: number): number {
    return doses.reduce((sum, dose) => {
      const hoursElapsed = (evaluationTimeMillis - dose.timeMillis) / 3_600_000
      if (hoursElapsed >= 0) {
        return sum + this.singleDoseLevel(dose.doseMg, dose.halfLifeHours, hoursElapsed)
      }
      return sum
    }, 0)
  },

  levelsByCompound(doses: DosePoint[], evaluationTimeMillis: number): Record<string, number> {
    const groups = doses.reduce((acc, d) => {
      if (!acc[d.compoundName]) acc[d.compoundName] = []
      acc[d.compoundName].push(d)
      return acc
    }, {} as Record<string, DosePoint[]>)

    return Object.fromEntries(
      Object.entries(groups).map(([name, compoundDoses]) => [
        name,
        compoundDoses.reduce((sum, dose) => {
          const hoursElapsed = (evaluationTimeMillis - dose.timeMillis) / 3_600_000
          return hoursElapsed >= 0 ? sum + this.singleDoseLevel(dose.doseMg, dose.halfLifeHours, hoursElapsed) : sum
        }, 0),
      ])
    )
  },

  generatePlotData(
    doses: DosePoint[],
    startMillis: number,
    endMillis: number,
    pointCount = 300
  ): Record<string, TimeLevelPoint[]> {
    const step = (endMillis - startMillis) / pointCount
    const groups = doses.reduce((acc, d) => {
      if (!acc[d.compoundName]) acc[d.compoundName] = []
      acc[d.compoundName].push(d)
      return acc
    }, {} as Record<string, DosePoint[]>)

    return Object.fromEntries(
      Object.entries(groups).map(([name, compoundDoses]) => [
        name,
        Array.from({ length: pointCount }, (_, i) => {
          const time = startMillis + i * step
          const level = compoundDoses.reduce((sum, dose) => {
            const hoursElapsed = (time - dose.timeMillis) / 3_600_000
            return hoursElapsed >= 0 ? sum + this.singleDoseLevel(dose.doseMg, dose.halfLifeHours, hoursElapsed) : sum
          }, 0)
          return { timeMillis: time, levelMg: level }
        }),
      ])
    )
  },

  steadyStatePeak(doseMg: number, halfLifeHours: number, intervalHours: number): number {
    const k = this.eliminationConstant(halfLifeHours)
    return doseMg / (1 - Math.exp(-k * intervalHours))
  },

  steadyStateTrough(doseMg: number, halfLifeHours: number, intervalHours: number): number {
    const peak = this.steadyStatePeak(doseMg, halfLifeHours, intervalHours)
    const k = this.eliminationConstant(halfLifeHours)
    return peak * Math.exp(-k * intervalHours)
  },
}
