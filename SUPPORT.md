# Support

Start with **XML Viewer: Open Visual Preview** on an XML text document. Choose **Retry** after a processing error, or **Retry layout** after a graph-layout failure. Size, depth and node limits are documented in README.md.

For a bug report, use [GitHub Issues](https://github.com/ertanbicakci/xml-visual-viewer-vscode/issues) and include:

- Extension version, VS Code version and operating system.
- Steps to reproduce and the expected/actual result.
- **XML Viewer: Copy Diagnostic Report**, if relevant. This report omits XML content, file names and paths.
- A minimal, non-confidential XML example only when needed to reproduce the issue.

The development repository is currently private; issue access requires repository access. Public distribution needs a public support destination or a public repository, recorded in the release-readiness checklist.

The extension processes documents locally and has no account, API key or telemetry. In a remote workspace, parsing runs in that workspace's Extension Host. Source files are never edited by the preview.
