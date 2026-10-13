export const BLOCKED_EXTENSIONS = new Set([
  // Windows executables
  "exe",
  "msi",
  "com",
  "scr",
  "pif",
  "cpl",
  "dll",
  "sys",

  // Scripts
  "bat",
  "cmd",
  "ps1",
  "vbs",
  "vbe",
  "jse",
  "wsf",
  "wsh",

  // Linux / Unix executables/scripts
  "sh",
  "bash",
  "run",
  "bin",
  "elf",

  // macOS executables/packages
  "app",
  "dmg",
  "pkg",
  "command",

  // Java executables
  "jar",
  "class",

  // Android
  "apk",
  "aab",

  // Other potentially executable formats
  "ipa",
  "deb",
  "rpm",
  "msix",
  "appx",
  "gadget",
]);

export const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-ms-installer",
  "application/vnd.microsoft.portable-executable",
  "application/vnd.android.package-archive",
  "application/x-executable",
  "application/x-pie-executable",
  "application/x-sh",
  "application/x-shellscript",
  "application/x-bat",
  "application/x-csh",
  "application/x-cmd",
]);
