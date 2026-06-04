const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');

// ----------------------------
// Style variables accessed from the stylesheet
// ----------------------------
var style = window.getComputedStyle(document.body)
var lineColour = style.getPropertyValue('--plot-line-color');
var backgroundColour = style.getPropertyValue('--backgroud-color');
var annotationColour = style.getPropertyValue('--annotation-color');
var majorPointColour = style.getPropertyValue('--major-point-color');
var minorPointColour = style.getPropertyValue('--minor-point-color');
// ----------------------------
// Variables for the draggable fft canvas
// ----------------------------
// Point being dragged
let draggingPoint = null;
// Get the peak frequencies from the fundamental
let shownFreqs = peaksFromFundamental();
// Minimum displayed frequency
let freqMin = 0.;
// Maximum displayed frequency (freq at n + 1)
let freqMax = shownFreqs[shownFreqs.length - 1] + shownFreqs[0]
// Padding to put y axis
let freqPad = 0.06 * freqMax
// initial peak values as 10 ** peakExponents
let peakExponents = linspace(0, -1.75, shownFreqs.length)
// Canvas amplitude display range for normalization
let ampMin = -0.30;
let ampMax = 1.3;
let ampPad = -0.02 * (ampMax - ampMin)
// amplitudes of the peaks
let peakAmplitudes = [];


// Convert to log scale at the start
let experimentalPeakAmplitudes = peaksAmpsFromFundamental()
let peakAmplitudeLogScaling = Math.log(arrayMin(experimentalPeakAmplitudes.slice(0,9)))

for (let i = 0; i < shownFreqs.length; i++) {
    if (i < experimentalPeakAmplitudes.length) {
      peakAmplitudes.push((Math.log(experimentalPeakAmplitudes[i]) - peakAmplitudeLogScaling) / -peakAmplitudeLogScaling)
    }
}

// actual displayed points for the cavas
let points = []
// fill the peak points array
for (let i = 0; i < shownFreqs.length; i++) {
    // Regulat FFT points
    if (i % 2 == 0) {
    points.push({x:freq2CanvasPixels(shownFreqs[i]), 
                 y:amp2CanvasPixels(peakAmplitudes[Math.floor(i/2)]),
                 yDrag:0})
    }
    else {
    points.push({x:freq2CanvasPixels(shownFreqs[i]), 
                 y:amp2CanvasPixels(0),
                 yDrag:1})
    }
}
// ----------------------------
// Variables for the resulting signal
// ----------------------------
let sampleRate = 22050;
let Pi = 3.1415926535
let sigMin = -1.3; // Normalized between -1 and 1 with padding
let sigMax = 1.1;
let timePeriod = 2 / shownFreqs[0];
let timeMin = -1 * 2 * (timePeriod / 20);
let timeMax = timePeriod + timePeriod/30; // Time for two periods
// Two periods signal time array
let signalPeriodTime = linspace(0, timePeriod + timePeriod/500, (timePeriod * sampleRate) | 0)


// ------------------------------
// Variables for the audio signal
// ------------------------------
//

function signalPeriodAmplitude() {
    // Compute two fundamental periods of the signal
    // from the fft peaks
    let signal = [];

    for (let i = 0; i < signalPeriodTime.length; i++) {
        let signalPoint = 0;
        for (let j = 0; j < points.length; j++) {
            let pointAmp = canvasPixel2amp(points[j].y)
            if (pointAmp > 0.01) {
              // pointAmp = Math.exp((pointAmp * -peakAmplitudeLogScaling) + peakAmplitudeLogScaling)
              let peakFreq = canvasPixel2freq(points[j].x)
              let sinValue = Math.sin(2 * Pi * signalPeriodTime[i] * peakFreq)
              signalPoint += pointAmp * sinValue;
            }
        }
        signal.push(signalPoint)
    }
    signalPeriodMax = arrayMax(arrayAbs(signal));
    for (let i = 0; i < signal.length; i++) {
        signal[i] = signal[i] / signalPeriodMax;
    }
    return signal
}

// Transform functions for the two coordinates of the signal plot
function signalPeriodAmplitude2Canvas(amplitude) {
    return canvas2.height - canvas2.height * (amplitude - sigMin) / (sigMax - sigMin)
}

