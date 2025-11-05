// Polyfills leves para navegadores antigos (mobile)
// Carregados condicionalmente por theme.js
(function(){
  try{
    // Element.closest
    if(!Element.prototype.closest){
      Element.prototype.closest = function(selector){
        let el = this;
        while(el && el.nodeType === 1){
          if(el.matches(selector)) return el;
          el = el.parentElement || el.parentNode;
        }
        return null;
      };
    }

    // Object.assign
    if(typeof Object.assign !== 'function'){
      Object.assign = function(target){
        if(target == null) throw new TypeError('Cannot convert undefined or null to object');
        const to = Object(target);
        for(let i=1;i<arguments.length;i++){
          const src = arguments[i];
          if(src != null){
            for(const key in src){ if(Object.prototype.hasOwnProperty.call(src,key)){ to[key] = src[key]; } }
          }
        }
        return to;
      };
    }

    // AbortController stub: permite chamar .abort() sem quebrar
    if(typeof window.AbortController === 'undefined'){
      window.AbortController = function(){ return { abort: function(){}, signal: {} }; };
    }

    // NodeList.forEach
    if(window.NodeList && !NodeList.prototype.forEach){
      NodeList.prototype.forEach = Array.prototype.forEach;
    }
  }catch(_){ /* noop */ }
})();