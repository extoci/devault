# d(evault)

we all work on too many projects now. why do we have to remember (and type) dev commands?

one project has `bun dev`, the other `pnpm dev`, another `cargo run`, etc.

what if all you needed to type was `d`?

## installation

requires bun.

```sh
npm i -g devault
```

## usage

```sh
d
```

running `d` for the first time in a directory will ask you for the command it should run. future runs will immediately alias to the command you've entered.

## commands

save a command for the current directory:

```sh
d set "bun dev"
```

run it later:

```sh
d
```

see what `d` thinks this directory is:

```sh
d show
```

forget the saved command:

```sh
d forget
```

list everything you've saved:

```sh
d list
```

## examples

the command can be whatever you would have typed yourself:

```sh
d set "bun dev"
d set "pnpm dev"
d set "npm run dev"
d set "yarn dev"
d set "mise run dev"
d set "make dev"
d set "just dev"
d set "docker compose up"
d set "cargo run"
d set "go run ."
```

devault does not know what a dev server is. it just remembers the command you told it.

## first run

if nothing is saved yet, `d` will suggest obvious commands from the files in the project.

for node projects it looks at lockfiles and package scripts, so a bun project with a `dev` script gets:

```sh
bun dev
```

for other projects it can suggest things like:

```sh
mise run dev
make dev
docker compose up
cargo run
go run .
```

you can always ignore the suggestions and type the command yourself.

## non-interactive

set `D_NO_PROMPT=1` if you want `d` to fail instead of asking questions:

```sh
D_NO_PROMPT=1 d
```

## development

run with bun:

```sh
bun run dev
```

build:

```sh
bun run build
```

the built cli is bundled into:

```txt
dist/cli.js
```

## notes

this is intentionally not a task runner, process manager, env manager, monorepo thing, shell integration, or runtime. what makes it good is it's everything-agnostic. you tell `d` what to run, and it does so.

it is a glorified auto-alias with a memory.

that is the whole point.