function canvas2SignalPeriodAmplitude(py) {
    return (sigMax - sigMin) * (py - canvas2.height) / (-1 * canvas2.height) + sigMin
}

function signalPeriodTime2Canvas(time) {
    return canvas2.width * (time - timeMin) / (timeMax - timeMin)
}

function canvas2SignalPeriodTime(px) {
    return (timeMax - timeMin) * (px / canvas2.width) + timeMin
}


function frequenciesFromPeaksPoints(points) {
    // frequencies for the continuous curve
    let freqCurve = [];
    let freqMax = canvasPixel2freq(points[points.length - 1].x) + canvasPixel2freq(points[0].x);
    for (let f = 0; f < freqMax; f++) {
        freqCurve.push(f)
    }
    return freqCurve
}

// Compute the ft from the peak points
function fftFromPeaksPoints(points) {
    freqCurve = frequenciesFromPeaksPoints(points);
    let fft = [];
    let fftBackgroundExps = linspace(-2, -4, freqCurve.length);
    for (let i = 0; i < fftBackgroundExps.length; i++){
        fft.push(10 ** fftBackgroundExps[i]);
    }

    let peakWidths = linspace(1.0, 0.5, points.length);
    
    // Empty array to store the FFT
    for (let i = 0; i < points.length; i++) {
        //peakId = shownFreqs[i]
        let peakAmp = canvasPixel2amp(points[i].y);
        if (peakAmp > 0.01) {
          peakId = Math.floor(canvasPixel2freq(points[i].x)) + 1
          peakKernel = polyPeakKernel(peakWidths[i])
          peakIndices = linspace(peakId - 25, peakId + 25, 51)
          for (let j = 0; j < peakKernel.length; j++) {
              fft[peakIndices[j]] = fft[peakIndices[j]] + peakKernel[j] * peakAmp
          }
        }
    }
    return fft
}

function polyPeakKernel(width) {
    // Polynomial 1x51 peak kernel
    // width: scaling of the peak width [0; 1]
    x1 = linspace(-1, 0, 25)
    exp2 = (5 * (1 - width) + 3 * width)
    let out = [];
    for (let i = 0; i < x1.length; i++) {
        out.push((x1[i] + 1) ** (2 ** exp2))
    }
    for (let i = x1.length -2; i > -1; i--) {
        out.push((x1[i] + 1) ** (2 ** exp2))
    }
    return out
}

function peaksAmpsFromFundamental() {
    // Get some experimental peak amplitudes from the user defined fundamental
    let experimentalPeakFreqsFundamentals = [82, 110, 146, 196, 328]
    // amplitudes of the peaks from a real sound (E2)
    let experimentalPeakAmplitudes82Hz =  [0.87222151, 1.0, 0.26613255, 0.24458187, 0.05386535,
                                           0.03874339, 0.01633243, 0.04685895, 0.01206461, 0.01397203]
    // amplitudes of the peaks from a real sound (A2)
    let experimentalPeakAmplitudes110Hz = [1.0, 0.74214521, 0.21227197, 0.09195222, 0.14772541,
                                           0.08142404, 0.02796886, 0.02547928, 0.00883545, 0.03559971]
    // amplitudes of the peaks from a real sound (D3)
    let experimentalPeakAmplitudes146Hz = [1.00000000e+00, 4.47225650e-01, 2.14790727e-01, 3.18458820e-02,
                                           1.29347581e-02, 2.51348501e-02, 1.78332130e-02, 2.29183680e-02,
                                           3.90459506e-03, 7.10127414e-04]
    // amplitudes of the peaks from a real sound (G3)
    let experimentalPeakAmplitudes196Hz = [1.0, 0.12325866, 0.09305026, 0.08022753, 0.0294975 ,
                                           0.03708471, 0.0277063 , 0.00695532, 0.00591834, 0.0191853 ]
    // amplitudes of the peaks from a real sound (B4)
    let experimentalPeakAmplitudes246Hz = [1.0, 0.40557445, 0.1998758, 0.02351546, 0.00564378,
                                           0.00471402, 0.01401029, 0.07721915, 0.03721915]
    // amplitudes of the peaks from a real sound (E5)
    let experimentalPeakAmplitudes328Hz = [1., 0.23243072, 0.03318285, 0.01011001, 0.01056265, 0.02165178, 
                                           0.00564378, 0.00471402, 0.00471402]
    let experimentalPeakAmplitudesArray = [experimentalPeakAmplitudes82Hz,
                                           experimentalPeakAmplitudes110Hz,
                                           experimentalPeakAmplitudes146Hz, 
                                           experimentalPeakAmplitudes196Hz,
                                           // experimentalPeakAmplitudes246Hz, 
                                           experimentalPeakAmplitudes328Hz]
    const fundamental = document.getElementById('fundamental');
    // Argmin of the diff
    let absFundamentalDiff = 1e6;
    let currDiff = 0;
    let matchId = -1;
    for (let i=0; i < experimentalPeakFreqsFundamentals.length; i++) {
        currDiff = Math.abs(fundamental.value - experimentalPeakFreqsFundamentals[i])
        if (currDiff < absFundamentalDiff) {
            matchId = i;
            absFundamentalDiff = currDiff;
        }
    }
    return experimentalPeakAmplitudesArray[matchId]
}


