# DP-Plugins Viewer (Desktop Application)

This is a desktop application built with [Electron](https://www.electronjs.org/) and [React](https://reactjs.org/) to view project information from the DP-Plugins GitHub organization.

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js and npm:** [Download & Install Node.js](https://nodejs.org/)

## Development

To run the application in development mode with hot-reloading:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the app:**
    ```bash
    npm run dev
    ```

## Building the Application

To build a distributable, native application for your platform:

1.  **Install dependencies (if you haven't already):**
    ```bash
    npm install
    ```

2.  **Build the app:**
    ```bash
    npm run build
    ```

The built application files will be located in the `dist-electron-build/` directory.

## CI / GitHub Actions (Automatic Windows .exe build & release) ⚙️

This repository includes a GitHub Actions workflow that builds the Windows installer (.exe) and uploads it to a GitHub Release automatically when you push a tag that starts with `v` (e.g., `v1.0.1`) or when you run the workflow manually via `workflow_dispatch`.

Setup notes:
- The action runs on `windows-latest`. It will run `npm ci` then `npm run build` which uses `electron-builder` to produce `dist-electron-build/DP-Plugins Viewer Setup <version>.exe`.
- The workflow will create or update a release with the built .exe using the built-in `GITHUB_TOKEN` that Actions exposes.
- If you want to sign the Windows installer with your code-signing certificate, add `CSC_LINK` and `CSC_KEY_PASSWORD` as secrets and configure `electron-builder` accordingly.

How to trigger a release:
- Push a tag that starts with `v`:
    ```powershell
    git tag v1.0.0
    git push origin v1.0.0
    ```
- Or run the GitHub Actions workflow manually from the repository's "Actions" tab and provide a `tag` (optional).

Permissions:
- The workflow uses the default `GITHUB_TOKEN` which provides enough permission to create releases and upload assets. The repository must allow Actions workflows to create releases.