# iOS build and release checklist

This is future release work, not permission to deploy or publish. Start with local development and device QA. Srujan approves distribution after the acceptance gates are met.

## Development build — IOS-012

- [ ] Confirm the college/team's Apple and Expo account ownership and who manages signing; keep private credentials out of Git and chat.
- [ ] Choose and record the iOS bundle identifier, signing team, version/build convention and supported devices/OS versions. The current `app.json` has no iOS bundle identifier.
- [ ] Review required capabilities, permission descriptions, app icons, splash assets and college branding.
- [ ] Choose local or EAS build workflow, document its commands, and add only the required reviewed configuration. EAS project linkage and build profiles are not present at this baseline.
- [ ] Create and install a signed development build on a physical iPhone; verify its API environment and session lifecycle.
- [ ] Verify notification capabilities and remote push in the actual signed build; a local notification preview does not satisfy this step.

## TestFlight — IOS-014

- [ ] Complete IOS-013 with no release-blocking defects and passing shared Android regression checks.
- [ ] Use a reviewed API environment, TLS and non-demo test accounts; confirm release URLs and exclude development network exceptions and secrets.
- [ ] Select a staging/release API and provision a review account with the minimum needed access. Backend hosting remains a separate approved task.
- [ ] Verify app-store/privacy disclosures against actual employee data, uploaded documents, storage, telemetry and SDK behavior; confirm current Apple requirements before submission.
- [ ] Confirm institution-approved distribution route, support contact, privacy-policy URL, metadata, screenshots and reviewer instructions.
- [ ] Build/archive with a unique build number, upload through the chosen workflow and wait for platform processing.
- [ ] Run an internal TestFlight check: install, update, login/restore/logout, timetable, leave, coverage, notifications and document access.
- [ ] Record approval, build identifier, tested API version and known non-blocking issues before expanding access.

## Operations and recovery

Do not add over-the-air updates merely for this milestone. If adopted later, document runtime compatibility and recovery before using them.

For a bad TestFlight build, stop further distribution and return testers to the last approved compatible build where available; otherwise issue a corrected build. Store release recovery may require a new build. Verify backward API compatibility before any backend change; never roll back a database by deleting employee records.

Record the release owner, incident contact, prior known-good build and rollout decision in the release PR. Avoid full notification payloads, document URLs, passwords or tokens in diagnostic logs.

## Completion criteria

A release task is complete only after the signed build has been installed and its checks recorded. Source export, simulator success and upload success are distinct milestones; none alone means the iOS app is released.
