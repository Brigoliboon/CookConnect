// Web Bluetooth transport for wireless thermal printers.
// Most BLE thermal printers (58mm/80mm) expose a write-only characteristic that
// accepts raw ESC/POS bytes. Service/characteristic UUIDs vary by vendor, so the
// defaults below cover the most common convention (FF00 / FF02) and are overridable.

export interface ThermalPrinterConfig {
  /** Optional device name prefix filter shown in the browser pairing dialog. */
  namePrefix?: string
  /** GATT primary service UUID. Default: 0xff00 */
  serviceUuid?: number | string
  /** Write characteristic UUID. Default: 0xff02 */
  writeCharacteristicUuid?: number | string
  /** Write mode for the characteristic. Default: "reliable" */
  writeType?: "reliable" | "no-response"
}

export class ThermalPrinterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ThermalPrinterError"
  }
}

const DEFAULT_CONFIG: Required<ThermalPrinterConfig> = {
  namePrefix: "",
  serviceUuid: 0xff00,
  writeCharacteristicUuid: 0xff02,
  writeType: "reliable",
}

let cachedCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
let cachedDevice: BluetoothDevice | null = null

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator
}

/**
 * Ensures a connected printer is available and returns its write characteristic.
 * Reuses an already-paired connection within the same browser session so repeat
 * prints don't trigger the pairing dialog again.
 */
export async function connectPrinter(
  config: ThermalPrinterConfig = {},
): Promise<BluetoothRemoteGATTCharacteristic> {
  const merged: Required<ThermalPrinterConfig> = { ...DEFAULT_CONFIG, ...config }

  if (!isBluetoothSupported()) {
    throw new ThermalPrinterError(
      "Web Bluetooth is not supported in this browser. Use Chrome or Edge on a device with Bluetooth.",
    )
  }

  if (cachedCharacteristic?.service.device.gatt?.connected) {
    return cachedCharacteristic
  }
  cachedCharacteristic = null
  cachedDevice = null

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: merged.namePrefix ? [{ namePrefix: merged.namePrefix }] : undefined,
      optionalServices: [merged.serviceUuid],
      acceptAllDevices: !merged.namePrefix,
    })
    cachedDevice = device

    const server = await device.gatt?.connect()
    if (!server) throw new ThermalPrinterError("Failed to connect to the printer.")
    const service = await server.getPrimaryService(merged.serviceUuid)
    const characteristic = await service.getCharacteristic(merged.writeCharacteristicUuid)
    cachedCharacteristic = characteristic
    return characteristic
  } catch (err) {
    if (err instanceof ThermalPrinterError) throw err
    if (err instanceof DOMException && err.name === "NotFoundError") {
      throw new ThermalPrinterError("Printer not found. Check that it is powered on and in range.")
    }
    if (err instanceof DOMException && err.name === "SecurityError") {
      throw new ThermalPrinterError(
        "Bluetooth access was denied. This feature requires HTTPS and a Bluetooth-capable device.",
      )
    }
    throw new ThermalPrinterError("Unable to connect to the printer.")
  }
}

export async function disconnectPrinter(): Promise<void> {
  cachedDevice?.gatt?.disconnect()
  cachedCharacteristic = null
  cachedDevice = null
}

/**
 * Sends raw ESC/POS bytes to the connected printer. Some vendors only accept a
 * single large write per characteristic operation, so the payload is chunked.
 */
export async function writePrinter(
  data: Uint8Array,
  config: ThermalPrinterConfig = {},
): Promise<void> {
  const merged: Required<ThermalPrinterConfig> = { ...DEFAULT_CONFIG, ...config }
  const characteristic =
    cachedCharacteristic ?? (await connectPrinter(config))

  const chunkSize = 512
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = Uint8Array.from(data.subarray(i, i + chunkSize))
    if (merged.writeType === "no-response") {
      await characteristic.writeValueWithoutResponse(chunk)
    } else {
      await characteristic.writeValue(chunk)
    }
  }
}
