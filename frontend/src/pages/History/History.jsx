import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import VideocamIcon from "@mui/icons-material/Videocam";
import HistoryIcon from "@mui/icons-material/History";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./History.module.css";

export default function History() {
  const { getHistoryOfUser, isAuthenticated } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
      setMeetings([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();

        if (Array.isArray(history)) {
          setMeetings(history);
        } else if (Array.isArray(history?.meetings)) {
          setMeetings(history.meetings);
        } else if (Array.isArray(history?.history)) {
          setMeetings(history.history);
        } else {
          setMeetings([]);
        }
      } catch {
        setMeetings([]);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const joinAgain = (meetingCode) => {
    if (!meetingCode) return;
    navigate(`/${meetingCode}`);
  };

  return (
    <main className={styles.historyPage}>
      <nav className={styles.navbar}>
        <button
          className={styles.brand}
          onClick={() => navigate(isAuthenticated ? "/home" : "/")}
        >
          <span className={styles.brandIcon}>
            <VideocamIcon />
          </span>
          <h2>MeetLink</h2>
        </button>
      </nav>

      <section className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Meeting history</p>
            <h1>Your recent meetings</h1>
          </div>

          <div className={styles.countCard}>
            <HistoryIcon />
            <span>{meetings.length}</span>
          </div>
        </div>

        {!isLoggedIn ? (
          <div className={styles.emptyState}>
            <div>
              <HistoryIcon />
            </div>
            <h3>Login required</h3>
            <p>Please sign in to view your meeting history.</p>
            <button onClick={() => navigate("/auth")}>Sign in</button>
          </div>
        ) : meetings.length !== 0 ? (
          <div className={styles.historyGrid}>
            {meetings.map((meeting, index) => (
              <article className={styles.historyCard} key={index}>
                <div className={styles.cardIcon}>
                  <VideocamIcon />
                </div>

                <div className={styles.cardContent}>
                  <span>Meeting code</span>
                  <h3>{meeting.meetingCode}</h3>

                  <p>
                    <CalendarTodayIcon />
                    {formatDate(meeting.date)}
                  </p>
                </div>

                <button onClick={() => joinAgain(meeting.meetingCode)}>
                  Join <ArrowForwardIcon />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div>
              <HistoryIcon />
            </div>
            <h3>No meetings yet</h3>
            <p>Your joined meeting history will appear here.</p>
            <button onClick={() => navigate("/home")}>Start meeting</button>
          </div>
        )}
      </section>
    </main>
  );
}
