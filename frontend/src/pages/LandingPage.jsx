import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import VideocamIcon from "@mui/icons-material/Videocam";
import ChatIcon from "@mui/icons-material/Chat";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import MicIcon from "@mui/icons-material/Mic";
import KeyboardVoiceIcon from "@mui/icons-material/KeyboardVoice";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const goToHome = () => {
    navigate(isAuthenticated ? "/home" : "/");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  const [meetingCode, setMeetingCode] = useState("");

  const handleJoinMeeting = (e) => {
    e.preventDefault();

    const code = meetingCode.trim();
    if (code) {
      navigate(`/${code}`);
    }
  };

  return (
    <div className="landingPageContainer">
      <nav className="landingNav">
        <button className="brandArea brandButton" onClick={goToHome}>
          <div className="brandIcon">
            <VideocamIcon />
          </div>
          <h2>MeetLink</h2>
        </button>

        <div className="navList">
          {isAuthenticated ? (
            <>
              <button className="navLink" onClick={() => navigate("/history")}>
                <HistoryIcon /> History
              </button>

              <button className="navPrimaryButton" onClick={handleLogout}>
                <LogoutIcon /> Logout
              </button>
            </>
          ) : (
            <>
              <button className="navLink" onClick={() => navigate("/auth")}>
                Sign in
              </button>

              <button
                className="navPrimaryButton"
                onClick={() => navigate("/auth")}
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="landingMainContainer">
        <section className="landingContent">
          <p className="landingEyebrow">Video meetings for teams and classes</p>

          <h1>MeetLink</h1>

          <p className="landingSubtitle">
            Start secure video calls, join meetings by code, share your screen,
            and keep your meeting history in one clean workspace.
          </p>

          <form className="meetingJoinBox" onSubmit={handleJoinMeeting}>
            <input
              type="text"
              value={meetingCode}
              placeholder="Enter meeting code"
              onChange={(e) => setMeetingCode(e.target.value)}
            />
            <button type="submit" disabled={!meetingCode.trim()}>
              Join
            </button>
          </form>

          <div className="landingActions">
            <button
              className="primaryAction"
              onClick={() => navigate(isAuthenticated ? "/home" : "/auth")}
            >
              {isAuthenticated ? "Start meeting" : "Sign in to start"}
              <ArrowForwardIcon />
            </button>

            <button
              className="secondaryAction"
              onClick={() => navigate(isAuthenticated ? "/history" : "/auth")}
            >
              {isAuthenticated ? "Meeting history" : "Create account"}
            </button>
          </div>

          <div className="landingHighlights">
            <span>
              <VideocamIcon /> HD video
            </span>
            <span>
              <ChatIcon /> Realtime chat
            </span>
            <span>
              <ScreenShareIcon /> Screen sharing
            </span>
          </div>
        </section>

        <section className="meetingPreview">
          <div className="previewGrid">
            <div className="previewTile">
              <div className="avatar">A</div>
              <p>Ashar</p>
              <MicIcon className="mutedIcon" />
            </div>

            <div className="previewTile">
              <div className="avatar">J</div>
              <p>John</p>
              <MicIcon className="mutedIcon" />
            </div>

            <div className="previewTile">
              <div className="avatar">S</div>
              <p>Frank</p>
              <MicIcon className="mutedIcon" />
            </div>

            <div className="previewTile purpleTile">
              <div className="avatar">R</div>
              <p>Robert</p>
              <MicIcon className="mutedIcon" />
            </div>
          </div>

          <div className="previewControls">
            <button>
              <KeyboardVoiceIcon /> Mic
            </button>
            <button>
              <VideocamIcon /> Camera
            </button>
            <button>
              <PresentToAllIcon /> Share
            </button>
            <button>
              <ChatIcon /> Chat
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
