import { en, hi, translate } from '../../src/i18n/strings';

describe('i18n', () => {
  it('defaults to EN', () => {
    expect(translate('en', 'four')).toBe(en.four);
  });
  it('switches to Hinglish', () => {
    expect(translate('hi', 'four')).toBe('Chauka');
    expect(translate('hi', 'six')).toBe('Chhakka');
  });
  it('falls back to EN for missing hi keys', () => {
    // `target` and `appName` are intentionally absent from hi.
    expect(hi.target).toBeUndefined();
    expect(translate('hi', 'target')).toBe(en.target);
    expect(translate('hi', 'appName')).toBe(en.appName);
  });
});
