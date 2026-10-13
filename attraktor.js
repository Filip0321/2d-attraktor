// Rechne den Attraktor aus, gezeichnet wird er dann vom shader
// Dadurch muss ich die Punkte nicht mit jeder Bewegung komplett neu berechnen

const LIMIT_ABSTAND_PUNKTE = 1000000; // weiter weg gilt als davongelaufen
const EINPENDELN = 100; // so viele Schritte am Anfang nicht speichern

export const TINKERBELL = {
  name: "Tinkerbell",
  werte: { a: 0.9, b: -0.6013, c: 2.0, d: 0.5 },
  start: [-0.72, -0.64],
  schritt(werte, pos) {
    const x = pos.x * pos.x - pos.y * pos.y + werte.a * pos.x + werte.b * pos.y;
    const y = 2 * pos.x * pos.y + werte.c * pos.x + werte.d * pos.y;
    pos.x = x;
    pos.y = y;
  },
};

// Hilfsfunktion
// Check ob der Punkt außerhalb des Limits oder im Unendlichen ist
function punktNichtMehrDa(punkt) {
  return (
    !Number.isFinite(punkt.x + punkt.y) ||
    Math.abs(punkt.x) > LIMIT_ABSTAND_PUNKTE ||
    Math.abs(punkt.y) > LIMIT_ABSTAND_PUNKTE
  );
}

// Alle Punkte einmal berechnen.
// Ergebnis: Float32Array mit x0, y0, x1, y1, … oder null, wenn der Punkt davonläuft
// start ist optional, ohne nimmt er den Start vom Typ
export function berechnePunkte(typ, werte, anzahl, start = typ.start) {
  const pos = { x: start[0], y: start[1] }; // eigene Position, nicht global

  for (let i = 0; i < EINPENDELN; i++) {
    typ.schritt(werte, pos);
  }

  // anzahl * 2 weil jeder Punkt eine x und y Koordinate hat
  const daten = new Float32Array(anzahl * 2);

  for (let i = 0; i < anzahl; i++) {
    typ.schritt(werte, pos);
    if (punktNichtMehrDa(pos)) return null;
    daten[i * 2] = pos.x;
    daten[i * 2 + 1] = pos.y;
  }

  return daten;
}

// Den fertigen Attraktor vermessen: wo ist seine Mitte und wie groß ist er
// gemalt wird hier nichts, mit dem Ergebnis kann main.js den Zoom so wählen,
// dass der Attraktor mittig und ganz im Bild ist
export function vermesseAttraktor(punkte) {
  let minX = Infinity; // der erste Punkt ist sicher kleiner
  let minY = Infinity;
  let maxX = -Infinity; // und sicher größer
  let maxY = -Infinity;

  // jetzt hat jeder punkt eine x und y Koordinate nacheinander geschrieben
  // im Array, also muss += 2
  for (let i = 0; i < punkte.length; i += 2) {
    if (punkte[i] < minX) minX = punkte[i];
    if (punkte[i] > maxX) maxX = punkte[i];
    if (punkte[i + 1] < minY) minY = punkte[i + 1];
    if (punkte[i + 1] > maxY) maxY = punkte[i + 1];
  }

  return {
    mitteX: (minX + maxX) / 2,
    mitteY: (minY + maxY) / 2,
    breite: Math.max(maxX - minX, 1e-9), // nie 0, sonst teilt passenderZoom durch 0
    hoehe: Math.max(maxY - minY, 1e-9),
  };
}
