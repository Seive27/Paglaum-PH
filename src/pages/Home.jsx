import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "../supabaseClient";
import QuickLinks from "../components/QuickLinks";
import RequestHelpModal from "../components/RequestHelpModal";
import DeleteModal from "../components/DeleteModal";
import SuccessModal from "../components/SuccessModal";

// 🌋 APIs
const EARTHQUAKE_API =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const TYPHOON_API =
  "https://api.met.no/weatherapi/tropicalcyclone/1.0/?content_type=json";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-center p-4">
            <h2 className="text-xl font-bold text-red-600">
              Something went wrong
            </h2>
            <p className="mt-2 text-gray-600">
              Please reload the page to continue.
            </p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Custom marker icons
const getMarkerIcon = (type) => {
  const colors = { High: "red", Medium: "orange", Low: "green", Temp: "blue" };
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="pin" style="background-color: ${
      colors[type] || "green"
    }"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Map click handler for pin mode
const MapClickHandler = ({ modalType, setTempMarker }) => {
  useMapEvents({
    click(e) {
      if (modalType === "pin") setTempMarker(e.latlng);
    },
  });
  return null;
};

// 🌋 Color scale for earthquake magnitude
const getMagnitudeColor = (mag) => {
  if (mag >= 6) return "#ff0000"; // red - strong
  if (mag >= 4) return "#ff6600"; // orange
  if (mag >= 2.5) return "#ffcc00"; // yellow
  return "#00cc44"; // green - weak
};

