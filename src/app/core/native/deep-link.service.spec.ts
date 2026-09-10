import { toAppPath } from './deep-link.service';

describe('toAppPath', () => {
  it('maps a site URL to its router path, keeping query and fragment', () => {
    expect(toAppPath('https://doctoguide.knocdoc.in/triage?ref=abc#x')).toBe('/triage?ref=abc#x');
  });

  it('maps the bare origin to the root', () => {
    expect(toAppPath('https://doctoguide.knocdoc.in')).toBe('/');
  });

  it('rejects other hosts, look-alike hosts and http', () => {
    expect(toAppPath('https://doctribe.knocdoc.in/pricing')).toBeNull();
    expect(toAppPath('https://doctoguide.knocdoc.in.example.com/pricing')).toBeNull();
    expect(toAppPath('http://doctoguide.knocdoc.in/pricing')).toBeNull();
  });

  it('rejects garbage', () => {
    expect(toAppPath('not a url')).toBeNull();
  });
});
