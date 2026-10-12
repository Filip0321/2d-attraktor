const MAX_PUNKTE = 1000000;
const MAX_STAERKE = 255;

const MAX_MASSSTAB_BESTIMMEN = 200000;
const LIMIT_ABSTAND_PUNKTE = 1000000;

const MAX_ZOOM = 10000;

let staerke = 10;
let punkte = 1000000;
let zoom = 100;
let massstab = 1;

// immer sinnvolle Hilfsfunktion
function hole(id) {
  return document.getElementById(id);
}

const canvas = hole("zeichenBild");
const canvasContext = canvas.getContext("2d");

const sofortBtn = hole("sofortBtn");
const massstabBtn = hole("massstabBtn");

const staerkeFeld = hole("staerke");
const punkteFeld = hole("punkte");
// die beiden Eingabefelder

const zoomFeld = hole("zoom");

let animiert = false;

function passGroesseAn() {
  const dpr = Math.max(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round((canvas.width / 4) * 3);
}

// ERSTMAL OHNE PRESETS, NUR EIN SCHÖNER ATTRAKTOR
let typ = "Tinkerbell"; // <-- falls ich später PRESETS auch hier mache
let werte = {
  a: 0.9,
  b: -0.6013,
  c: 2.0,
  d: 0.5,
};
let start = [-0.72, -0.64];
const pos = {
  x: start[0],
  y: start[1],
};

function schritt(werte, pos) {
  const x = pos.x * pos.x - pos.y * pos.y + werte.a * pos.x + werte.b * pos.y;
  const y = 2 * pos.x * pos.y + werte.c * pos.x + werte.d * pos.y;
  pos.x = x;
  pos.y = y;
}

let fertigesBild = null;
let mittigesBild = null;
let gezeichnet = 0;

// Hilfsfunktion
// Check ob der Punkt außerhalb des Limits oder im Unendlichen ist
function punktNichtMehrDa(punkt) {
  return (
    !Number.isFinite(punkt.x + punkt.y) ||
    Math.abs(punkt.x) > LIMIT_ABSTAND_PUNKTE ||
    Math.abs(punkt.y) > LIMIT_ABSTAND_PUNKTE
  );
}

function attraktorMittigMalen() {
  // den Attraktor ausrichten, dass er mittig im Bild / auf dem Canvas ist
  // erstmal eine ProbeAnzahl an Punkten berechnen und Abstand der Punkte zueinander bestimmen
  // und der neue Maßstab (verhältnis alter canvas zu neuem) verschieben beim malen alle Punkte
  // bevor diese gemalt werden natürlich
  const probe = { x: pos.x, y: pos.y };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const test = Math.min(punkte, MAX_MASSSTAB_BESTIMMEN);

  for (let i = 0; i < test; i++) {
    schritt(werte, probe);
    if (punktNichtMehrDa(probe)) return null;
    if (i < 100) continue; // erstmal einpendeln lassen
    if (probe.x < minX) minX = probe.x;
    if (probe.x > maxX) maxX = probe.x;
    if (probe.y < minY) minY = probe.y;
    if (probe.y > maxY) maxY = probe.y;
  }

  const breite = maxX - minX;
  const hoehe = maxY - minY;
  massstab = Math.min(canvas.width / breite, canvas.height / hoehe) * 0.9;
  // sonst sieht man einfach gar nichts
  // beim Tinkerbell muss die distanz aller punkt um das 900 FACHE erhöht 
  // werden damit man überhaupt was erkennen kann

  return {
    mitteX: (minX + maxX) / 2,
    mitteY: (minY + maxY) / 2,
  };
}

function zeichenflaecheGrauInitialisieren() {
  fertigesBild = canvasContext.createImageData(canvas.width, canvas.height);
  const pixel = fertigesBild.data;
  // array aus allen pixeln mit r, g, b, a werten nacheinander im array
  for (let i = 0; i < pixel.length; i += 4) {
    pixel[i] = 17; // red
    pixel[i + 1] = 17; // blue
    pixel[i + 2] = 17; // green
    pixel[i + 3] = 255; // alpha
  }
  pos.x = start[0]; // resetten
  pos.y = start[1];
  mittigesBild = attraktorMittigMalen();
}

function punkteHinzufuegen(anzahl) {
  if (!mittigesBild) {
    gezeichnet = punkte;
    return;
  }

  const w = fertigesBild.width;
  const h = fertigesBild.height;
  const pixel = fertigesBild.data;
  const { mitteX, mitteY } = mittigesBild;
  const ende = Math.min(gezeichnet + anzahl, punkte);

  for (; gezeichnet < ende; gezeichnet++) {
    schritt(werte, pos);

    if (punktNichtMehrDa(pos)) {
      gezeichnet = punkte;
      return;
    }

    if (gezeichnet < 100) continue;

    const px = Math.floor(w / 2 + (pos.x - mitteX) * zoom); // die Punkte korrekt bezogen
    const py = Math.floor(h / 2 + (pos.y - mitteY) * zoom); // auf die neue Mitte setzen
    if (px < 0 || px >= w || py < 0 || py >= h) continue;

    const stelle = (py * w + px) * 4; // siehe gameOfLife --> aus mehrdimensionaler Array, eindimensionale
    // jeder pixel ist 4 breit, deswegen *4
    pixel[stelle] += staerke; // helleres grau an der stelle
    pixel[stelle + 1] += staerke;
    pixel[stelle + 2] += staerke;
  }
}

function attraktorAufCanvas() {
  canvasContext.putImageData(fertigesBild, 0, 0);
}

// immer sinnvoll beim lesen von Ganzzahlen
// Hilfsfunktion dass die eingabe auch ne Ganzzahl ist
function leseGanzzahl(feld, min, max, bisher) {
  const zahl = Number(feld.value.trim());
  if (feld.value.trim() === "" || !Number.isFinite(zahl)) {
    feld.value = bisher;
    // wenn leer oder nicht Finite dann mach den Wert was er davor war
    return bisher;
  }
  const jetzt = Math.min(Math.max(zahl, min), max);
  // soll größer min und kleiner max sein
  feld.value = jetzt;
  return jetzt;
}

punkteFeld.addEventListener("change", () => {
  punkte = leseGanzzahl(punkteFeld, 0, MAX_PUNKTE, punkte);
  zeichneAttraktor();
});

staerkeFeld.addEventListener("change", () => {
  staerke = leseGanzzahl(staerkeFeld, 0, MAX_STAERKE, staerke);
  zeichneAttraktor();
});

sofortBtn.addEventListener("click", () => {
  animiert = !animiert;
  sofortBtn.textContent = animiert ? "Stoppen" : "Animieren";
});

massstabBtn.addEventListener("click", () => {
  zoom = massstab;
  zoomFeld.value = massstab;
  zeichneAttraktor();
});

zoomFeld.addEventListener("change", () => {
  zoom = leseGanzzahl(zoomFeld, 0, MAX_ZOOM, zoom);
  zeichneAttraktor();
});

punkteFeld.value = punkte;
staerkeFeld.value = staerke;
zoomFeld.value = zoom;

function zeichneAttraktor() {
  gezeichnet = 0;
  pos.x = start[0];
  pos.y = start[1];

  zeichenflaecheGrauInitialisieren();
  punkteHinzufuegen(punkte);
  attraktorAufCanvas();
}

passGroesseAn();
zeichenflaecheGrauInitialisieren();
punkteHinzufuegen(punkte);
attraktorAufCanvas();
