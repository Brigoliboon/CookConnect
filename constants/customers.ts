export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  location: {
    lat: number
    lng: number
  }
  isActive: boolean
  createdAt: string
}

export const CUSTOMER_STATUS_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Disabled", value: "false" },
] as const

export const CUSTOMERS: Customer[] = [
  { id: "C-001", name: "Maria Santos", email: "maria.santos@email.com", phone: "09171234567", address: "Sheikh Zayed Rd, Dubai", location: { lat: 25.2048, lng: 55.2708 }, isActive: true, createdAt: "2025-01-15" },
  { id: "C-002", name: "Jose Garcia", email: "jose.garcia@email.com", phone: "09179876543", address: "Corniche Rd, Abu Dhabi", location: { lat: 24.4539, lng: 54.3773 }, isActive: true, createdAt: "2025-02-20" },
  { id: "C-003", name: "Ana Cruz", email: "ana.cruz@email.com", phone: "09175678901", address: "Al Qasba, Sharjah", location: { lat: 25.3463, lng: 55.4209 }, isActive: false, createdAt: "2025-03-10" },
  { id: "C-004", name: "Pedro Reyes", email: "pedro.reyes@email.com", phone: "09173456789", address: "Al Majaz, Sharjah", location: { lat: 25.3202, lng: 55.3859 }, isActive: true, createdAt: "2025-04-05" },
  { id: "C-005", name: "Carla Jimenez", email: "carla.jimenez@email.com", phone: "09172223344", address: "Al Reem Island, Abu Dhabi", location: { lat: 24.4825, lng: 54.4038 }, isActive: true, createdAt: "2025-05-12" },
  { id: "C-006", name: "Benigno Aquino", email: "benigno.aquino@email.com", phone: "09175556677", address: "Dubai Marina, Dubai", location: { lat: 25.0799, lng: 55.1400 }, isActive: false, createdAt: "2025-06-01" },
]
