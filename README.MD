# Lathe Gear Change Calculator

A browser-based tool that calculates gear-train combinations for screwcutting on a manual lathe.

## What it does

The calculator searches through all permutations of a user-supplied gear set and finds combinations that produce a specified thread pitch (given in threads-per-inch or millimetres).  Results are ranked by closeness to the target pitch and displayed alongside a schematic diagram showing how the gears are arranged on the lathe.

## Usage

Open `javascript/changegears.html` in a modern web browser (no server required).

1. **Gears** – Enter the tooth counts of all gears available to you as a comma-separated list.
2. **Leadscrew** – Enter the leadscrew pitch and select whether the value is in TPI or mm.
3. **Target** – Enter the thread pitch you want to cut and select TPI or mm.
4. **Validation** – Choose how strictly impossible gear combinations are filtered out.
5. Click **Search for combinations**.  The dropdown lists every valid gear train found, sorted by accuracy.  Selecting an entry shows the exact pitch produced, the error, and a diagram of the gear layout.

## Configuration

At the top of `javascript/changegears.js` there are two variables you can adjust to match your lathe:

| Variable | Default | Description |
|---|---|---|
| `ILX` | 38 | Horizontal distance (mm) between input and leadscrew shafts |
| `ILY` | 70 | Vertical distance (mm) between input and leadscrew shafts |

These values are used both to draw the on-screen gear diagram and to filter out combinations that physically cannot fit on your lathe.

## Licence

GPLv3 – see [LICENSE](LICENSE).

## History

Originally created by Carl Williams (2011) at https://lathenovice.wordpress.com/.  Forked and updated by Jeff Pedlow from 2020 onwards.