function peaksFromFundamental() {
    // Partial humans can hear
    const fundamental = document.getElementById('fundamental');
    var shownFreqs = [];
    for (let i = 2; i < 15; i++) {
        shownFreqs.push(fundamental.value * i/2);
    }
    return shownFreqs;
}


// Transfor functions for the two axes of the Fourier plot
function freq2CanvasPixels(freq) {
    return canvas.width * (freq / freqMax + freqPad / freqMax)
}
function canvasPixel2freq(px) {
    return (px / canvas.width - freqPad / freqMax) * freqMax
}

function amp2CanvasPixels(amp) {
    return canvas.height - canvas.height * (amp - ampMin) / (ampMax - ampMin)
}
function canvasPixel2amp(py) {
    let amp = ((py - canvas.height) / (-1 * canvas.height)) * (ampMax - ampMin) + ampMin
    return amp
}

function arrayAbs(array) {
    out = []
    for (let i = 0; i < array.length; i++){
        if (array[i] < 0) {
            out.push(-1 * array[i])
        }
        else {
            out.push(array[i])
        }
    }
   return out 
}

function arrayMin(array) {
    minValue = array[0]
    for (let i = 0; i < array.length; i++) {
        if (array[i] < minValue) {
            minValue = array[i]
        }
    }
    return minValue
}

function arrayMax(array) {
    minValue = array[0]
    for (let i = 0; i < array.length; i++) {
        if (array[i] > minValue) {
            minValue = array[i]
        }
    }
    return minValue
}

function linspace(start, stop, samples) {
    step = (stop - start) / (samples - 1);
    output = [];
    for (let i = 0; i < samples; i++)
        output.push(start + i * step)
    return output
}


function drawCurve() {
    // This draws the Fourier transform curve with the peaks
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.fillStyle = backgroundColour;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();

    freqValues = frequenciesFromPeaksPoints(points)
    fftValues = fftFromPeaksPoints(points)
    
    ctx.moveTo(freq2CanvasPixels(freqValues[0]), amp2CanvasPixels(fftValues[0]));
    
    for (let i = 1; i < freqValues.length; i++) {
        ctx.lineTo(freq2CanvasPixels(freqValues[i]), amp2CanvasPixels(fftValues[i]));
    }
    ctx.strokeStyle = lineColour;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawPoints();
    drawTicks();
}

function drawCurve2() {
    ctx2.clearRect(0, 0, canvas.width, canvas.height);

    ctx2.beginPath();
    ctx2.fillStyle = backgroundColour;
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    ctx2.beginPath();

    signalAmpValues = signalPeriodAmplitude()
    
    ctx2.moveTo(signalPeriodTime2Canvas(signalPeriodTime[0]), 
                signalPeriodAmplitude2Canvas(signalAmpValues[0]));
    
    for (let i = 1; i < signalPeriodTime.length; i++) {
        ctx2.lineTo(signalPeriodTime2Canvas(signalPeriodTime[i]), 
                    signalPeriodAmplitude2Canvas(signalAmpValues[i]));
    }
    ctx2.strokeStyle = lineColour;
    ctx2.lineWidth = 2;
    ctx2.stroke();

    drawTicks2();
}

