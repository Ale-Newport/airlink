# Assets

## Artwork status

The iOS icon is final. The Android launcher icon is still the old generated
placeholder until Android work resumes (issue #4).

| Asset | Where | Status |
|---|---|---|
| iOS app icon | `apps/mobile/ios/AirLink/Images.xcassets/AppIcon.appiconset` | real (v1.0) |
| Android launcher icon | `apps/mobile/android/app/src/main/res/mipmap-*` | placeholder |
| iOS launch screen | `apps/mobile/ios/AirLink/LaunchScreen.storyboard` | real, brand-neutral |
| Android splash | `apps/mobile/android/app/src/main/res/values/styles.xml` | real, brand-neutral |

`scripts/make-icons.sh` regenerates the icon set from `assets/icon-source.svg`
(iOS, the web demo's 180 px icon and the Android mipmaps).

## The icon

The mark is a signal leaving one node and arriving at another. It reads at 40 px. The product is about two things connecting
without infrastructure, so the obvious directions are a link, an arc between two
points, or a signal with nothing behind it. Avoid a Bluetooth glyph: Bluetooth
is an implementation detail, and the app is not about it.

The palette lives in [`packages/config/src/theme.ts`](../packages/config/src/theme.ts).
The accent is `#0A6CFF`.
