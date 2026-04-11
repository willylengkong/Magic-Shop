// ─── VALIDATION HELPERS ──────────────────────────────────────────────────────

/**
 * Tampilkan pesan error pada field tertentu
 * @param {string} fieldId - id input field
 * @param {string} message - pesan error
 */
function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) input.setAttribute("aria-invalid", "true");
  if (errorEl) errorEl.textContent = message;
}

/**
 * Bersihkan pesan error pada field tertentu
 * @param {string} fieldId - id input field
 */
function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) input.removeAttribute("aria-invalid");
  if (errorEl) errorEl.textContent = "";
}

/** Bersihkan semua error di halaman */
function clearAllErrors() {
  document
    .querySelectorAll("[aria-invalid]")
    .forEach((el) => el.removeAttribute("aria-invalid"));
  document.querySelectorAll(".error-msg").forEach((el) => {
    el.textContent = "";
  });
}

// ─── TOAST NOTIFICATION ───────────────────────────────────────────────────────

/**
 * Tampilkan toast notifikasi
 * @param {string} message
 * @param {"success"|"error"} type
 */
function showToast(message, type = "error") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

// ─── BUTTON STATE ─────────────────────────────────────────────────────────────

/**
 * Set tombol ke state loading atau normal
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 */
function setButtonLoading(btn, isLoading) {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText =
      btn.querySelector("span")?.textContent || btn.textContent;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>Loading...</span>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
  }
}

// ─── TOGGLE PASSWORD VISIBILITY ───────────────────────────────────────────────

/**
 * Toggle show/hide password pada input
 * @param {HTMLButtonElement} btnEl - tombol toggle yang diklik
 */
function togglePasswordVisibility(btnEl) {
  const targetId = btnEl.dataset.target;
  const input = document.getElementById(targetId);
  const icon = btnEl.querySelector("i");
  if (!input) return;

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btnEl.setAttribute(
    "aria-label",
    isHidden ? "Sembunyikan password" : "Tampilkan password",
  );

  if (icon) {
    icon.classList.toggle("fa-eye", !isHidden);
    icon.classList.toggle("fa-eye-slash", isHidden);
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

/**
 * Handler submit form login.
 * Mengirim POST ke /auth/login dengan { email, password }.
 * Jika berhasil, data user disimpan ke localStorage dan
 * diarahkan ke home.html (member) atau admin.html (admin).
 *
 * @param {SubmitEvent} e
 */
async function handleLogin(e) {
  e.preventDefault();
  clearAllErrors();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");

  // ── Validasi sisi klien ──
  let isValid = true;

  if (!email) {
    showFieldError("email", "Email tidak boleh kosong");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError("email", "Format email tidak valid");
    isValid = false;
  }

  if (!password) {
    showFieldError("password", "Password tidak boleh kosong");
    isValid = false;
  }

  if (!isValid) return;

  // ── Simpan HTML asli tombol sebelum loading ──
  btn.dataset.originalHtml = btn.innerHTML;
  setButtonLoading(btn, true);

  try {
    // ── Kirim ke API: POST /auth/login ──
    const response = await fetch(`${CONFIG.BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Simpan data user ke localStorage
      localStorage.setItem("user", JSON.stringify(data));

      showToast(data.message || "Login berhasil!", "success");

      // Redirect berdasarkan role_id (1 = admin, 2 = member)
      setTimeout(() => {
        if (data.role_id === 1) {
          window.location.href = "admin.html";
        } else {
          window.location.href = "home.html";
        }
      }, 1000);
    } else {
      // Tampilkan pesan error dari API (misal: email/password salah)
      showToast(data.detail || "Email atau password salah", "error");
    }
  } catch (err) {
    showToast(
      "Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.",
      "error",
    );
    console.error("[Login Error]", err);
  } finally {
    setButtonLoading(btn, false);
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

/**
 * Handler submit form register.
 * Mengirim POST ke /auth/register dengan { email, password, role_id: 2 }.
 * Jika berhasil, redirect ke halaman login.
 *
 * @param {SubmitEvent} e
 */
async function handleRegister(e) {
  e.preventDefault();
  clearAllErrors();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;
  const btn = document.getElementById("registerBtn");

  // ── Validasi sisi klien ──
  let isValid = true;

  if (!name) {
    showFieldError("name", "Nama lengkap tidak boleh kosong");
    isValid = false;
  } else if (name.length < 2) {
    showFieldError("name", "Nama minimal 2 karakter");
    isValid = false;
  }

  if (!email) {
    showFieldError("email", "Email tidak boleh kosong");
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError("email", "Format email tidak valid");
    isValid = false;
  }

  if (!password) {
    showFieldError("password", "Password tidak boleh kosong");
    isValid = false;
  } else if (password.length < 6) {
    showFieldError("password", "Password minimal 6 karakter");
    isValid = false;
  }

  if (!confirm) {
    showFieldError("confirmPassword", "Konfirmasi password tidak boleh kosong");
    isValid = false;
  } else if (password !== confirm) {
    showFieldError("confirmPassword", "Password tidak cocok");
    isValid = false;
  }

  if (!isValid) return;

  // ── Simpan HTML asli tombol sebelum loading ──
  btn.dataset.originalHtml = btn.innerHTML;
  setButtonLoading(btn, true);

  try {
    // ── Kirim ke API: POST /auth/register ──
    // role_id: 2 = member (default untuk user yang mendaftar sendiri)
    const response = await fetch(`${CONFIG.BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password}),
    });

    const data = await response.json();

    if (response.ok) {
      showToast(
        data.message || "Registrasi berhasil! Silakan login.",
        "success",
      );

      // Redirect ke halaman login setelah berhasil register
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } else {
      // Tampilkan pesan error dari API (misal: email sudah terdaftar)
      showToast(data.detail || "Registrasi gagal, coba lagi.", "error");
    }
  } catch (err) {
    showToast(
      "Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.",
      "error",
    );
    console.error("[Register Error]", err);
  } finally {
    setButtonLoading(btn, false);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Pasang event submit pada form yang ada di halaman
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  // Pasang event toggle password pada setiap tombol .toggle-pw
  document.querySelectorAll(".toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => togglePasswordVisibility(btn));
  });

  // Bersihkan error per field saat user mulai mengetik
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input.id));
  });
});
