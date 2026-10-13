// Verbindet die Seite mit Rechnen und Zeichnen.

import { TINKERBELL, berechnePunkte, vermesseAttraktor } from "./attraktor.js";
import { erstelleShader } from "./shader.js";

const MAX_PUNKTE = 10000000;
const MAX_STAERKE = 255;
const MAX_ZOOM = 100000;
const BILDER_PRO_ANIMATION = 300; // in so vielen Bildern entsteht der Attraktor (60 pro Sekunde = 5 s)

let punkte = 100000;
let staerke = 10;
let zoom = 100;

// immer sinnvolle Hilfsfunktion
function hole(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Im HTML fehlt ein Element mit id="${id}"`);
  return element;
}

const canvas = hole("zeichenBild");

const sofortBtn = hole("sofortBtn");
const massstabBtn = hole("massstabBtn");

const staerkeFeld = hole("staerke");
const punkteFeld = hole("punkte");
// die beiden Eingabefelder

const zoomFeld = hole("zoom");

const farbigCheck = hole("farbigCheck");
const redRange = hole("red");
const blueRange = hole("blue");

// Startwerte aus dem HTML lesen, dann gibt es nur eine Stelle, wo sie stehen
let farbig = farbigCheck.checked;
let red = Number(redRange.value);
let blue = Number(blueRange.value);

const shader = erstelleShader(canvas);

// Der Attraktor ist jetzt in attraktor.js drin
const typ = TINKERBELL;
let werte = { ...typ.werte };

let mass = null; // Ergebnis von vermesseAttraktor
let ansicht = { x: 0, y: 0 }; // welcher Punkt des Attraktors in der Bildmitte liegt

let sichtbar = punkte; // wie viele Punkte gerade gezeichnet werden
let animationsId = null; // läuft gerade eine Animation? dann steht hier ihre Nummer

function passeGroesseAn() {
  // mindestens doppelt so fein rechnen, auch bei normalen Monitoren mit dpr 1
  const dpr = Math.max(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}

// immer sinnvoll beim lesen von Zahlen
// Hilfsfunktion dass die Eingabe auch eine Zahl im Rahmen ist (und ganz, wenn sollGanz)
function leseZahl(feld, min, max, bisher, sollGanz = true) {
  const zahl = Number(feld.value.trim());
  if (feld.value.trim() === "" || !Number.isFinite(zahl)) {
    feld.value = bisher;
    // wenn leer oder nicht Finite dann mach den Wert was er davor war
    return bisher;
  }
  let jetzt = Math.min(Math.max(zahl, min), max);
  // soll größer min und kleiner max sein
  if (sollGanz) jetzt = Math.round(jetzt);
  feld.value = jetzt;
  return jetzt;
}

// Zoom, bei dem der ganze Attraktor ins Bild passt
function passenderZoom() {
  if (!mass) return zoom;
  return Math.min(canvas.width / mass.breite, canvas.height / mass.hoehe) * 0.9;
}

// rechnen nur wenn sich Werte oder Punktzahl ändern
function rechne() {
  // berechnen der Punkte in attraktor.js
  const daten = berechnePunkte(typ, werte, punkte);
  shader.ladePunkte(daten);
  mass = daten ? vermesseAttraktor(daten) : null;
}

// zeichnen billig, geht bei jedem Zoom
function zeichne() {
  shader.zeichne({ mitteX: ansicht.x, mitteY: ansicht.y, zoom, staerke, farbig, red, blue, sichtbar });
}

function zeigeAlles() {
  if (mass) ansicht = { x: mass.mitteX, y: mass.mitteY };
  zoom = passenderZoom();
  zoomFeld.value = Math.round(zoom);
  zeichne();
}

// Entstehen lassen: jedes Bild ein paar Punkte mehr zeichnen
// gerechnet ist schon alles, der Shader zeichnet nur die ersten "sichtbar" Punkte

function stoppeAnimation() {
  if (animationsId !== null) cancelAnimationFrame(animationsId);
  animationsId = null;
  sichtbar = punkte;
  sofortBtn.textContent = "Animieren";
}

function animiere() {
  stoppeAnimation();
  sichtbar = 0;
  sofortBtn.textContent = "Stoppen";
  const proBild = Math.ceil(punkte / BILDER_PRO_ANIMATION);

  function bildSchritt() {
    sichtbar += proBild;
    zeichne();
    if (sichtbar < punkte) {
      animationsId = requestAnimationFrame(bildSchritt);
    } else {
      stoppeAnimation(); // fertig: Knopf zurücksetzen
    }
  }

  animationsId = requestAnimationFrame(bildSchritt);
}

// Felder

punkteFeld.addEventListener("change", () => {
  punkte = leseZahl(punkteFeld, 1000, MAX_PUNKTE, punkte);
  stoppeAnimation();
  rechne();
  zeichne();
});

staerkeFeld.addEventListener("change", () => {
  staerke = leseZahl(staerkeFeld, 1, MAX_STAERKE, staerke);
  zeichne(); // nur zeichnen, die Punkte bleiben gleich
});

zoomFeld.addEventListener("change", () => {
  zoom = leseZahl(zoomFeld, 1, MAX_ZOOM, zoom, false);
  zeichne(); // nur zeichnen
});

sofortBtn.addEventListener("click", () => {
  if (animationsId !== null) {
    stoppeAnimation();
    zeichne(); // sofort alles zeigen
  } else {
    animiere();
  }
});

massstabBtn.addEventListener("click", zeigeAlles);

farbigCheck.addEventListener("change", () => {
  farbig = farbigCheck.checked; // direkt vom Häkchen, dann kann es nie verkehrt herum sein
  zeichne();
});

// "input" statt "change": feuert schon beim Ziehen, nicht erst beim Loslassen
redRange.addEventListener("input", () => {
  red = Number(redRange.value);
  zeichne();
});

blueRange.addEventListener("input", () => {
  blue = Number(blueRange.value);
  zeichne();
});

// Mouse Listener
// Mausrad: zoomen, die Stelle unter dem Zeiger bleibt stehen

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();

  const abstand = mausAbstand(event);
  const punkt = punktBei(abstand); // merken, bevor der Zoom sich ändert

  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16; // manche Mäuse melden Zeilen statt Pixel
  zoom *= Math.exp(-delta * 0.0015);
  zoom = Math.min(Math.max(zoom, 1), MAX_ZOOM);

  haltePunkt(punkt, abstand); // derselbe Punkt, dieselbe Maus, neuer Zoom

  zoomFeld.value = Math.round(zoom);
  zeichne();
}, { passive: false });

// Abstand der Maus zur Canvas-Mitte [Canvas-Pixel]
function mausAbstand(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    // müssen hier den canvas durch rect teilen, alle Pixel im Canvas sind bei
    // passeGroesseAn mit dpr multipliziert worden und damit ist nicht jeder
    // Punkt im rect genau der Punkt im canvas
    dx: (event.clientX - rect.left) * (canvas.width / rect.width) - canvas.width / 2,
    dy: (event.clientY - rect.top) * (canvas.height / rect.height) - canvas.height / 2,
    // zurück kommt der Punkt relativ zur Canvas-Mitte
  };
}

// Welcher Punkt des Attraktors liegt bei diesem Abstand?
// durch den zoom teilen, denn beim malen des Punktes hatten wir zuvor den zoom multipliziert
function punktBei({ dx, dy }) {
  return {
    x: ansicht.x + dx / zoom,
    y: ansicht.y + dy / zoom,
  };
}

// Ansicht so setzen, dass dieser Punkt bei diesem Abstand liegt
function haltePunkt(punkt, { dx, dy }) {
  ansicht.x = punkt.x - dx / zoom;
  ansicht.y = punkt.y - dy / zoom;
}

// Finger und Maus: ein Zeiger verschiebt, zwei Zeiger zoomen und verschieben
// das Muster ist bei Fingern immer gleich (ersetzen dann auch die einfachen pointer listener)
const finger = new Map(); // pointerId → Abstand zur Canvas-Mitte

let gegriffen = null; // der Punkt des Attraktors, der festgehalten wird
let startAbstand = 1; // Abstand der zwei Finger beim Aufsetzen
let startZoom = 1; // Zoom beim Aufsetzen des zweiten Fingers

// Die Finger als Liste
function alleFinger() {
  return [...finger.values()];
}

// Punkt genau zwischen zwei Fingern
function mitteZwischen(a, b) {
  return { dx: (a.dx + b.dx) / 2, dy: (a.dy + b.dy) / 2 };
}

// Abstand der beiden Finger zueinander
function abstandZwischen(a, b) {
  return Math.hypot(a.dx - b.dx, a.dy - b.dy);
}

// Neu anfassen, je nachdem, wie viele Finger gerade drauf sind
function greifeNeu() {
  if (finger.size === 1) {
    const [a] = alleFinger();
    gegriffen = punktBei(a);
  } else if (finger.size === 2) {
    const [a, b] = alleFinger();
    gegriffen = punktBei(mitteZwischen(a, b));
    startAbstand = Math.max(abstandZwischen(a, b), 1); // nie 0, sonst teilen wir unten durch 0
    startZoom = zoom;
  } else {
    gegriffen = null;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  finger.set(event.pointerId, mausAbstand(event));
  canvas.setPointerCapture(event.pointerId);
  greifeNeu();
});

canvas.addEventListener("pointermove", (event) => {
  if (!finger.has(event.pointerId)) return; // Maus nur drüber, nicht gedrückt
  finger.set(event.pointerId, mausAbstand(event));

  if (finger.size === 1) {
    const [a] = alleFinger();
    haltePunkt(gegriffen, a);
  } else if (finger.size === 2) {
    const [a, b] = alleFinger();
    zoom = startZoom * (abstandZwischen(a, b) / startAbstand);
    zoom = Math.min(Math.max(zoom, 1), MAX_ZOOM);
    haltePunkt(gegriffen, mitteZwischen(a, b));
    zoomFeld.value = Math.round(zoom);
  }

  zeichne();
});

function lassLos(event) {
  finger.delete(event.pointerId);
  greifeNeu(); // mit den übrigen Fingern neu anfassen
}

canvas.addEventListener("pointerup", lassLos);
canvas.addEventListener("pointercancel", lassLos);

// Start

punkteFeld.value = punkte;
staerkeFeld.value = staerke;

rechne(); // die Punkte brauchen keine Canvas-Größe

let ersteGroesse = true;

const beobachter = new ResizeObserver(() => {
  const alteBreite = canvas.width;
  passeGroesseAn();
  if (ersteGroesse) {
    ersteGroesse = false;
    zeigeAlles(); // passender Zoom braucht die echte Größe
  } else {
    // zoom ist "Canvas-Pixel pro Einheit": wird der Canvas breiter,
    // muss der zoom mitwachsen, sonst sieht man plötzlich mehr vom Attraktor
    zoom *= canvas.width / alteBreite;
    zoomFeld.value = Math.round(zoom);
    zeichne();
  }
});

beobachter.observe(canvas);
