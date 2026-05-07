// content.js
let versions = null;
let activeMenu = null;

function parseVersions(raw) {
  const parts = raw.split('---').filter(p => p.trim());
  return {
    subtle: parts.find(p => p.includes('SUBTLE'))?.replace('SUBTLE', '').trim() || '',
    human:  parts.find(p => p.includes('HUMAN'))?.replace('HUMAN', '').trim()  || '',
    ceo:    parts.find(p => p.includes('CEO'))?.replace('CEO', '').trim()       || ''
  };
}

/**
 * Replaces Gmail compose box content properly.
 * Direct .innerText assignment loses Gmail's change tracking.
 */
function applyToComposeBox(box, text) {
  box.focus();
  // Select all and replace so Gmail registers the edit
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
}

function showGlassMenu(anchor, composeBox, rawData) {
  if (activeMenu) activeMenu.remove();
  versions = parseVersions(rawData);

  const menu = document.createElement('div');
  menu.className = 'humanizer-glass-menu';
  menu.innerHTML = `
    <h3>✨ Select Tone</h3>
    <div class="humanizer-tabs">
      <div class="humanizer-tab active" data-tone="subtle">SUBTLE</div>
      <div class="humanizer-tab" data-tone="human">HUMAN</div>
      <div class="humanizer-tab" data-tone="ceo">CEO</div>
    </div>
    <div class="humanizer-preview" id="h-preview">${escapeHtml(versions.subtle)}</div>
    <div class="humanizer-actions">
      <button class="humanizer-btn btn-secondary" id="h-cancel">Cancel</button>
      <button class="humanizer-btn btn-primary" id="h-swap">Apply</button>
    </div>
  `;

  document.body.appendChild(menu);
  activeMenu = menu;

  // Smart positioning: try above the toolbar, fall back if it goes off-screen
  const rect = anchor.getBoundingClientRect();
  const menuH = 240; // approx
  const spaceAbove = rect.top;
  
  if (spaceAbove >= menuH + 15) {
    menu.style.position = 'fixed';
    menu.style.top = `${rect.top - menuH - 15}px`;
  } else {
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 10}px`;
  }
  
  // Horizontal: align left but clamp to viewport
  const left = Math.min(rect.left, window.innerWidth - 355);
  menu.style.left = `${Math.max(8, left)}px`;

  // Tab logic
  let selected = 'subtle';
  menu.querySelectorAll('.humanizer-tab').forEach(tab => {
    tab.onclick = () => {
      menu.querySelector('.active').classList.remove('active');
      tab.classList.add('active');
      selected = tab.dataset.tone;
      menu.querySelector('#h-preview').innerText = versions[selected];
    };
  });

  menu.querySelector('#h-cancel').onclick = () => menu.remove();
  menu.querySelector('#h-swap').onclick = () => {
    applyToComposeBox(composeBox, versions[selected]);
    menu.remove();
  };

  // Close on outside click
  const onOutsideClick = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('mousedown', onOutsideClick);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 100);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showInlineError(btn, msg) {
  const orig = btn.innerText;
  btn.innerText = '⚠ ' + msg;
  btn.style.color = '#ff3b30';
  setTimeout(() => {
    btn.innerText = orig;
    btn.style.color = '#007aff';
  }, 3000);
}

// Button injection loop — Gmail compose toolbar selector
setInterval(() => {
  // .btC is the bottom toolbar of a Gmail compose window
  const toolbars = document.querySelectorAll('.btC');
  toolbars.forEach(toolbar => {
    if (toolbar.querySelector('.btn-h-trigger')) return;

    // Find the contenteditable compose area — walk up to the compose wrapper
    const composeWrapper = toolbar.closest('[role="dialog"]') || toolbar.closest('.M9');
    if (!composeWrapper) return;
    const box = composeWrapper.querySelector('div[contenteditable="true"]');
    if (!box) return;

    const btn = document.createElement('div');
    btn.className = 'btn-h-trigger';
    btn.innerText = '✨ Humanize';
    btn.style.cssText = 'cursor:pointer; margin-left:12px; font-weight:600; color:#007aff; font-size:12px; white-space:nowrap; user-select:none;';

    btn.onclick = async () => {
      const emailText = box.innerText.trim();
      if (!emailText) {
        showInlineError(btn, 'Compose something first');
        return;
      }
      btn.innerText = '⏳ Thinking...';
      btn.style.pointerEvents = 'none';
      const res = await chrome.runtime.sendMessage({ type: 'REWRITE', text: emailText });
      btn.innerText = '✨ Humanize';
      btn.style.pointerEvents = 'auto';
      if (res.data) {
        showGlassMenu(toolbar, box, res.data);
      } else {
        showInlineError(btn, res.error || 'Something went wrong');
      }
    };

    toolbar.appendChild(btn);
  });
}, 2000);