function drawPoints() {
    points.forEach(point => {
        ctx.beginPath();
        let peakAmp = canvasPixel2amp(point.y);
        let pointSize = 7;
        // Points at the bottom are same colour as line
        if (peakAmp < 0.01) {
            ctx.fillStyle = lineColour;
            pointSize = 4;
        }
        // Points that can be dragged are green
        else if(point.yDrag == 1) {
            ctx.fillStyle = minorPointColour;
        }
        else {
            ctx.fillStyle = majorPointColour;
        }
        ctx.arc(point.x, point.y, pointSize, 0, Math.PI * 2);
        ctx.fill();
    });
}

function fillCanvasBackgrounds() {
    ctx2.beginPath();
    ctx2.fillStyle = backgroundColour;
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
}


// Function to draw ticks and labels
function drawTicks() {
    ctx.beginPath();
    ctx.font = "20px Arial";
    ctx.fillStyle = annotationColour;
    let boxPadding = 2;
    let boxLeft = canvas.width * (freqPad / freqMax);

    // Draw the bounding box
    ctx.moveTo(boxLeft, boxPadding); // Left top
    ctx.lineTo(boxLeft,  amp2CanvasPixels(ampPad)) // Left bottom
    ctx.lineTo(canvas.width, amp2CanvasPixels(ampPad)) // Right bottom
    // ctx.lineTo(canvas.width - boxPadding, boxPadding) // Right top
    // ctx.lineTo(boxLeft, boxPadding) // Right top
    ctx.strokeStyle = annotationColour;    
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw the X ticks
    let canvasBottom = amp2CanvasPixels(ampPad);
    for (let i = 0; i < points.length; i++) {
        let peakAmp = canvasPixel2amp(points[i].y);
        if (peakAmp > 0.01) {
          ctx.moveTo(points[i].x, canvasBottom);
          ctx.lineTo(points[i].x, canvasBottom + 12);
          let tickLabel = canvasPixel2freq(points[i].x)
          ctx.fillText(Math.round(tickLabel), points[i].x - 15, canvasBottom + 30)
        }
    }
    ctx.fillText("Fréquence (Hz)", canvas.width / 2 - 20, canvas.height - 5)

    // Draw the Y ticks
    ctx.moveTo(boxLeft, amp2CanvasPixels(ampPad))
    ctx.lineTo(boxLeft, amp2CanvasPixels(ampPad + 0.1) - 20)

    ctx.strokeStyle = annotationColour;    
    ctx.lineWidth = 2;
    ctx.stroke();

    // Write Amplitude
    ctx.save();
    ctx.translate(canvas.width, canvas.height)
    ctx.rotate(1.5 * Math.PI);
    ctx.fillText("Amplitude", canvas.height/2, -canvas.width + 20)
    ctx.restore();
}

function drawTicks2() {
    // Font and tick style
    ctx2.beginPath();
    ctx2.font = "20px Arial";
    ctx2.fillStyle = annotationColour;
    ctx2.strokeStyle = annotationColour;
    ctx2.lineWidth = 2.5;
    let boxPadding = 5;
    let boxLeft = signalPeriodTime2Canvas(-timePeriod/200);

    // Draw the bounding box
    ctx2.moveTo(boxLeft, signalPeriodAmplitude2Canvas(1.05)); // Left top
    ctx2.lineTo(boxLeft, signalPeriodAmplitude2Canvas(-1.05)) // Left bottom
    // Horizontal line for time axis
    ctx2.moveTo(boxLeft, signalPeriodAmplitude2Canvas(0))
    ctx2.lineTo(canvas.width - boxPadding, signalPeriodAmplitude2Canvas(0))

    ctx2.fillText("Temps (Périodes)", canvas.width / 2 - 40, canvas.height - 5)
    
    // Draw the X ticks
    let periodDt = timePeriod / 8;
    let canvasPeriodTimeTicks = linspace(periodDt, 8 * periodDt, 8)
    let tickYPos = signalPeriodAmplitude2Canvas(0);
    for (let i = 0; i < canvasPeriodTimeTicks.length; i++) {
        let tickXPos = signalPeriodTime2Canvas(canvasPeriodTimeTicks[i])
        ctx2.moveTo(tickXPos, tickYPos);
        ctx2.lineTo(tickXPos, tickYPos + 12);
        if ((i+1) % 2 == 0) {
            let tickLabel = 2 * canvasPeriodTimeTicks[i] / timePeriod;
            ctx2.fillText(tickLabel.toFixed(1), tickXPos - 10, tickYPos + 30)
        }
    }
    ctx2.stroke();

    // Write Amplitude
    ctx2.save();
    ctx2.translate(canvas.width, canvas.height)
    ctx2.rotate(1.5 * Math.PI);
    ctx2.fillText("Amplitude", canvas.height/2 - 20, -canvas.width + 30)
    ctx2.restore();
}

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

