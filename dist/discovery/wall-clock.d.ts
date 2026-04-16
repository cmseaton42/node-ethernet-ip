/**
 * Wall Clock — Get/Set Attribute Single on WallClock Object.
 * Per CIP Vol 1 — WallClock Object (Class 0x8B, Instance 0x01, Attribute 0x05)
 */
export declare function buildReadWallClockRequest(): Buffer;
/** Parse wall clock response into a Date. Fields: year, month, day, hour, min, sec, microsec */
export declare function parseWallClockResponse(data: Buffer): Date;
export declare function buildWriteWallClockRequest(date: Date): Buffer;
//# sourceMappingURL=wall-clock.d.ts.map