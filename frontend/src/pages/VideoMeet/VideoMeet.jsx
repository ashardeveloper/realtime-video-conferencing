import React, { useEffect, useRef, useState } from "react";
import styles from "./VideoMeet.module.css";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Badge, IconButton } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import io from "socket.io-client";
import server from "../../environment";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";

const server_url = `${server}`;

var connections = {};

const iceServers = [
  {
    urls: process.env.REACT_APP_STUN_URL || "stun:stun.l.google.com:19302",
  },
];

const turnUrls = [
  process.env.REACT_APP_TURN_URL,
  process.env.REACT_APP_TURNS_URL,
].filter(Boolean);

if (
  turnUrls.length > 0 &&
  process.env.REACT_APP_TURN_USERNAME &&
  process.env.REACT_APP_TURN_CREDENTIAL
) {
  iceServers.push({
    urls: turnUrls,
    username: process.env.REACT_APP_TURN_USERNAME,
    credential: process.env.REACT_APP_TURN_CREDENTIAL,
  });
}

const peerConnectionConfig = {
  iceServers,
  iceTransportPolicy: "all",
};

const RemoteVideoTile = React.memo(function RemoteVideoTile({
  video,
  index,
  styles,
  isVideoOff,
  isAudioOff,
}) {
  const videoElementRef = useRef(null);

  useEffect(() => {
    if (videoElementRef.current && video.stream) {
      videoElementRef.current.srcObject = video.stream;
    }
  }, [video.stream]);

  const displayName = video.username || `Participant ${index + 1}`;

  return (
    <div className={styles.videoCard}>
      <video
        className={styles.gridVideo}
        data-socket={video.socketId}
        ref={videoElementRef}
        autoPlay
        playsInline
      ></video>

      {isVideoOff && (
        <div className={styles.cameraOffOverlay}>
          <div className={styles.cameraOffAvatar}>
            {displayName.trim().charAt(0).toUpperCase() || "P"}
          </div>
        </div>
      )}

      <div className={styles.videoNameTag}>
        {displayName}
        {isAudioOff && <MicOffIcon />}
      </div>
    </div>
  );
});

const PrimaryRemoteVideo = React.memo(function PrimaryRemoteVideo({
  video,
  styles,
}) {
  const videoElementRef = useRef(null);

  useEffect(() => {
    if (videoElementRef.current && video.stream) {
      videoElementRef.current.srcObject = video.stream;
    }
  }, [video.stream]);

  return (
    <video
      className={styles.gridVideo}
      data-socket={video.socketId}
      ref={videoElementRef}
      autoPlay
      playsInline
    ></video>
  );
});

const LocalVideoElement = React.memo(function LocalVideoElement({
  className,
  localVideoRef,
}) {
  return (
    <video
      className={className}
      ref={(ref) => {
        localVideoRef.current = ref;

        if (ref && window.localStream && ref.srcObject !== window.localStream) {
          ref.srcObject = window.localStream;
        }
      }}
      autoPlay
      muted
      playsInline
    ></video>
  );
});

