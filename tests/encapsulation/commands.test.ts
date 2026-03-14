import { EIPCommand, getCommandName, isValidCommand, parseStatus } from '@/encapsulation/commands';

describe('EIPCommand enum', () => {
  it('has correct hex values', () => {
    expect(EIPCommand.NOP).toBe(0x00);
    expect(EIPCommand.ListServices).toBe(0x04);
    expect(EIPCommand.ListIdentity).toBe(0x63);
    expect(EIPCommand.ListInterfaces).toBe(0x64);
    expect(EIPCommand.RegisterSession).toBe(0x65);
    expect(EIPCommand.UnregisterSession).toBe(0x66);
    expect(EIPCommand.SendRRData).toBe(0x6f);
    expect(EIPCommand.SendUnitData).toBe(0x70);
    expect(EIPCommand.IndicateStatus).toBe(0x72);
    expect(EIPCommand.Cancel).toBe(0x73);
  });
});

describe('getCommandName', () => {
  it('returns name for valid commands', () => {
    expect(getCommandName(0x65)).toBe('RegisterSession');
    expect(getCommandName(0x6f)).toBe('SendRRData');
    expect(getCommandName(0x70)).toBe('SendUnitData');
  });

  it('returns null for invalid codes', () => {
    expect(getCommandName(0xff)).toBeNull();
    expect(getCommandName(0x99)).toBeNull();
  });
});

describe('isValidCommand', () => {
  it('returns true for valid commands', () => {
    expect(isValidCommand(0x65)).toBe(true);
    expect(isValidCommand(0x00)).toBe(true);
  });

  it('returns false for invalid codes', () => {
    expect(isValidCommand(0xff)).toBe(false);
    expect(isValidCommand(0x10)).toBe(false);
  });
});

describe('parseStatus', () => {
  it('parses all known status codes', () => {
    expect(parseStatus(0x00)).toBe('SUCCESS');
    expect(parseStatus(0x01)).toContain('invalid');
    expect(parseStatus(0x02)).toContain('memory');
    expect(parseStatus(0x03)).toContain('Poorly formed');
    expect(parseStatus(0x64)).toContain('invalid session handle');
    expect(parseStatus(0x65)).toContain('invalid length');
    expect(parseStatus(0x69)).toContain('Unsupported');
  });

  it('returns general failure with hex for unknown codes', () => {
    const result = parseStatus(0xab);
    expect(result).toContain('0xab');
    expect(result).toContain('FAIL');
  });
});
