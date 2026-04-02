export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum VOStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
}

export enum VOType {
  BUDGET = 'BUDGET',
  TIMELINE = 'TIMELINE',
  SCOPE = 'SCOPE',
  COMBINED = 'COMBINED',
}

export enum HealthStatus {
  GREEN = 'GREEN', // SPI >= 0.9 && CPI >= 0.9
  YELLOW = 'YELLOW', // SPI >= 0.8 || CPI >= 0.8
  RED = 'RED', // SPI < 0.8 || CPI < 0.8
}
