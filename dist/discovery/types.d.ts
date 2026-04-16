/**
 * Discovery types — device and controller property interfaces.
 */
export interface Device {
    address: string;
    vendorId: number;
    deviceType: number;
    productCode: number;
    revision: string;
    status: number;
    serialNumber: string;
    productName: string;
    state: number;
}
export interface ControllerProperties {
    name: string;
    serialNumber: number;
    version: string;
    status: number;
    faulted: boolean;
    run: boolean;
    program: boolean;
}
export interface ModuleProperties {
    vendorId: number;
    deviceType: number;
    productCode: number;
    revision: string;
    serialNumber: number;
    productName: string;
}
//# sourceMappingURL=types.d.ts.map