function VideoMeet() {
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoRef = useRef();
  let lobbyPreviewRef = useRef();
  let lobbyStreamRef = useRef(null);

  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState([]);
  let [audio, setAudio] = useState();
  let [screen, setScreen] = useState();
  let [showModel, setShowModel] = useState(true);
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUsername] = useState("");
  let [videos, setVideos] = useState([]);
  let [remoteMediaState, setRemoteMediaState] = useState({});
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [videoInputDevices, setVideoInputDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [screenShareSupported, setScreenShareSupported] = useState(false);

  let videoRef = useRef([]);

  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const goToAppHome = () => {
    if (askForUsername) {
      navigate(isAuthenticated ? "/home" : "/");
      return;
    }

    handleEndCall();
  };

  const handleProfileLogout = () => {
    logout();

    if (askForUsername) {
      navigate("/");
      return;
    }

    handleEndCall();
  };

  const meetingCode = decodeURIComponent(
    window.location.pathname.replace("/", ""),
  );

  const stopLobbyPreview = () => {
    if (lobbyStreamRef.current) {
      lobbyStreamRef.current.getTracks().forEach((track) => track.stop());
      lobbyStreamRef.current = null;
    }
  };

  const startLobbyPreview = async ({
    video: enableVideo = true,
    audio: enableAudio = true,
  } = {}) => {
    try {
      stopLobbyPreview();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: enableVideo
          ? selectedVideoDeviceId
            ? { deviceId: { exact: selectedVideoDeviceId } }
            : true
          : false,
        audio: enableAudio
          ? selectedAudioDeviceId
            ? { deviceId: { exact: selectedAudioDeviceId } }
            : true
          : false,
      });

      await loadMediaDevices();
      lobbyStreamRef.current = stream;
      window.localStream = stream;

      setVideoAvailable(stream.getVideoTracks().length > 0);
      setAudioAvailable(stream.getAudioTracks().length > 0);

      if (lobbyPreviewRef.current && stream.getVideoTracks().length > 0) {
        lobbyPreviewRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.log("Could not access media devices.", error);
      alert(
        "Camera/Microphone permission is required to preview before joining.",
      );
      return null;
    }
  };

  const loadMediaDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const microphones = devices.filter(
      (device) => device.kind === "audioinput",
    );
    const cameras = devices.filter((device) => device.kind === "videoinput");

    setAudioInputDevices(microphones);
    setVideoInputDevices(cameras);

    if (!selectedAudioDeviceId && microphones[0]) {
      setSelectedAudioDeviceId(microphones[0].deviceId);
    }

    if (!selectedVideoDeviceId && cameras[0]) {
      setSelectedVideoDeviceId(cameras[0].deviceId);
    }
  };

  const replaceTrackForPeers = (kind, newTrack) => {
    Object.values(connections).forEach((peerConnection) => {
      const sender = peerConnection
        .getSenders()
        .find((sender) => sender.track && sender.track.kind === kind);

      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  };

  const replaceLocalMediaTrack = async (kind, deviceId) => {
    const constraints =
      kind === "video"
        ? { video: { deviceId: { exact: deviceId } }, audio: false }
        : { video: false, audio: { deviceId: { exact: deviceId } } };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack =
      kind === "video"
        ? newStream.getVideoTracks()[0]
        : newStream.getAudioTracks()[0];

    if (!newTrack || !window.localStream) {
      return;
    }

    const oldTracks =
      kind === "video"
        ? window.localStream.getVideoTracks()
        : window.localStream.getAudioTracks();

    oldTracks.forEach((track) => {
      track.stop();
      window.localStream.removeTrack(track);
    });

    window.localStream.addTrack(newTrack);
    replaceTrackForPeers(kind, newTrack);

    if (kind === "video" && localVideoRef.current) {
      localVideoRef.current.srcObject = window.localStream;
    }
  };

  const handleAudioDeviceChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedAudioDeviceId(deviceId);

    if (window.localStream) {
      await replaceLocalMediaTrack("audio", deviceId);
    }
  };

  const handleVideoDeviceChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedVideoDeviceId(deviceId);

    if (window.localStream) {
      await replaceLocalMediaTrack("video", deviceId);
      setVideo(true);
    }
  };

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoPermission) {
        setVideoAvailable(true);
      } else {
        setVideoAvailable(false);
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (audioPermission) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });

        if (userMediaStream) {
          window.localStream = userMediaStream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.log("Error accessing media devices.", error);
    }
  };

  useEffect(() => {
    return () => {
      stopLobbyPreview();
    };
  }, []);

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (err) {
      console.log(err);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({
                sdp: connections[id].localDescription,
              }),
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);

        try {
          let tracks = localVideoRef.current.srcObject.getTracks();
          tracks.forEach((track) => track.stop());
        } catch (err) {
          console.log(err);
        }
      };
    });
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();

    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();

    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video,
          audio: audio,
        })
        .then(getUserMediaSuccess)
        .catch((err) => console.log(err));
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (err) {
        console.log(err);
      }
    }
  };

  // useEffect(() => {
  //   if (video !== undefined && audio !== undefined) {
  //     getUserMedia();
  //   }
  // }, [video, audio]);

  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId]
              .createAnswer()
              .then((description) => {
                connections[fromId]
                  .setLocalDescription(description)
                  .then(() => {
                    socketRef.current.emit(
                      "signal",
                      fromId,
                      JSON.stringify({
                        sdp: connections[fromId].localDescription,
                      }),
                    );
                  })
                  .catch((e) => console.log(e));
              })
              .catch((e) => console.log(e));
          }
        })
        .catch((e) => console.log(e));
    }

    if (signal.ice) {
      connections[fromId]
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((e) => console.log(e));
    }
  };

  let handleEndCall = () => {
    try {
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
      }
    } catch (e) {}

    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => {
          track.stop();
        });
        window.localStream = null;
      }
    } catch (e) {}

    try {
      Object.keys(connections).forEach((id) => {
        connections[id].close();
        delete connections[id];
      });
    } catch (e) {}

    try {
      socketRef.current?.disconnect();
    } catch (e) {}

    window.location.href = "/";
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        sender,
        data,
        socketIdSender,
      },
    ]);

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  let connectToSocketServer = (displayName) => {
    socketRef.current = io.connect(server_url, {
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", {
        path: meetingCode,
        username: displayName || username || "Guest",
      });

      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on(
        "media-state-change",
        ({ socketId, video, audio }) => {
          setRemoteMediaState((prev) => ({
            ...prev,
            [socketId]: {
              video,
              audio,
            },
          }));
        },
      );

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => {
          const updatedVideos = videos.filter((video) => video.socketId !== id);
          videoRef.current = updatedVideos;
          return updatedVideos;
        });

        setRemoteMediaState((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });

        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });

      socketRef.current.on("user-joined", (id, clients, roomUsers = {}) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConnectionConfig,
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId,
            );

            if (videoExists) {
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? {
                        ...video,
                        stream: event.stream,
                        username:
                          roomUsers[socketListId] || video.username || "Guest",
                      }
                    : video,
                );

                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                username: roomUsers[socketListId] || "Guest",
                autoPlay: true,
                playsinline: true,
              };

              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);

            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (err) {}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription }),
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

  let getMedia = (displayName) => {
    setVideo(true);
    setAudio(true);

    if (window.localStream) {
      window.localStream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      window.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }

    connectToSocketServer(displayName);
  };

  let connectMeeting = async () => {
    const displayName = username.trim() || "Guest";

    setUsername(displayName);

    if (!window.localStream) {
      const stream = await startLobbyPreview({ video: true, audio: true });

      if (!stream) {
        return;
      }
    }

    setAskForUsername(false);
    getMedia(displayName);
  };

  let handleVideo = () => {
    const nextVideoState = !video;

    setVideo(nextVideoState);

    if (window.localStream) {
      window.localStream.getVideoTracks().forEach((track) => {
        track.enabled = nextVideoState;
      });
    }

    socketRef.current?.emit("media-state-change", {
      video: nextVideoState,
      audio,
    });
  };

  let handleAudio = () => {
    const nextAudioState = !audio;

    setAudio(nextAudioState);

    if (window.localStream) {
      window.localStream.getAudioTracks().forEach((track) => {
        track.enabled = nextAudioState;
      });
    }

    socketRef.current?.emit("media-state-change", {
      video,
      audio: nextAudioState,
    });
  };

  let getDislayMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);

          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          getUserMedia();
        }),
    );
  };

  let getDislayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDislayMediaSuccess)
          .catch((e) => console.log(e));
      }
    }
  };

  useEffect(() => {
    if (screen !== undefined) {
      getDislayMedia();
    }
  }, [screen]);

  const isMobileOrTabletBrowser = () => {
    const userAgent = navigator.userAgent || "";
    const isTouchMac =
      navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

    return (
      /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(userAgent) || isTouchMac
    );
  };

  const canUseScreenShare = () => {
    return Boolean(
      window.isSecureContext &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getDisplayMedia &&
      !isMobileOrTabletBrowser(),
    );
  };

  useEffect(() => {
    setScreenShareSupported(canUseScreenShare());
    setScreenAvailable(canUseScreenShare());
  }, []);

  let handleScreen = () => {
    if (!canUseScreenShare()) {
      alert(
        "Screen sharing is only available on supported desktop browsers over HTTPS or localhost.",
      );
      return;
    }

    setScreen(!screen);
  };

  const getInitial = (name = "A") => {
    return name.trim().charAt(0).toUpperCase() || "A";
  };

  const roomName = meetingCode || "Meeting";

  const participantCount = videos.length + 1;

  const getGridLayoutClass = () => {
    if (participantCount <= 2) return styles.layoutTwo;
    if (participantCount === 3) return styles.layoutThree;
    if (participantCount === 4) return styles.layoutFour;
    return styles.layoutMany;
  };

  const isRemoteVideoOff = (socketId) => {
    return remoteMediaState[socketId]?.video === false;
  };

  const isRemoteAudioOff = (socketId) => {
    return remoteMediaState[socketId]?.audio === false;
  };

  useEffect(() => {
    if (!askForUsername && localVideoRef.current && window.localStream) {
      localVideoRef.current.srcObject = window.localStream;
    }
  }, [askForUsername]);

  let sendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    socketRef.current.emit("chat-message", trimmedMessage, username || "Guest");
    setMessage("");
  };

  return (
    <div>
      {askForUsername === true ? (
        <div className={styles.lobbyPage}>
          <nav className={styles.lobbyNav}>
            <button className={styles.lobbyBrand} onClick={goToAppHome}>
              <div className={styles.lobbyBrandIcon}>
                <VideocamIcon />
              </div>
              <h2>MeetLink</h2>
            </button>
          </nav>

          <main className={styles.lobbyShell}>
            <section className={styles.lobbyPanel}>
              <h1>Meeting Lobby</h1>

              <p className={styles.lobbySubtitle}>
                Check your camera and audio before joining.
              </p>

              <div className={styles.lobbyFieldGroup}>
                <label>Meeting code</label>
                <div className={styles.lobbyInputWrap}>
                  <input value={meetingCode || "Meeting"} readOnly />
                  <CloseIcon />
                </div>
              </div>

              <div className={styles.lobbyFieldGroup}>
                <label>Your name</label>
                <div className={styles.lobbyInputWrap}>
                  <input
                    value={username}
                    placeholder="Enter your name"
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.readyCard}>
                <div className={styles.readyDot}></div>
                <div>
                  <h3>You’re ready to join</h3>
                  <p>Check your audio and video, then connect.</p>
                </div>
              </div>

              <button className={styles.joinNowButton} onClick={connectMeeting}>
                Join now
              </button>

              <button
                className={styles.backButton}
                onClick={() => window.history.back()}
              >
                Back
              </button>

              <div className={styles.encryptedNote}>
                <LockOutlinedIcon />
                <span>Your meeting is end-to-end encrypted</span>
              </div>
            </section>

            <section className={styles.cameraPreviewCard}>
              <div className={styles.cameraPreviewArea}>
                <video ref={lobbyPreviewRef} autoPlay muted playsInline></video>

                <div className={styles.previewFallback}>
                  <div className={styles.previewAvatar}>
                    <PersonIcon />
                  </div>
                  <p>Camera preview</p>
                </div>
              </div>

              <div className={styles.deviceBar}>
                <div className={styles.deviceItem}>
                  <button
                    type="button"
                    className={styles.deviceIcon}
                    onClick={() =>
                      startLobbyPreview({ video: false, audio: true })
                    }
                  >
                    <MicIcon />
                  </button>

                  <div className={styles.deviceDetails}>
                    <h4>Microphone</h4>

                    <div className={styles.selectWrap}>
                      <select
                        className={styles.deviceSelect}
                        value={selectedAudioDeviceId}
                        onChange={handleAudioDeviceChange}
                      >
                        {audioInputDevices.length === 0 ? (
                          <option value="">Default microphone</option>
                        ) : (
                          audioInputDevices.map((device, index) => (
                            <option
                              key={device.deviceId}
                              value={device.deviceId}
                            >
                              {device.label || `Microphone ${index + 1}`}
                            </option>
                          ))
                        )}
                      </select>
                      <KeyboardArrowDownIcon />
                    </div>
                  </div>
                </div>

                <div className={styles.deviceItem}>
                  <button
                    type="button"
                    className={styles.deviceIcon}
                    onClick={() =>
                      startLobbyPreview({ video: true, audio: true })
                    }
                  >
                    <VideocamIcon />
                  </button>

                  <div className={styles.deviceDetails}>
                    <h4>Camera</h4>

                    <div className={styles.selectWrap}>
                      <select
                        className={styles.deviceSelect}
                        value={selectedVideoDeviceId}
                        onChange={handleVideoDeviceChange}
                      >
                        {videoInputDevices.length === 0 ? (
                          <option value="">Default camera</option>
                        ) : (
                          videoInputDevices.map((device, index) => (
                            <option
                              key={device.deviceId}
                              value={device.deviceId}
                            >
                              {device.label || `Camera ${index + 1}`}
                            </option>
                          ))
                        )}
                      </select>
                      <KeyboardArrowDownIcon />
                    </div>
                  </div>
                </div>

                <button className={styles.settingsButton}>
                  <SettingsOutlinedIcon />
                </button>
              </div>
            </section>
          </main>
        </div>
      ) : (
        <div className={styles.meetingRoomPage}>
          <header className={styles.meetingHeader}>
            <button className={styles.roomBrand} onClick={goToAppHome}>
              <div className={styles.roomBrandIcon}>
                <VideocamIcon />
              </div>
              <h2>MeetLink</h2>
            </button>

            <div className={styles.roomMeta}>
              <div>
                <h3>Room: {roomName}</h3>
                <p>
                  {participantCount} participant
                  {participantCount > 1 ? "s" : ""}
                </p>
              </div>
              <ShieldOutlinedIcon />
            </div>

            <div className={styles.profileMenuWrap}>
              <button
                className={styles.profileButton}
                onClick={() => setShowProfileMenu((prev) => !prev)}
              >
                <span>{getInitial(username || "A")}</span>
                <KeyboardArrowDownIcon />
              </button>

              {showProfileMenu && (
                <div className={styles.profileMenu}>
                  {isAuthenticated && (
                    <button onClick={() => navigate("/history")}>
                      <HistoryIcon />
                      <span>History</span>
                    </button>
                  )}

                  {isAuthenticated ? (
                    <button onClick={handleProfileLogout}>
                      <LogoutIcon />
                      <span>Logout</span>
                    </button>
                  ) : (
                    <button onClick={() => navigate("/auth")}>
                      <LogoutIcon />
                      <span>Sign in</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          <main
            className={`${styles.meetingShell} ${
              showModel ? "" : styles.meetingShellFull
            }`}
          >
            <section className={`${styles.videoGrid} ${getGridLayoutClass()}`}>
              {participantCount === 2 && videos[0] ? (
                <div
                  className={`${styles.videoCard} ${styles.primaryVideoCard}`}
                >
                  <PrimaryRemoteVideo video={videos[0]} styles={styles} />

                  {isRemoteVideoOff(videos[0].socketId) && (
                    <div className={styles.cameraOffOverlay}>
                      <div className={styles.cameraOffAvatar}>
                        {(videos[0].username || "P")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    </div>
                  )}

                  <div className={styles.videoNameTag}>
                    {videos[0].username || "Participant"}
                    {isRemoteAudioOff(videos[0].socketId) && <MicOffIcon />}
                  </div>

                  <div className={styles.selfPreviewCard}>
                    <LocalVideoElement localVideoRef={localVideoRef} />

                    {video === false && (
                      <div className={styles.cameraOffOverlay}>
                        <div className={styles.cameraOffAvatar}>
                          {getInitial(username || "You")}
                        </div>
                      </div>
                    )}

                    <div className={styles.selfPreviewTag}>
                      <span>You</span>
                      {audio === true ? <MicIcon /> : <MicOffIcon />}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`${styles.videoCard} ${styles.localVideoCard}`}
                  >
                    <LocalVideoElement
                      className={styles.gridVideo}
                      localVideoRef={localVideoRef}
                    />

                    {video === false && (
                      <div className={styles.cameraOffOverlay}>
                        <div className={styles.cameraOffAvatar}>
                          {getInitial(username || "You")}
                        </div>
                      </div>
                    )}

                    <div className={styles.videoNameTag}>
                      {username || "You"}
                    </div>
                  </div>

                  {videos.map((video, index) => (
                    <RemoteVideoTile
                      key={video.socketId}
                      video={video}
                      index={index}
                      styles={styles}
                      isVideoOff={isRemoteVideoOff(video.socketId)}
                      isAudioOff={isRemoteAudioOff(video.socketId)}
                    />
                  ))}
                </>
              )}
            </section>
            {showModel && (
              <aside className={styles.roomChatPanel}>
                <div className={styles.chatHeader}>
                  <h3>Chat</h3>
                  <MoreHorizIcon />
                </div>

                <div className={styles.chatMessages}>
                  {messages.length !== 0 ? (
                    messages.map((item, index) => (
                      <div className={styles.chatBubble} key={index}>
                        <div className={styles.chatBubbleHeader}>
                          <h4>
                            {item.socketIdSender === socketIdRef.current
                              ? "You"
                              : item.sender}
                          </h4>
                          <span>10:31 AM</span>
                        </div>
                        <p>{item.data}</p>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyChatState}>
                      <div>
                        <ChatIcon />
                      </div>
                      <h4>No messages yet</h4>
                      <p>Start chatting with your meeting participants.</p>
                    </div>
                  )}
                </div>

                <div className={styles.chatInputBar}>
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    placeholder="Type a message..."
                  />
                  <SentimentSatisfiedAltIcon />
                  <button onClick={sendMessage}>Send</button>
                </div>
              </aside>
            )}
          </main>

          <div className={styles.meetingDock}>
            <div className={styles.dockDeviceControl}>
              <button
                type="button"
                className={styles.dockToggleButton}
                onClick={handleVideo}
              >
                {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                <span>Camera</span>
              </button>

              <div className={styles.dockSelectWrap}>
                <select
                  className={styles.dockDeviceSelect}
                  value={selectedVideoDeviceId}
                  onChange={handleVideoDeviceChange}
                  aria-label="Select camera"
                >
                  {videoInputDevices.length === 0 ? (
                    <option value="">Default camera</option>
                  ) : (
                    videoInputDevices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))
                  )}
                </select>
                <KeyboardArrowDownIcon />
              </div>
            </div>

            <div className={styles.dockDeviceControl}>
              <button
                type="button"
                className={styles.dockToggleButton}
                onClick={handleAudio}
              >
                {audio === true ? <MicIcon /> : <MicOffIcon />}
                <span>Mic</span>
              </button>

              <div className={styles.dockSelectWrap}>
                <select
                  className={styles.dockDeviceSelect}
                  value={selectedAudioDeviceId}
                  onChange={handleAudioDeviceChange}
                  aria-label="Select microphone"
                >
                  {audioInputDevices.length === 0 ? (
                    <option value="">Default microphone</option>
                  ) : (
                    audioInputDevices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))
                  )}
                </select>
                <KeyboardArrowDownIcon />
              </div>
            </div>

            <button className={styles.leaveButton} onClick={handleEndCall}>
              <CallEndIcon />
              <span>Leave</span>
            </button>

            <button
              className={showModel ? styles.activeDockButton : ""}
              onClick={() => {
                setShowModel(!showModel);
                setNewMessages(0);
              }}
            >
              <ChatIcon />
              <span>Chat</span>
              {!showModel && newMessages > 0 && (
                <strong className={styles.dockBadge}>{newMessages}</strong>
              )}
            </button>

            <button
              onClick={handleScreen}
              disabled={!screenShareSupported}
              className={!screenShareSupported ? styles.disabledDockButton : ""}
              title={
                screenShareSupported
                  ? "Share screen"
                  : "Screen sharing is available on supported desktop browsers only"
              }
            >
              {screen === true ? <ScreenShareIcon /> : <PresentToAllIcon />}
              <span>Share</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoMeet;
