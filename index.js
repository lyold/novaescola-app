'use strict';

/**
 * Entry point do app.
 * O polyfill de URL PRECISA ser aplicado antes de qualquer import
 * para corrigir o erro do Supabase no React Native 0.73+ / Hermes:
 * "Cannot assign to property 'protocol' which has only a getter"
 *
 * react-native-url-polyfill/auto falha no RN 0.81 porque faz
 * `global.URL = ...` (atribuição direta), mas URL é getter-only no Hermes.
 * Object.defineProperty funciona quando a propriedade é configurable.
 */
var urlPolyfill = require('react-native-url-polyfill');
var PolyURL = urlPolyfill.URL;
var PolyURLSearchParams = urlPolyfill.URLSearchParams;

function applyPolyfill(name, value) {
  try {
    var descriptor = Object.getOwnPropertyDescriptor(global, name);
    if (!descriptor) {
      global[name] = value;
      return;
    }
    if (descriptor.configurable !== false) {
      Object.defineProperty(global, name, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: descriptor.enumerable !== false,
      });
    }
  } catch (_) {
    // Silently ignore - URL pode já estar correta
  }
}

applyPolyfill('URL', PolyURL);
applyPolyfill('URLSearchParams', PolyURLSearchParams);

// Agora carrega o app (supabase já encontrará a URL polyfillada)
var { registerRootComponent } = require('expo');
var App = require('./App').default;
registerRootComponent(App);
