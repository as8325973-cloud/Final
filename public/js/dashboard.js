document.addEventListener("DOMContentLoaded", () => {
  loadCountryList();

  // 預設先顯示提示（不自動載入第一個國家）
  const tbody = document.getElementById("countryHistoryTable");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="2">請選擇國家</td></tr>`;
  }
});

// 取得國家清單
async function loadCountryList() {
  const sel = document.getElementById("countrySelect1");
  const tbody = document.getElementById("countryHistoryTable");

  try {
    const res = await fetch("/api/countries", {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`載入國家清單失敗 (HTTP ${res.status})`);
    }

    const data = await res.json();

    // ✅ 永遠先放 placeholder，並確保預設選中它
    const placeholder = `<option value="undefined" selected>-- 請選擇國家 --</option>`;

    if (!Array.isArray(data) || data.length === 0) {
      sel.innerHTML = placeholder;
      if (tbody) tbody.innerHTML = `<tr><td colspan="2">沒有國家資料</td></tr>`;
      return;
    }

    // ✅ 在 placeholder 後面再接國家清單
    sel.innerHTML =
      placeholder +
      data.map(c => `<option value="${c.alpha3}">${c.name}</option>`).join("");

    // ✅ 綁定事件：只有使用者選了國家才載入
    sel.addEventListener("change", loadCountryHistory);

  } catch (err) {
    console.error(err);
    sel.innerHTML = `<option value="undefined" selected>-- 請選擇國家 --</option>`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="2">載入國家清單失敗</td></tr>`;
  }
}

// 功能一：顯示該國家歷年 MMR（JSON 方案）
async function loadCountryHistory() {
  const sel = document.getElementById("countrySelect1");
  const code = sel?.value ?? "undefined";
  const tbody = document.getElementById("countryHistoryTable");

  if (!tbody) return;

  // ✅ 若還是 placeholder，就顯示提示，不打 API
  if (!code || code === "undefined") {
    tbody.innerHTML = `<tr><td colspan="2">請選擇國家</td></tr>`;
    return;
  }

  try {
    const res = await fetch(`/api/mmr/history/json?alpha3=${encodeURIComponent(code)}`, {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      let msg = `查詢失敗 (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error) msg = errJson.error;
      } catch (_) { }
      tbody.innerHTML = `<tr><td colspan="2">${msg}</td></tr>`;
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2">沒有資料</td></tr>`;
      return;
    }

    tbody.innerHTML = data
      .sort((a, b) => a.year - b.year)
      .map(r => `<tr><td>${r.year}</td><td>${r.mmr}</td></tr>`)
      .join("");

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2">查詢失敗：網路或伺服器錯誤</td></tr>`;
  }
}