console.log('Device is touch device:', isTouchDevice)

// Case for Mobile (touch device)
if (isTouchDevice) {
  // Event when the touch ends
  canvas.addEventListener('touchend', () => {
      draggingPoint = null;
      updateAudio();
  });
  // Assuming touch cancel equals mouse leave
  canvas.addEventListener('touchcancel', () => {
      draggingPoint = null;
  });
  // Event when the touch starts
  canvas.addEventListener('touchstart', (event) => {
      if (event.touches.length == 1) {
      console.log('Disabling scrolling');
      event.preventDefault();
      }
      const mousePos = getTouchPos(canvas, event);
      points.forEach(point => {
          if (isPointInsideTouch(mousePos, point)) {
              draggingPoint = point;
          }
      });
  });
  // Event when the touching moves
  document.addEventListener("touchmove", (event) => {
      if (event.touches.length == 1) {
      console.log('Disabling scrolling')
      event.preventDefault();
      }
      if (draggingPoint) {
          const mousePos = getTouchPos(canvas, event);
          if (draggingPoint.yDrag == 1) {
              draggingPoint.x = mousePos.x;
          }
          draggingPoint.y = Math.min(mousePos.y, amp2CanvasPixels(0));
          draggingPoint.y = Math.max(draggingPoint.y, amp2CanvasPixels(ampMax - 0.1));
          fillCanvasBackgrounds();
          drawCurve();
          drawCurve2();
      }
  });
} // End if isTouchDevice
// Case for Desktop with mouse
else {
  // Event when the click ends
  canvas.addEventListener('mouseup', () => {
      draggingPoint = null;
      updateAudio();
  });
  // Event when the mouse leaves the canvas
  canvas.addEventListener('mouseleave', () => {
      draggingPoint = null;
  });
  // Event when the mouse gets clicked
  canvas.addEventListener('mousedown', (event) => {
      const mousePos = getMousePos(canvas, event);
      points.forEach(point => {
          if (isPointInside(mousePos, point)) {
              draggingPoint = point;
          }
      });
  });
  // Event when the mouse moves
  canvas.addEventListener('mousemove', (event) => {
      if (draggingPoint) {
          const mousePos = getMousePos(canvas, event);
          if (draggingPoint.yDrag == 1) {
              draggingPoint.x = mousePos.x;
          }
          draggingPoint.y = Math.min(mousePos.y, amp2CanvasPixels(0));
          draggingPoint.y = Math.max(draggingPoint.y, amp2CanvasPixels(ampMax - 0.1));
          drawCurve();
          drawCurve2();
      }
  });
} // End else


// Function to update everything when the fundamental changes
document.getElementById('fundamental').addEventListener('change', function () {

    // Convert to log scale at the start
    experimentalPeakAmplitudes = peaksAmpsFromFundamental()
    peakAmplitudeLogScaling = Math.log(arrayMin(experimentalPeakAmplitudes.slice(0,9)))
    peakAmplitudes = []
    for (let i = 0; i < shownFreqs.length; i++) {
        if (i < experimentalPeakAmplitudes.length) {
          peakAmplitudes.push((Math.log(experimentalPeakAmplitudes[i]) - peakAmplitudeLogScaling) / -peakAmplitudeLogScaling)
        }
    }
    shownFreqs = peaksFromFundamental();
    freqMax = shownFreqs[shownFreqs.length - 1] + shownFreqs[0]
    freqPad = 0.06 * freqMax
    for (let i = 0; i < shownFreqs.length; i++) {
      if (i % 2 == 0) {
        points[i] = {x:freq2CanvasPixels(shownFreqs[i]), 
                     y:amp2CanvasPixels(peakAmplitudes[Math.floor(i/2)]),
                     yDrag:0}
      }
      else {
        points[i] = {x:freq2CanvasPixels(shownFreqs[i]), 
                     y:points[i].y,
                     yDrag:1}
      }
    }
    timePeriod = 2 / shownFreqs[0];
    timeMin = -1 * 2 * (timePeriod / 20);
    timeMax = timePeriod + timePeriod/30; // Time for two periods
    // Two periods signal time array
    signalPeriodTime = linspace(0, timePeriod + timePeriod/500, (timePeriod * sampleRate) | 0)
    drawCurve();
    drawCurve2();
    updateAudio();
    });

