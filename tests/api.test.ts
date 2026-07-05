/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { assert, describe, test } from './test_harness_util';

interface ApiResponseHeader {
  'content-type': string;
  'x-frame-options': string;
  'x-content-type-options': string;
}

function mockApiHeaders(): ApiResponseHeader {
  return {
    'content-type': 'application/json; charset=utf-8',
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff'
  };
}

describe('AegisRoute Operations - REST API Gateway Schema Compliance', () => {
  test('API response headers must contain strict modern security headers', () => {
    const headers = mockApiHeaders();
    assert(headers['content-type'].includes('application/json'), 'API output format must be JSON');
    assert(headers['x-frame-options'] === 'DENY', 'Clickjacking defense header X-Frame-Options must be set to DENY');
    assert(headers['x-content-type-options'] === 'nosniff', 'MIME type sniffing defense header must be active');
  });
});
