import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RestoreIcon from "@mui/icons-material/Restore";
import VideocamIcon from "@mui/icons-material/Videocam";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import withAuth from "../../utils/withAuth";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./HomeComponent.module.css";

function HomeComponent() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const { addToUserHistory } = useAuth();

  const handleJoinVideoCall = async () => {
    const code = meetingCode.trim();

    if (!code) {
      return;
    }

    await addToUserHistory(code);
    navigate(`/${code}`);
  };

  return (
    <main className={styles.homePage}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <VideocamIcon />
          </span>
          <h2>MeetLink</h2>
        </div>

        <div className={styles.navActions}>
          <button onClick={() => navigate("/history")}>
            <RestoreIcon />
            <span>History</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/auth");
            }}
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>Secure video meetings</p>
          <h1>Start or join your meeting instantly.</h1>
          <p className={styles.subtitle}>
            Enter a meeting code to connect with your team, class, or friends in
            a clean video workspace.
          </p>

          <div className={styles.joinBox}>
            <input
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoinVideoCall();
              }}
              placeholder="Enter meeting code"
            />
            <button
              disabled={!meetingCode.trim()}
              onClick={handleJoinVideoCall}
            >
              Join <ArrowForwardIcon />
            </button>
          </div>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewTile}>
            <span>A</span>
            <p>You</p>
          </div>
          <div className={styles.previewTile}>
            <span>S</span>
            <p>Sarah</p>
          </div>
          <div className={styles.previewTile}>
            <span>J</span>
            <p>John</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default withAuth(HomeComponent);