function getMousePos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function getTouchPos(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

function isPointInside(mousePos, point) {
    const dx = mousePos.x - point.x;
    const dy = mousePos.y - point.y;
    return Math.sqrt(dx * dx + dy * dy) < 8; // Radius of the point
}

// Allow larger tolerance for touch events
function isPointInsideTouch(mousePos, point) {
    const dx = mousePos.x - point.x;
    const dy = mousePos.y - point.y;
    return Math.sqrt(dx * dx + dy * dy) < 32; // Radius of the point
}

function getSampleAt(t)
// t - is number from range [0, DUR), return number in range [0, 1]
{
    const PI = 3.1415926535;
    let signalValue = 0.
    for (let i = 0; i < points.length; i ++) {
        let An = canvasPixel2amp(points[i].y);
        // An = Math.exp((An * -0.1 * peakAmplitudeLogScaling) + 0.1 * peakAmplitudeLogScaling)
        let freq = canvasPixel2freq(points[i].x);
        let decay = Math.exp(-(i/3 + 1)/2 * t);
        let signalHarmonic = An * Math.sin(2 * PI * t * freq) * decay;
        signalValue += signalHarmonic;
    }
    return signalValue; 
}

function fadeOut(signal, SPS) {
    let fadeOutTime = 0.5;
    let fadeOutSamples = fadeOutTime * SPS;
    let fadeOutArray = linspace(1.0, 0., fadeOutSamples)
    for (let i = 0; i < fadeOutArray.length; i++) {
        let curVal = signal[signal.length - fadeOutArray.length + i];
        signal[signal.length - fadeOutArray.length + i] = curVal * fadeOutArray[i]
    }
    return signal
}

function genWAVUrl(fun, DUR=1, NCH=1, SPS=44100, BPS=2) 
// DUR - duration in seconds   SPS - sample per second (default 44100)
// NCH - number of channels    BPS - bytes per sample
{
  let size = DUR*NCH*SPS*BPS; 
  let put = (n, l=4) => [(n<<24),(n<<16),(n<<8),n].filter((x,i)=>i<l).map(x=> String.fromCharCode(x>>>24)).join('');
  let p = (...a) => a.map( b=> put(...[b].flat()) ).join(''); 
  let data = `RIFF${put(44+size)}WAVEfmt ${p(16,[1,2],[NCH,2],SPS,NCH*BPS*SPS,[NCH*BPS,2],[BPS*8,2])}data${put(size)}`
  
  let signal = [];
  for (let i = 0; i < DUR*SPS; i++) {
    let f = fun(i/SPS);
    signal.push(f);
  }
  normValue = arrayMax(arrayAbs(signal));
  for (let i = 0; i < signal.length; i++) {
      signal[i] = signal[i] / normValue;
      signal[i] = signal[i] * 0.95;
      //signal[i] = 0.5 * (signal[i] + 1);
  }

  signal = fadeOut(signal, SPS);
  for (let i = 0; i < signal.length; i++) {
     let f = signal[i];
     intValue = Math.floor( f * (2**(BPS*8)/2));
     data += put(intValue, BPS);
  }
  
  return "data:Audio/WAV;base64," + btoa(data);
}

function initialAudio() {
    var WAV = new Audio(genWAVUrl(getSampleAt, 3.5)); // 5s
    WAV.setAttribute("controls", "controls");
    WAV.setAttribute("id", "soundElement");
    document.getElementById("listenContainer").appendChild(WAV);
}

function updateAudio() {
    var WAV = new Audio(genWAVUrl(getSampleAt, 3.5)); // 5s
    WAV.setAttribute("controls", "controls");
    WAV.setAttribute("id", "soundElement");
    document.getElementById("soundElement").replaceWith(WAV);
}

drawCurve();
drawCurve2();
initialAudio();
