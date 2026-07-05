# My Scanner

A small Expo/React Native app that signs in through Broadcastify's own web
page, discovers the signed-in user's Calls playlists, and creates one mobile
button per playlist.

The repository also contains an installable, mobile-friendly web version in
`docs/`. GitHub Pages deploys it automatically from `main`.

## What it does

- Keeps the Broadcastify username and password inside Broadcastify's web form.
- Shares the resulting session cookie between the sign-in view, playlist sync,
  and player.
- Refreshes the playlist list at launch, when the app returns to the
  foreground, every minute while open, and on pull-to-refresh.
- Adds and removes buttons as Broadcastify playlists change.
- Opens each playlist in Broadcastify's embedded web player.
- Keeps navigation on Broadcastify/RadioReference; other links open in the
  device browser.

## Run it

1. On this Windows computer, double-click `start-app.cmd`.
2. Otherwise, install dependencies with `pnpm install` (or `npm install`) and
   run `pnpm start`.
3. Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

## Installable web version

Open the GitHub Pages address on a phone, then choose **Install app** or
**Add to Home Screen** from the browser menu. The PWA opens the always-current
Broadcastify playlist page and stores optional one-tap playlist shortcuts on
the device.

Web browser security prevents a static GitHub Pages site from reading a
signed-in page on another domain. Automatic playlist extraction therefore
remains a feature of the native app; a fully automatic web version requires
the approved Broadcastify Calls Client API.

## Important product note

This version is intended as a personal companion to the existing Broadcastify
website. Broadcastify also offers an approved, metered Calls Client API. A
public app-store release should use that official API and receive Broadcastify's
prior scope approval.
