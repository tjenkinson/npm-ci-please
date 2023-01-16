# npm-ci-please

`npm ci` with a fallback to `npm i` when it fails, but shouldn't.

To workaround fun errors like:

```
7:41:18 PM: npm ERR! code EBADPLATFORM
7:41:18 PM: npm ERR! notsup Unsupported platform for @esbuild/android-arm@0.15.15: wanted {"os":"android","arch":"arm"} (current: {"os":"linux","arch":"x64"})
7:41:18 PM: npm ERR! notsup Valid OS:    android
7:41:18 PM: npm ERR! notsup Valid Arch:  arm
7:41:18 PM: npm ERR! notsup Actual OS:   linux
7:41:18 PM: npm ERR! notsup Actual Arch: x64
7:41:18 PM: npm ERR! A complete log of this run can be found in:
7:41:18 PM: npm ERR!     /opt/buildhome/.npm/_logs/2022-12-18T19_41_17_238Z-debug-0.log
```

See [this issue](https://github.com/netlify/cli/issues/5323) for one case where `npm ci` is broken and the above error happens.

Ideally npm will fix this bug and this workaround will not be needed.

## How?

This tool will first run `npm ci`, and if that doesn't work it will:

- take a copy of the current "package-lock.json"
- run `npm install`
- check if "package-lock.json" contents has changed, and if it has exit with 1, otherwise exit with 0

Note this fallback is not intended to mimick exactly what `npm ci` does. E.g. with `npm ci` it won't even try to install anything or run package scripts if the "package-lock.json" is not in sync.

## Usage

```sh
npx npm-ci-please@1
```

If you want to skip even trying the native `npm ci` and go straight to the workaround add the `--skip-native` flag.
