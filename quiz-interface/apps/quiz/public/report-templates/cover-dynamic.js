(() => {
  function toPx(value) {
    const n = Number.parseFloat(String(value || '').replace('px', ''));
    return Number.isFinite(n) ? n : null;
  }

  function getTotalScale(el) {
    let sx = 1;
    let sy = 1;
    let cur = el;

    while (cur && cur !== document.documentElement) {
      const t = window.getComputedStyle(cur).transform;
      if (t && t !== 'none') {
        try {
          const m = new DOMMatrixReadOnly(t);
          const curSx = Math.hypot(m.a, m.b) || 1;
          const curSy = Math.hypot(m.c, m.d) || 1;
          sx *= curSx;
          sy *= curSy;
        } catch {
          // ignore
        }
      }
      cur = cur.parentElement;
    }

    return { sx, sy };
  }

  function getLineHeightPxFromStyle(fontSizePx, lineHeightValue) {
    const lhPx = toPx(lineHeightValue);
    if (lhPx !== null) return lhPx;

    const lhNum = Number.parseFloat(String(lineHeightValue || ''));
    if (Number.isFinite(lhNum) && lhNum > 0 && String(lineHeightValue).trim() === String(lhNum)) {
      return fontSizePx * lhNum;
    }

    return fontSizePx * 1.2;
  }

  function getPageRootFor(el) {
    let cur = el;
    while (cur) {
      const r = cur.getBoundingClientRect();
      if (r.width >= 540 && r.width <= 680 && r.height >= 760 && r.height <= 980) {
        return cur;
      }
      cur = cur.parentElement;
    }

    const byStyle = document.querySelector(
      'body > div[style*="width:595"][style*="height:841"], body > div[style*="width:595"][style*="height:842"]'
    );
    return byStyle || document.getElementById('publication') || document.body;
  }

  function ensureOverlay(pageRoot) {
    let overlay = document.getElementById('__cover_dynamic_overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__cover_dynamic_overlay';
      overlay.style.position = 'absolute';
      overlay.style.left = '0px';
      overlay.style.top = '0px';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '9999';
      pageRoot.appendChild(overlay);
    }
    return overlay;
  }

  function ensureOverlayText(overlay, id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'absolute';
      el.style.left = '0px';
      el.style.width = '100%';
      el.style.textAlign = 'center';
      el.style.whiteSpace = 'normal';
      el.style.overflowWrap = 'break-word';
      overlay.appendChild(el);
    }
    return el;
  }

  function getBasisSourceEls() {
    const basisSingle = document.getElementById('_idTextSpan_basis');
    if (basisSingle) return [basisSingle];

    const s3 = document.getElementById('_idTextSpan003');
    const s4 = document.getElementById('_idTextSpan004');
    const s5 = document.getElementById('_idTextSpan005');
    if (s3 && s4 && s5) return [s3, s4, s5];

    return [];
  }

  function buildBasisText(els) {
    const txt = els.map((e) => e.textContent || '').join('');
    return txt.replace(/\s+/g, ' ').trim();
  }

  function hideEls(els) {
    els.forEach((el) => {
      el.style.visibility = 'hidden';
    });
  }

  function applyScaledTextStyle(targetEl, sourceEl, scale) {
    const cs = window.getComputedStyle(sourceEl);
    const fs = toPx(cs.fontSize) ?? 0;
    const fontSizePx = fs * (scale.sx > 0 ? scale.sx : 1);
    const lineHeightPx = getLineHeightPxFromStyle(fs, cs.lineHeight) * (scale.sy > 0 ? scale.sy : 1);

    targetEl.style.fontFamily = cs.fontFamily;
    targetEl.style.fontWeight = cs.fontWeight;
    targetEl.style.fontStyle = cs.fontStyle;
    targetEl.style.color = cs.color;
    targetEl.style.fontSize = `${fontSizePx}px`;
    targetEl.style.lineHeight = `${lineHeightPx}px`;

    const ls = toPx(cs.letterSpacing);
    if (ls !== null) {
      targetEl.style.letterSpacing = `${ls * (scale.sx > 0 ? scale.sx : 1)}px`;
    } else {
      targetEl.style.letterSpacing = cs.letterSpacing;
    }

    return { fontSizePx, lineHeightPx };
  }

  function adjustCoverLayout() {
    const nameSource = document.getElementById('_idTextSpan002');
    if (!nameSource) return;

    const pageRoot = getPageRootFor(nameSource);

    const pageRootStyle = window.getComputedStyle(pageRoot);
    if (pageRootStyle.position === 'static') {
      pageRoot.style.position = 'relative';
    }

    const overlay = ensureOverlay(pageRoot);
    const nameBox = ensureOverlayText(overlay, '__cover_dynamic_name');
    const basisBox = ensureOverlayText(overlay, '__cover_dynamic_basis');

    const rootRect = pageRoot.getBoundingClientRect();
    const nameRect = nameSource.getBoundingClientRect();

    const nameTop = nameRect.top - rootRect.top;

    nameBox.style.top = `${nameTop}px`;
    nameBox.textContent = (nameSource.textContent || '').trim();

    const nameScale = getTotalScale(nameSource);
    const nameMetrics = applyScaledTextStyle(nameBox, nameSource, nameScale);

    const nameBoxRect = nameBox.getBoundingClientRect();
    const lineHeight = nameMetrics.lineHeightPx > 0 ? nameMetrics.lineHeightPx : 1;
    const lines = Math.max(1, Math.ceil(nameBoxRect.height / lineHeight));

    const basisSourceEls = getBasisSourceEls();
    const basisText = buildBasisText(basisSourceEls);
    basisBox.textContent = basisText;

    const basisSourceRect = basisSourceEls[0]?.getBoundingClientRect();
    const baseGapPx = basisSourceRect ? Math.max(0, basisSourceRect.top - nameRect.top) : 0;
    const basisTop = baseGapPx > 0 ? nameTop + baseGapPx + (lines - 1) * lineHeight : nameTop + lines * lineHeight;
    basisBox.style.top = `${basisTop}px`;

    const basisStyleSource = basisSourceEls[0] || nameSource;
    const basisScale = basisSourceEls[0] ? getTotalScale(basisSourceEls[0]) : nameScale;
    applyScaledTextStyle(basisBox, basisStyleSource, basisScale);

    hideEls([nameSource, ...basisSourceEls]);
  }

  function scheduleAdjust() {
    requestAnimationFrame(() => {
      adjustCoverLayout();
      setTimeout(adjustCoverLayout, 50);
      setTimeout(adjustCoverLayout, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleAdjust);
  } else {
    scheduleAdjust();
  }

  window.addEventListener('load', scheduleAdjust);
  window.addEventListener('resize', scheduleAdjust);
})();
