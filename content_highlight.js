var contentHighlightWorker = function(element, options){
  var self = this;
  this.element = element;
  this.settings = {
    nodeIdentifierKey: options.nodeIdentifierKey || "msnode",
    highlightClass: options.highlightClass || "content-highlight",
    highlightIdentifyClassRoot: options.highlightIdentifyClassRoot || "content-highlight-identifier-",
    highlightLifetimeClassRoot: options.highlightLifetimeClassRoot || "content-highlight-lifetime-",
    highlightActiveClass: options.highlightActiveClass || "content-highlight-active",
    popTipClass: options.popTipClass || "content-highlight-poptip",
    popTipDefaultHead: options.popTipDefaultHead || "Highlight",
    addToServerPath: options.addToServerPath || element.dataset.addhighlightspath,
    removeFromServerPath: options.removeFromServerPath || element.dataset.removehighlightspath,
    readOnly: options.readOnly || false,
  }

  if(!rangy || !rangy.getSelection){
    return;
  }

  this.init = function(){
    rangy.init();
    this.getContentHighlightsFromServer();
    if (!this.settings.readOnly) {
      element.addEventListener('mouseup', this.initializeHighlighter);
    }
  }

  this.initializeHighlighter = function(){
    var selection, bookmarkObject, range;
    selection = rangy.getSelection();
    if(selection.isCollapsed == false && selection.rangeCount > 0){
      range = selection.getRangeAt(0);
      commonAncestor = range.commonAncestorContainer;
      while(commonAncestor.dataset == undefined || commonAncestor.dataset[self.settings.nodeIdentifierKey] == undefined){
        commonAncestor = commonAncestor.parentNode;
        if(commonAncestor == undefined || commonAncestor.contains(this)){
          return;
        }
      }
      bookmarkObject = selection.getBookmark(commonAncestor);
      if(bookmarkObject && bookmarkObject.rangeBookmarks.length > 0){
        highlightParams = {
          common_ancestor_node_type: commonAncestor.tagName,
          common_ancestor_identifier_key: self.settings.nodeIdentifierKey,
          common_ancestor_identifier: commonAncestor.dataset[self.settings.nodeIdentifierKey],
          start_offset: bookmarkObject.rangeBookmarks[0].start,
          end_offset: bookmarkObject.rangeBookmarks[0].end,
          backward: bookmarkObject.backward,
          content: selection.toString(),
        }
        self.saveContentHighlightsToServer(highlightParams);
      }else{
        return;
      }
      selection.detach();
    }
  }

  this.getContentHighlightsFromServer = function(){
    this.saveContentHighlightsToServer({});
  }

  this.saveContentHighlightsToServer = function(highlightParams){
    self.ajaxLoader(self.settings.addToServerPath, highlightParams, function(allHighlights){
      self.modifyContentHighlights(allHighlights, 'add');
    });
  }

  this.removeContentHighlightsFromServer = function(highlightElement){
    var removeHighlightParams;
    if(highlightElement.className != undefined){
      var classNameArray = highlightElement.className.split(" ");
      for(var iter=0; iter<classNameArray.length; iter++){
        if(classNameArray[iter].substring(0, self.settings.highlightIdentifyClassRoot.length) == self.settings.highlightIdentifyClassRoot){
          removeHighlightParams = {
            content_highlight_id: classNameArray[iter].substring(self.settings.highlightIdentifyClassRoot.length, classNameArray[iter].length)
          }
        }
      }
    }
    if(removeHighlightParams != undefined){
      self.ajaxLoader(self.settings.removeFromServerPath, removeHighlightParams, function(removableHighlights){
        self.modifyContentHighlights(removableHighlights, 'remove');
      });
    }
  }

  this.setEventListenersToHighlights = function(highlights){
    for(var iter = 0; iter < highlights.length; iter ++){
      highlights[iter].addEventListener('click', self.clickHighlightListener);
    }
  }

  this.removeEventListenersFromHighlights = function(highlights){
    for(var iter = 0; iter < highlights.length; iter ++){
      highlights[iter].removeEventListener('click', self.clickHighlightListener);
    }
  }

  this.clickHighlightListener = function(event){
    self.showPopTipFor(this, event);
    event.stopPropagation();
  }

  this.modifyContentHighlights = function(contentHighlights, modifyAction){
    var selection = rangy.getSelection();
    var classApplier;
    for(var iter = 0; iter < contentHighlights.length; iter++){
      highlightableObject = contentHighlights[iter];
      containerNode = element.querySelector(highlightableObject.common_ancestor_node_type + '[data-' + self.settings.nodeIdentifierKey + '="' + highlightableObject.common_ancestor_identifier + '"]')
      if(containerNode != undefined){
        bookmarkObject = {
          backward: highlightableObject.backward,
          rangeBookmarks: [{
            start: highlightableObject.start_offset,
            end: highlightableObject.end_offset,
            containerNode: containerNode
          }]
        }
        classApplier = rangy.createClassApplier(self.settings.highlightIdentifyClassRoot + highlightableObject.identifier, {elementProperties: {className: self.settings.highlightClass}});
        selection.moveToBookmark(bookmarkObject);
        if(selection.toString() == highlightableObject.content){
          switch(modifyAction){
            case "add":
              classApplier.applyToSelection();
              var elementSet = element.getElementsByClassName(self.settings.highlightIdentifyClassRoot + highlightableObject.identifier);
              self.addDataAttributesToElements(elementSet, [["description", highlightableObject.description], ["removable", highlightableObject.can_cancel]]);
              if(highlightableObject.life_time_class_ends != undefined){
                self.addLifetimeClassesToElements(elementSet, highlightableObject.life_time_class_ends);
              }
              if (!this.settings.readOnly) {
                self.setEventListenersToHighlights(elementSet);
              }
              break;
            case "remove":
              var elementSet = element.getElementsByClassName(self.settings.highlightIdentifyClassRoot + highlightableObject.identifier);
              self.removeDataAttributesFromElements(elementSet, [["description", highlightableObject.description], ["removable", highlightableObject.can_cancel]]);
              self.removeLifetimeClassesFromElements(elementSet);
              self.removeEventListenersFromHighlights(elementSet);
              self.unmarkActiveHighlights();
              classApplier.undoToSelection();
              break;
            default:
              break;
          }
        }
      }
    }
    selection.removeAllRanges();
    selection.detach();
  }

  this.addLifetimeClassesToElements = function(anyElements, lifetimeClassEnds){
    if(lifetimeClassEnds.length > 0){
      for(var iter=0; iter < anyElements.length; iter++){
        var anyElementClasses = anyElements[iter].className.split(" ");
        var newLifetimeEnds = new Array;
        loop1: for(var iter1=0; iter1<lifetimeClassEnds.length; iter1++){
          loop2: for(var iter2=0; iter2< anyElementClasses.length; iter2++){
            if(anyElementClasses[iter2] == self.settings.highlightLifetimeClassRoot + lifetimeClassEnds[iter1]){
              continue loop1;
            }
          }
          newLifetimeEnds.push(self.settings.highlightLifetimeClassRoot + lifetimeClassEnds[iter1]);
        }
        if(newLifetimeEnds.length > 0){
          anyElements[iter].className = anyElementClasses.join(" ") + " " + newLifetimeEnds.join(" ");
        }
      }
    }
  }

  this.removeLifetimeClassesFromElements = function(anyElements){
    for(var iter=0; iter < anyElements.length; iter++){
      if(anyElements[iter].className != undefined){
        var currentClasses = anyElements[iter].className.split(" ");
        var newClasses = new Array;
        loop1: for(var iter1=0; iter1 < currentClasses.length; iter1++){
          if(currentClasses[iter1].substring(0, self.settings.highlightLifetimeClassRoot.length) == self.settings.highlightLifetimeClassRoot){
            continue loop1;
          }
          newClasses.push(currentClasses[iter1]);
        }
        anyElements[iter].className = newClasses.join(" ");
      }
    }
  }

  this.addDataAttributesToElements = function(anyElements, dataAttributesArray){
    if(dataAttributesArray.length > 0){
      for(var iter=0; iter < anyElements.length; iter++){
        for(var iter1=0; iter1 < dataAttributesArray.length; iter1++){
          anyElements[iter].dataset[dataAttributesArray[iter1][0]] = dataAttributesArray[iter1][1];
        }
      }
    }
  }

  this.removeDataAttributesFromElements = function(anyElements, dataAttributesArray){
    if(dataAttributesArray.length > 0){
      for(var iter=0; iter < anyElements.length; iter++){
        for(var iter1=0; iter1 < dataAttributesArray.length; iter1++){
          delete anyElements[iter].dataset[dataAttributesArray[iter1][0]];
        }
      }
    }
  }

  this.markHighlightAsActive = function(anyElement){
    if(anyElement.className != undefined){
      var anyElementClassArray = anyElement.className.split(" ");
      for(var iter=0; iter< anyElementClassArray.length; iter++){
        if(anyElementClassArray[iter] == self.settings.highlightActiveClass){
          return;
        }
      }
      anyElementClassArray.push(self.settings.highlightActiveClass);
      anyElement.className = anyElementClassArray.join(" ");
    }
  }

  this.unmarkActiveHighlights = function(){
    var activeHighlights = self.element.getElementsByClassName(self.settings.highlightActiveClass);
    for(var iter=0;iter<activeHighlights.length;iter++){
      if(activeHighlights[iter].className != undefined){
        var anyElementClassArray = activeHighlights[iter].className.split(" ");
        var newClassArray = new Array;
        for(var iter1=0; iter1< anyElementClassArray.length; iter1++){
          if(anyElementClassArray[iter1] != self.settings.highlightActiveClass){
            newClassArray.push(anyElementClassArray[iter1]);
          }
        }
        activeHighlights[iter].className = newClassArray.join(" ");
      }
    }
  }

  this.showPopTipFor = function(highlightElement, clickEvent){
    self.removePopTip();
    self.buildPopupFromHighlightElement(highlightElement);
    if(self.popTip != undefined){
      self.popTip.style.top = highlightElement.offsetTop + highlightElement.offsetHeight + "px";
      self.popTip.style.left = highlightElement.offsetLeft + 10 + "px";
      self.element.append(self.popTip);
      self.markHighlightAsActive(highlightElement);
      window.addEventListener('resize', self.removePopTip);
      document.addEventListener('click', self.removePopTip);
    }
  }

  this.removePopTip = function(){
    if(self.popTip != undefined){
      self.popTip.remove();
      self.popTip = undefined;
      self.unmarkActiveHighlights();
      window.removeEventListener('resize', self.removePopTip);
      document.removeEventListener('click', self.removePopTip);
    }
  }

  this.buildPopupFromHighlightElement = function(highlightElement){
    self.popTip = document.createElement('div');
    self.popTip.className = self.settings.popTipClass;
    self.popTip.innerHTML = "<span class='description'>" + (highlightElement.dataset.description || self.settings.popTipDefaultHead)+ "</span>";
    if(highlightElement.dataset.removable == "true"){
      self.popTip.innerHTML += "<a href='javascript:void(0);' class='cancel_highlight'>click to remove</a>";
      if(self.popTip.getElementsByClassName('cancel_highlight')[0] != undefined){
        self.popTip.getElementsByClassName('cancel_highlight')[0].addEventListener('click', function(){
          self.removePopTip();
          self.removeContentHighlightsFromServer(highlightElement);
        });
      }
    }
  }

  this.ajaxLoader = function(url, params, callbackFunc){
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", url, true);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.setRequestHeader("Accept", "application/json");    
    if(document.querySelector('meta[name="csrf-token"]') != null){
      xmlhttp.setRequestHeader("X-CSRF-Token", document.querySelector('meta[name="csrf-token"]').content);      
    }
    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        var data = JSON.parse(this.responseText);
        callbackFunc(data);
      }
    };
    xmlhttp.send(self.serializeParams(params));
  }

  this.serializeParams = function(obj, prefix) {
    var str = [], p;
    for(p in obj) {
      if (obj.hasOwnProperty(p)) {
        var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
        str.push((v !== null && typeof v === "object") ?
          serialize(v, k) :
          encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  }
}
