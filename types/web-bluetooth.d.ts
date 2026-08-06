// Minimal ambient types for the Web Bluetooth API (navigator.bluetooth).
// These match the WHATWG Web Bluetooth spec surface used by the thermal printer stack.
// Without them, TS has no knowledge of navigator.bluetooth.

interface BluetoothAdvertisingEvent extends Event {
  readonly device: BluetoothDevice
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly service: BluetoothRemoteGATTService
  readonly uuid: string
  readonly properties: {
    broadcast: boolean
    read: boolean
    writeWithoutResponse: boolean
    write: boolean
    notify: boolean
    indicate: boolean
    authenticatedSignedWrites: boolean
    reliableWrite: boolean
    writableAuxiliaries: boolean
  }
  readonly value: DataView | null
  getValue(): DataView | null
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(
    type: "characteristicvaluechanged",
    listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => void,
  ): void
}

interface BluetoothRemoteGATTService {
  readonly device: BluetoothDevice
  readonly uuid: string
  readonly isPrimary: boolean
  getCharacteristic(
    characteristic: BluetoothCharacteristicUUID,
  ): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(
    characteristic?: BluetoothCharacteristicUUID,
  ): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTServer {
  readonly device: BluetoothDevice
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name: string
  readonly gatt: BluetoothRemoteGATTServer | undefined
  watchAdvertisements(): Promise<void>
  unwatchAdvertisements(): void
  readonly watchingAdvertisements: boolean
  addEventListener(type: "advertisementreceived", listener: (this: BluetoothDevice, ev: BluetoothAdvertisingEvent) => void): void
}

interface Bluetooth {
  getDevices(): Promise<BluetoothDevice[]>
  getAvailability(): Promise<boolean>
  requestDevice(options: {
    filters?: { name?: string; namePrefix?: string; services?: BluetoothServiceUUID[] }[]
    optionalServices?: BluetoothServiceUUID[]
    acceptAllDevices?: boolean
  }): Promise<BluetoothDevice>
}

interface Navigator {
  bluetooth: Bluetooth
}

type BluetoothCharacteristicUUID = number | string
type BluetoothServiceUUID = number | string
