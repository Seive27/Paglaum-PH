// src/pages/Requests.jsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import SuccessModal from "../components/SuccessModal";

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    name: "",
    barangay: "",
    need: "",
    urgency: "Medium",
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await submitRequest({ ...form, lat: latitude, lng: longitude });
      },
      async () => {
        await submitRequest(form);
      }
    );
  };

  const submitRequest = async (requestData) => {
    try {
      const { error } = await supabase.from("requests").insert([requestData]);
      if (error) throw error;

      setRequests((prev) => [
        { ...requestData, id: Date.now(), created_at: new Date().toISOString() },
        ...prev,
      ]);

      setForm({ name: "", barangay: "", need: "", urgency: "Medium" });
      setShowSuccess(true);
    } catch (error) {
      console.error("Error inserting request:", error);
      alert("Failed to submit request: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32">
      {/* Page Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-green-700">
        Needs & Requests Board
      </h1>
      <p className="mt-2 text-gray-600 sm:text-lg">
        Families can post what they need, and donors/NGOs can see and respond.
      </p>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 p-4 sm:p-6 bg-white shadow-md rounded-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your Name"
            required
            className="w-full p-2 border rounded-md"
          />
          <input
            type="text"
            name="barangay"
            value={form.barangay}
            onChange={handleChange}
            placeholder="Your Barangay"
            required
            className="w-full p-2 border rounded-md"
          />
        </div>
        <textarea
          name="need"
          value={form.need}
          onChange={handleChange}
          placeholder="What do you need? (e.g., water, food, medicine)"
          required
          className="w-full p-2 border rounded-md"
        ></textarea>
        <select
          name="urgency"
          value={form.urgency}
          onChange={handleChange}
          className="w-full p-2 border rounded-md"
        >
          <option value="High">High (urgent)</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Request"}
        </button>
      </form>

      {/* Requests List */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {requests.length === 0 ? (
          <p className="text-gray-600 col-span-full">No requests posted yet.</p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-green-50 border-l-4 rounded-md shadow-sm flex flex-col justify-between"
              style={{
                borderLeftColor:
                  req.urgency === "High"
                    ? "red"
                    : req.urgency === "Medium"
                    ? "orange"
                    : "green",
              }}
            >
              <h2 className="font-semibold text-lg">{req.need}</h2>
              <p className="text-gray-600">
                <span className="font-medium">{req.name}</span> from{" "}
                <span className="font-medium">{req.barangay}</span>
              </p>
              <p className="mt-1 text-sm">
                Urgency:{" "}
                <span
                  className={
                    req.urgency === "High"
                      ? "text-red-600 font-semibold"
                      : req.urgency === "Medium"
                      ? "text-orange-600 font-semibold"
                      : "text-green-600 font-semibold"
                  }
                >
                  {req.urgency}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Posted on {new Date(req.created_at).toLocaleString()}
              </p>
              {req.lat && req.lng && (
                <p className="text-xs text-gray-500 mt-1">
                  📍 Location saved ({req.lat.toFixed(4)}, {req.lng.toFixed(4)})
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        show={showSuccess}
        message="Your request has been submitted successfully!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
