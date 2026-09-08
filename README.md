# Hourglass Rivals

Create a MOBILE APP (not a website) — a 2-player board game prototype (Ludo/Chess hybrid), designed mobile-first with touch-friendly UI, optimized for phone screen sizes (portrait orientation).

PLATFORM NOTE:

- This is a mobile app experience — design and layout must work well on small touch screens

- Use large tap targets for pieces and buttons (minimum 44x44px touch area)

- No hover-dependent interactions — everything must work with tap/touch

- Layout should be responsive and fit within a single mobile viewport without horizontal scrolling

- Portrait orientation as primary layout

BOARD SHAPE (hourglass-style, variable row widths):

- Row 1: 8 columns wide — Player 1 starting row

- Row 2: 8 columns wide — Player 1 starting row

- Row 3: 10 columns wide — neutral/empty

- Row 4: 10 columns wide — neutral/empty

- Row 5: 10 columns wide — neutral/empty

- Row 6: 8 columns wide — Player 2 starting row

- Row 7: 8 columns wide — Player 2 starting row

- The 8-wide rows are horizontally centered relative to the 10-wide rows (1 extra empty column of margin on each side where the row is narrower)

- Represent the board as a 7-row grid; render each row with its correct width and center-alignment so the overall shape looks like an hourglass/diamond with cut corners

- Board must scale to fit mobile screen width, with squares small enough to fit but still tappable

PIECES:

- Each player has 16 pieces total: 8 pieces placed in each of their two starting rows at game start

- Player 1 pieces start in rows 1 and 2 (8 each)

- Player 2 pieces start in rows 6 and 7 (8 each)

GAMEPLAY:

- Turn-based, 2 players (same-device pass-and-play for this prototype)

- Each turn, the current player taps "Roll Dice" which generates a random number 1-6

- Player taps one of their pieces to select it, then taps a highlighted destination square to move it in ANY direction (up, down, left, right — not diagonal) by exactly the number of squares shown on the dice

- Movement must be a straight line in one chosen direction, staying within the board's actual playable squares for each row (respecting the varying row widths — a piece cannot move into a column that doesn't exist for that row)

- Highlight valid destination squares after a piece is selected/tapped, based on the dice roll and board shape

CAPTURING:

- If a player moves their piece onto a square occupied by an opponent's piece, that opponent's piece is "killed" and sent back to its original starting position (its exact starting row/column)

- A player's own pieces cannot occupy the same square as each other or overlap

WINNING:

- The first player to get ALL 16 of their pieces into the opponent's two starting rows (Player 1 targets rows 6-7, Player 2 targets rows 1-2) wins

- Once a piece reaches the target rows, mark it visually as "home" and it cannot be moved anymore

UI REQUIREMENTS (mobile-first):

- Render the hourglass-shaped board clearly, sized to fit mobile screen, with each row's correct width and centered alignment

- Distinct colors for Player 1 pieces (e.g. blue circles) and Player 2 pieces (e.g. red circles)

- Clearly show whose turn it is (prominent banner/header)

- Show the dice roll result prominently, with a satisfying tap animation on roll

- Show a turn/move counter

- Brief visual effect (flash/animation) when a piece is captured, before it returns to start

- Win screen when a player gets all 16 pieces home, with a "Play Again" button

- "Reset Game" button, easily reachable with thumb

- Bottom-anchored controls where possible (easier thumb reach on mobile)

TECH:

- Use React with useState for game state management

- Represent the board as a data structure that supports variable row widths (e.g. an array of rows, each with its own column count and center offset)

- All logic client-side, no backend needed for this prototype

- Ensure touch events (onTouchStart/onClick) work properly on mobile browsers

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/19845b09-ebb5-4e3e-a2f3-15d2d724d1d2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
