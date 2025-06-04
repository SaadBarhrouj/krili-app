import {
  __commonJS
} from "./chunk-3OV72XIM.js";

// node_modules/flatpickr/dist/l10n/fr.js
var require_fr = __commonJS({
  "node_modules/flatpickr/dist/l10n/fr.js"(exports, module) {
    (function(global, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.fr = {}));
    })(exports, function(exports2) {
      "use strict";
      var fp = typeof window !== "undefined" && window.flatpickr !== void 0 ? window.flatpickr : {
        l10ns: {}
      };
      var French = {
        firstDayOfWeek: 1,
        weekdays: {
          shorthand: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
          longhand: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
        },
        months: {
          shorthand: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"],
          longhand: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
        },
        ordinal: function(nth) {
          if (nth > 1) return "";
          return "er";
        },
        rangeSeparator: " au ",
        weekAbbreviation: "Sem",
        scrollTitle: "Défiler pour augmenter la valeur",
        toggleTitle: "Cliquer pour basculer",
        time_24hr: true
      };
      fp.l10ns.fr = French;
      var fr = fp.l10ns;
      exports2.French = French;
      exports2.default = fr;
      Object.defineProperty(exports2, "__esModule", {
        value: true
      });
    });
  }
});
export default require_fr();
//# sourceMappingURL=flatpickr_dist_l10n_fr__js.js.map
