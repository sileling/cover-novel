# Cover Novel

Read novels disguised as JavaScript code comments in VS Code. Looks like coding, reads like a book.

## Features

- **Stealth Reading** — Novel text is embedded inside `//` comments of valid-looking JavaScript code
- **Boss Key** — Press `Alt+Q` to instantly hide the novel tab and switch back to your previous file
- **Page Navigation** — `Alt+Right` / `Alt+Left` for next/previous page (customizable)
- **Chapter Navigation** — Auto-detects Chinese chapter markers (`第X章`/`第X回`) and jumps to the exact line
- **Encoding Detection** — Automatically detects GBK, UTF-8, and Big5 encoding — no manual conversion needed
- **Multi-Book Support** — Open `.txt` files from anywhere, recent books are remembered for quick switching
- **Progress Persistence** — Reading progress is automatically saved per book

## Keybindings

| Key | Command | Description |
|-----|---------|-------------|
| `Ctrl+Alt+,` / `Cmd+Alt+,` | Open Novel | Open or restore the last reading session |
| `Alt+Right` | Next Page | Turn to the next page |
| `Alt+Left` | Previous Page | Turn to the previous page |
| `Alt+Q` | Boss Key | Hide / restore the novel instantly |

All keybindings can be customized via VS Code's `keybindings.json`.

## Usage

1. Press `Ctrl+Alt+,` to start
   - First time: a file picker will open — choose any `.txt` file
   - Afterwards: resumes from your last reading position
2. Use the status bar buttons or keyboard shortcuts to navigate
3. Click the progress indicator on the bottom-right to switch between recent books



## Credits

This project is a rewrite of [code-novel](https://github.com/iyim/code-novel) with TypeScript, modular architecture, boss key, chapter navigation, encoding detection, and customizable shortcuts.

Thanks to the original author for the inspiration 🙌