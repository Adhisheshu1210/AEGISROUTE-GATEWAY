/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AssertionResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  message?: string;
  error?: any;
}

const activeAssertions: AssertionResult[] = [];
let currentSuite = 'Global';
let currentTest = 'Default';

export function assert(condition: boolean, message?: string) {
  if (!condition) {
    const errorMsg = message || 'Assertion failed';
    const err = new Error(errorMsg);
    activeAssertions.push({
      suiteName: currentSuite,
      testName: currentTest,
      passed: false,
      message: errorMsg,
      error: err
    });
    throw err;
  } else {
    activeAssertions.push({
      suiteName: currentSuite,
      testName: currentTest,
      passed: true,
      message: message || 'Assertion passed'
    });
  }
}

export function describe(name: string, fn: () => void) {
  currentSuite = name;
  fn();
}

export function test(name: string, fn: () => void) {
  currentTest = name;
  try {
    fn();
  } catch (err) {
    // Already logged in assert, or unexpected runtime crash
    if (!activeAssertions.some(a => a.suiteName === currentSuite && a.testName === currentTest && !a.passed)) {
      activeAssertions.push({
        suiteName: currentSuite,
        testName: currentTest,
        passed: false,
        message: 'Unexpected runtime crash: ' + (err as any).message,
        error: err
      });
    }
  }
}

export function getAssertions() {
  return activeAssertions;
}

export function clearAssertions() {
  activeAssertions.length = 0;
}
