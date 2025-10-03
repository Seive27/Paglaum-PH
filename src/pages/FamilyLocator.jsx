// src/pages/FamilyLocator.jsx
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import debounce from "lodash.debounce";
import SuccessModal from "../components/SuccessModal";
import UpdateStatusModal from "../components/UpdateStatusModal";

export default function FamilyLocator() {
  const [familyPosts, setFamilyPosts] = useState([]);
  const [form, setForm] = useState({
    reporter_name: "",
    contact_number: "",
    person_name: "",
    person_age: "",
    last_seen_location: "",
    health_status: "",
    other_details: "",
    status: "Missing",
    lat: null,
    lng: null,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [updateModal, setUpdateModal] = useState({ show: false, postId: null, currentStatus: "" });
  const [showFormMobile, setShowFormMobile] = useState(false);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("family-locator-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_locator" },
        fetchPosts
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("family_locator")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFamilyPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reporter_name || !form.person_name || !form.last_seen_location) {
      alert("Please fill in all required fields (Reporter Name, Person Name, Last Seen Location).");
      return;
    }

    setLoading(true);
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await submitPost({ ...form, lat: latitude, lng: longitude });
      },
      async () => {
        await submitPost(form);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submitPost = async (postData) => {
    try {
      const { error } = await supabase.from("family_locator").insert([postData]);
      if (error) throw error;

      setFamilyPosts(prev => [
        { ...postData, id: Date.now(), created_at: new Date().toISOString() },
        ...prev,
      ]);

      setForm({
        reporter_name: "",
        contact_number: "",
        person_name: "",
        person_age: "",
        last_seen_location: "",
        health_status: "",
        other_details: "",
        status: "Missing",
        lat: null,
        lng: null,
      });

      setShowSuccess(true);
      setShowFormMobile(false); // auto-close mobile form after submit
    } catch (error) {
      console.error("Error submitting post:", error.message);
      alert("Failed to submit post: " + error.message);
    } finally {
      setLoading(false);
      setLocationLoading(false);
    }
  };

  const debouncedSearch = debounce(val => setSearch(val), 300);

  const filteredPosts = familyPosts.filter(post => {
    const matchesSearch =
      post.person_name.toLowerCase().includes(search.toLowerCase()) ||
      post.last_seen_location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || post.status === filter;
    return matchesSearch && matchesFilter;
  });

  const promptUpdateStatus = (postId, currentStatus) => {
    setUpdateModal({ show: true, postId, currentStatus });
  };

  const handleUpdateStatus = async (newStatus) => {
    const { postId } = updateModal;
    const { error } = await supabase
      .from("family_locator")
      .update({ status: newStatus })
      .eq("id", postId);

    if (error) {
      console.error("Error updating status:", error.message);
      alert("Failed to update status: " + error.message);
    } else {
      setFamilyPosts(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, status: newStatus } : post
        )
      );
      setUpdateModal({ show: false, postId: null, currentStatus: "" });
      setShowSuccess(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 pt-16">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Find My Family</h1>
      <p className="text-gray-600 mb-6">
        Post about missing persons or confirm when someone is found. This helps families reunite quickly.
      </p>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 w-full md:flex-1">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or location..."
            onChange={(e) => debouncedSearch(e.target.value)}
            className="flex-1 border p-2 rounded-md w-full"
          />
        </div>
        <select
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 rounded-md w-full md:w-48"
        >
          <option>All</option>
          <option>Missing</option>
          <option>Found</option>
          <option>Looking for family</option>
        </select>
      </div>

      {/* Mobile toggle button for form */}
      <div className="md:hidden mb-4">
  <button
    className="w-full bg-purple-600 text-white p-3 rounded-md font-semibold shadow"
    onClick={() => setShowFormMobile(true)}
  >
    Report a Missing Person
  </button>
</div>

      {/* Layout: Posts + Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Posts (scrollable on mobile) */}
        <div className="md:col-span-2 space-y-4 max-h-[70vh] md:max-h-full overflow-y-auto">
          {filteredPosts.length === 0 ? (
            <p className="text-gray-500">No posts match your search/filter.</p>
          ) : (
            filteredPosts.map(post => (
              <div
                key={post.id}
                className="p-4 border-l-4 bg-purple-50 rounded-md shadow-sm flex flex-col md:flex-row gap-4"
                style={{
                  borderLeftColor:
                    post.status === "Missing" ? "red" :
                    post.status === "Found" ? "green" : "orange"
                }}
              >
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">
                    {post.person_name}{" "}
                    <span className="text-sm text-gray-600">({post.person_age || "?"} y/o)</span>
                  </h2>
                  <p className="text-gray-700">
                    Last seen at <b>{post.last_seen_location}</b>
                  </p>
                  <p className="text-gray-700">
                    Contact: <b>{post.contact_number || "N/A"}</b>
                  </p>
                  <p className={`mt-1 font-semibold ${
                    post.status === "Missing" ? "text-red-600" :
                    post.status === "Found" ? "text-green-600" : "text-orange-600"
                  }`}>{post.status}</p>
                  {post.health_status && <p className="text-gray-600 text-sm mt-1">Health: {post.health_status}</p>}
                  {post.other_details && <p className="text-gray-600 text-sm mt-1">{post.other_details}</p>}
                  {post.lat && post.lng && (
                    <p className="text-xs text-gray-500">📍 Location: ({post.lat.toFixed(4)}, {post.lng.toFixed(4)})</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Reported by {post.reporter_name} • {new Date(post.created_at).toLocaleString()}
                  </p>
                  <button
                    className="mt-2 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => promptUpdateStatus(post.id, post.status)}
                  >
                    Update Status
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Form */}
        {window.innerWidth >= 768 && (
          <div className="bg-white p-4 rounded-xl shadow-md space-y-4 md:block">
            <h2 className="text-xl font-semibold text-purple-700 mb-2">Report a Missing Person</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" name="reporter_name" value={form.reporter_name} onChange={handleChange} placeholder="Your Name" required className="w-full p-2 border rounded-md" />
              <input type="text" name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="Contact Number" className="w-full p-2 border rounded-md" />
              <input type="text" name="person_name" value={form.person_name} onChange={handleChange} placeholder="Missing Person's Name" required className="w-full p-2 border rounded-md" />
              <input type="number" name="person_age" value={form.person_age} onChange={handleChange} placeholder="Age" className="w-full p-2 border rounded-md" />
              <input type="text" name="last_seen_location" value={form.last_seen_location} onChange={handleChange} placeholder="Last Seen Location" required className="w-full p-2 border rounded-md" />
              <input type="text" name="health_status" value={form.health_status} onChange={handleChange} placeholder="Health Status (e.g., Mentally Sound)" className="w-full p-2 border rounded-md" />
              <textarea name="other_details" value={form.other_details} onChange={handleChange} placeholder="Other Details (clothes, shoes, identifiers)" className="w-full p-2 border rounded-md"></textarea>
              <select name="status" value={form.status} onChange={handleChange} className="w-full p-2 border rounded-md">
                <option value="Missing">🟥 Missing</option>
                <option value="Found">🟩 Found</option>
                <option value="Looking for family">🟨 Looking for Family</option>
              </select>
              <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 disabled:opacity-50">
                {locationLoading ? "Locating..." : loading ? "Posting..." : "Post Update"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Form Panel */}
      {showFormMobile && window.innerWidth < 768 && (
  <div className="fixed top-0 right-0 z-50 w-4/5 max-w-sm h-full bg-white p-4 overflow-y-auto shadow-xl">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-purple-700">Report a Missing Person</h2>
      <button
        onClick={() => setShowFormMobile(false)}
        className="text-gray-600 hover:text-gray-800 font-bold text-xl"
      >
        ×
      </button>
    </div>
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        name="reporter_name"
        value={form.reporter_name}
        onChange={handleChange}
        placeholder="Your Name"
        required
        className="w-full p-2 border rounded-md"
      />
      <input
        type="text"
        name="contact_number"
        value={form.contact_number}
        onChange={handleChange}
        placeholder="Contact Number"
        className="w-full p-2 border rounded-md"
      />
      <input
        type="text"
        name="person_name"
        value={form.person_name}
        onChange={handleChange}
        placeholder="Missing Person's Name"
        required
        className="w-full p-2 border rounded-md"
      />
      <input
        type="number"
        name="person_age"
        value={form.person_age}
        onChange={handleChange}
        placeholder="Age"
        className="w-full p-2 border rounded-md"
      />
      <input
        type="text"
        name="last_seen_location"
        value={form.last_seen_location}
        onChange={handleChange}
        placeholder="Last Seen Location"
        required
        className="w-full p-2 border rounded-md"
      />
      <input
        type="text"
        name="health_status"
        value={form.health_status}
        onChange={handleChange}
        placeholder="Health Status (e.g., Mentally Sound)"
        className="w-full p-2 border rounded-md"
      />
      <textarea
        name="other_details"
        value={form.other_details}
        onChange={handleChange}
        placeholder="Other Details (clothes, shoes, identifiers)"
        className="w-full p-2 border rounded-md"
      ></textarea>
      <select
        name="status"
        value={form.status}
        onChange={handleChange}
        className="w-full p-2 border rounded-md"
      >
        <option value="Missing">🟥 Missing</option>
        <option value="Found">🟩 Found</option>
        <option value="Looking for family">🟨 Looking for Family</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
      >
        {locationLoading ? "Locating..." : loading ? "Posting..." : "Post Update"}
      </button>
    </form>
  </div>
      )}

      {/* Modals */}
      <SuccessModal
        show={showSuccess}
        message="Your post has been submitted successfully!"
        onClose={() => setShowSuccess(false)}
      />

      <UpdateStatusModal
        show={updateModal.show}
        currentStatus={updateModal.currentStatus}
        onClose={() => setUpdateModal({ show: false, postId: null, currentStatus: "" })}
        onConfirm={handleUpdateStatus}
      />
    </div>
  );
}
