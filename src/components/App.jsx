import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
// import polygonize from "@turf/polygonize";
// import pointsWithinPolygon from "@turf/points-within-polygon";
import addRingToMap from "../util/ring";
import { introAnimation } from "../animations/intro";
import DurationSlider from "./DurationSlider";
import DestinationType from "./DestinationType";
import RoundTripCheckbox from "./RoundTrip";
import MenuButtons from "./MenuButtons";
import Journey from "../journey";
import './App.css';

const token = import.meta.env.VITE_MAPBOX_KEY;
mapboxgl.accessToken = token;

function addCoordinateToMap(map, randomCoordinate, descriptor, placeName) {
  const popup = new mapboxgl.Popup({ closeOnClick: false })
      .setLngLat(randomCoordinate)
      .setHTML(`
        <h3>${descriptor} Point</h3>
        ${placeName ? `<i>${placeName}</i>` : ''}
        <i>${randomCoordinate.join(',')}</i>
      `).addTo(map.current);
}

// Cosmetic, though it'd be nice if there were a cleaner way to do this
function toggleDestinationUI(shouldShow) {
  const destination = document.querySelector('.mapbox-directions-destination')
  destination.style.display = shouldShow ? 'block' : 'none';
  const reverseSymbol = document.querySelector('.directions-icon-reverse')
  reverseSymbol.style.display = shouldShow ? 'block' : 'none';
}

async function createAndPlotRoute(map, isOneWay, duration, destinationType) {
  // Journey instantiation
  const directionsControl = map.current._directions;
  const origin = directionsControl.getOrigin();
  const journey = new Journey(
    origin.geometry.coordinates,
    isOneWay,
    parseInt(duration, 10),
    destinationType
  );
  await journey.generateJourney();
  console.log(journey);
  
  // Map interfacing
  addCoordinateToMap(map, journey.originPoint, 'Origin');
  addRingToMap(map, journey.contourRing);
  addCoordinateToMap(map, journey.bearingPoint, 'Bearing');
  addCoordinateToMap(map, journey.destinationPoint, 'Destination', journey.destinationPoi.place_name);
  directionsControl.setOrigin(journey.originPoint);
  directionsControl.setDestination(journey.destinationPoint);
  toggleDestinationUI(true);
}

function App() {
  const [isOneWay, setIsOneWay] = useState(true);
  const handleCheckbox = () => { setIsOneWay(!isOneWay)};
  const [duration, setDuration] = useState(30);
  const handleSlider = (event) => { setDuration(event.target.value); };
  const [destinationType, setDestinationType] = useState("coffee");
  const handleRadio = (event) => { setDestinationType(event.target.value); };
  const handleSubmit = (event) => {
    if(!Object.keys(map.current._directions.getOrigin()).length) return;
    map.current.getLayer('ring-background') && map.current.removeLayer('ring-background');
    map.current.getLayer('ring-dashes') && map.current.removeLayer('ring-dashes');
    map.current.getSource('ring-coords') && map.current.removeSource('ring-coords');
    document.querySelectorAll('.mapboxgl-popup').forEach((el) => { el.remove() });
    createAndPlotRoute(map, isOneWay, duration, destinationType);
  }

  const isFirstTimeVisitor = false;
  const initialLon = isFirstTimeVisitor ? -122.11 : -122.2685;
  const initialLat = isFirstTimeVisitor ? 47.36 : 47.5505;
  const initialZoom = isFirstTimeVisitor ? 8.88 : 11.73;
  const initialPitch = 62.50;
  const initialBearing = isFirstTimeVisitor ? -64.50 : 5.00;

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lon, setLon] = useState(initialLon);
  const [lat, setLat] = useState(initialLat);
  const [zoom, setZoom] = useState(initialZoom);
  const [pitch, setPitch] = useState(initialPitch);
  const [bearing, setBearing] = useState(initialBearing);

  useEffect(() => {
    if (map.current) return; // initialize the map only once
  
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lon, lat],
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
    });

    map.current.addControl(new mapboxgl.FullscreenControl());
    map.current.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }));

    const directionsControl = new MapboxDirections({
      flyTo: false,
      profile: "mapbox/cycling",
      alternatives: true,
      accessToken: token,
      interactive: false,
      exclude: "ferry",
      controls: {
        profileSwitcher: false
      },
    });
    map.current.addControl(directionsControl, "top-left");
    map.current._directions = directionsControl;
    map.current._directions.on('route', (e) => {
      // Automatically hide the instructions once the "route" event fires
      const selector = ".directions-control-directions";
      const directionsEl = document.querySelector(selector);
      if (!directionsEl) return;
      directionsEl.style.opacity = 0;
    });
    toggleDestinationUI(false);

    map.current.on('load', () => {
      map.current.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
      map.current.setTerrain({'source': 'mapbox-dem', 'exaggeration': 4});

      if (isFirstTimeVisitor) {
        introAnimation(map);
      }
    });
  });

  useEffect(() => {
    if (!map.current) return; // wait for map to initialize
    map.current.on("move", () => {
      setLon(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
      setPitch(map.current.getPitch().toFixed(2));
      setBearing(map.current.getBearing().toFixed(2));
    });
  })

  return (
    <div className="App">
      <div className="sidebar">
        <div>Longitude: {lon} | Latitude: {lat}</div>
        <div>Zoom: {zoom} | Pitch: {pitch} | Bearing: {bearing}</div>
        <br/>
        <div className="journey-sidebar">
          <div className="journey-inputs">
            <DestinationType value={destinationType} onChange={handleRadio} />
            <DurationSlider value={duration} onChange={handleSlider} /><br/>
            <RoundTripCheckbox value={isOneWay} onChange={handleCheckbox} duration={duration}/>
          </div>
          <br/>
          <button onClick={handleSubmit}>Go on a journey!</button>
        </div>
      </div>
      <MenuButtons/>
      <div ref={mapContainer} className="map-container" />
    </div>
  )
}

export default App;
