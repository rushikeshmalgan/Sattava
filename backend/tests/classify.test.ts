import { classifyHttpFailure, classifyNetworkFailure } from '../src/ai/classify';

const base = { reasons: [] as string[], message: '' };

describe('classifyHttpFailure', () => {
  it.each([
    [{ status: 400, reasons: ['API_KEY_INVALID'], message: 'API key not valid. Please pass a valid API key.' }, 'API_KEY_INVALID'],
    [{ status: 400, reasons: [], message: 'API key expired. Please renew the API key.' }, 'API_KEY_INVALID'],
    [{ status: 401, ...base }, 'API_KEY_INVALID'],
    [{ status: 403, ...base }, 'API_KEY_INVALID'],
    [{ status: 429, ...base }, 'RATE_LIMITED'],
    [{ status: 200, providerStatus: 'RESOURCE_EXHAUSTED', ...base }, 'RATE_LIMITED'],
    [{ status: 404, ...base, message: 'models/x is no longer available' }, 'MODEL_FAILED'],
    [{ status: 500, ...base }, 'MODEL_FAILED'],
    [{ status: 503, providerStatus: 'UNAVAILABLE', ...base }, 'MODEL_FAILED'],
    [{ status: 504, ...base }, 'MODEL_FAILED'],
  ])('%j -> %s', (info, expected) => {
    expect(classifyHttpFailure(info as any).category).toBe(expected);
  });

  it('REGRESSION: "invalid argument" must NOT be treated as an invalid API key', () => {
    const c = classifyHttpFailure({
      status: 400,
      providerStatus: 'INVALID_ARGUMENT',
      reasons: [],
      message: 'Request contains an invalid argument.',
    });
    expect(c.category).toBe('MODEL_FAILED');
    expect(c.reason).toBe('BAD_REQUEST');
  });

  it('REGRESSION: status digits or the word "invalid" in a message do not imply a key problem', () => {
    const c = classifyHttpFailure({ status: 500, reasons: [], message: 'invalid state, saw 401 tokens and 403 rows' });
    expect(c.category).toBe('MODEL_FAILED');
  });

  it('distinguishes a retired model (404) from an overloaded one (503) for observability', () => {
    expect(classifyHttpFailure({ status: 404, ...base }).reason).toBe('MODEL_NOT_FOUND');
    expect(classifyHttpFailure({ status: 503, ...base }).reason).toBe('MODEL_OVERLOADED');
  });
});

describe('classifyNetworkFailure', () => {
  it('flags timeouts and aborts', () => {
    expect(classifyNetworkFailure(Object.assign(new Error('x'), { name: 'TimeoutError' }))).toEqual({
      category: 'NETWORK_ERROR',
      reason: 'TIMEOUT',
    });
    expect(classifyNetworkFailure(Object.assign(new Error('x'), { name: 'AbortError' })).reason).toBe('TIMEOUT');
  });

  it('flags connection failures', () => {
    expect(classifyNetworkFailure(new TypeError('fetch failed'))).toEqual({ category: 'NETWORK_ERROR', reason: 'CONNECTION' });
  });
});
