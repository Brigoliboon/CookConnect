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
  { id: "C-001", name: "Maria Santos", email: "maria.santos@email.com", phone: "09171234567", address: "123 Rizal St, Manila", location: { lat: 14.5995, lng: 120.9842 }, isActive: true, createdAt: "2025-01-15" },
  { id: "C-002", name: "Jose Garcia", email: "jose.garcia@email.com", phone: "09179876543", address: "456 Mabini Ave, Quezon City", location: { lat: 14.6507, lng: 121.0429 }, isActive: true, createdAt: "2025-02-20" },
  { id: "C-003", name: "Ana Cruz", email: "ana.cruz@email.com", phone: "09175678901", address: "789 Bonifacio Rd, Makati", location: { lat: 14.5547, lng: 121.0244 }, isActive: false, createdAt: "2025-03-10" },
  { id: "C-004", name: "Pedro Reyes", email: "pedro.reyes@email.com", phone: "09173456789", address: "321 Luna St, Taguig", location: { lat: 14.5176, lng: 121.0509 }, isActive: true, createdAt: "2025-04-05" },
  { id: "C-005", name: "Carla Jimenez", email: "carla.jimenez@email.com", phone: "09172223344", address: "555 Shaw Blvd, Mandaluyong", location: { lat: 14.5764, lng: 121.0351 }, isActive: true, createdAt: "2025-05-12" },
  { id: "C-006", name: "Benigno Aquino", email: "benigno.aquino@email.com", phone: "09175556677", address: "88 Edsa Ave, Pasay", location: { lat: 14.5378, lng: 121.0014 }, isActive: false, createdAt: "2025-06-01" },
]
