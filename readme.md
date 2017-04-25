### Content Highlight
Highlight text in any html content (inspired by Medium's highlight feature)
![How it works](./sample.gif)


#### How it works
* Given some html content, assign unique identifiers to every html node in the content with data attribute data-msnode (this can be customized). [ruby sample](../lib/content.rb)
* When text is selected, highlight is created with the common ancestor html node with a unique identifier and start/end offsets.
* The common ancestor node identifier, start offset, end offset are sent to the server, where it can be optionally associated with the current user.
* The server returns all highlights as JSON and suitable content highlight classes are applied using rangy's class applier module.
* Highlight removal permissions can also be set by the server. Clicking on a highlight will let us remove the highlight.
* Removing a highlight will send request the server for acknowledgment


#### Dependencies
Text selection is supported by [Rangy](https://www.github.com/timdown/rangy)
* [Rangy's Core module](https://github.com/timdown/rangy/blob/master/src/core/core.js)
* [Rangy's Class Applier Module](https://github.com/timdown/rangy/blob/master/src/modules/rangy-classapplier.js)
