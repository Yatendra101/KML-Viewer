import React, { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Polygon, Popup } from "react-leaflet";
import { parseString } from "xml2js";
import "leaflet/dist/leaflet.css";

// Validate coordinates
const isValidCoordinate = (coord) => {
  return (
    Array.isArray(coord) &&
    coord.length === 2 &&
    typeof coord[0] === "number" &&
    typeof coord[1] === "number" &&
    !isNaN(coord[0]) &&
    !isNaN(coord[1])
  );
};

// Calculate total length of lines
const calculateLength = (coords) => {
  if (!coords || coords.length < 2) return 0;

  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lon1] = coords[i - 1];
    const [lat2, lon2] = coords[i];

    if (!isValidCoordinate([lat1, lon1]) || !isValidCoordinate([lat2, lon2])) continue;

    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    length += R * c;
  }
  return length.toFixed(2);
};

const KMLViewer = () => {
  const [elements, setElements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseString(text, (err, result) => {
        if (err) {
          console.error("Error parsing KML:", err);
          return;
        }
        const placemarks = result?.kml?.Document?.[0]?.Placemark || [];
        processKMLData(placemarks);
      });
    };
    reader.readAsText(file);
  };

  const processKMLData = (placemarks) => {
    let counts = { Point: 0, LineString: 0, Polygon: 0, MultiLineString: 0 };
    let parsedElements = [];

    placemarks.forEach((placemark) => {
      if (placemark.Point) {
        counts["Point"] += 1;
        const coords = parseCoordinates(placemark.Point[0]?.coordinates?.[0]);
        if (coords.length > 0) {
          parsedElements.push({ type: "Point", coords, name: placemark.name?.[0] || "Point" });
        }
      }

      if (placemark.LineString) {
        counts["LineString"] += 1;
        const coords = parseCoordinates(placemark.LineString[0]?.coordinates?.[0]);
        if (coords.length > 1) {
          parsedElements.push({ type: "LineString", coords, length: calculateLength(coords), name: placemark.name?.[0] || "LineString" });
        }
      }

      if (placemark.Polygon) {
        counts["Polygon"] += 1;
        const coords = parseCoordinates(placemark.Polygon[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]);
        if (coords.length > 2) {
          parsedElements.push({ type: "Polygon", coords, name: placemark.name?.[0] || "Polygon" });
        }
      }

      if (placemark.MultiGeometry && placemark.MultiGeometry[0]?.LineString) {
        counts["MultiLineString"] += 1;
        const multiCoords = placemark.MultiGeometry[0].LineString.map((line) =>
          parseCoordinates(line?.coordinates?.[0])
        ).filter(coords => coords.length > 1);

        if (multiCoords.length > 0) {
          const totalLength = multiCoords.reduce((acc, coords) => acc + parseFloat(calculateLength(coords)), 0);
          parsedElements.push({ type: "MultiLineString", coords: multiCoords, length: totalLength.toFixed(2), name: placemark.name?.[0] || "MultiLineString" });
        }
      }
    });

    setElements(parsedElements);
    setSummary(counts);
    setShowSummary(false);
    setShowDetailed(false);
  };

  const parseCoordinates = (coordString) => {
    if (!coordString) return [];
    return coordString.trim().split(/\s+/).map((coord) => {
      const [lng, lat] = coord.split(",");
      if (!lng || !lat) return null;
      const parsedCoord = [parseFloat(lat), parseFloat(lng)];
      return isValidCoordinate(parsedCoord) ? parsedCoord : null;
    }).filter(coord => coord !== null); // Remove invalid coordinates
  };

  return (
    <div>
      <h2>KML File Viewer</h2>
      <input type="file" accept=".kml" onChange={handleFileUpload} />
      <button onClick={() => { setShowSummary(true); setShowDetailed(false); }}>Summary</button>
      <button onClick={() => { setShowSummary(false); setShowDetailed(true); }}>Detailed</button>

      {showSummary && summary && (
        <div>
          <h3>Summary</h3>
          <table border="1">
            <thead>
              <tr>
                <th>Element Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary).map(([key, value]) => (
                value > 0 && (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetailed && elements.length > 0 && (
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "500px", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {elements.map((el, index) => {
            if (el.type === "Point" && isValidCoordinate(el.coords)) {
              return <Marker key={index} position={el.coords}><Popup>{el.name}</Popup></Marker>;
            }
            if (el.type === "LineString" && el.coords.every(isValidCoordinate)) {
              return <Polyline key={index} positions={el.coords} color="blue"><Popup>{`${el.name}: Length ${el.length} km`}</Popup></Polyline>;
            }
            if (el.type === "Polygon" && el.coords.every(isValidCoordinate)) {
              return <Polygon key={index} positions={el.coords} color="green"><Popup>{el.name}</Popup></Polygon>;
            }
            return null;
          })}
        </MapContainer>
      )}
    </div>
  );
};

export default KMLViewer;
