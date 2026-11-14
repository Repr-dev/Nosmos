// Grid
const dimensionX = 60;
const dimensionY = 30;

// EQUATION
// a graphable shape is defined with a single function isPointFilled(x, y, t) describing whether a point in spacetime is filled or not.
const examples = {
  'conic section': {
    isPointFilled: (x, y, t) => {
      let xOffset = 0;
      let yOffset = 0;
      let xCoeff = Math.cos(2 * t);
      let yCoeff = Math.sin(2 * t);
      let radius = 8;
      let radiusWidth = 4;

      let value = xCoeff * (x - xOffset) ** 2 + yCoeff * (y - yOffset) ** 2;
      let aboveLowerRadius = (radius - radiusWidth / 2) ** 2 <= value;
      let belowOuterRadius = (radius + radiusWidth / 2) ** 2 >= value;

      return aboveLowerRadius && belowOuterRadius;
    },
  },
  sinusoidal: {
    isPointFilled: (x, y, t) => {
      let yOffset = 0;
      let amplitude = 2.5;
      let b = 1 / 3;
      let timeScale = 4;
      let width = 5;

      let aboveLowerBound =
        y >= amplitude * Math.sin(b * x - timeScale * t) - width / 2 + yOffset;
      let belowUpperBound =
        y <= amplitude * Math.sin(b * x - timeScale * t) + width / 2 + yOffset;
      let rightOfLeftBound = x >= -dimensionX / 2;

      let leftEdgeRight = x <= -dimensionX / 2;
      let leftEdgeLeft = x >= -dimensionX / 2 - 2;

      return (
        (aboveLowerBound && belowUpperBound && rightOfLeftBound) ||
        (leftEdgeRight && leftEdgeLeft)
      );
    },
  },
  'tangent line': {
    isPointFilled: (x, y, t) => {
      let yOffset = -6;
      let funnySineSum =
        Math.sin(t) + Math.sin(t + 1.047) + 0.5 * Math.sin(1.5 * t - 0.785);
      let xCoeff = funnySineSum * (1 / 4.2 - 1 / 4.5) + 1 / 4.5;
      let width = 4;
      const coreFunc = (a) => (a * xCoeff) ** 2 + yOffset;

      let aboveLowerBound = y >= coreFunc(x) - width;
      let belowUpperBound = y <= coreFunc(x);

      let lineWidth = 4;
      let xValueInUse = 2 * -Math.cos(t);
      let slope = xCoeff * 2 * xValueInUse; // (d/dx) (coreFunc)
      let aboveLineLowerBound =
        y >=
        coreFunc(xValueInUse) -
          width +
          slope * (x - xValueInUse) -
          lineWidth / 2;
      let belowLineUpperBound =
        y <=
        coreFunc(xValueInUse) -
          width +
          slope * (x - xValueInUse) +
          lineWidth / 2;

      return (
        (aboveLowerBound && belowUpperBound) ||
        (aboveLineLowerBound && belowLineUpperBound)
      );
    },
  },
};
const shape = examples['conic section'];

// Visualization
const glyph = {
  empty: '.',
  solid: '■',
  fill: '☐',
  spacer: '',
  yAxis: '|',
  xAxis: '—',
  origin: '+',
};
const glyphIndex = {
  empty: 0,
  solid: 1,
  fill: 2,
  spacer: 3,
  yAxis: 4,
  xAxis: 5,
  origin: 6,
};

// Animation
const tickRate = 25;
let time = 0;
const timeLimit = 10;

let lastFrame = Array.from({ length: dimensionY }, () =>
  Array(dimensionX).fill(glyphIndex.empty)
); // for optimization purposes; no redrawing of repeated frames

const wait = (seconds) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000)); // time delay between ticks

function drawFrame(frameData) {
  // computes outlines, axes and renders onto screen
  if (frameData === lastFrame) return;

  let finalString = '';

  for (let i = 0; i < frameData.length; i++) {
    let strToLog = '';
    for (let j = 0; j < frameData[i].length; j++) {
      if (frameData[i][j] === glyph.fill) {
        const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
        const XClampIndex = (input) => clamp(input, 0, frameData.length - 1);
        const YClampIndex = (input) => clamp(input, 0, frameData[i].length - 1);

        let isGlyphAtAnEdge =
          frameData[XClampIndex(i + 1)][j] === glyph.empty ||
          frameData[XClampIndex(i - 1)][j] === glyph.empty ||
          frameData[i][YClampIndex(j - 1)] === glyph.empty ||
          frameData[i][YClampIndex(j + 1)] === glyph.empty;

        if (isGlyphAtAnEdge) frameData[i][j] = glyph.solid;
      }

      let onXAxis = false;
      let onYAxis = false;
      if (i === Math.floor(dimensionY / 2) && frameData[i][j] === glyph.empty) {
        onXAxis = true;
        frameData[i][j] = glyph.xAxis;
      }
      if (j === Math.floor(dimensionX / 2) && frameData[i][j] !== glyph.solid) {
        onYAxis = true;
        if (frameData[i][j] === glyph.empty) frameData[i][j] = glyph.yAxis;
      }
      if (onXAxis && onYAxis && frameData[i][j] !== glyph.fill)
        frameData[i][j] = glyph.origin;

      strToLog += glyph.spacer + frameData[i][j];
    }

    finalString += strToLog + '\n';
  }

  console.clear();
  finalString += `t = ${(Math.round(time * 100) / 100).toFixed(
    2
  )}s\n\n[Ctrl+C] to exit the program`;
  process.stdout.write(`\x1b[H${finalString}\x1b[J`);

  frameData = lastFrame;
}
function computeFrameData() {
  // computes filled vs. empty areas
  let data = Array.from({ length: dimensionY }, () =>
    Array(dimensionX).fill(glyph.empty)
  );

  for (let i = 0; i < dimensionY; i++) {
    for (let j = 0; j < dimensionX; j++) {
      // transform from (dimensionX, dimensionY) to (x, y) where the origin is at the middle
      let x = -dimensionX / 2 + j;
      let y = dimensionY / 2 - i;

      data[i][j] = shape.isPointFilled(x, y, time) ? glyph.fill : glyph.empty;
    }
  }

  return data;
}

function adaptVarsToTime() {
  yCoeff = Math.sin(2 * time);
  xCoeff = Math.cos(2 * time);
}
async function tick() {
  time += 1 / tickRate;

  adaptVarsToTime();
  drawFrame(computeFrameData());

  await wait(1 / tickRate);

  tick();
}

tick();
