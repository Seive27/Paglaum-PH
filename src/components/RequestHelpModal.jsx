import React from "react";

const RequestHelpModal = ({ formData, setFormData, onClose, onSubmit, transparentBackground }) => {
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${
        transparentBackground ? "bg-transparent" : "bg-black bg-opacity-50"
      }`}
    >
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Request Help</h2>
        <div className="space-y-4">
          <input
            type="text"
            name="need"
            value={formData.need}
            onChange={handleChange}
            placeholder="What do you need?"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            name="barangay"
            value={formData.barangay}
            onChange={handleChange}
            placeholder="Barangay"
            className="w-full p-2 border rounded"
          />
          <select
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestHelpModal;