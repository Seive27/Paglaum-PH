import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { supabase } from "../services/supabase";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Home, Plus, X, Info } from "lucide-react";
import SuccessModal from "../components/SuccessModal"; // Import SuccessModal

// Shelter marker
const shelterIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -25],
});

// User marker
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [25, 25],
  iconAnchor: [12, 12],
});

// Component to handle map click in add mode
function AddShelterClick({ addMode, setNewLocation }) {
  useMapEvents({
    click(e) {
      if (addMode) {
        setNewLocation(e.latlng);
      }
    },
  });
  return null;
}

export default function Shelters() {
  const [shelters, setShelters] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [newLocation, setNewLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    barangay: "",
    capacity: "",
    status: "Available",
  });
  const [showSuccess, setShowSuccess] = useState(false); // State to control SuccessModal
  const mapRef = useRef();

  useEffect(() => {
    fetchShelters();

    const shelterChannel = supabase
      .channel("shelters-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "shelters" }, fetchShelters)
      .subscribe();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("User denied geolocation:", err)
      );
    }

    return () => supabase.removeChannel(shelterChannel);
  }, []);

  const fetchShelters = async () => {
    const { data, error } = await supabase.from("shelters").select("*");
    if (!error) setShelters(data);
  };

  const handleSaveShelter = async () => {
    if (!newLocation || !formData.name || !formData.barangay) {
      alert("Please click on the map and fill all required fields!");
      return;
    }

    const { error } = await supabase.from("shelters").insert([
      {
        name: formData.name,
        barangay: formData.barangay,
        capacity: formData.capacity,
        status: formData.status,
        lat: newLocation.lat,
        lng: newLocation.lng,
      },
    ]);

    if (!error) {
      setShowSuccess(true); // Show SuccessModal on success
      fetchShelters();
      setAddMode(false);
      setNewLocation(null);
      setFormData({ name: "", barangay: "", capacity: "", status: "Available" });
    } else {
      console.error(error);
      alert("❌ Failed to add shelter.");
    }
  };

  const panToShelter = (shelter) => {
    if (mapRef.current) {
      mapRef.current.flyTo([shelter.lat, shelter.lng], 15, { duration: 1.5 });
    }
  };

  const defaultCenter = [11.27, 124.04];

  return (
    <div className="h-screen w-full flex flex-col md:flex-row pt-16">
      {/* LEFT: Map */}
      <div className="relative flex-1 h-full">
        {/* Instruction banner */}
        {addMode && !newLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm md:text-base">
            <Info size={18} />
            Click on the map to choose a location for the new shelter.
          </div>
        )}

        {/* Instruction 2: Fill in details after selecting location */}
        {addMode && newLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm md:text-base">
            <Info size={18} />
            Click on the pinned location to fill in shelter details and save.
          </div>
        )}

        {/* Add Shelter Button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={() => {
              setAddMode(!addMode);
              setNewLocation(null);
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg font-semibold transition ${
              addMode ? "bg-red-500 text-white" : "bg-blue-600 text-white"
            }`}
          >
            {addMode ? (
              <>
                <X size={20} /> Cancel
              </>
            ) : (
              <>
                <Home size={20} /> <Plus size={20} /> Add Shelter
              </>
            )}
          </button>
        </div>

        <MapContainer
          ref={mapRef}
          center={userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter}
          zoom={11}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>📍 You are here</Popup>
            </Marker>
          )}

          {/* Existing shelters */}
          {shelters.map((shelter) => (
            <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={shelterIcon}>
              <Popup>
                🏠 <b>{shelter.name}</b> <br />
                {shelter.barangay} <br />
                Capacity: {shelter.capacity || "Unknown"} <br />
                Status: {shelter.status}
              </Popup>
            </Marker>
          ))}

          {/* New shelter marker with form */}
          {newLocation && (
            <Marker position={newLocation} icon={shelterIcon}>
              <Popup>
                <div className="p-2 space-y-2">
                  <h3 className="font-bold">Add Shelter Details</h3>
                  <input
                    type="text"
                    placeholder="Shelter Name"
                    className="border p-1 w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Barangay"
                    className="border p-1 w-full"
                    value={formData.barangay}
                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Capacity"
                    className="border p-1 w-full"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  />
                  <select
                    className="border p-1 w-full"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="Full">Full</option>
                    <option value="Closed">Closed</option>
                  </select>
                  <button
                    onClick={handleSaveShelter}
                    className="bg-green-500 text-white px-2 py-1 rounded mt-2 w-full"
                  >
                    Save Shelter
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          <AddShelterClick addMode={addMode} setNewLocation={setNewLocation} />
        </MapContainer>
      </div>

      {/* RIGHT: Available Shelters Panel */}
      <div className="w-full md:w-80 bg-white shadow-md p-4 overflow-y-auto flex-shrink-0">
        <h2 className="text-lg font-bold text-red-700 mb-4">Available Shelters</h2>
        {shelters.length === 0 ? (
          <p className="text-gray-500">No shelters yet.</p>
        ) : (
          shelters.map((shelter) => (
            <div
              key={shelter.id}
              className="mb-3 p-3 border rounded-lg shadow-sm bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => panToShelter(shelter)}
            >
              <p className="font-semibold">{shelter.name}</p>
              <p className="text-sm text-gray-600">{shelter.barangay}</p>
              <p
                className={`text-xs font-bold ${
                  shelter.status === "Available"
                    ? "text-green-600"
                    : shelter.status === "Full"
                    ? "text-orange-500"
                    : "text-red-600"
                }`}
              >
                Status: {shelter.status}
              </p>
              <p className="text-xs text-gray-500">Capacity: {shelter.capacity || "Unknown"}</p>
            </div>
          ))
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        show={showSuccess}
        message="Shelter added successfully!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}