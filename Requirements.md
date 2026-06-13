# Requirements

Wickra is a Rust core with native bindings (Python, Node.js, WASM) and a C ABI
hub that the C, C++, C#, Go, Java and R bindings link against. Each binding has
its own minimum toolchain. This page lists what every language needs to **use**
the published package, and what extra you need to **build from source**.

## Supported versions at a glance

| Language    | Package / distribution                | Minimum supported            | Tested in CI                       |
| ----------- | ------------------------------------- | ---------------------------- | ---------------------------------- |
| **Rust**    | crates.io — `wickra`                  | **1.86** (MSRV)              | stable, Linux · macOS · Windows    |
| **Python**  | PyPI — `wickra` (abi3 wheel)          | **3.9**                      | 3.9 · 3.10 · 3.11 · 3.12 · 3.13 × 3 OS |
| **Node.js** | npm — `wickra` (N-API 8, prebuilt)    | **20**                       | 22 · 24 (active LTS) × 3 OS        |
| **WASM**    | npm — `wickra-wasm`                   | any modern JS engine         | browsers · Node.js · Deno · Bun    |
| **C**       | `wickra.h` + library (each release)   | **C99** compiler             | smoke + archetype ctests × 3 OS    |
| **C++**     | `wickra.hpp` over the C ABI           | **C++14** compiler           | C++ smoke ctest                    |
| **C#**      | NuGet — `Wickra`                      | **.NET 8** (`net8.0`)        | net8.0 × 3 OS                      |
| **Go**      | module — `wickra-lib/wickra-go`       | **Go 1.23**                  | 1.23+ × 3 OS (cgo)                 |
| **Java**    | Maven Central — `org.wickra:wickra`   | **Java 22** (FFM / Panama)   | built on JDK 25 LTS, target 22     |
| **R**       | source package                        | **R ≥ 2.10**                 | —                                  |

"Minimum supported" is the floor declared in the binding's manifest (Rust
`rust-version`, Python `requires-python`, Node `engines`, C# `TargetFramework`,
Go directive, Java `maven.compiler.release`, R `Depends`). "Tested in CI" is the
range the CI matrix actually exercises on every push.

## Per-language detail

### Rust

- **MSRV 1.86.** The library crate (`wickra`) and its workspace build on Rust
  1.86 or later. There is nothing else to install — `cargo add wickra`.
- Building the **Node.js** binding from source needs Rust **1.88** (its
  `napi`-derived crate's MSRV); this only matters if you compile the Node binding
  yourself rather than installing the prebuilt npm package.

### Python

- **Python 3.9+.** The wheel is an **abi3** (stable-ABI) wheel built for
  `abi3-py39`, so a single wheel per platform runs on 3.9 through 3.13 (and
  newer). NumPy ≥ 1.22 is the only runtime dependency.
- Prebuilt wheels ship for Linux, macOS and Windows (x64 and arm64) — `pip
  install wickra`, no compiler needed.

### Node.js

- **Node.js 20+.** The binding is a prebuilt **N-API 8** (ABI-stable) addon, so
  one binary works across Node versions without recompiling. Node 18 reached
  end-of-life, so 20 is the floor; CI runs the active LTS lines (22 and 24).
- Prebuilt binaries ship per platform via npm `optionalDependencies` — `npm
  install wickra`, no compiler needed.

### WASM

- **Any modern JavaScript engine.** `wickra-wasm` is a `wasm-bindgen` module
  compiled to WebAssembly; it runs in current browsers, Node.js, Deno and Bun —
  anywhere with WebAssembly + ES-module support. No native toolchain at all.

### C and C++

- **A C99 (C) or C++14 (C++) compiler.** The C ABI is a plain `wickra.h` header
  plus a shared/static library; the optional `wickra.hpp` adds a header-only RAII
  wrapper for C++. Both ship prebuilt with every
  [GitHub release](https://github.com/wickra-lib/wickra/releases) for Linux,
  macOS and Windows — link against the library, no Rust toolchain required.

### C#

- **.NET 8 or later.** The binding targets `net8.0` and ships on NuGet as
  `Wickra` with the native library bundled per RID, so `dotnet add package
  Wickra` is all you need. It uses `LibraryImport` source-generated P/Invoke.

### Go

- **Go 1.23+, plus a C compiler.** The binding is a **cgo** shim over the C ABI,
  so building any program that imports it needs a C toolchain (gcc/clang on
  Linux/macOS, MinGW or MSVC on Windows) with `CGO_ENABLED=1` (the default). The
  prebuilt native libraries are committed per platform in the
  `wickra-lib/wickra-go` module.

### Java

- **Java 22 or later.** The binding uses the Java Foreign Function & Memory API
  (Panama, `java.lang.foreign`), which is **final since Java 22** — no preview
  flag. The FFM API is *restricted*, so run your application with
  `--enable-native-access=ALL-UNNAMED`. It ships on Maven Central as
  `org.wickra:wickra` with the native library bundled; the published bytecode
  targets Java 22 even though CI builds it on the JDK 25 LTS.

### R

- **R ≥ 2.10, plus a C toolchain.** The binding reaches the C ABI through R's
  native `.Call` interface, so installing the package compiles a thin C glue
  layer — you need a C toolchain (**Rtools** on Windows; the system compiler on
  Linux/macOS) and the Wickra C ABI header and library. `SystemRequirements`
  lists the C ABI shared library, downloaded automatically during install.

## Build-from-source extras

Installing a prebuilt package needs none of these — they only apply when you
compile a binding yourself:

- **Rust toolchain** (1.86; 1.88 for the Node binding) — for the core, Python,
  Node and WASM bindings.
- **A C/C++ compiler** — for C, C++, Go (cgo) and R (`.Call` glue).
- **The C ABI library** (`cargo build -p wickra-c --release`) — for C, C++, C#,
  Go, Java and R when building against a local checkout rather than a release.

## See also

- [Quickstart pages](Quickstart-Rust) — a five-minute tour per language.
- [Indicators overview](Indicators-Overview) — the full catalogue.
- Source and releases: <https://github.com/wickra-lib/wickra>
