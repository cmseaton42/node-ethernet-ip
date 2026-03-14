import { parseListIdentityResponse, buildListIdentityRequest } from '@/discovery/list-identity';
import { parseControllerProps, buildGetControllerPropsRequest } from '@/discovery/controller-props';
import {
  parseWallClockResponse,
  buildReadWallClockRequest,
  buildWriteWallClockRequest,
} from '@/discovery/wall-clock';
import { buildGenericCIPMessage } from '@/discovery/generic-message';
import { EIPCommand } from '@/encapsulation/commands';
import { CIPService } from '@/cip/services';

describe('ListIdentity', () => {
  it('builds a ListIdentity request', () => {
    const buf = buildListIdentityRequest();
    expect(buf.readUInt16LE(0)).toBe(EIPCommand.ListIdentity);
  });

  it('parses a ListIdentity response', () => {
    // Build mock response data
    const data = Buffer.alloc(40);
    let ptr = 0;
    data.writeUInt16LE(1, ptr);
    ptr += 2; // encap version
    data.writeUInt16BE(2, ptr);
    ptr += 2; // sin_family
    data.writeUInt16BE(44818, ptr);
    ptr += 2; // sin_port
    data.writeUInt8(192, ptr);
    ptr += 1; // IP octets
    data.writeUInt8(168, ptr);
    ptr += 1;
    data.writeUInt8(1, ptr);
    ptr += 1;
    data.writeUInt8(100, ptr);
    ptr += 1;
    ptr += 8; // sin_zero
    data.writeUInt16LE(1, ptr);
    ptr += 2; // vendorId
    data.writeUInt16LE(14, ptr);
    ptr += 2; // deviceType
    data.writeUInt16LE(55, ptr);
    ptr += 2; // productCode
    data.writeUInt8(32, ptr);
    ptr += 1; // major
    data.writeUInt8(11, ptr);
    ptr += 1; // minor
    data.writeUInt16LE(0x0060, ptr);
    ptr += 2; // status (run)
    data.writeUInt32LE(0xaabbccdd, ptr);
    ptr += 4; // serial
    data.writeUInt8(4, ptr);
    ptr += 1; // name length
    data.write('L85E', ptr, 'ascii');
    ptr += 4;
    data.writeUInt8(3, ptr); // state

    const device = parseListIdentityResponse(data);
    expect(device.address).toBe('192.168.1.100');
    expect(device.vendorId).toBe(1);
    expect(device.revision).toBe('32.11');
    expect(device.productName).toBe('L85E');
    expect(device.serialNumber).toBe('0xaabbccdd');
  });
});

describe('ControllerProps', () => {
  it('builds Get Attribute All request', () => {
    const buf = buildGetControllerPropsRequest();
    expect(buf[0]).toBe(CIPService.GET_ATTRIBUTE_ALL);
  });

  it('parses controller properties', () => {
    const data = Buffer.alloc(20);
    let ptr = 0;
    data.writeUInt16LE(1, ptr);
    ptr += 2; // vendor
    data.writeUInt16LE(14, ptr);
    ptr += 2; // device type
    data.writeUInt16LE(55, ptr);
    ptr += 2; // product code
    data.writeUInt8(32, ptr);
    ptr += 1; // major
    data.writeUInt8(11, ptr);
    ptr += 1; // minor
    data.writeUInt16LE(0x0060, ptr);
    ptr += 2; // status (run mode)
    data.writeUInt32LE(12345, ptr);
    ptr += 4; // serial
    data.writeUInt8(4, ptr);
    ptr += 1; // name length
    data.write('L85E', ptr, 'ascii');

    const props = parseControllerProps(data);
    expect(props.name).toBe('L85E');
    expect(props.version).toBe('32.11');
    expect(props.serialNumber).toBe(12345);
    expect(props.run).toBe(true);
    expect(props.program).toBe(false);
    expect(props.faulted).toBe(false);
  });
});

describe('WallClock', () => {
  it('builds read request', () => {
    const buf = buildReadWallClockRequest();
    expect(buf[0]).toBe(CIPService.GET_ATTRIBUTE_SINGLE);
  });

  it('builds write request', () => {
    const buf = buildWriteWallClockRequest(new Date(2025, 2, 15, 10, 30, 0, 500));
    expect(buf[0]).toBe(CIPService.SET_ATTRIBUTE_SINGLE);
  });

  it('parses wall clock response', () => {
    const data = Buffer.alloc(28);
    data.writeUInt32LE(2025, 0); // year
    data.writeUInt32LE(3, 4); // month (March)
    data.writeUInt32LE(15, 8); // day
    data.writeUInt32LE(10, 12); // hour
    data.writeUInt32LE(30, 16); // minute
    data.writeUInt32LE(45, 20); // second
    data.writeUInt32LE(500000, 24); // microseconds

    const date = parseWallClockResponse(data);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(2); // 0-based
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
    expect(date.getSeconds()).toBe(45);
    expect(date.getMilliseconds()).toBe(500);
  });
});

describe('GenericCIPMessage', () => {
  it('builds with class/instance only', () => {
    const buf = buildGenericCIPMessage(0x01, 0x01, 0x01);
    expect(buf[0]).toBe(0x01); // service
  });

  it('builds with attribute', () => {
    const buf = buildGenericCIPMessage(0x0e, 0x8b, 0x01, 0x05);
    expect(buf[0]).toBe(0x0e); // GET_ATTRIBUTE_SINGLE
  });

  it('builds with data', () => {
    const data = Buffer.from([0xaa, 0xbb]);
    const buf = buildGenericCIPMessage(0x10, 0x01, 0x01, 0x05, data);
    expect(buf[0]).toBe(0x10); // SET_ATTRIBUTE_SINGLE
    expect(buf.length).toBeGreaterThan(6);
  });
});
