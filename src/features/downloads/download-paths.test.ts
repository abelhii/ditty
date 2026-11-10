import { audioFileName, coverFileName, serverKey } from '@/features/downloads/download-paths';

describe('serverKey', () => {
  it('is stable and 12 chars', () => {
    expect(serverKey('https://a.example.com', 'abel')).toBe(serverKey('https://a.example.com', 'abel'));
    expect(serverKey('https://a.example.com', 'abel')).toHaveLength(12);
  });

  it('differs per server and per user, and ignores host case', () => {
    expect(serverKey('https://a.example.com', 'abel')).not.toBe(serverKey('https://b.example.com', 'abel'));
    expect(serverKey('https://a.example.com', 'abel')).not.toBe(serverKey('https://a.example.com', 'other'));
    expect(serverKey('https://A.example.com', 'abel')).toBe(serverKey('https://a.example.com', 'abel'));
  });
});

describe('audioFileName', () => {
  it('joins id and lowercased suffix', () => {
    expect(audioFileName('track-1', 'FLAC')).toBe('track-1.flac');
  });

  it('falls back to .bin when no suffix', () => {
    expect(audioFileName('track-1')).toBe('track-1.bin');
    expect(audioFileName('track-1', '')).toBe('track-1.bin');
  });

  it('neutralises path traversal in untrusted ids', () => {
    expect(audioFileName('../../etc/passwd', 'mp3')).toBe('______etc_passwd.mp3');
  });
});

describe('coverFileName', () => {
  it('prefixes and sanitises', () => {
    expect(coverFileName('al-9/x')).toBe('cover-al-9_x.jpg');
  });
});
