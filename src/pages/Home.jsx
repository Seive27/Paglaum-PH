import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "../supabaseClient";
import QuickLinks from "../components/QuickLinks";
import RequestHelpModal from "../components/RequestHelpModal";
import DeleteModal from "../components/DeleteModal";
import SuccessModal from "../components/SuccessModal";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600">
              Something went wrong
            </h2>
            <p className="mt-2 text-gray-600">Please reload the page to continue.</p>
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
  const colors = {
    High: "red",
    Medium: "orange",
    Low: "green",
    Temp: "blue",
  };
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="pin" style="background-color: ${colors[type] || "green"}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Map click handler for pin mode
const MapClickHandler = ({ modalType, setTempMarker }) => {
  useMapEvents({
    click(e) {
      if (modalType === "pin") {
        setTempMarker(e.latlng);
      }
    },
  });
  return null;
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
    urgency: "Medium",
    location: "",
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [showSuccess, setShowSuccess] = useState(false);
  const mapRef = useRef();

  const defaultCenter = [10.3157, 123.8854];

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

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching requests:", error);
    else setRequests(data || []);
  };

  const handleRequestClick = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (map) map.setView([coords.latitude, coords.longitude], 15);
        setTempMarker({ lat: coords.latitude, lng: coords.longitude });
        setModalType("request");
        setIsLoadingLocation(false);
      },
      (err) => {
        console.error(err);
        alert("Please allow location access.");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePinLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (map) map.setView([coords.latitude, coords.longitude], 15);
        setTempMarker({ lat: coords.latitude, lng: coords.longitude });
        setModalType("pin");
        setIsLoadingLocation(false);
      },
      (err) => {
        console.error(err);
        alert("Please allow location access.");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (modalType !== "request") return;
    if (!formData.need || !formData.name || !formData.barangay)
      return alert("Please fill in all fields.");

    try {
      const { data, error } = await supabase.from("requests").insert([
        {
          need: formData.need,
          name: formData.name,
          barangay: formData.barangay,
          urgency: formData.urgency,
          lat: tempMarker?.lat || null,
          lng: tempMarker?.lng || null,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;

      // Immediately update state with new request
      if (data && data.length > 0) {
        setRequests((prev) => [data[0], ...prev]);
      } else {
        // Fallback to re-fetch if data is not returned
        await fetchRequests();
      }

      // Reset form and states
      setFormData({ need: "", name: "", barangay: "", urgency: "Medium", location: "" });
      setModalType(null);
      setTempMarker(null);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit request: " + err.message);
    }
  };

  const promptDelete = (id) => setDeleteModal({ show: true, id });

  const confirmDelete = async () => {
    const id = deleteModal.id;
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) alert("Failed to delete: " + error.message);
    else setRequests((prev) => prev.filter((r) => r.id !== id));
    setDeleteModal({ show: false, id: null });
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    fetchRequests(); // Re-fetch to ensure data sync
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Responsive Map & Feed */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Map */}
          <div className="relative flex-1 h-96 md:h-full">
            <MapContainer
              ref={mapRef}
              center={defaultCenter}
              zoom={11}
              className="h-full w-full"
              whenCreated={setMap}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {requests.map((req) => (
                <Marker
                  key={req.id}
                  position={[req.lat || defaultCenter[0], req.lng || defaultCenter[1]]}
                  icon={getMarkerIcon(req.urgency)}
                  eventHandlers={{ click: () => setSelectedRequest(req) }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-red-700">{req.need}</h3>
                      <p>{req.name} ({req.barangay})</p>
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
                <Marker position={[tempMarker.lat, tempMarker.lng]} icon={getMarkerIcon("Temp")}>
                  <Popup>Temporary Pin</Popup>
                </Marker>
              )}
              <MapClickHandler modalType={modalType} setTempMarker={setTempMarker} />
            </MapContainer>

            {/* Centered Floating Buttons */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
              <QuickLinks onRequest={handleRequestClick} onPin={handlePinLocation} />
            </div>

            {/* Loading */}
            {isLoadingLocation && (
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-lg shadow-lg text-center">
                  <p className="text-lg font-semibold">Locating your position...</p>
                  <div className="mt-2 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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
              onClose={handleSuccessClose}
            />

            {selectedRequest && (
              <div className="absolute bottom-20 left-5 bg-white shadow-lg p-4 rounded-lg w-72 border z-50">
                <h3 className="text-lg font-bold text-red-700">{selectedRequest.need}</h3>
                <p className="text-gray-700">
                  {selectedRequest.name} ({selectedRequest.barangay})
                </p>
                <p
                  className={`font-semibold mt-2 ${
                    selectedRequest.urgency === "High"
                      ? "text-red-600"
                      : selectedRequest.urgency === "Medium"
                      ? "text-orange-500"
                      : "text-green-600"
                  }`}
                >
                  Urgency: {selectedRequest.urgency}
                </p>
                {selectedRequest.created_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Added: {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                )}
                <div className="flex justify-between mt-3">
                  <button
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Close
                  </button>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={() => promptDelete(selectedRequest.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Requests Feed */}
          <div className="w-full md:w-80 bg-white shadow-md p-4 overflow-y-auto flex-shrink-0 pt-4 md:pt-16">
            <h2 className="text-lg font-bold text-red-700 mb-4">Requests</h2>
            {requests.length === 0 ? (
              <p className="text-gray-500">No requests yet.</p>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="mb-3 p-3 border rounded-lg shadow-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedRequest(req)}
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