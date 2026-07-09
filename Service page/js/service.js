/* =====================================================
   SERVICE PAGE TEMPLATE — service.js
   Reusable across Thesis / Assignment / Research Proposal / SPSS / Proofreading
   Handles: FAQ accordion + Package tab switcher
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* -------- FAQ ACCORDION -------- */
  document.querySelectorAll('.svc-faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.svc-faq-item');
      item.classList.toggle('open');
    });
  });

  /* -------- PACKAGE TAB SWITCHER -------- */
  var svcPackages = {
    standard: {
      price: '৳15,000',
      popular: false,
      features: [
        'Delivery in 20 Days',
        '2 Free Revisions',
        'Turnitin Report',
        'Editable Source File'
      ]
    },
    recommended: {
      price: '৳28,000',
      popular: true,
      features: [
        'Delivery in 15 Days',
        'Unlimited Revisions',
        'Turnitin Report',
        'AI + Human Quality Check',
        'Editable Source File',
        'Progress Dashboard Access'
      ]
    },
    premium: {
      price: '৳45,000',
      popular: false,
      features: [
        'Delivery in 10 Days',
        'Unlimited Revisions',
        'Turnitin Report',
        'AI + Human Quality Check',
        'Editable Source File',
        'Progress Dashboard Access',
        '1-on-1 Expert Consultation',
        'Priority Support'
      ]
    }
  };

  var svcTabs = document.querySelectorAll('.svc-tab');
  var svcPriceEl = document.getElementById('svc-pkg-price');
  var svcFeaturesEl = document.getElementById('svc-pkg-features');
  var svcPopularTag = document.getElementById('svc-popular-tag');

  function renderPackage(key) {
    var pkg = svcPackages[key];
    if (!pkg) return;
    svcPriceEl.textContent = pkg.price;
    svcFeaturesEl.innerHTML = pkg.features.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    svcPopularTag.style.display = pkg.popular ? 'inline-flex' : 'none';
  }

  svcTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      svcTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      renderPackage(tab.getAttribute('data-pkg'));
    });
  });

});
