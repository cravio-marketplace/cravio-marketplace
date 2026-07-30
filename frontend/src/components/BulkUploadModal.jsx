import { useState } from "react";
import { Upload, Download, X, FileText } from "lucide-react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import API from "../api";

export default function BulkUploadModal({ onClose, onComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    const template = [
      ["name", "price", "category", "available", "quantity", "meal_time"],
      ["Jollof Rice", "2500", "Main", "true", "", "lunch,dinner"],
      ["Chicken Suya", "1800", "Snacks", "true", "50", "snacks"],
      ["Coca Cola", "400", "Drinks", "true", "", "snacks"],
      ["Fried Rice", "3000", "Main", "false", "0", "lunch,dinner"],
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cravio_menu_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validRows = results.data.filter(row => row.name && row.price);
        setPreview(validRows);
        if (validRows.length === 0) toast.error("No valid rows found. Check your CSV format.");
      },
      error: () => toast.error("Error parsing CSV"),
    });
  };

  const uploadMenu = async () => {
    if (preview.length === 0) {
      toast.error("No valid items to upload");
      return;
    }
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of preview) {
      try {
        const priceKobo = Math.round(parseFloat(item.price) * 100);
        const mealTimes = item.meal_time ? item.meal_time.split(',') : [];
        const payload = {
          name: item.name,
          price: priceKobo,
          category: item.category || "Other",
          available: item.available === "true" || item.available === true,
          quantity: item.quantity ? parseInt(item.quantity) : null,
          meal_time: mealTimes,
        };
        await API.post("/menu", payload);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to add ${item.name}:`, error);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`Added ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
      onComplete();
      onClose();
    } else {
      toast.error("Upload failed. Check your CSV format.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Bulk Upload Menu</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700 mb-2">
              Upload a CSV file with your menu items. Required columns:
            </p>
            <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
              <li><strong>name</strong> - Item name (required)</li>
              <li><strong>price</strong> - Price in ₦ (required)</li>
              <li><strong>category</strong> - Main, Snacks, Drinks, etc. (optional)</li>
              <li><strong>available</strong> - true or false (optional, defaults to true)</li>
              <li><strong>quantity</strong> - Stock count (optional, blank = unlimited)</li>
              <li><strong>meal_time</strong> - Comma-separated: breakfast,lunch,dinner,snacks (optional)</li>
            </ul>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full border-2 border-dashed border-brand-orange text-brand-orange py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-orangeLight transition"
          >
            <Download size={18} /> Download CSV Template
          </button>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <FileText size={40} className="text-gray-400" />
              <span className="text-gray-600">{file ? file.name : "Click to select CSV file"}</span>
              <span className="text-xs text-gray-400">or drag and drop</span>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-medium text-sm">
                Preview ({preview.length} items)
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {preview.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="px-4 py-2 text-sm flex justify-between">
                    <span>{item.name}</span>
                    <span className="text-brand-orange">₦{item.price}</span>
                  </div>
                ))}
                {preview.length > 10 && (
                  <div className="px-4 py-2 text-xs text-gray-400 text-center">
                    +{preview.length - 10} more items
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={uploadMenu}
              disabled={uploading || preview.length === 0}
              className="flex-1 bg-brand-orange text-white py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {uploading ? "Uploading..." : `Upload ${preview.length} Items`}
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-100 py-2 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}