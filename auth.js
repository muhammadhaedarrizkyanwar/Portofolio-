// ===============================
// DATA USER
// ===============================

function getAuthUserData(user) {
  if (!user) return null;

  const name = user.displayName || "User";

  return {
    uid: user.uid,
    email: user.email || "",
    name,
    username: name
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, ""),
    photoURL: user.photoURL || ""
  };
}

function authGetCurrentUser() {
  return getAuthUserData(auth.currentUser);
}

function authGetSession() {
  return getAuthUserData(auth.currentUser);
}

// ===============================
// AUTH GUARD
// ===============================

function authGate() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
}

// ===============================
// DROPDOWN PROFIL
// ===============================

function renderProfileDropdown() {
  const dropdown = document.querySelector("[data-profile-dropdown]");

  if (!dropdown) return;

  auth.onAuthStateChanged(async (user) => {
    const profileToggle = dropdown.parentElement
      ? dropdown.parentElement.querySelector(".profile-toggle")
      : null;

    if (!user) {
      setProfileToggle(profileToggle, null);

      dropdown.innerHTML = `
        <li>
          <a href="login.html">🔑 Login</a>
        </li>
        <li>
          <a href="register.html">📝 Daftar</a>
        </li>
      `;
      return;
    }

    const session = getAuthUserData(user);

    setProfileToggle(profileToggle, session);

    let isAdmin = false;

    try {
      const userDocument = await db
        .collection("users")
        .doc(user.uid)
        .get();

      if (userDocument.exists) {
        const userData = userDocument.data();
        isAdmin = userData?.role === "admin";
      }
    } catch (error) {
      console.error("Gagal memeriksa role admin:", error);
    }

    dropdown.innerHTML = `
      <li class="profile-hello">
        Halo, <strong>${escapeHTML(session.name)}</strong>
      </li>

      <li>
        <a href="dashboard.html">👤 Dashboard</a>
      </li>

      ${
        isAdmin
          ? `
            <li>
              <a href="admin.html">🔐 Admin Panel</a>
            </li>
          `
          : ""
      }

      <li>
        <button type="button" class="danger" data-logout-button>
          🚪 Logout
        </button>
      </li>
    `;

    const logoutButton = dropdown.querySelector("[data-logout-button]");

    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        try {
          await auth.signOut();
          window.location.href = "index.html";
        } catch (error) {
          console.error("Logout error:", error);
          alert("Gagal logout.");
        }
      });
    }
  });
}

// Isi tombol profil: foto (mis. dari Google), kalau tidak ada
// pakai huruf pertama nama, kalau belum login pakai ikon 👤.
function setProfileToggle(toggle, session) {
  if (!toggle) return;

  toggle.classList.remove("has-initial");

  if (!session) {
    toggle.textContent = "👤";
    return;
  }

  const showInitial = () => {
    toggle.textContent = (session.name || "U").trim().charAt(0).toUpperCase();
    toggle.classList.add("has-initial");
  };

  if (!session.photoURL) {
    showInitial();
    return;
  }

  const img = document.createElement("img");
  img.alt = "";
  img.referrerPolicy = "no-referrer";
  img.src = session.photoURL;
  img.addEventListener("error", showInitial);

  toggle.textContent = "";
  toggle.appendChild(img);
}

// Mencegah teks user masuk sebagai HTML
function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===============================
// NAVIGASI UMUM
// ===============================

function initNavigation() {
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  document.querySelectorAll(".submenu-toggle").forEach((toggle) => {
    const submenu = toggle.nextElementSibling;

    if (!submenu || !submenu.classList.contains("sub-menu")) {
      return;
    }

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const isOpen = submenu.classList.contains("open");

      document.querySelectorAll(".sub-menu.open").forEach((menu) => {
        menu.classList.remove("open");
      });

      if (!isOpen) {
        submenu.classList.add("open");
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".has-submenu")) {
      document.querySelectorAll(".sub-menu.open").forEach((menu) => {
        menu.classList.remove("open");
      });
    }
  });
}

// ===============================
// TEMA
// ===============================

function loadSavedTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.setAttribute("data-theme", "dark");
  }
}

