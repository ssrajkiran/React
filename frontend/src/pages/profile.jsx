import { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { toast } from "react-toastify";
import api from "../api";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");

  const [user, setUser] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/profile");
        setUser({
          name: res.data?.name || "",
          email: res.data?.email || "",
        });
      } catch (err) {
        toast.error("Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

  /* ================= UPDATE PROFILE ================= */
  const handleSaveProfile = async () => {
    const name = user.name.trim();
    const email = user.email.trim();

    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }

    setLoading(true);
    try {
      await api.put("/auth/profile", { name, email });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  /* ================= CHANGE PASSWORD ================= */
  const handleSavePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      toast.success("Password updated successfully!");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-4">
        <div className="row">

          {/* SIDEBAR */}
          <div className="col-md-3">
            <div className="card p-3 shadow-sm">
              <button
                className={`btn mb-2 ${activeTab === "profile" ? "btn-primary" : "btn-light"}`}
                onClick={() => setActiveTab("profile")}
              >
                My Profile
              </button>

              <button
                className={`btn ${activeTab === "password" ? "btn-primary" : "btn-light"}`}
                onClick={() => setActiveTab("password")}
              >
                Change Password
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="col-md-9">
            <div className="card p-4 shadow-sm">

              {activeTab === "profile" && (
                <>
                  <h5 className="mb-4">My Profile</h5>

                  <input
                    type="text"
                    className="form-control mb-3"
                    value={user.name}
                    onChange={(e) =>
                      setUser((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Name"
                  />

                  <input
                    type="email"
                    className="form-control mb-3"
                    value={user.email}
                    onChange={(e) =>
                      setUser((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Email"
                  />

                  <button
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}

              {activeTab === "password" && (
                <>
                  <h5 className="mb-4">Change Password</h5>

                  <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                  />

                  <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                  />

                  <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="Confirm Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />

                  <button
                    className="btn btn-warning"
                    onClick={handleSavePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </>
              )}

            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
