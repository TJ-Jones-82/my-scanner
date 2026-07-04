# My Scanner

A small Expo/React Native app that signs in through Broadcastify's own web
page, discovers the signed-in user's Calls playlists, and creates one mobile
button per playlist.

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

## Important product note

This version is intended as a personal companion to the existing Broadcastify
website. Broadcastify also offers an approved, metered Calls Client API. A
public app-store release should use that official API and receive Broadcastify's
prior scope approval.
