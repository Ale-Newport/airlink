/**
 * App Store guideline 5.1.1(iv): the app must not steer people through, or
 * around, a permission prompt. App Review rejected build 1.0.0 (9) for three
 * things, and each is pinned here so none can come back:
 *
 *  1. Sending someone to Settings after they tapped "Don't Allow".
 *  2. A button that says "Allow" under our own explanation. The only Allow is
 *     the system's own sheet; ours says "Continue".
 *  3. A "Not now" button beside it. The explanation always leads to the prompt.
 *
 * The camera screen is rendered for real, with the camera permission faked in
 * the two states a reviewer sees: not asked yet, and refused.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '@airlink/config';
import { ThemeProvider } from '../src/ui/index.js';
import { PermissionsStep } from '../src/screens/onboarding/PermissionsStep.js';
import { ScanCodeScreen } from '../src/screens/you/ScanCodeScreen.js';
import { local } from '../src/screens/you/localStrings.js';

const mockCamera = {
  hasPermission: false,
  canRequestPermission: true,
  requestPermission: jest.fn(async () => false),
};
const mockNavigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() };

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: () => null,
  useCameraPermission: () => mockCamera,
  useObjectOutput: () => ({}),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
}));
jest.mock('../src/client/ClientProvider.js', () => ({ useClient: () => ({}) }));

beforeEach(() => {
  mockCamera.hasPermission = false;
  mockCamera.canRequestPermission = true;
  mockCamera.requestPermission.mockClear();
  mockNavigation.goBack.mockClear();
  mockNavigation.replace.mockClear();
});

/** Every label a person could read on the screen, as one string to search. */
function visibleText(): string {
  return JSON.stringify(screen.toJSON());
}

test('our own words, and the only button under them says Continue', () => {
  expect(strings.permissions.continue).toBe('Continue');
  // The words that App Review objected to are gone from the shared strings, so
  // nothing can quietly put them back on a button.
  expect(Object.keys(strings.permissions)).not.toContain('allow');
  expect(Object.keys(strings.permissions)).not.toContain('notNow');
});

test('the camera explanation has a Continue button that always asks, and nothing that delays it', async () => {
  await render(
    <ThemeProvider>
      <ScanCodeScreen />
    </ThemeProvider>,
  );

  expect(screen.getByText(local.scan.cameraBody)).toBeTruthy();
  expect(screen.getByText(strings.permissions.continue)).toBeTruthy();
  expect(screen.queryByText(/^allow$/i)).toBeNull();
  expect(screen.queryByText(/not now/i)).toBeNull();
  expect(screen.queryByText(strings.permissions.openSettings)).toBeNull();

  await fireEvent.press(screen.getByText(strings.permissions.continue));
  expect(mockCamera.requestPermission).toHaveBeenCalledTimes(1);
  // Pressing it leaves the person on the system's prompt, not somewhere else.
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
});

test('after the camera is refused there is an explanation, no way into Settings, and a way on', async () => {
  mockCamera.canRequestPermission = false;
  await render(
    <ThemeProvider>
      <ScanCodeScreen />
    </ThemeProvider>,
  );

  expect(screen.getByText(strings.permissions.deniedTitle)).toBeTruthy();
  // The sentence says where the switch lives; nothing takes them there.
  expect(visibleText()).toContain(strings.permissions.deniedBody);
  expect(screen.queryByText(strings.permissions.openSettings)).toBeNull();
  expect(screen.queryByText(/^allow$/i)).toBeNull();

  // The two routes that need no camera are offered instead.
  await fireEvent.press(screen.getByText(strings.profile.showQr));
  expect(mockNavigation.replace).toHaveBeenCalledWith('MyCode');
  await fireEvent.press(screen.getByText(strings.common.close));
  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});

test('the permissions step never offers Settings, even when the radios did not come up', async () => {
  for (const trouble of [null, 'radios', 'profile'] as const) {
    const view = await render(
      <ThemeProvider>
        <PermissionsStep width={360} trouble={trouble} />
      </ThemeProvider>,
    );
    expect(screen.queryByText(strings.permissions.openSettings)).toBeNull();
    expect(screen.queryByText(/^allow$/i)).toBeNull();
    expect(screen.queryByText(/not now/i)).toBeNull();
    await view.unmount();
  }
});
