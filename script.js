const FIREBASE_API_KEY = "AIzaSyA-CZj8oZcAjQcTkRlh-C3KGYT1NOAvfyE";
    const GOOGLE_CLIENT_ID = "931334159621-l2pvqp0bsj2cgj05mot3jn6gj7hakgol.apps.googleusercontent.com";
    const REDIRECT_URI = "http://localhost:5500";

    document.addEventListener("DOMContentLoaded", () => {
      const loginBtn = document.getElementById("loginBtn");
      if (loginBtn) loginBtn.addEventListener("click", startGoogleLogin);

      const storedName = sessionStorage.getItem("displayName");
      const storedEmail = sessionStorage.getItem("email");
      if (storedName && storedEmail) {
        // Already logged in → redirect to products page
        window.location.href = "products.html";
      } else {
        handleRedirectAuth();
      }

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) logoutBtn.addEventListener("click", logout);
    });

    function startGoogleLogin() {
      try {
        const oauthUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
          `&response_type=token` +
          `&scope=profile email` +
          `&prompt=select_account`;

        window.location.href = oauthUrl;
      } catch (error) {
        console.error("Login Error:", error);
        alert("Failed to initiate Google login.");
      }
    }

    async function handleRedirectAuth() {
      try {
        if (!window.location.hash.includes("access_token")) return;

        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");
        if (!accessToken) throw new Error("No access token found in URL.");

        const res = await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
          {
            postBody: `access_token=${accessToken}&providerId=google.com`,
            requestUri: REDIRECT_URI,
            returnSecureToken: true,
          },
          { headers: { "Content-Type": "application/json" } }
        );

        const data = res.data;
        if (!data.idToken) throw new Error("No ID token received from Firebase.");

        // Store session
        sessionStorage.setItem("idToken", data.idToken);
        sessionStorage.setItem("displayName", data.displayName || "");
        sessionStorage.setItem("email", data.email || "");

        // Redirect to products page after login
        window.location.href = "products.html";

      } catch (err) {
        console.error("Auth Error:", err.response?.data || err);
        alert("Authentication failed. Please try again.");
      }
    }

    function logout() {
      sessionStorage.clear();
      document.getElementById("userDetails").innerHTML = "";
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) logoutBtn.style.display = "none";
    }