/* ═══════════════════════════════════════════════════════════
   SCRIPTORA — XSS Sanitizer (sanitize.js)
   
   Usage: escHtml(userInput) — সব user input এ use করো
   যেখানে innerHTML এ directly value বসানো হচ্ছে।
═══════════════════════════════════════════════════════════ */

(function () {

  /**
   * escHtml — HTML special characters escape করে XSS prevent করে
   * e.g. escHtml('<script>alert(1)</script>') → '&lt;script&gt;alert(1)&lt;/script&gt;'
   */
  function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g,  '&#096;');
  }

  /**
   * sanitizeInput — form input থেকে leading/trailing whitespace সরায়
   * এবং বেশি লম্বা input truncate করে
   */
  function sanitizeInput(str, maxLen = 1000) {
    if (!str) return '';
    return String(str).trim().slice(0, maxLen);
  }

  /**
   * isValidEmail — basic email format check
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  /**
   * isValidPhone — Bangladesh phone number check
   * 01XXXXXXXXX format (11 digits)
   */
  function isValidPhone(phone) {
    return /^01[3-9]\d{8}$/.test(String(phone).replace(/\s/g, ''));
  }

  /* Global এ expose করো */
  window.escHtml       = escHtml;
  window.sanitizeInput = sanitizeInput;
  window.isValidEmail  = isValidEmail;
  window.isValidPhone  = isValidPhone;

})();