function toggleTheme() {
  const isDark = document.body.getAttribute("data-theme") === "dark";

  if (isDark) {
    document.body.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
  } else {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
}

// ===============================
// GANTI PASSWORD
// ===============================

function authRequestPasswordChangeCode() {
  const code = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  sessionStorage.setItem("pwChangeCode", code);

  return {
    ok: true,
    code
  };
}

function authSendVerificationEmail(email, name, code) {
  // Mode demo.
  // EmailJS dapat ditambahkan di sini jika sudah dikonfigurasi.
  return Promise.resolve({
    sent: false,
    email,
    name,
    code
  });
}

// ===============================
// UPDATE AKUN
// ===============================

async function authUpdateAccount({
  name,
  email,
  currentPassword,
  newPassword,
  verificationCode
}) {
  const user = auth.currentUser;

  if (!user) {
    return {
      ok: false,
      message: "User tidak login."
    };
  }

  if (!currentPassword) {
    return {
      ok: false,
      message: "Password saat ini wajib diisi."
    };
  }

  try {
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    await user.reauthenticateWithCredential(credential);

    if (name && name !== user.displayName) {
      await user.updateProfile({
        displayName: name
      });
    }

    if (email && email !== user.email) {
      await user.updateEmail(email);
    }

    if (newPassword) {
      const storedCode = sessionStorage.getItem("pwChangeCode");

      if (!storedCode || storedCode !== verificationCode) {
        return {
          ok: false,
          message: "Kode verifikasi salah atau sudah kedaluwarsa."
        };
      }

      await user.updatePassword(newPassword);
      sessionStorage.removeItem("pwChangeCode");
    }

    await db.collection("users").doc(user.uid).set(
      {
        email: user.email,
        displayName: user.displayName || name || "User",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      {
        merge: true
      }
    );

    return {
      ok: true
    };
  } catch (error) {
    console.error("Update account error:", error);

    let message = "Gagal menyimpan perubahan.";

    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {
      message = "Password saat ini salah.";
    } else if (error.code === "auth/requires-recent-login") {
      message = "Silakan login ulang sebelum mengubah akun.";
    } else if (error.code === "auth/email-already-in-use") {
      message = "Email tersebut sudah digunakan.";
    } else if (error.code === "auth/invalid-email") {
      message = "Format email tidak valid.";
    } else if (error.code === "auth/weak-password") {
      message = "Password baru minimal 6 karakter.";
    }

    return {
      ok: false,
      message
    };
  }
}

// ===============================
// HAPUS AKUN
// ===============================

async function authDeleteAccount(password) {
  const user = auth.currentUser;

  if (!user) {
    return {
      ok: false,
      message: "User tidak login."
    };
  }

  if (!password) {
    return {
      ok: false,
      message: "Password wajib diisi."
    };
  }

  try {
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      password
    );

    await user.reauthenticateWithCredential(credential);

    await db.collection("users").doc(user.uid).delete();
    await user.delete();

    return {
      ok: true
    };
  } catch (error) {
    console.error("Delete account error:", error);

    let message = "Gagal menghapus akun.";

    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {
      message = "Password salah.";
    } else if (error.code === "auth/requires-recent-login") {
      message = "Silakan login ulang sebelum menghapus akun.";
    }

    return {
      ok: false,
      message
    };
  }
}

// ===============================
// CEK ADMIN
// ===============================

async function authIsAdmin() {
  const user = auth.currentUser;

  if (!user) {
    return false;
  }

  try {
    const userDocument = await db
      .collection("users")
      .doc(user.uid)
      .get();

    return userDocument.data()?.role === "admin";
  } catch (error) {
    console.error("Admin check error:", error);
    return false;
  }
}

// ===============================
// LOGIN DENGAN GOOGLE
// ===============================

async function authSignInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await auth.signInWithPopup(provider);
  const user = result.user;

  const userRef = db.collection("users").doc(user.uid);
  const snapshot = await userRef.get();

  if (snapshot.exists) {
    if (snapshot.data()?.isDisabled === true) {
      await auth.signOut();

      const disabledError = new Error("Akun dinonaktifkan.");
      disabledError.code = "app/user-disabled";
      throw disabledError;
    }
  } else {
    // Pertama kali masuk lewat Google: buat dokumen user biasa
    await userRef.set({
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "User",
      role: "user",
      isDisabled: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  return user;
}

async function handleGoogleLogin(showError, button) {
  if (button) button.disabled = true;

  try {
    const user = await authSignInWithGoogle();

    localStorage.setItem("userEmail", user.email || "");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Google login error:", error);

    const messages = {
      "auth/popup-blocked":
        "Popup diblokir browser. Izinkan popup lalu coba lagi.",
      "auth/unauthorized-domain":
        "Domain ini belum diizinkan di Firebase (Authentication → Settings → Authorized domains).",
      "auth/operation-not-allowed":
        "Login Google belum diaktifkan di Firebase.",
      "auth/network-request-failed":
        "Koneksi bermasalah. Coba lagi.",
      "app/user-disabled":
        "Akun kamu dinonaktifkan."
    };

    // Popup ditutup sendiri oleh user: tidak perlu pesan error
    if (
      error.code !== "auth/popup-closed-by-user" &&
      error.code !== "auth/cancelled-popup-request"
    ) {
      showError(
        messages[error.code] || "Gagal login dengan Google. Coba lagi."
      );
    }
  } finally {
    if (button) button.disabled = false;
  }
}

// ===============================
// INISIALISASI OTOMATIS
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  loadSavedTheme();
  initNavigation();

  if (typeof applyTranslations === "function") {
    applyTranslations();
  }

  renderProfileDropdown();
});