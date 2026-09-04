// AuthPage.jsx
import React, { useState } from "react";
import styles from "./AuthPage.module.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
      const success = await login({
        username,
        password,
      });

      if (success) {
        navigate("/home");
      }
    } else {
      await register({
        name,
        username,
        password,
      });

      setIsLogin(true);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Image Section */}
      <div className={styles.left}>
        <img
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80"
          alt="Mountain"
          className={styles.image}
        />
      </div>

      {/* Right Auth Section */}
      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.icon}>🔒</div>

          <h1 className={styles.title}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>

          <p className={styles.subtitle}>
            {isLogin ? "Sign in to continue" : "Sign up to start meetings"}
          </p>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              onClick={() => setIsLogin(true)}
              className={`${styles.tabBtn} ${isLogin ? styles.active : ""}`}
            >
              Sign In
            </button>

            <button
              onClick={() => setIsLogin(false)}
              className={`${styles.tabBtn} ${!isLogin ? styles.active : ""}`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                className={styles.input}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              type="text"
              placeholder="Username"
              value={username}
              className={styles.input}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />

            {!isLogin && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
            )}

            {isLogin && (
              <div className={styles.row}>
                <label>
                  <input type="checkbox" /> Remember me
                </label>

                <button type="button" className={styles.link}>
                  Forgot Password?
                </button>
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitBtn}>
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <p className={styles.footer}>
            {isLogin ? "New here?" : "Already have an account?"}

            <button
              onClick={() => setIsLogin(!isLogin)}
              className={styles.link}
            >
              {isLogin ? " Create one" : " Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