export default function Home() {
  const [requests, setRequests] = useState([]);
  const [map, setMap] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [formData, setFormData] = useState({
    need: "",
    name: "",
    barangay: "",
    urgency: "",
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [showSuccess, setShowSuccess] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [earthquakes, setEarthquakes] = useState([]);
  const [typhoons, setTyphoons] = useState([]);

  const mapRef = useRef();
  const defaultCenter = [10.3157, 123.8854];

  // 🔥 Fetch Supabase requests + realtime updates
  useEffect(() => {
    let isMounted = true;
    fetchRequests();

    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          if (isMounted) fetchRequests();
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("Subscription error:", err);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // 🌋 Fetch Earthquake + Typhoon Data
  useEffect(() => {
    const fetchEarthquakes = async () => {
      try {
        const res = await fetch(EARTHQUAKE_API);
        const data = await res.json();
        setEarthquakes(data.features || []);
      } catch (err) {
        console.error("Error fetching earthquakes:", err);
      }
    };

    const fetchTyphoons = async () => {
      try {
        const res = await fetch(TYPHOON_API);
        const data = await res.json();
        setTyphoons(data?.tropicalcyclones || []);
      } catch (err) {
        console.error("Error fetching typhoons:", err);
      }
    };

    fetchEarthquakes();
    fetchTyphoons();
    const interval = setInterval(() => {
      fetchEarthquakes();
      fetchTyphoons();
    }, 600000); // refresh every 10 min
    return () => clearInterval(interval);
  }, []);

  // Auto-hide error toast
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching requests:", error);
    else setRequests(data || []);
  };

  const handleLocationClick = (type) => {
    if (!navigator.geolocation)
      return setErrorMessage("⚠️ Geolocation not supported.");
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (map) map.setView([coords.latitude, coords.longitude], 15);
        setTempMarker({ lat: coords.latitude, lng: coords.longitude });
        setModalType(type);
        setIsLoadingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setErrorMessage("⚠️ Please allow location access.");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (modalType !== "request") return;
    if (
      !formData.need ||
      !formData.name ||
      !formData.barangay ||
      !formData.urgency
    ) {
      setErrorMessage("⚠️ Please fill in all fields, including urgency level.");
      return;
    }
    try {
      const { data, error } = await supabase.from("requests").insert([
        {
          ...formData,
          lat: tempMarker?.lat || null,
          lng: tempMarker?.lng || null,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      setRequests(
        (prev) => (data && data.length ? [data[0], ...prev] : prev)
      );
      setFormData({ need: "", name: "", barangay: "", urgency: "" });
      setModalType(null);
      setTempMarker(null);
      setShowSuccess(true);
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMessage("❌ Failed to submit request: " + err.message);
    }
  };

  const promptDelete = (id) => setDeleteModal({ show: true, id });
  const confirmDelete = async () => {
    const { error } = await supabase
      .from("requests")
      .delete()
      .eq("id", deleteModal.id);
    if (error) setErrorMessage("❌ Failed to delete: " + error.message);
    else setRequests((prev) => prev.filter((r) => r.id !== deleteModal.id));
    setDeleteModal({ show: false, id: null });
  };

  const panToRequest = (req) => {
    if (mapRef.current && req.lat && req.lng)
      mapRef.current.flyTo([req.lat, req.lng], 15, { duration: 1.5 });
    else if (mapRef.current)
      mapRef.current.flyTo(defaultCenter, 11, { duration: 1.5 });
  };

  const filteredRequests = filterUrgency
    ? requests.filter((r) => r.urgency === filterUrgency)
    : requests;

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden relative">
        {/* ✅ Error Toast */}
        {errorMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeIn z-[1000]">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Map */}
          <div className="relative flex-1 h-64 md:h-full">
            <MapContainer
              ref={mapRef}
              center={defaultCenter}
              zoom={6}
              className="h-full w-full"
              whenCreated={setMap}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* 🌋 Earthquake Sonar Markers */}
{earthquakes.map((eq, i) => {
  const [lng, lat] = eq.geometry.coordinates;
  const mag = eq.properties.mag || 0;
  const color = getMagnitudeColor(mag);

  const sonarIcon = L.divIcon({
    className: "",
    html: `
      <div class="sonar-container">
        <div class="sonar-wave" style="background-color: ${color}; animation-delay: 0s"></div>
        <div class="sonar-wave" style="background-color: ${color}; animation-delay: 0.8s"></div>
        <div class="sonar-wave" style="background-color: ${color}; animation-delay: 1.6s"></div>
      </div>
    `,
    iconSize: [20, 20],
  });

  return (
    <Marker key={i} position={[lat, lng]} icon={sonarIcon}>
      <Popup>
        <strong>Magnitude:</strong> {mag} <br />
        <strong>Location:</strong> {eq.properties.place}
      </Popup>
    </Marker>
  );
})}


              {/* 🌀 Typhoon Circles */}
              {typhoons.map((storm, i) => {
                const { center } = storm || {};
                if (!center?.latitude || !center?.longitude) return null;
                return (
                  <Circle
                    key={i}
                    center={[center.latitude, center.longitude]}
                    radius={100000}
                    pathOptions={{
                      color: "blue",
                      fillColor: "blue",
                      fillOpacity: 0.25,
                    }}
                  >
                    <Popup>
                      <b>Typhoon:</b> {storm.name || "Unnamed"} <br />
                      <b>Category:</b> {storm.intensity || "Unknown"}
                    </Popup>
                  </Circle>
                );
              })}

              {/* Request Markers */}
              {requests.map((req) => (
                <Marker
                  key={req.id}
                  position={[
                    req.lat || defaultCenter[0],
                    req.lng || defaultCenter[1],
                  ]}
                  icon={getMarkerIcon(req.urgency)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-red-700">{req.need}</h3>
                      <p>
                        {req.name} ({req.barangay})
                      </p>
                      <p
                        className="font-semibold mt-1"
                        style={{
                          color:
                            req.urgency === "High"
                              ? "#ef4444"
                              : req.urgency === "Medium"
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      >
                        Urgency: {req.urgency}
                      </p>
                      {req.created_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Added: {new Date(req.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {tempMarker && (
                <Marker
                  position={[tempMarker.lat, tempMarker.lng]}
                  icon={getMarkerIcon("Temp")}
                >
                  <Popup>Temporary Pin</Popup>
                </Marker>
              )}
              <MapClickHandler
                modalType={modalType}
                setTempMarker={setTempMarker}
              />
            </MapContainer>

            {/* Floating Buttons */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex justify-center">
              <QuickLinks
                onRequest={() => handleLocationClick("request")}
                onPin={() => handleLocationClick("pin")}
              />
            </div>

            {/* Loading Overlay */}
            {isLoadingLocation && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent">
                <div className="bg-white/80 p-6 rounded-xl shadow-xl text-center animate-pulseOnce">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-500"></div>
                      <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-t-4 border-b-4 border-gray-200 animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-800 mb-2">
                    Locating...
                  </p>
                  <p className="text-sm text-gray-600">
                    Please wait while we find your position.
                  </p>
                </div>
              </div>
            )}

            {/* Modals */}
            {modalType === "request" && (
              <RequestHelpModal
                formData={formData}
                setFormData={setFormData}
                onClose={() => setModalType(null)}
                onSubmit={handleSubmit}
                transparentBackground={true}
              />
            )}
            <DeleteModal
              show={deleteModal.show}
              onClose={() => setDeleteModal({ show: false, id: null })}
              onConfirm={confirmDelete}
              message="Are you sure you want to delete this help request? This action cannot be undone."
            />
            <SuccessModal
              show={showSuccess}
              message="Help request submitted successfully!"
              onClose={() => {
                setShowSuccess(false);
                fetchRequests();
              }}
            />
          </div>

          {/* Requests Feed */}
          <div className="w-full md:w-80 bg-white shadow-md p-4 pr-6 overflow-y-auto flex-shrink-0 pt-16">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Urgency
              </label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full p-2 border rounded md:w-48"
              >
                <option value="">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <h2 className="text-lg font-bold text-red-700 mb-4">Requests</h2>
            {filteredRequests.length === 0 ? (
              <p className="text-gray-500">No requests match the filter.</p>
            ) : (
              filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="mb-3 p-3 border rounded-lg shadow-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => panToRequest(req)}
                >
                  <p className="font-semibold">{req.need}</p>
                  <p className="text-sm text-gray-600">
                    {req.name} - {req.barangay}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      req.urgency === "High"
                        ? "text-red-600"
                        : req.urgency === "Medium"
                        ? "text-orange-500"
                        : "text-green-600"
                    }`}
                  >
                    Urgency: {req.urgency}
                  </p>
                  {req.created_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Added: {new Date(req.created_at).toLocaleString()}
                    </p>
                  )}
                  <button
                    className="mt-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      promptDelete(req.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
