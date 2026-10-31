# IOS-001 simulator baseline

Recorded 21 October 2026 on branch `codex/ios-001`, using the application code merged in PR #10 and the iOS plan from PR #11. This is an Expo Go development smoke test, not signed-device or release acceptance.

## Environment

| Component                  | Observed version      |
| -------------------------- | --------------------- |
| Xcode                      | 27.1, build 27A9275   |
| Simulator                  | iPhone 17 Pro         |
| Runtime                    | iOS 26.5, build 23F77 |
| Simulator UI               | Xcode Device Hub      |
| Node / npm                 | 24.18.0 / 11.16.0     |
| Expo / Expo Go             | 57.0.26 / 57.0.9      |
| React Native / Expo Router | 0.86.3 / 57.0.24      |

Development acceptance currently covers this iPhone/runtime combination only. It does not establish the minimum supported release OS. Keep the existing portrait/light configuration and declared iPad support; confirm older/smaller iPhones, software-keyboard behavior and iPad before release. No support declaration was changed.

## Reproduce

From the repository root, after the prerequisites in [DEVELOPMENT.md](DEVELOPMENT.md):

```sh
xcrun simctl list devices available
# If needed, boot an available iPhone using its ID from the list:
xcrun simctl boot <device-udid>
xcrun simctl bootstatus <device-udid> -b
npm run ios --workspace @campushr/mobile -- --lan --port 8081
```

If the simulator is already booted, skip the boot command. Open the project in Expo Go using the URL Metro prints. On this Xcode installation the simulator window is provided by Device Hub at `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`; the old `open -a Simulator` command did not find an app.

The initial `--localhost` run bound Metro to IPv6 `::1` but advertised `127.0.0.1`, causing Expo Go to show a server connection error. Restarting with `--lan` resolved it. Do not change the API or disable transport protections to fix a Metro connection failure.

For the UI-only baseline, use the existing explicit demo account in `mobile/lib/auth-context.tsx`. This path requires no database or API server; sample records do not verify live API integration. Real login requires the separately configured API.

## Results

| Check               | Result                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Native launch       | CampusHR login rendered in Expo Go                                                             |
| Demo login          | Opened Home with the demo-session label                                                        |
| Navigation          | Home, Timetable, Attendance, Leave and Profile opened                                          |
| Timetable           | Today → Full Week → Monday changed the rendered schedule                                       |
| Leave modal         | Opened, accepted text input and cancelled without submission                                   |
| Safe areas          | Login, Home and Leave modal content visible below the status area and above the home indicator |
| Hardware text entry | Login and draft fields accepted input; software keyboard/avoidance remains unverified          |
| Attendance          | Existing placeholder renders; no real attendance integration claimed                           |
| Home header         | Native badge overflow found; added wrapping and token spacing to its header                    |

## Automated baseline

- Mobile typecheck and lint passed before and after the layout fix. The three timetable regression tests passed during the initial baseline.
- iOS production bundle export passed before the layout fix; iOS, Android and web exports also passed afterward to `/tmp/campushr-ios-001-final-export`.
- `npx expo install --check` failed with six patch-version mismatches: Expo, constants, linking, notifications, router and splash-screen. No dependencies were upgraded. Recheck and align them in a reviewed follow-up before release.
- Expo Go emitted notification-support warnings. Remote push is not verified by this smoke test and needs a suitable development build.

## Remaining IOS-001 acceptance

- [ ] Verify software keyboard presentation and avoidance on the login and leave forms.
- [ ] Check a smaller iPhone and iPad; record the minimum intended release OS/device scope.
- [ ] Have another teammate reproduce the launch from these instructions.

Physical devices, secure session restoration, live API writes, remote push, signing and TestFlight are outside this baseline. No deployment, production migration, real employee login or leave submission was performed.
