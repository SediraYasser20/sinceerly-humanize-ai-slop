// Load saved prefs on open
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiKey', 'provider'], ({ apiKey, provider }) => {
    if (apiKey) document.getElementById('key').value = apiKey;
    if (provider) document.getElementById('provider').value = provider;
  });
});

document.getElementById('save').onclick = () => {
  const apiKey = document.getElementById('key').value.trim();
  const provider = document.getElementById('provider').value;

  if (!apiKey) {
    showStatus('Please enter an API key.', '#ff3b30');
    return;
  }

  chrome.storage.local.set({ apiKey, provider }, () => {
    showStatus('Saved!', '#34c759');
  });
};

function showStatus(msg, color) {
  const btn = document.getElementById('save');
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.style.background = color;
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = '#007aff';
  }, 1800);
}
