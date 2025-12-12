document.addEventListener("DOMContentLoaded", () => {
  loadCountryList();
});

// 取得國家清單
async function loadCountryList() {
  const res = await fetch("/api/countries");
  const data = await res.json();

  const sel = document.getElementById("countrySelect1");
  sel.innerHTML = data.map(c => `<option value="${c.alpha3}">${c.name}</option>`).join("");

  sel.addEventListener("change", loadCountryHistory);

  loadCountryHistory(); // 預設載入第一個國家
}

// 功能一：顯示該國家歷年 MMR
async function loadCountryHistory() {
  const code = document.getElementById("countrySelect1").value;

  const res = await fetch(`/api/mmr/history?alpha3${code}`);
  const data = await res.json();

  const tbody = document.getElementById("countryHistoryTable");

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">沒有資料</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .sort((a, b) => a.year - b.year)
    .map(r => `<tr><td>${r.year}</td><td>${r.mmr}</td></tr>`)
    .join("");
}

