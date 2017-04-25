(function($) {
  $.fn.contentHighlighter = function(options){
    return this.each(function(){
      var element = this;
      setTimeout(function(){
        var worker = new contentHighlightWorker(element, options || {});
        worker.init();
      }, 10);
    });
  };
})(jQuery);
