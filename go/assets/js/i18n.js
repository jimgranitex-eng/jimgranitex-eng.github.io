/* I18N-UNLIMITED v1 — unlimited-language bridge interstitial localization (2026-10-10).
 *
 * ARCHITECTURE:
 *  - Merchant-gated: a language activates ONLY if the merchant supports it
 *    (I18N_MERCHANTS). James's rule: "so long as the third party companies
 *    support them obviously."
 *  - Adding a language = adding one row to I18N_STRINGS. No code changes.
 *  - Negotiation: full BCP 47 (navigator.languages) -> exact locale -> base
 *    language -> merchant support check -> English fallback.
 *  - FTC disclosures: ftcReviewed:true ONLY for human-reviewed frozen blocks.
 *    Unreviewed languages get UI strings in their language + the ENGLISH FTC
 *    block. NEVER ship a machine-translated disclosure unreviewed.
 *  - Merchant URL (tag + UTMs) NEVER changes. This script only swaps text.
 *
 * HARD NOs: no credential handling, no checkout proxying, text-only.
 */
(function(){
try{

/* ---- 1. MERCHANT LANGUAGE MATRIX (the gate) ----
 * Sources: Amazon "About the Spanish Language Experience" (amazon.com/gp/help),
 * AliExpress multi-language site footer (16 languages), merchant help pages.
 * amazon.com (US): English + Spanish ONLY. Everything else is per-locale. */
var I18N_MERCHANTS = {
  'amazon-us': ['en','es'],
  'amazon-ca': ['en','fr'],
  'amazon-mx': ['es'],
  'amazon-es': ['es'],
  'amazon-de': ['de'],
  'amazon-fr': ['fr'],
  'amazon-it': ['it'],
  'amazon-uk': ['en'],
  'amazon-br': ['pt'],
  'amazon-jp': ['ja','en'],
  'amazon-in': ['en','hi'],
  'amazon-au': ['en'],
  'amazon-ae': ['en','ar'],
  'amazon-nl': ['nl','en'],
  'amazon-se': ['sv','en'],
  'amazon-pl': ['pl'],
  'amazon-be': ['nl','fr','en'],
  'amazon-eg': ['en','ar'],
  'amazon-tr': ['tr'],
  'amazon-sg': ['en'],
  'aliexpress': ['en','es','pt','fr','de','it','nl','ru','ja','ko','th','vi','tr','ar','he','id','pl'],
  'chewy':      ['en'],
  'default':    ['en']
};

/* Merchant display names (used in localized strings). Amazon is "Amazon"
 * in every supported language; override per merchant if ever needed. */
var I18N_MERCHANT_NAMES = { 'default': 'Amazon' };

/* ---- 2. STRING TABLES — one row per language ----
 * ftcReviewed:true = human-reviewed FROZEN disclosure block. Anything false
 * falls back to the English FTC block (safe) until reviewed. */
var I18N_STRINGS = {
en: {
  ftcReviewed: true,
  h1: 'Taking you to Amazon\u2026',
  pickedPre: 'You picked ',
  pickedPost: '.\u2009We\u2019re sending you to Amazon where you can see today\u2019s price and buy it there.',
  ftcLead: 'Affiliate disclosure: ',
  ftcBody: 'we may earn a commission if you buy \u2014 at no cost to you. We never see your order, payment, or personal details. Amazon is the seller, ships your order, and handles returns and support.',
  cta: 'Continue to Amazon \u2192'
},
es: {
  ftcReviewed: true, /* live since 2026-10-10, reviewed */
  h1: 'Llev\u00e1ndote a Amazon\u2026',
  pickedPre: 'Elegiste ',
  pickedPost: '.\u2009Te estamos llevando a Amazon, donde puedes ver el precio de hoy y comprarlo all\u00ed.',
  ftcLead: 'Divulgaci\u00f3n de afiliado: ',
  ftcBody: 'como afiliado de Amazon, ganamos comisiones por compras que califiquen, sin costo adicional para ti. No vemos tu pedido, tu pago ni tus datos personales. Amazon es el vendedor, env\u00eda tu pedido y gestiona devoluciones y soporte.',
  cta: 'Continuar a Amazon \u2192'
},
pt: {
  ftcReviewed: false, /* DRAFT — needs human review before ftcReviewed:true */
  h1: 'Levando voc\u00ea \u00e0 Amazon\u2026',
  pickedPre: 'Voc\u00ea escolheu ',
  pickedPost: '.\u2009Estamos levando voc\u00ea \u00e0 Amazon, onde voc\u00ea pode ver o pre\u00e7o de hoje e comprar l\u00e1.',
  ftcLead: 'DRAFT — Divulga\u00e7\u00e3o de afiliado: ',
  ftcBody: 'DRAFT — como afiliado da Amazon, ganhamos comiss\u00f5es por compras qualificadas, sem custo adicional para voc\u00ea. N\u00e3o vemos seu pedido, pagamento ou dados pessoais. A Amazon \u00e9 a vendedora, envia seu pedido e gerencia devolu\u00e7\u00f5es e suporte.',
  cta: 'Continuar para a Amazon \u2192'
},
fr: {
  ftcReviewed: false, /* DRAFT — needs human review before ftcReviewed:true */
  h1: 'Direction Amazon\u2026',
  pickedPre: 'Vous avez choisi ',
  pickedPost: '.\u2009Nous vous redirigeons vers Amazon, o\u00f9 vous pouvez voir le prix du jour et l\u2019acheter l\u00e0-bas.',
  ftcLead: 'DRAFT — Divulgation d\u2019affiliation\u00a0: ',
  ftcBody: 'DRAFT — en tant qu\u2019affili\u00e9 Amazon, nous percevons des commissions sur les achats \u00e9ligibles, sans co\u00fbt suppl\u00e9mentaire pour vous. Nous ne voyons ni votre commande, ni votre paiement, ni vos donn\u00e9es personnelles. Amazon est le vendeur, exp\u00e9die votre commande et g\u00e8re les retours et l\u2019assistance.',
  cta: 'Continuer vers Amazon \u2192'
},
de: {
  ftcReviewed: false, /* DRAFT — needs human review before ftcReviewed:true */
  h1: 'Weiter zu Amazon\u2026',
  pickedPre: 'Sie haben ',
  pickedPost: ' ausgew\u00e4hlt.\u2009Wir leiten Sie zu Amazon weiter, wo Sie den heutigen Preis sehen und dort kaufen k\u00f6nnen.',
  ftcLead: 'DRAFT — Offenlegung von Partnerlinks: ',
  ftcBody: 'DRAFT — Als Amazon-Partner verdienen wir an qualifizierten K\u00e4ufen \u2013 f\u00fcr Sie ohne zus\u00e4tzliche Kosten. Wir sehen weder Ihre Bestellung noch Ihre Zahlung oder pers\u00f6nlichen Daten. Amazon ist der Verk\u00e4ufer, versendet Ihre Bestellung und \u00fcbernimmt R\u00fcckgaben und Support.',
  cta: 'Weiter zu Amazon \u2192'
},
it: {
  ftcReviewed: false, /* DRAFT — needs human review before ftcReviewed:true */
  h1: 'Ti stiamo portando su Amazon\u2026',
  pickedPre: 'Hai scelto ',
  pickedPost: '.\u2009Ti stiamo portando su Amazon, dove puoi vedere il prezzo di oggi e acquistarlo l\u00ec.',
  ftcLead: 'DRAFT — Informativa sugli affiliati: ',
  ftcBody: 'DRAFT — in qualit\u00e0 di affiliato Amazon, guadagniamo commissioni sugli acquisti idonei, senza costi aggiuntivi per te. Non vediamo il tuo ordine, il tuo pagamento n\u00e9 i tuoi dati personali. Amazon \u00e8 il venditore, spedisce il tuo ordine e gestisce resi e assistenza.',
  cta: 'Continua su Amazon \u2192'
}
};

/* ---- 3. NEGOTIATION ----
 * Full language list -> exact locale -> base language -> merchant gate -> en. */
function negotiate(supported){
  var langs = [];
  try{
    if(navigator.languages && navigator.languages.length)
      for(var i=0;i<navigator.languages.length;i++) langs.push(navigator.languages[i]);
  }catch(e){}
  try{ if(navigator.language) langs.push(navigator.language); }catch(e){}
  try{ if(navigator.userLanguage) langs.push(navigator.userLanguage); }catch(e){}
  langs.push('en');
  var seen = {};
  for(var k=0;k<langs.length;k++){
    var c = String(langs[k]||'').toLowerCase().replace(/_/g,'-').split(';')[0].trim();
    if(!c || seen[c]) continue;
    seen[c] = 1;
    var base = c.split('-')[0];
    var cands = (base && base!==c) ? [c, base] : [c];
    for(var j=0;j<cands.length;j++){
      var cand = cands[j];
      if(I18N_STRINGS[cand] && supported.indexOf(cand) >= 0) return cand;
    }
  }
  return 'en';
}

/* ---- 4. APPLY ---- */
function applyStrings(lang){
  if(lang==='en') return; /* English is the page default; nothing to swap */
  var S = I18N_STRINGS[lang];
  if(!S) return;
  try{ document.documentElement.lang = lang; }catch(e){}
  var h1 = document.querySelector('.box h1');
  if(h1 && S.h1) h1.textContent = S.h1;
  var sub = document.querySelector('.box p:not(.ftc)');
  if(sub && S.pickedPre){
    var st = sub.querySelector('strong');
    var nm = st ? st.textContent : '';
    sub.textContent = '';
    sub.appendChild(document.createTextNode(S.pickedPre));
    var b = document.createElement('strong'); b.textContent = nm; sub.appendChild(b);
    sub.appendChild(document.createTextNode(S.pickedPost));
  }
  var ftc = document.querySelector('.box p.ftc');
  if(ftc){
    /* Unreviewed disclosure -> fall back to ENGLISH block. Never ship DRAFT legal text. */
    var F = S.ftcReviewed ? S : I18N_STRINGS.en;
    ftc.textContent = '';
    var fb = document.createElement('strong'); fb.textContent = F.ftcLead; ftc.appendChild(fb);
    ftc.appendChild(document.createTextNode(F.ftcBody));
  }
  var go = document.querySelector('a.go');
  if(go && S.cta) go.textContent = S.cta;
}

/* ---- 5. RUN ---- */
var merchant = 'amazon-us';
try{
  var ds = document.currentScript && document.currentScript.getAttribute('data-merchant');
  if(ds) merchant = ds;
}catch(e){}
var supported = I18N_MERCHANTS[merchant] || I18N_MERCHANTS['default'];
applyStrings(negotiate(supported));

}catch(e){/* fail closed: English page stands */}
})();
